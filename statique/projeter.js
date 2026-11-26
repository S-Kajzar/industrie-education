/* industrie.education — projeter.js
   Calque plein écran « Projeter » : QR code de la page (au moins 60 % de la hauteur de l'écran), adresse lisible,
   bouton « Copier le lien », fermeture par Échap, focus piégé dans le calque.
   La bibliothèque QR (lib/qrcode.js, licence MIT) est copiée dans le site et chargée à la première ouverture
   seulement. Aucune requête vers un tiers, aucun stockage.
   Sans JavaScript, le bouton « Projeter » est un lien vers la page Enseignants (rubrique Projeter). */
(function () {
  'use strict';

  var html = document.documentElement;
  var script = document.currentScript;
  var dossier = script && script.src ? script.src.replace(/[^\/]*$/, '') : '';
  var calque = null;
  var declencheur = null;
  var attente = null;
  var rendusInertes = [];

  function adresse() {
    return window.location.href.split('#')[0];
  }

  function chargerQR(suite) {
    if (window.qrcode) { suite(); return; }
    if (attente) { attente.push(suite); return; }
    attente = [suite];
    var balise = document.createElement('script');
    balise.src = dossier + 'lib/qrcode.js';
    balise.onload = function () {
      var file = attente;
      attente = null;
      file.forEach(function (f) { f(); });
    };
    balise.onerror = function () {
      attente = null;
      message('QR code indisponible : utilisez l’adresse ci-dessus.');
    };
    document.head.appendChild(balise);
  }

  // Dessine le QR code en SVG : un carré par module noir, une marge de 4 modules (zone de silence).
  function svgQR(texte) {
    var qrcode = window.qrcode;
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }
    var qr = qrcode(0, 'M');
    qr.addData(texte);
    qr.make();
    var n = qr.getModuleCount();
    var marge = 4;
    var chemin = '';
    for (var ligne = 0; ligne < n; ligne++) {
      for (var colonne = 0; colonne < n; colonne++) {
        if (qr.isDark(ligne, colonne)) chemin += 'M' + (colonne + marge) + ' ' + (ligne + marge) + 'h1v1h-1z';
      }
    }
    var cote = n + 2 * marge;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + cote + ' ' + cote + '" shape-rendering="crispEdges"'
      + ' aria-hidden="true" focusable="false" data-modules="' + n + '"><path fill="currentColor" d="' + chemin + '"/></svg>';
  }

  function message(texte) {
    if (calque) calque.querySelector('[data-etat]').textContent = texte;
  }

  function construire() {
    calque = document.createElement('div');
    calque.className = 'projeter';
    calque.setAttribute('role', 'dialog');
    calque.setAttribute('aria-modal', 'true');
    calque.setAttribute('aria-labelledby', 'projeter-titre');
    calque.hidden = true;
    calque.innerHTML =
      '<h2 class="projeter-titre" id="projeter-titre">Scanner pour ouvrir cette page</h2>'
      + '<div class="projeter-qr" role="img" aria-label="QR code de l’adresse de cette page" data-qr></div>'
      + '<p class="projeter-adresse" data-adresse></p>'
      + '<div class="projeter-actions">'
      + '<button type="button" class="btn-jaune" data-copier>Copier le lien</button>'
      + '<button type="button" class="btn-contour" data-fermer>Fermer <span aria-hidden="true">(Échap)</span></button>'
      + '</div>'
      + '<p class="projeter-etat" data-etat aria-live="polite"></p>';
    document.body.appendChild(calque);
    calque.querySelector('[data-copier]').addEventListener('click', copier);
    calque.querySelector('[data-fermer]').addEventListener('click', fermer);
  }

  function focusables() {
    return Array.prototype.slice.call(calque.querySelectorAll('button:not([disabled])'));
  }

  // Écoute en phase de capture : Échap et Tab sont traités ici, avant les raccourcis propres au contenu.
  function clavier(evenement) {
    if (!calque || calque.hidden) return;
    if (evenement.key === 'Escape' || evenement.key === 'Esc') {
      evenement.preventDefault();
      evenement.stopPropagation();
      fermer();
      return;
    }
    if (evenement.key !== 'Tab') return;
    var liste = focusables();
    var premier = liste[0];
    var dernier = liste[liste.length - 1];
    var actuel = document.activeElement;
    if (!calque.contains(actuel)) {
      evenement.preventDefault();
      premier.focus();
    } else if (evenement.shiftKey && actuel === premier) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && actuel === dernier) {
      evenement.preventDefault();
      premier.focus();
    }
    evenement.stopPropagation();
  }

  function retenirFocus(evenement) {
    if (calque && !calque.hidden && !calque.contains(evenement.target)) focusables()[0].focus();
  }

  function ouvrir(evenement) {
    if (evenement) evenement.preventDefault();
    if (!calque) construire();
    declencheur = document.activeElement;
    var lien = adresse();
    calque.querySelector('[data-adresse]').textContent = lien.replace(/^https?:\/\//, '');
    calque.querySelector('[data-qr]').innerHTML = '';
    message('');
    // Le reste de la page devient inerte tant que le calque est ouvert.
    rendusInertes = Array.prototype.slice.call(document.body.children).filter(function (el) {
      return el !== calque && !el.hasAttribute('inert');
    });
    rendusInertes.forEach(function (el) { el.setAttribute('inert', ''); });
    calque.hidden = false;
    html.classList.add('projeter-ouvert');
    document.addEventListener('keydown', clavier, true);
    document.addEventListener('focusin', retenirFocus, true);
    calque.querySelector('[data-copier]').focus();
    chargerQR(function () {
      if (!calque.hidden) calque.querySelector('[data-qr]').innerHTML = svgQR(lien);
    });
  }

  function fermer() {
    if (!calque || calque.hidden) return;
    calque.hidden = true;
    html.classList.remove('projeter-ouvert');
    rendusInertes.forEach(function (el) { el.removeAttribute('inert'); });
    rendusInertes = [];
    document.removeEventListener('keydown', clavier, true);
    document.removeEventListener('focusin', retenirFocus, true);
    if (declencheur && declencheur.focus) declencheur.focus();
  }

  function copierAncien(texte) {
    var zone = document.createElement('textarea');
    zone.value = texte;
    zone.setAttribute('readonly', '');
    zone.className = 'visuellement-cache';
    calque.appendChild(zone);
    zone.select();
    var reussi = false;
    try { reussi = document.execCommand('copy'); } catch (erreur) { reussi = false; }
    calque.removeChild(zone);
    calque.querySelector('[data-copier]').focus();
    message(reussi ? 'Lien copié.' : 'Copie impossible : sélectionnez l’adresse ci-dessus.');
  }

  function copier() {
    var lien = adresse();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(lien).then(function () { message('Lien copié.'); }, function () { copierAncien(lien); });
    } else {
      copierAncien(lien);
    }
  }

  document.addEventListener('click', function (evenement) {
    var cible = evenement.target;
    var lien = cible && cible.closest ? cible.closest('[data-projeter]') : null;
    if (lien) ouvrir(evenement);
  });
}());
