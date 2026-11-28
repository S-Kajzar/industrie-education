// outils/construire.py sur des dépôts factices (lot 1e) : une erreur de contenu (nom de collection réservé, type,
// thème ou public inconnu, identifiant en double ou différent du dossier, fichier autonome invalide) retient seulement
// la fiche, ou la collection, avec un message clair dans l'état de la publication ; le reste du site se construit,
// sans lien vers ce qui est retenu. Une erreur de code (gabarit cassé) arrête la construction. Umami et l'indexation
// suivent site.json.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { DEPOT, depotFactice, construire, site } = require('./outils');

const collection = (titre) => ({ titre, theme: 'mecanique', publics: ['si'], description: 'Collection factice.' });
const contenu = (id, autres = {}) => ({ id, titre: `Contenu ${id}`, type: 'cours', niveau: 1, description: 'Contenu factice pour les tests.', mode: 'natif', ...autres });
const REPRIS = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>Repris</title>\n'
  + '<meta name="description" content="Contenu repris factice.">\n</head>\n<body>\n<h1>Repris</h1>\n</body>\n</html>\n';

// Pages du site public (le back-office /admin/ en est exclu : ni Umami, ni règles du site public).
function pagesHtml(dossier) {
  return fs.readdirSync(dossier, { recursive: true }).filter((f) => f.endsWith('.html') && !f.startsWith(`admin${path.sep}`))
    .map((f) => path.join(dossier, f));
}

function avecDepot(modifier, verifier, env) {
  const racine = depotFactice(modifier);
  try {
    verifier(construire(racine, env), racine);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
}

const lireEtat = (racine) => JSON.parse(fs.readFileSync(path.join(racine, '_site', 'admin', 'etat.json'), 'utf8'));

// [nom, modification, fiche retenue (état), message attendu, page qui ne doit pas exister]
const RETENUES = [
  ['nom de collection réservé (catalogue)', (ecrire) => {
    ecrire('contenus/catalogue/collection.json', collection('Catalogue'));
  }, 'contenus/catalogue/collection.json', /Nom de collection réservé : « catalogue » \(contenus\/catalogue\/\)/, null],
  ['nom de collection réservé (thème)', (ecrire) => {
    ecrire('contenus/mecanique/collection.json', collection('Mécanique'));
    ecrire('contenus/mecanique/levier/contenu.json', contenu('levier'));
    ecrire('contenus/mecanique/levier/index.html', '<p>Levier.</p>\n');
  }, 'contenus/mecanique/collection.json', /Nom de collection réservé : « mecanique »/, 'mecanique/levier/'],
  ['nom de collection réservé (dossier technique « _ »)', (ecrire) => {
    ecrire('contenus/_/collection.json', collection('Technique'));
  }, 'contenus/_/collection.json', /Nom de collection réservé : « _ »/, null],
  ['type inconnu', (ecrire) => {
    ecrire('contenus/essai/un/contenu.json', contenu('un', { type: 'tp' }));
  }, 'contenus/essai/un/contenu.json', /Type inconnu « tp » dans contenus\/essai\/un\/contenu\.json/, 'essai/un/'],
  ['public inconnu (collection)', (ecrire) => {
    ecrire('contenus/essai/collection.json', { ...collection('Essai'), publics: ['si', 'seconde'] });
  }, 'contenus/essai/collection.json', /Public inconnu « seconde » dans contenus\/essai\/collection\.json/, 'essai/'],
  ['public inconnu (contenu)', (ecrire) => {
    ecrire('contenus/essai/deux/contenu.json', contenu('deux', { publics: ['cap'] }));
  }, 'contenus/essai/deux/contenu.json', /Public inconnu « cap » dans contenus\/essai\/deux\/contenu\.json/, 'essai/deux/'],
  ['thème inconnu', (ecrire) => {
    ecrire('contenus/essai/collection.json', { ...collection('Essai'), theme: 'chimie' });
  }, 'contenus/essai/collection.json', /Thème inconnu « chimie »/, 'essai/un/'],
  ['identifiant en double', (ecrire) => {
    ecrire('contenus/autre/collection.json', collection('Autre'));
    ecrire('contenus/autre/un/contenu.json', contenu('un'));
    ecrire('contenus/autre/un/index.html', '<p>Doublon.</p>\n');
  }, 'contenus/essai/un/contenu.json', /Identifiant en double : « un » est déjà celui de contenus\/autre\/un\/contenu\.json/, 'essai/un/'],
  ['identifiant différent du dossier', (ecrire) => {
    ecrire('contenus/essai/trois/contenu.json', contenu('quatre'));
  }, 'contenus/essai/trois/contenu.json', /L’identifiant « quatre » de contenus\/essai\/trois\/contenu\.json doit être le nom de son dossier/, 'essai/trois/'],
  ['contenu repris sans balise <body> explicite', (ecrire) => {
    ecrire('contenus/essai/trois/contenu.json', contenu('trois', { mode: 'repris' }));
    ecrire('contenus/essai/trois/index.html', '<!DOCTYPE html>\n<title>Sans corps</title>\n<p>Texte.</p>\n');
  }, 'contenus/essai/trois/contenu.json', /contenus\/essai\/trois\/index\.html : document incomplet : une seule balise <body> attendue/, 'essai/trois/'],
  ['description trop courte', (ecrire) => {
    ecrire('contenus/essai/deux/contenu.json', contenu('deux', { description: 'Trop court.' }));
  }, 'contenus/essai/deux/contenu.json', /Champ « description » trop court dans contenus\/essai\/deux\/contenu\.json : 11 caractères, 20 au moins/, 'essai/deux/'],
  ['fiche illisible (JSON invalide)', (ecrire) => {
    ecrire('contenus/essai/deux/contenu.json', '{ "id": "deux", ');
  }, 'contenus/essai/deux/contenu.json', /JSON invalide dans contenus\/essai\/deux\/contenu\.json, ligne 1/, 'essai/deux/'],
];

for (const [nom, modifier, fiche, message, absente] of RETENUES) {
  test(`erreur de contenu, fiche retenue, le reste du site se construit : ${nom}`, () => {
    avecDepot(modifier, (resultat, racine) => {
      expect(resultat.status, resultat.stdout + resultat.stderr).toBe(0);
      const etat = lireEtat(racine);
      const retenue = etat.a_corriger.fiches_retenues.find((r) => r.fiche === fiche);
      expect(retenue, JSON.stringify(etat.a_corriger.fiches_retenues)).toBeTruthy();
      expect(retenue.erreurs.map((e) => e.message).join('\n')).toMatch(message);
      for (const e of retenue.erreurs) {
        expect(e.champ.trim(), 'champ de /admin/ à corriger').not.toBe('');
        expect(e.correction.trim(), 'correction en une phrase').not.toBe('');
      }
      expect(resultat.stdout).toContain('Fiches retenues, non publiées');
      // Le reste se construit ; la fiche retenue n'a pas de page, n'est pas dans le sitemap et n'est liée nulle part.
      const sortie = path.join(racine, '_site');
      expect(fs.existsSync(path.join(sortie, 'index.html'))).toBe(true);
      expect(fs.existsSync(path.join(sortie, 'catalogue', 'index.html'))).toBe(true);
      if (absente) {
        expect(fs.existsSync(path.join(sortie, absente, 'index.html')), absente).toBe(false);
        expect(fs.readFileSync(path.join(sortie, 'sitemap.xml'), 'utf8')).not.toContain(`${site.base}${absente}<`);
        for (const page of pagesHtml(sortie)) {
          expect(fs.readFileSync(page, 'utf8'), page).not.toMatch(new RegExp(`href="(?:\\.\\./|\\./)*${absente}"`));
        }
      }
    });
  });
}

test('« à la une » : un contenu introuvable n’est pas affiché, il est signalé, la construction continue', () => {
  avecDepot((ecrire) => ecrire('catalogue/a-la-une.json', ['un', 'deux', 'absent']), (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    const autres = lireEtat(racine).a_corriger.autres;
    expect(autres.map((a) => a.message).join('\n')).toMatch(/« absent » n’est pas un contenu publié/);
    expect(autres.map((a) => a.message).join('\n')).toMatch(/La une affiche 2 contenus ; il en faut de 3 à 6/);
  });
});

test('erreur de code simulée (gabarit cassé) : la construction s’arrête, rien n’est publié, le résumé le dit', () => {
  const gabarits = fs.mkdtempSync(path.join(os.tmpdir(), 'gabarits-casses-'));
  fs.cpSync(path.join(DEPOT, 'gabarits'), gabarits, { recursive: true });
  fs.writeFileSync(path.join(gabarits, 'collection.html'), '{% extends "base.html" %}{% block corps %}{{ variable_inconnue }}{% endblock %}\n');
  const resume = path.join(gabarits, 'resume.md');
  try {
    const racine = depotFactice();
    try {
      const { spawnSync } = require('node:child_process');
      const r = spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine, '--sortie',
        path.join(racine, '_site'), '--resume', resume], { encoding: 'utf8', env: { ...process.env, INDUSTRIE_GABARITS: gabarits } });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('variable_inconnue');
      expect(fs.existsSync(path.join(racine, '_site', 'index.html'))).toBe(false);
      expect(fs.readFileSync(resume, 'utf8')).toMatch(/^## À corriger\n\n\*\*Publication arrêtée\.\*\*/);
    } finally {
      fs.rmSync(racine, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(gabarits, { recursive: true, force: true });
  }
});

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

// Mentions légales complètes : condition pour ouvrir le site aux moteurs (lot 1c).
const MENTIONS = {
  editeur: { nom: 'Éditeur d’essai', adresse: '', directeur_publication: 'Directeur d’essai' }, contact: 'contact@exemple.test',
};

test('indexable : robots.txt ouvert avec le sitemap, plus de noindex', () => {
  avecDepot((ecrire) => {
    const site = JSON.parse(fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8'));
    ecrire('site.json', { ...site, ...MENTIONS, indexable: true });
  }, (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    const robots = fs.readFileSync(path.join(racine, '_site', 'robots.txt'), 'utf8');
    expect(robots).toMatch(/^Allow: \/$/m);
    // Seul le back-office reste interdit aux moteurs.
    expect(robots.match(/^Disallow:.*$/gm)).toEqual([`Disallow: ${site.base}admin/`]);
    expect(robots).toContain(`Sitemap: ${site.origine}${site.base}sitemap.xml`);
    for (const page of pagesHtml(path.join(racine, '_site'))) expect(fs.readFileSync(page, 'utf8'), page).not.toContain('noindex');
  });
});

test('umami_script : adresse https complète exigée ; l’adresse donnée remplace celle par défaut', () => {
  const IDENTIFIANT = '0f3c4b5a-1234-4cde-9abc-0123456789ab';
  const reglages = () => JSON.parse(fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8'));
  for (const mauvaise of ['http://cloud.umami.is/script.js', 'cloud.umami.is/script.js', 'https://']) {
    avecDepot((ecrire) => ecrire('site.json', { ...reglages(), umami: IDENTIFIANT, umami_script: mauvaise }), (resultat) => {
      expect(resultat.status, mauvaise).toBe(1);
      expect(resultat.stderr).toContain('« umami_script » doit être l’adresse complète du script Umami, en https://');
    });
  }
  avecDepot((ecrire) => ecrire('site.json', { ...reglages(), umami: IDENTIFIANT, umami_script: 'https://eu.umami.exemple/script.js' }), (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(fs.readFileSync(path.join(racine, '_site', 'index.html'), 'utf8'))
      .toContain(`<script defer src="https://eu.umami.exemple/script.js" data-website-id="${IDENTIFIANT}"></script>`);
  });
});

test('fiche en ligne devenue invalide (--precedent) : retirée du site et signalée comme telle', () => {
  avecDepot((ecrire) => {
    ecrire('contenus/essai/deux/contenu.json', contenu('deux', { notions: ['notion-inconnue'] }));
    ecrire('etat-en-ligne.json', { format: 1, publiees: ['essai/deux/', 'essai/un/'] });
  }, (resultat, racine) => {
    const { spawnSync } = require('node:child_process');
    const resume = path.join(racine, 'resume.md');
    const r = spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine, '--sortie',
      path.join(racine, '_site'), '--precedent', path.join(racine, 'etat-en-ligne.json'), '--resume', resume], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    const [retenue] = lireEtat(racine).a_corriger.fiches_retenues;
    expect(retenue).toMatchObject({ fiche: 'contenus/essai/deux/contenu.json', etait_en_ligne: true });
    expect(fs.existsSync(path.join(racine, '_site', 'essai', 'deux'))).toBe(false);
    expect(fs.readFileSync(resume, 'utf8')).toMatch(/« Contenu deux »\*\* \(`contenus\/essai\/deux\/contenu\.json`\)\. \*\*Retirée du site\*\* : elle était en ligne\./);
    // Sans état précédent, la même fiche est seulement retenue.
    expect(construire(racine).status).toBe(0);
    expect(lireEtat(racine).a_corriger.fiches_retenues[0].etait_en_ligne).toBe(false);
  });
});
