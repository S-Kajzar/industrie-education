// Outils partagés par les tests : données du dépôt, pages attendues (TRAME § 3), pages construites, dépôt factice.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEPOT = path.resolve(__dirname, '..');
const SITE = path.join(DEPOT, '_site');

const lireJSON = (fichier) => JSON.parse(fs.readFileSync(path.join(DEPOT, fichier), 'utf8'));
const site = lireJSON('site.json');
const themes = lireJSON('catalogue/themes.json');
const publics = lireJSON('catalogue/publics.json');

function sousDossiers(dossier) {
  return fs.readdirSync(dossier, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

// Collections et contenus tels que décrits dans contenus/ (sources, pas le site construit).
function collections() {
  return sousDossiers(path.join(DEPOT, 'contenus')).map((id) => {
    const collection = lireJSON(`contenus/${id}/collection.json`);
    return {
      id,
      ...collection,
      contenus: sousDossiers(path.join(DEPOT, 'contenus', id)).map((c) => {
        const contenu = lireJSON(`contenus/${id}/${c}/contenu.json`);
        // Thème et publics hérités de la collection, sauf surcharge (TRAME § 5).
        return { ...contenu, theme: contenu.theme || collection.theme, publics: contenu.publics || collection.publics,
          collection: id, chemin: `${id}/${c}/` };
      }),
    };
  });
}

const contenus = () => collections().flatMap((c) => c.contenus).filter((c) => c.statut !== 'brouillon');

// Fiches d'annales (à plat annales/<id>.json ou en dossier annales/<id>/annale.json) ; publiées = statut « relu ».
function annales({ toutes = false } = {}) {
  const dossier = path.join(DEPOT, 'annales');
  if (!fs.existsSync(dossier)) return [];
  const fiches = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) fiches.push(lireJSON(`annales/${e.name}/annale.json`));
    else if (e.name.endsWith('.json')) fiches.push(lireJSON(`annales/${e.name}`));
  }
  return fiches.filter((a) => toutes || a.statut === 'relu').map((a) => ({ ...a, chemin: `annales/${a.id}/`, type: 'annale' }));
}

// Toutes les cartes du catalogue : contenus publiés puis annales publiées.
const cartesCatalogue = () => [...contenus(), ...annales()];

// Pages de TRAME § 3 (sauf « annale », lot 2) : [adresse relative à la base, gabarit].
function pagesAttendues() {
  const pages = [['', 'accueil'], ['catalogue/', 'catalogue']];
  for (const p of publics) pages.push([`${p.id}/`, 'liste']);
  for (const t of themes) pages.push([`${t.id}/`, 'liste']);
  for (const c of collections()) {
    pages.push([`${c.id}/`, 'collection']);
    for (const x of c.contenus) pages.push([x.chemin, x.mode === 'repris' ? 'contenu repris' : 'contenu']);
  }
  pages.push(['annales/', 'annales']);
  for (const p of publics) pages.push([`annales/${p.id}/`, 'annales']);
  for (const a of annales()) pages.push([a.chemin, 'annale']);
  for (const s of ['enseignants/', 'partenaires/', 'a-propos/', 'mentions-legales/', 'credits/', '404.html']) pages.push([s, 'service']);
  return pages;
}

// Toutes les pages HTML écrites dans _site/ (adresses relatives à la base).
function pagesConstruites() {
  const pages = [];
  (function parcourir(dossier, prefixe) {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!(prefixe === '' && e.name === '_')) parcourir(path.join(dossier, e.name), `${prefixe}${e.name}/`);
      } else if (e.name.endsWith('.html')) {
        pages.push(e.name === 'index.html' ? prefixe : prefixe + e.name);
      }
    }
  }(SITE, ''));
  return pages.sort();
}

const fichierDePage = (chemin) => path.join(SITE, chemin.endsWith('.html') ? chemin : `${chemin}index.html`);
const estRepris = (chemin) => contenus().some((c) => c.chemin === chemin && (c.mode === 'repris' || c.fichier));
// Fichier autonome publié tel quel (contenu repris ou annale) : exclu de la limite de 1 Mo (TRAME § 8).
const estAutonome = (chemin) => estRepris(chemin) || annales().some((a) => a.chemin === chemin);

// Dépôt factice minimal (site.json et catalogue/ du vrai dépôt, une collection « essai » de trois contenus natifs),
// modifiable par une fonction avant la construction.
function depotFactice(modifier) {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'industrie-education-'));
  const ecrire = (fichier, donnees) => {
    const cible = path.join(racine, fichier);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.writeFileSync(cible, typeof donnees === 'string' ? donnees : `${JSON.stringify(donnees, null, 2)}\n`);
  };
  ecrire('site.json', fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8'));
  fs.cpSync(path.join(DEPOT, 'catalogue'), path.join(racine, 'catalogue'), { recursive: true });
  ecrire('contenus/essai/collection.json', {
    titre: 'Essai', theme: 'mecanique', publics: ['si'], description: 'Collection factice.',
  });
  for (const id of ['un', 'deux', 'trois']) {
    ecrire(`contenus/essai/${id}/contenu.json`, {
      id, titre: `Contenu ${id}`, type: 'cours', niveau: 1, description: 'Contenu factice.', mode: 'natif',
    });
    ecrire(`contenus/essai/${id}/index.html`, '<p>Contenu factice.</p>\n');
  }
  ecrire('catalogue/a-la-une.json', ['un', 'deux', 'trois']);
  if (modifier) modifier(ecrire, racine);
  return racine;
}

function construire(racine) {
  return spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine,
    '--sortie', path.join(racine, '_site')], { encoding: 'utf8' });
}

module.exports = {
  DEPOT, SITE, site, themes, publics, collections, contenus, annales, cartesCatalogue, pagesAttendues,
  pagesConstruites, fichierDePage, estRepris, estAutonome, depotFactice, construire, lireJSON,
};
