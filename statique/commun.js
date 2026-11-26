/* industrie.education — commun.js
   Trois améliorations progressives : titre évolutif de l'accueil, filtres du catalogue, mode projection.
   Sans ce script, chaque page reste complète (titre par défaut, toutes les cartes affichées).
   Aucun cookie, aucun stockage, aucune requête : tout se calcule dans le navigateur. */
(function () {
  'use strict';

  var html = document.documentElement;

  function tous(selecteur, racine) {
    return Array.prototype.slice.call((racine || document).querySelectorAll(selecteur));
  }

  /* ---------- titre évolutif (DESIGN.md § 7) ---------- */

  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  // Moment de la journée, d'après l'heure locale du navigateur.
  function momentDe(date) {
    var jour = date.getDay();
    var heure = date.getHours();
    if (jour === 0 || jour === 6) return 'week-end';
    if (heure >= 22 || heure < 6) return 'nuit';
    if (heure < 8) return 'matin';
    if (heure >= 12 && heure < 14) return 'midi';
    if (heure >= 17) return 'soir';
    return 'cours';
  }

  function titreEvolutif() {
    var titre = document.querySelector('[data-titre-evolutif]');
    if (!titre) return;
    var maintenant = new Date();
    var moment = momentDe(maintenant);
    // Les six titres sont déjà dans la page (variantes masquées qui réservent la hauteur) : on recopie le bon.
    var variante = document.querySelector('.accueil-titre-variante[data-moment="' + moment + '"]');
    if (variante) {
      titre.textContent = variante.textContent;
      titre.setAttribute('data-moment', moment);
    }
    var etiquette = document.querySelector('[data-moment-texte]');
    if (etiquette) etiquette.textContent = JOURS[maintenant.getDay()] + ' · ' + maintenant.getHours() + ' h';
  }

  /* ---------- catalogue : filtres et recherche, état dans l'adresse ---------- */

  // Minuscules, sans accents ni ligatures : « Énergie » et « energie » se valent.
  function normaliser(texte) {
    return String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘ʼ]/g, '\'').replace(/\s+/g, ' ').trim();
  }

  function motsDe(texte) {
    var propre = normaliser(texte);
    return propre ? propre.split(' ') : [];
  }

  // Ordre des paramètres dans l'adresse (TRAME § 3).
  var PARAMETRES = ['q', 'public', 'theme', 'type', 'niveau'];
  var FILTRES = ['public', 'theme', 'type', 'niveau'];

  function catalogue() {
    var racine = document.querySelector('[data-catalogue]');
    if (!racine) return;

    var cartes = tous('[data-cartes] > li', racine).map(function (li) {
      return {
        li: li,
        theme: li.getAttribute('data-theme') || '',
        type: li.getAttribute('data-type') || '',
        publics: (li.getAttribute('data-publics') || '').split(' '),
        niveau: li.getAttribute('data-niveau') || '',
        texte: normaliser(li.getAttribute('data-texte') || li.textContent)
      };
    });
    var boutons = tous('[data-filtre]', racine);
    var panneau = racine.querySelector('[data-filtres]');
    var ouvrir = racine.querySelector('[data-filtres-ouvrir]');
    var formulaire = document.querySelector('[data-recherche-catalogue]');
    var champ = formulaire ? formulaire.querySelector('input[name="q"]') : null;
    var compteur = racine.querySelector('[data-compteur]');
    var vide = racine.querySelector('[data-vide]');
    var effacer = racine.querySelector('[data-effacer]');

    // Valeurs admises pour chaque filtre : celles des boutons actifs. Une valeur inconnue dans l'adresse est ignorée.
    var admises = {};
    var libelles = {};
    FILTRES.forEach(function (f) { admises[f] = ['']; libelles[f] = {}; });
    boutons.forEach(function (b) {
      var f = b.getAttribute('data-filtre');
      var v = b.getAttribute('data-valeur');
      if (!admises[f] || b.disabled) return;
      if (admises[f].indexOf(v) < 0) admises[f].push(v);
      var libelle = b.querySelector('[data-libelle]');
      libelles[f][v] = libelle ? libelle.textContent : b.textContent;
    });

    function lireAdresse() {
      var p = new URLSearchParams(window.location.search);
      var e = { q: (p.get('q') || '').trim() };
      FILTRES.forEach(function (f) {
        var v = p.get(f) || '';
        e[f] = admises[f].indexOf(v) >= 0 ? v : '';
      });
      return e;
    }

    var etat = lireAdresse();

    function ecrireAdresse() {
      var p = new URLSearchParams();
      PARAMETRES.forEach(function (cle) { if (etat[cle]) p.set(cle, etat[cle]); });
      var requete = p.toString();
      window.history.replaceState(null, '', window.location.pathname + (requete ? '?' + requete : '') + window.location.hash);
    }

    function correspond(carte, e, mots) {
      if (e.theme && carte.theme !== e.theme) return false;
      if (e.type && carte.type !== e.type) return false;
      if (e.public && carte.publics.indexOf(e.public) < 0) return false;
      if (e.niveau && carte.niveau !== e.niveau) return false;
      for (var i = 0; i < mots.length; i++) {
        if (carte.texte.indexOf(mots[i]) < 0) return false;
      }
      return true;
    }

    function compter(e, mots) {
      var n = 0;
      cartes.forEach(function (c) { if (correspond(c, e, mots)) n++; });
      return n;
    }

    function pluriel(n, mot) { return n + ' ' + mot + (n > 1 ? 's' : ''); }

    function appliquer(ecrire) {
      var mots = motsDe(etat.q);
      var affichees = 0;
      cartes.forEach(function (c) {
        var ok = correspond(c, etat, mots);
        c.li.hidden = !ok;
        if (ok) affichees++;
      });

      // Boutons : état pressé et nombre de résultats si on choisissait cette option.
      boutons.forEach(function (b) {
        var f = b.getAttribute('data-filtre');
        var v = b.getAttribute('data-valeur');
        b.setAttribute('aria-pressed', String(etat[f] === v));
        var nb = b.querySelector('.filtre-nb');
        if (nb && !b.disabled) {
          var essai = {};
          PARAMETRES.forEach(function (cle) { essai[cle] = etat[cle]; });
          essai[f] = v;
          nb.textContent = compter(essai, mots);
        }
      });

      var actifs = [];
      FILTRES.forEach(function (f) { if (etat[f]) actifs.push(libelles[f][etat[f]]); });
      if (etat.q) actifs.push('« ' + etat.q + ' »');
      if (compteur) {
        compteur.innerHTML = '';
        var fort = document.createElement('b');
        fort.textContent = String(affichees);
        compteur.appendChild(fort);
        var reste = (affichees > 1 ? ' contenus affichés' : ' contenu affiché');
        compteur.appendChild(document.createTextNode(reste + (actifs.length ? ' · ' + actifs.join(' · ') : '')));
      }
      if (vide) vide.hidden = affichees > 0;
      if (ouvrir) {
        var nbFiltres = FILTRES.filter(function (f) { return etat[f]; }).length;
        var marque = ouvrir.querySelector('[data-filtres-actifs]');
        if (marque) marque.textContent = nbFiltres ? pluriel(nbFiltres, 'actif') : '';
      }
      if (ecrire) ecrireAdresse();
    }

    boutons.forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-filtre');
        var v = b.getAttribute('data-valeur');
        // Un second clic sur l'option choisie la retire.
        etat[f] = (etat[f] === v) ? '' : v;
        appliquer(true);
      });
    });

    if (champ) {
      champ.value = etat.q;
      champ.addEventListener('input', function () {
        etat.q = champ.value.trim();
        appliquer(true);
      });
    }
    if (formulaire) {
      formulaire.addEventListener('submit', function (evenement) {
        evenement.preventDefault();
        if (champ) etat.q = champ.value.trim();
        appliquer(true);
      });
    }
    if (effacer) {
      effacer.hidden = false;
      effacer.addEventListener('click', function (evenement) {
        evenement.preventDefault();
        PARAMETRES.forEach(function (cle) { etat[cle] = ''; });
        if (champ) champ.value = '';
        appliquer(true);
      });
    }
    if (ouvrir && panneau) {
      ouvrir.addEventListener('click', function () {
        var ouvert = ouvrir.getAttribute('aria-expanded') !== 'true';
        ouvrir.setAttribute('aria-expanded', String(ouvert));
        panneau.classList.toggle('ouvert', ouvert);
      });
    }

    if (panneau) panneau.hidden = false;
    appliquer(false);
  }

  /* ---------- mode projection (DESIGN.md § 6) : interrupteur et touche P ---------- */

  function projection() {
    var interrupteurs = tous('[data-projection]');
    if (!interrupteurs.length) return;

    function actif() { return html.getAttribute('data-mode') === 'projection'; }

    function regler(etat) {
      if (etat) html.setAttribute('data-mode', 'projection');
      else html.removeAttribute('data-mode');
      interrupteurs.forEach(function (b) { b.setAttribute('aria-pressed', String(etat)); });
    }

    interrupteurs.forEach(function (b) {
      b.hidden = false;
      b.addEventListener('click', function () { regler(!actif()); });
    });

    document.addEventListener('keydown', function (evenement) {
      if (evenement.key !== 'p' && evenement.key !== 'P') return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey || evenement.defaultPrevented) return;
      var cible = evenement.target;
      if (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))) return;
      if (html.classList.contains('projeter-ouvert')) return;
      evenement.preventDefault();
      regler(!actif());
    });
  }

  function demarrer() {
    titreEvolutif();
    catalogue();
    projection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
}());
