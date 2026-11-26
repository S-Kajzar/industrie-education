// outils/construire.py sur des dépôts factices : la construction s'arrête avec un message clair sur un nom de
// collection réservé, un type, un thème ou un public inconnu, un identifiant en double, un contenu de
// a-la-une.json introuvable ; Umami et l'indexation suivent site.json.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { DEPOT, depotFactice, construire, site } = require('./outils');

const collection = (titre) => ({ titre, theme: 'mecanique', publics: ['si'], description: 'Collection factice.' });
const contenu = (id, autres = {}) => ({ id, titre: `Contenu ${id}`, type: 'cours', niveau: 1, description: 'Contenu factice.', mode: 'natif', ...autres });
const REPRIS = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>Repris</title>\n'
  + '<meta name="description" content="Contenu repris factice.">\n</head>\n<body>\n<h1>Repris</h1>\n</body>\n</html>\n';

function pagesHtml(dossier) {
  return fs.readdirSync(dossier, { recursive: true }).filter((f) => f.endsWith('.html')).map((f) => path.join(dossier, f));
}

function avecDepot(modifier, verifier) {
  const racine = depotFactice(modifier);
  try {
    verifier(construire(racine), racine);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
}

const ECHECS = [
  ['nom de collection réservé (catalogue)', (ecrire) => {
    ecrire('contenus/catalogue/collection.json', collection('Catalogue'));
  }, /Nom de collection réservé : « catalogue » \(contenus\/catalogue\/\)/],
  ['nom de collection réservé (thème)', (ecrire) => {
    ecrire('contenus/mecanique/collection.json', collection('Mécanique'));
  }, /Nom de collection réservé : « mecanique »/],
  ['nom de collection réservé (dossier technique « _ »)', (ecrire) => {
    ecrire('contenus/_/collection.json', collection('Technique'));
  }, /Nom de collection réservé : « _ »/],
  ['type inconnu', (ecrire) => {
    ecrire('contenus/essai/un/contenu.json', contenu('un', { type: 'tp' }));
  }, /Type inconnu « tp » dans contenus\/essai\/un\/contenu\.json/],
  ['public inconnu (collection)', (ecrire) => {
    ecrire('contenus/essai/collection.json', { ...collection('Essai'), publics: ['si', 'seconde'] });
  }, /Public inconnu « seconde » dans contenus\/essai\/collection\.json/],
  ['public inconnu (contenu)', (ecrire) => {
    ecrire('contenus/essai/deux/contenu.json', contenu('deux', { publics: ['cap'] }));
  }, /Public inconnu « cap » dans contenus\/essai\/deux\/contenu\.json/],
  ['thème inconnu', (ecrire) => {
    ecrire('contenus/essai/collection.json', { ...collection('Essai'), theme: 'chimie' });
  }, /Thème inconnu « chimie »/],
  ['identifiant en double', (ecrire) => {
    ecrire('contenus/autre/collection.json', collection('Autre'));
    ecrire('contenus/autre/un/contenu.json', contenu('un'));
    ecrire('contenus/autre/un/index.html', '<p>Doublon.</p>\n');
  }, /Identifiant en double : « un » \(contenus\/autre\/un\/contenu\.json et contenus\/essai\/un\/contenu\.json\)/],
  ['identifiant différent du dossier', (ecrire) => {
    ecrire('contenus/essai/trois/contenu.json', contenu('quatre'));
  }, /L’identifiant « quatre » de contenus\/essai\/trois\/contenu\.json doit être le nom de son dossier/],
  ['contenu de a-la-une.json introuvable', (ecrire) => {
    ecrire('catalogue/a-la-une.json', ['un', 'deux', 'absent']);
  }, /Contenu de catalogue\/a-la-une\.json introuvable : « absent »/],
  ['contenu repris sans balise <body> explicite', (ecrire) => {
    ecrire('contenus/essai/trois/contenu.json', contenu('trois', { mode: 'repris' }));
    ecrire('contenus/essai/trois/index.html', '<!DOCTYPE html>\n<title>Sans corps</title>\n<p>Texte.</p>\n');
  }, /contenus\/essai\/trois\/index\.html : document incomplet : une seule balise <body> attendue/],
];

for (const [nom, modifier, message] of ECHECS) {
  test(`la construction s’arrête : ${nom}`, () => {
    avecDepot(modifier, (resultat, racine) => {
      expect(resultat.status, resultat.stdout + resultat.stderr).toBe(1);
      expect(resultat.stderr).toMatch(/^Construction arrêtée : /);
      expect(resultat.stderr).toMatch(message);
      expect(fs.existsSync(path.join(racine, '_site', 'index.html'))).toBe(false);
    });
  });
}

test('le dépôt factice, sans erreur, se construit', () => {
  avecDepot(null, (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(fs.existsSync(path.join(racine, '_site', 'essai', 'un', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(racine, '_site', '_', 'commun.css'))).toBe(true);
  });
});

test('Umami : script inséré sur chaque page, contenus repris compris, quand site.json donne un identifiant', () => {
  const IDENTIFIANT = '0f3c4b5a-1234-4cde-9abc-0123456789ab';
  avecDepot((ecrire) => {
    const site = JSON.parse(fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8'));
    ecrire('site.json', { ...site, umami: IDENTIFIANT });
    ecrire('contenus/essai/trois/contenu.json', contenu('trois', { mode: 'repris' }));
    ecrire('contenus/essai/trois/index.html', REPRIS);
  }, (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    const pages = pagesHtml(path.join(racine, '_site'));
    expect(pages.length).toBeGreaterThan(20);
    const balise = `<script defer src="https://cloud.umami.is/script.js" data-website-id="${IDENTIFIANT}"></script>`;
    for (const page of pages) expect(fs.readFileSync(page, 'utf8'), page).toContain(balise);
  });
});

test('indexable : robots.txt ouvert avec le sitemap, plus de noindex', () => {
  avecDepot((ecrire) => {
    const site = JSON.parse(fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8'));
    ecrire('site.json', { ...site, indexable: true });
  }, (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    const robots = fs.readFileSync(path.join(racine, '_site', 'robots.txt'), 'utf8');
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow/m);
    expect(robots).toContain(`Sitemap: ${site.origine}${site.base}sitemap.xml`);
    for (const page of pagesHtml(path.join(racine, '_site'))) expect(fs.readFileSync(page, 'utf8'), page).not.toContain('noindex');
  });
});
