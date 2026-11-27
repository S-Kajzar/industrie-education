// Outils partagés par les tests : données du dépôt, pages attendues (TRAME § 3), pages construites, dépôt factice.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

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

// État de la publication écrit par la construction (lot 1e) : pages des fiches publiées, fiches retenues, etc.
// Une fiche « relu » retenue pour une erreur de contenu n'est pas publiée : les tests ne l'attendent pas.
const etat = () => JSON.parse(fs.readFileSync(path.join(SITE, 'admin', 'etat.json'), 'utf8'));
const publiee = (chemin) => etat().publiees.includes(chemin);

const contenus = () => collections().flatMap((c) => c.contenus).filter((c) => c.statut !== 'brouillon' && publiee(c.chemin));

// Fiches d'annales (à plat annales/<id>.json ou en dossier annales/<id>/annale.json) ; publiées = statut « relu » et
// non retenues par la construction.
function annales({ toutes = false } = {}) {
  const dossier = path.join(DEPOT, 'annales');
  if (!fs.existsSync(dossier)) return [];
  const fiches = [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    try {
      if (e.isDirectory()) fiches.push(lireJSON(`annales/${e.name}/annale.json`));
      else if (e.name.endsWith('.json')) fiches.push(lireJSON(`annales/${e.name}`));
    } catch { /* fiche illisible : la construction la signale et ne la publie pas */ }
  }
  return fiches.map((a) => ({ ...a, chemin: `annales/${a.id}/`, type: 'annale' }))
    .filter((a) => toutes || (a.statut === 'relu' && publiee(a.chemin)));
}

// Toutes les cartes du catalogue : contenus publiés puis annales publiées.
const cartesCatalogue = () => [...contenus(), ...annales()];

// Un thème est actif s'il a au moins un contenu ou une annale publiés ; sinon il n'a pas de page (« Bientôt »).
const themeActif = (id) => cartesCatalogue().some((c) => c.theme === id);
const themesActifs = () => themes.filter((t) => themeActif(t.id));

// Pages de TRAME § 3 (sauf « annale », lot 2) : [adresse relative à la base, gabarit].
function pagesAttendues() {
  const pages = [['', 'accueil'], ['catalogue/', 'catalogue']];
  for (const p of publics) pages.push([`${p.id}/`, 'liste']);
  for (const t of themesActifs()) pages.push([`${t.id}/`, 'liste']);
  for (const c of collections()) {
    pages.push([`${c.id}/`, 'collection']);
    for (const x of c.contenus) pages.push([x.chemin, x.mode === 'repris' ? 'contenu repris' : 'contenu']);
  }
  pages.push(['annales/', 'annales']);
  for (const p of publics) pages.push([`annales/${p.id}/`, 'annales']);
  for (const a of annales()) pages.push([a.chemin, 'annale']);
  for (const s of ['labo/', 'maquettes/']) pages.push([s, 'vitrine-section']);
  for (const s of ['enseignants/', 'partenaires/', 'a-propos/', 'mentions-legales/', 'credits/', '404.html']) pages.push([s, 'service']);
  return pages;
}

// Toutes les pages HTML du site public écrites dans _site/ (adresses relatives à la base). Le back-office /admin/
// en est exclu : les règles du site public (requêtes, poids, h1…) ne s'y appliquent pas (tests/admin.spec.js).
function pagesConstruites() {
  const pages = [];
  (function parcourir(dossier, prefixe) {
    for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!(prefixe === '' && ['_', 'admin'].includes(e.name))) parcourir(path.join(dossier, e.name), `${prefixe}${e.name}/`);
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
      id, titre: `Contenu ${id}`, type: 'cours', niveau: 1, description: 'Contenu factice pour les tests.', mode: 'natif',
    });
    ecrire(`contenus/essai/${id}/index.html`, '<p>Contenu factice.</p>\n');
  }
  ecrire('catalogue/a-la-une.json', ['un', 'deux', 'trois']);
  if (modifier) modifier(ecrire, racine);
  return racine;
}

// Sert un site construit (dossier quelconque) comme GitHub Pages, le temps d'un test : { adresse, arreter }.
async function servirSite(dossier, port) {
  const processus = spawn(process.execPath, [path.join(__dirname, 'serveur.js')], {
    env: { ...process.env, PORT: String(port), DOSSIER_SITE: dossier }, stdio: 'ignore',
  });
  const adresse = `http://127.0.0.1:${port}${site.base}`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(adresse)).status) break; } catch { await new Promise((r) => setTimeout(r, 50)); }
  }
  return { adresse, arreter: () => processus.kill() };
}

// Styles calculés de chaque élément du corps d'une page, pièces de l'enveloppe exclues (garde-fou « aucun style du
// fichier autonome n'est écrasé ») ; « apres » permet d'agir sur la page avant le relevé (ex. choisir un mode).
const PROPRIETES_RELEVEES = ['display', 'position', 'visibility', 'boxSizing', 'color', 'backgroundColor', 'fontFamily',
  'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textDecorationLine', 'textTransform', 'textAlign',
  'whiteSpace', 'listStyleType', 'marginTop', 'marginBottom', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderLeftWidth', 'borderLeftColor', 'minHeight', 'cursor',
  'opacity', 'zIndex'];

async function stylesDuCorps(browser, adresse, apres) {
  const contexte = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await contexte.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(adresse);
  if (apres) await apres(page);
  const styles = await page.evaluate((proprietes) => [...document.body.querySelectorAll('*')]
    .filter((e) => !e.closest('.enveloppe-tete, .enveloppe-pied, .enveloppe-fiche, .enveloppe-ancre'))
    .map((e) => {
      const s = getComputedStyle(e);
      return `${e.tagName}.${typeof e.className === 'string' ? e.className : ''} ${proprietes.map((p) => s[p]).join('|')}`;
    }), PROPRIETES_RELEVEES);
  await contexte.close();
  return styles;
}

function construire(racine, env = {}) {
  return spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine,
    '--sortie', path.join(racine, '_site')], { encoding: 'utf8', env: { ...process.env, ...env } });
}

module.exports = {
  DEPOT, SITE, site, themes, publics, collections, contenus, annales, etat, cartesCatalogue, themeActif, themesActifs, pagesAttendues,
  pagesConstruites, fichierDePage, estRepris, estAutonome, depotFactice, construire, servirSite, stylesDuCorps, lireJSON,
};
