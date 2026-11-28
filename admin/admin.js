/* Back-office /admin/ (lot 1e) : compléments à Sveltia CMS, servis par le site (copiés par outils/construire.py).
 *
 * 1. Bandeau d'état de la publication, en haut de la page : « Publication en cours », « En ligne depuis hh:mm » ou
 *    « Échec : voir le détail », avec le nombre de fiches retenues et d'images à régulariser, chacun relié à sa liste
 *    et aux corrections. Sources :
 *      - ./etat.json, écrit par la construction de la version en ligne (même site, sans limite) ;
 *      - l'API publique de GitHub, SANS jeton (celui de Sveltia n'est jamais lu), pour l'exécution en cours. Limite :
 *        60 requêtes par heure et par adresse IP. Le bandeau interroge au chargement, au retour sur l'onglet, environ
 *        20 secondes après un enregistrement et sur le bouton « Actualiser », jamais en continu, et au plus une fois
 *        toutes les 20 secondes.
 * 2. Champ « Tester le fichier » (widget telecharger, champ valider_nouvelle_version) des fiches d'annale et de
 *    contenu : « Télécharger pour tester » enregistre le fichier HTML sur l'ordinateur, prêt à ouvrir en local. Il
 *    n'est jamais ouvert dans cet onglet : un fichier ouvert ici aurait accès au jeton de Sveltia. Le contenu vient de
 *    Sveltia s'il l'a déjà en mémoire, sinon de l'API publique de GitHub (dépôt public, sans jeton). Quand une nouvelle
 *    version attend (champ caché nouvelle_version), elle a son propre lien et la case « Valider la nouvelle version » :
 *    cochée, la valeur du champ est true ; décochée, le champ reste vide et rien n'est écrit dans la fiche.
 * Aucune donnée n'est envoyée ailleurs qu'à api.github.com, hôte déjà autorisé pour /admin/ (CLAUDE.md).
 */
(function () {
  'use strict';

  var racine = document.querySelector('script[data-depot]');
  var DEPOT = racine ? racine.getAttribute('data-depot') : '';
  var API = 'https://api.github.com/repos/' + DEPOT;
  var INTERVALLE_MIN = 20000;
  var DELAI_APRES_ENREGISTREMENT = 20000;

  // ---------------------------------------------------------------------------------------------------------------
  // Outils

  function el(balise, attributs, enfants) {
    var e = document.createElement(balise);
    Object.keys(attributs || {}).forEach(function (cle) {
      if (cle === 'texte') e.textContent = attributs[cle];
      else if (cle.indexOf('on') === 0) e.addEventListener(cle.slice(2), attributs[cle]);
      else e.setAttribute(cle, attributs[cle]);
    });
    (enfants || []).forEach(function (enfant) {
      if (enfant !== null && enfant !== undefined) e.appendChild(typeof enfant === 'string' ? document.createTextNode(enfant) : enfant);
    });
    return e;
  }

  function pluriel(n, mot, motPluriel) {
    return n + ' ' + (n > 1 ? (motPluriel || mot + 's') : mot);
  }

  function heure(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    var hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    var aujourdhui = new Date().toDateString() === d.toDateString();
    return aujourdhui ? hm : 'le ' + d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' à ' + hm;
  }

  // ---------------------------------------------------------------------------------------------------------------
  // 1. Bandeau d'état

  var bandeau = el('section', { id: 'etat-publication', 'aria-label': 'État de la publication', 'aria-live': 'polite' });
  var dernierAppel = 0;
  var dernierRun = null;
  var minuterie = null;

  function lireEtat() {
    return fetch('./etat.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // Dernière exécution de « Publier le site » sur main, hors exécutions annulées (file d'attente) ; null si l'API ne
  // répond pas (limite atteinte, hors ligne). Au plus un appel toutes les 20 secondes.
  function lireExecution() {
    if (!DEPOT) return Promise.resolve(null);
    if (Date.now() - dernierAppel < INTERVALLE_MIN) return Promise.resolve(dernierRun);
    dernierAppel = Date.now();
    return fetch(API + '/actions/workflows/publier.yml/runs?branch=main&per_page=5', {
      headers: { Accept: 'application/vnd.github+json' }, credentials: 'omit', cache: 'no-store',
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (donnees) {
      var runs = (donnees && donnees.workflow_runs) || [];
      dernierRun = runs.filter(function (run) { return ['cancelled', 'skipped'].indexOf(run.conclusion) < 0; })[0] || null;
      return dernierRun;
    }).catch(function () { return null; });
  }

  function statut(etat, run) {
    if (run && run.status !== 'completed') {
      return { classe: 'en-cours', texte: 'Publication en cours', lien: run.html_url, libelle: 'voir l’avancement' };
    }
    if (run && run.conclusion && run.conclusion !== 'success') {
      return { classe: 'echec', texte: 'Échec : voir le détail', lien: run.html_url, libelle: 'ouvrir sur GitHub' };
    }
    var depuis = etat && etat.construit_le ? heure(etat.construit_le) : '';
    return {
      classe: 'en-ligne',
      texte: depuis ? 'En ligne depuis ' + depuis : 'En ligne',
      note: run ? '' : ' (état de GitHub indisponible)',
    };
  }

  function erreursListe(erreurs) {
    return el('ul', {}, (erreurs || []).map(function (e) {
      return el('li', {}, [el('strong', { texte: e.champ }), ' : ' + e.message + ' ', el('span', { class: 'correction', texte: '→ ' + e.correction })]);
    }));
  }

  function lienFiche(fiche) {
    var m = /^annales\/([^/]+)\.json$/.exec(fiche || '');
    return m ? el('a', { href: '#/collections/annales/entries/' + m[1], texte: 'ouvrir la fiche' }) : null;
  }

  function section(titre, elements, rendu) {
    if (!elements || !elements.length) return null;
    return el('div', { class: 'etat-section' }, [el('h3', { texte: titre + ' (' + elements.length + ')' }),
      el('ul', {}, elements.map(rendu))]);
  }

  function listeACorriger(a) {
    return [
      section('Fiches retenues (non publiées)', a.fiches_retenues, function (f) {
        return el('li', {}, [el('strong', { texte: f.rubrique + ' : « ' + f.titre + ' »' }), ' (' + f.fiche + ')',
          f.etait_en_ligne ? el('span', { class: 'retiree', texte: ' Retirée du site : elle était en ligne.' }) : null,
          ' ', lienFiche(f.fiche), erreursListe(f.erreurs)]);
      }),
      section('Brouillons : avertissements', a.brouillons, function (f) {
        return el('li', {}, [el('strong', { texte: f.rubrique + ' : « ' + f.titre + ' »' }), ' (' + f.fiche + ') ',
          lienFiche(f.fiche), erreursListe(f.erreurs)]);
      }),
      section('Nouvelles versions à relire : avertissements', a.nouvelles_versions, function (n) {
        return el('li', {}, [el('strong', { texte: '« ' + n.titre + ' »' }), ' (' + n.fichier + ')', erreursListe(n.avertissements)]);
      }),
      section('Images non publiées', a.images_non_publiees, function (i) {
        return el('li', {}, [el('strong', { texte: i.usage }), ' (' + i.fiche + ', champ « ' + i.champ + ' ») : ' + i.message + ' ',
          el('span', { class: 'correction', texte: '→ ' + i.correction })]);
      }),
      section('Images orphelines', a.images_orphelines, function (i) {
        return el('li', {}, [i.message + ' ', el('span', { class: 'correction', texte: '→ ' + i.correction })]);
      }),
      section('Fichiers déposés non importés', a.fichiers_non_importes, function (n) {
        return el('li', {}, [n.message + ' ', n.correction ? el('span', { class: 'correction', texte: '→ ' + n.correction }) : null,
          el('ul', {}, (n.problemes || []).slice(0, 6).map(function (p) { return el('li', { texte: p }); }))]);
      }),
      section('Notions proposées', a.notions_proposees, function (n) {
        return el('li', {}, ['« ' + n.nom + ' » (' + n.id + '), proposée par ' + n.fiche + ' ',
          el('span', { class: 'correction', texte: '→ ' + n.correction })]);
      }),
      section('Autres', a.autres, function (x) {
        return el('li', {}, [el('strong', { texte: x.objet }), ' : ' + x.message + ' ', el('span', { class: 'correction', texte: '→ ' + x.correction })]);
      }),
    ];
  }

  function afficher(etat, run) {
    var s = statut(etat, run);
    var a = (etat && etat.a_corriger) || {};
    var comptes = (etat && etat.comptes) || {};
    var aCorriger = comptes.a_corriger || 0;
    var regulariser = (etat && etat.images_a_regulariser) || [];
    var autres = aCorriger - (comptes.fiches_retenues || 0);
    var ligne = el('p', { class: 'etat-ligne' }, [
      el('span', { class: 'etat-statut etat-' + s.classe, texte: s.texte }),
      s.lien ? el('a', { href: s.lien, target: '_blank', rel: 'noopener', texte: s.libelle }) : null,
      s.note ? el('span', { class: 'etat-note', texte: s.note }) : null,
      etat ? el('a', { href: '#etat-a-corriger', class: 'etat-compte', 'data-compte': 'fiches-retenues',
        texte: pluriel(comptes.fiches_retenues || 0, 'fiche retenue', 'fiches retenues'), onclick: ouvrir('etat-a-corriger') }) : null,
      etat ? el('a', { href: '#etat-a-regulariser', class: 'etat-compte', 'data-compte': 'images-a-regulariser',
        texte: pluriel(regulariser.length, 'image à régulariser', 'images à régulariser'), onclick: ouvrir('etat-a-regulariser') }) : null,
      etat && (etat.nouvelles_versions || []).length ? el('a', { href: '#etat-nouvelles-versions', class: 'etat-compte',
        'data-compte': 'nouvelles-versions', onclick: ouvrir('etat-nouvelles-versions'),
        texte: pluriel(etat.nouvelles_versions.length, 'nouvelle version à relire', 'nouvelles versions à relire') }) : null,
      etat && autres > 0 ? el('a', { href: '#etat-a-corriger', class: 'etat-compte', 'data-compte': 'autres',
        texte: pluriel(autres, 'autre point à corriger', 'autres points à corriger'), onclick: ouvrir('etat-a-corriger') }) : null,
      el('button', { type: 'button', class: 'etat-actualiser', texte: 'Actualiser', onclick: function () { actualiser(true); } }),
    ]);
    var details = [];
    if (aCorriger) {
      details.push(el('details', { id: 'etat-a-corriger' }, [el('summary', { texte: 'À corriger (' + aCorriger + ')' })].concat(listeACorriger(a))));
    }
    if (regulariser.length) {
      details.push(el('details', { id: 'etat-a-regulariser' }, [el('summary', { texte: 'Images à régulariser (' + regulariser.length + ')' }),
        el('ul', {}, regulariser.map(function (i) {
          return el('li', {}, [el('strong', { texte: i.usage }), ' (' + i.fiche + ') : ' + i.message + ' ', el('span', { class: 'correction', texte: '→ ' + i.correction })]);
        }))]));
    }
    if ((etat && etat.nouvelles_versions || []).length) {
      details.push(el('details', { id: 'etat-nouvelles-versions' }, [el('summary', { texte: 'Nouvelles versions à relire (' + etat.nouvelles_versions.length + ')' }),
        el('ul', {}, etat.nouvelles_versions.map(function (n) {
          return el('li', {}, [el('strong', { texte: n.rubrique + ' : « ' + n.titre + ' »' }), ' (' + n.fiche + '), déposée le ' + (n.deposee_le || '?') + ' ',
            lienFiche(n.fiche), el('span', { class: 'correction', texte: '→ Téléchargez-la depuis la fiche (« Tester le fichier »), testez-la, puis cochez « Valider la nouvelle version » et enregistrez.' })]);
        }))]));
    }
    var ouverts = Array.prototype.filter.call(bandeau.querySelectorAll('details[open]'), function (d) { return d.id; })
      .map(function (d) { return d.id; });
    bandeau.replaceChildren.apply(bandeau, [ligne].concat(details));
    ouverts.forEach(function (id) { var d = document.getElementById(id); if (d) d.open = true; });
    bandeau.setAttribute('data-etat', s.classe);
  }

  function ouvrir(id) {
    return function (evenement) {
      evenement.preventDefault();
      var d = document.getElementById(id);
      if (d) { d.open = true; d.scrollIntoView({ block: 'nearest' }); d.querySelector('summary').focus(); }
    };
  }

  function actualiser(force) {
    if (force) dernierAppel = 0;
    return Promise.all([lireEtat(), lireExecution()]).then(function (resultats) { afficher(resultats[0], resultats[1]); });
  }

  function installerBandeau() {
    if (!document.body.contains(bandeau)) document.body.insertBefore(bandeau, document.body.firstChild);
    // L'interface de Sveltia commence sous le bandeau, quelle que soit sa hauteur (listes ouvertes ou non).
    var mesurer = function () {
      document.documentElement.style.setProperty('--hauteur-bandeau', Math.ceil(bandeau.getBoundingClientRect().height) + 'px');
    };
    if (window.ResizeObserver) new ResizeObserver(mesurer).observe(bandeau);
    mesurer();
    afficher(null, null);
    actualiser();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') actualiser();
    });
  }

  if (document.body) installerBandeau();
  else document.addEventListener('DOMContentLoaded', installerBandeau);

  // ---------------------------------------------------------------------------------------------------------------
  // 2. Champ « Tester le fichier » et actualisation après un enregistrement

  var CMS = window.CMS;
  if (!CMS || !CMS.registerFieldType) return;
  var React = CMS.React;
  var h = React.createElement;

  CMS.registerEventListener({
    name: 'postSave',
    handler: function () {
      clearTimeout(minuterie);
      minuterie = setTimeout(function () { actualiser(true); }, DELAI_APRES_ENREGISTREMENT);
    },
  });

  function valeur(carte, cle) {
    if (!carte) return undefined;
    return typeof carte.get === 'function' ? carte.get(cle) : carte[cle];
  }

  function recuperer(chemin, getAsset) {
    var propre = String(chemin).replace(/^\/+/, '');
    // Fichier que Sveltia a déjà en mémoire (téléversé dans cette session, ou dépôt local) : aucun appel réseau.
    var asset = getAsset ? getAsset(chemin) || getAsset('/' + propre) : null;
    var enMemoire = asset && asset.fileObj instanceof Blob ? Promise.resolve(asset.fileObj)
      : asset && typeof asset.url === 'string' && asset.url.indexOf('blob:') === 0
        ? fetch(asset.url).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; })
        : Promise.resolve(null);
    return enMemoire.then(function (contenu) {
      if (contenu) return contenu;
      return fetch(API + '/contents/' + propre.split('/').map(encodeURIComponent).join('/') + '?ref=main', {
        headers: { Accept: 'application/vnd.github.raw' }, credentials: 'omit', cache: 'no-store',
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status === 404 ? 'fichier pas encore sur GitHub : enregistrez la fiche, puis réessayez'
          : 'GitHub ne répond pas (' + r.status + '), réessayez dans quelques minutes');
        return r.blob();
      });
    });
  }

  function telecharger(chemin, nom, getAsset) {
    return recuperer(chemin, getAsset).then(function (contenu) {
      return contenu.arrayBuffer();
    }).then(function (octets) {
      var adresse = URL.createObjectURL(new Blob([octets], { type: 'text/html;charset=utf-8' }));
      var lien = el('a', { href: adresse, download: nom });
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      setTimeout(function () { URL.revokeObjectURL(adresse); }, 60000);
    });
  }

  function Telecharger(props) {
    var etat = React.useState('');
    var message = etat[0];
    var setMessage = etat[1];
    var donnees = props.entry ? valeur(props.entry, 'data') : null;
    var fichier = valeur(donnees, 'fichier');
    var nouvelle = valeur(donnees, 'nouvelle_version');
    var fichierNouveau = valeur(nouvelle, 'fichier');
    var deposee = valeur(nouvelle, 'deposee_le');
    var ident = valeur(donnees, 'id') || 'fichier';

    function bouton(chemin, nom, libelle) {
      return h('button', {
        type: 'button',
        className: 'tester-bouton',
        onClick: function () {
          setMessage('Téléchargement…');
          telecharger(chemin, nom, props.getAsset).then(function () {
            setMessage('Fichier enregistré sur votre ordinateur (' + nom + ') : ouvrez-le pour le tester.');
          }).catch(function (erreur) { setMessage('Téléchargement impossible : ' + erreur.message + '.'); });
        },
      }, libelle);
    }

    return h('div', { className: 'tester-fichier', id: props.forID },
      typeof fichier === 'string' && fichier
        ? bouton(fichier, ident + '.html', 'Télécharger pour tester')
        : h('p', null, 'Pas encore de fichier HTML dans cette fiche.'),
      typeof fichierNouveau === 'string' && fichierNouveau ? h('div', { className: 'tester-nouvelle-version' },
        h('p', null, h('strong', null, 'Nouvelle version à relire'), deposee ? ' (déposée le ' + deposee + ')' : '',
          ' : téléchargez-la, testez-la, puis cochez « Valider la nouvelle version » et enregistrez. D’ici là, la version en ligne reste en ligne.'),
        bouton(fichierNouveau, ident + '-nouvelle-version.html', 'Télécharger la nouvelle version pour tester'),
        h('label', { className: 'tester-valider' },
          h('input', {
            type: 'checkbox',
            checked: props.value === true,
            onChange: function (evenement) { props.onChange(evenement.target.checked ? true : undefined); },
          }),
          ' Valider la nouvelle version')) : null,
      message ? h('p', { role: 'status', className: 'tester-message' }, message) : null);
  }

  CMS.registerFieldType({ name: 'telecharger', controlComponent: Telecharger });
}());
