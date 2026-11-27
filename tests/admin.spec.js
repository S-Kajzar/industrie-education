// Back-office /admin/ (lot 1d, TRAME § 9) : Sveltia CMS servi par le site.
//   - admin/config.yml : rubriques, chemins existants, aucune clé de données oubliée, listes fermées identiques à
//     celles de la construction, données au format du back-office ;
//   - _site/admin/ : copié depuis le paquet npm, hors du site public (noindex, sitemap, robots.txt, aucun lien) ;
//   - dans le navigateur, sans GitHub (appels extérieurs bloqués) : script servi par le site, écran de connexion en
//     français, aucune erreur JavaScript, configuration acceptée par le validateur du paquet lui-même ;
//   - en mode « dépôt local » (tests/depot-local.js) : chaque fiche s'ouvre, un enregistrement ne change que le champ
//     modifié, une annale se dépose depuis un téléphone, un fichier de plus de 5 Mo est refusé.
// Un vrai enregistrement sur GitHub (API GraphQL) n'est pas joignable depuis les tests : recette de Sébastien.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');
const { test, expect } = require('@playwright/test');
const {
  DEPOT, SITE, site, themes, publics, annales, pagesConstruites, fichierDePage, depotFactice, construire, lireJSON,
} = require('./outils');
const { configuration, fichiersGeres, formater, aAligner } = require('../outils/format-donnees');
const { fichiersDuDepot, preparerDepotLocal, lireDepotLocal, listerDepotLocal } = require('./depot-local');

const SOURCE = fs.readFileSync(path.join(DEPOT, 'admin', 'config.yml'), 'utf8');
const CONFIG = configuration();
const collection = (nom) => CONFIG.collections.find((c) => c.name === nom);
const champ = (champs, nom) => champs.find((c) => c.name === nom);
const options = (c) => c.options.map((o) => (typeof o === 'object' ? o.value : o));

// Listes fermées de la construction, lues dans le code lui-même.
const CONSTANTES = JSON.parse(spawnSync('python3', ['-c', [
  'import json, sys', `sys.path.insert(0, ${JSON.stringify(path.join(DEPOT, 'outils'))})`, 'import construire as c',
  'import annale as a',
  'print(json.dumps({"types": list(c.TYPES), "niveaux": list(c.NIVEAUX), "licences": list(c.LICENCES),'
  + ' "statuts": list(c.STATUTS), "identifiant": c.IDENTIFIANT.pattern, "licences_annale": list(a.LICENCES_ANNALE),'
  + ' "a_venir": list(c.A_VENIR), "taille_max": a.TAILLE_MAX, "reserves": list(c.NOMS_RESERVES)}))',
].join('\n')], { encoding: 'utf8' }).stdout);

// Clés techniques volontairement non modifiables dans le back-office (champs cachés, recopiés tels quels).
const TECHNIQUES = {
  contenus: ['mode', 'source'],
  reglages: ['nom', 'base', 'origine', 'hebergeur'],
};

// --------------------------------------------------------------------------------------------------------------
test.describe('admin/config.yml', () => {
  test('commence par le lien vers son schéma ; YAML sans erreur', () => {
    expect(SOURCE.split('\n')[0]).toBe('# yaml-language-server: $schema=https://unpkg.com/@sveltia/cms/schema/sveltia-cms.json');
    expect(YAML.parseDocument(SOURCE, { merge: true }).errors.map((e) => e.message)).toEqual([]);
  });

  test('GitHub, ce dépôt, branche main, connexion par jeton seulement, commits directs et en français', () => {
    expect(CONFIG.backend).toMatchObject({ name: 'github', repo: 'S-Kajzar/industrie-education', branch: 'main', auth_methods: ['token'] });
    expect(CONFIG.backend.skip_ci).toBeUndefined();
    expect(CONFIG.publish_mode).toBeUndefined();
    const messages = CONFIG.backend.commit_messages;
    expect(Object.keys(messages).sort()).toEqual(['create', 'delete', 'deleteMedia', 'update', 'uploadMedia']);
    expect(messages.update).toBe('{{collection}} : mise à jour de {{slug}}');
    for (const m of Object.values(messages)) expect(m).toMatch(/ : (création|mise à jour|suppression|ajout) de /);
  });

  test('rubriques dans l’ordre, chacune avec sa ligne d’aide ; Accueil avec « à la une » et « à venir »', () => {
    expect(CONFIG.collections.map((c) => c.label))
      .toEqual(['Annales', 'Contenus', 'Images et crédits', 'Accueil', 'Notions', 'Thèmes', 'Réglages du site']);
    for (const c of CONFIG.collections) expect(c.description, c.label).toBeTruthy();
    expect(collection('accueil').files.map((f) => f.name)).toEqual(['a-la-une', 'a-venir']);
  });

  test('chaque rubrique et chaque dossier de médias pointe vers un fichier ou un dossier existant', () => {
    const existe = (rel, dossier) => {
      const cible = path.join(DEPOT, rel.replace(/^\//, ''));
      return fs.existsSync(cible) && fs.statSync(cible)[dossier ? 'isDirectory' : 'isFile']();
    };
    for (const c of CONFIG.collections) {
      if (c.folder) expect(existe(c.folder, true), c.folder).toBe(true);
      if (c.file) expect(existe(c.file, false), c.file).toBe(true);
      for (const f of c.files || []) expect(existe(f.file, false), f.file).toBe(true);
    }
    expect(existe(CONFIG.media_folder, true)).toBe(true);
    for (const a of CONFIG.asset_collections) expect(existe(a.media_folder, true), a.media_folder).toBe(true);
    expect(CONFIG.asset_collections.map((a) => a.media_folder)).toEqual(['medias/cartes', 'medias/illustrations', 'medias/depots']);
    (function parcourir(champs) {
      for (const c of champs) {
        if (c.media_folder) expect(existe(c.media_folder, true), c.media_folder).toBe(true);
        if (c.fields) parcourir(c.fields);
      }
    }(CONFIG.collections.flatMap((c) => [...(c.fields || []), ...(c.files || []).flatMap((f) => f.fields)])));
  });

  test('aucune clé des fichiers de données n’est absente de la configuration ; clés techniques en champs cachés', () => {
    const oubliees = [];
    const verifier = (objet, champs, ou) => {
      for (const [cle, v] of Object.entries(objet)) {
        const c = champ(champs, cle);
        if (!c) { oubliees.push(`${ou} : « ${cle} »`); continue; }
        if (c.widget === 'object' && c.fields && v && typeof v === 'object') verifier(v, c.fields, `${ou} › ${cle}`);
        if (c.widget === 'list' && c.fields && Array.isArray(v)) v.forEach((x) => verifier(x, c.fields, `${ou} › ${cle}`));
      }
    };
    for (const [fichier, champs, liste] of fichiersGeres(CONFIG)) {
      const donnees = lireJSON(fichier);
      for (const objet of liste ? donnees : [donnees]) verifier(objet, champs, fichier);
    }
    expect(oubliees, 'clés perdues au premier enregistrement').toEqual([]);
    const caches = (champs) => champs.filter((c) => c.widget === 'hidden').map((c) => c.name);
    expect(caches(collection('contenus').fields)).toEqual(TECHNIQUES.contenus);
    expect(caches(collection('reglages').files[0].fields)).toEqual(TECHNIQUES.reglages);
    // Les fichiers modifiés par le back-office le sont chacun par une seule rubrique.
    const fichiers = fichiersGeres(CONFIG).map(([f]) => f);
    expect(new Set(fichiers).size).toBe(fichiers.length);
  });

  test('listes fermées identiques à celles de outils/construire.py, outils/annale.py et catalogue/', () => {
    const a = collection('annales').fields;
    const c = collection('contenus').fields;
    expect(options(champ(c, 'type'))).toEqual(CONSTANTES.types);
    expect(options(champ(c, 'niveau'))).toEqual(CONSTANTES.niveaux);
    expect(options(champ(c, 'statut'))).toEqual(CONSTANTES.statuts);
    expect(options(champ(a, 'statut'))).toEqual(CONSTANTES.statuts);
    expect(options(champ(a, 'publics'))).toEqual(publics.map((p) => p.id));
    expect(options(champ(a, 'theme'))).toEqual(themes.map((t) => t.id));
    expect(options(champ(champ(a, 'source').fields, 'licence'))).toEqual(CONSTANTES.licences_annale);
    expect(options(champ(collection('credits').fields, 'licence'))).toEqual(CONSTANTES.licences);
    expect(collection('accueil').files.find((f) => f.name === 'a-venir').fields.map((f) => f.name)).toEqual(CONSTANTES.a_venir);
    for (const champs of [a, c, collection('notions').fields]) {
      expect(new RegExp(champ(champs, 'id').pattern[0]).source).toBe(new RegExp(CONSTANTES.identifiant).source);
      expect(champ(champs, 'id').pattern[1]).toMatch(/^Minuscules sans accent/);
    }
    // Notions choisies dans la liste de catalogue/notions.json (rubrique « Notions »).
    for (const champs of [a, c]) {
      expect(champ(champs, 'notions')).toMatchObject({ widget: 'relation', collection: 'notions', value_field: 'id', multiple: true });
    }
    expect(collection('notions').file).toBe('catalogue/notions.json');
    // Statut sans valeur par défaut pour les contenus : Sveltia l'appliquerait aussi aux fiches existantes.
    expect(champ(c, 'statut').default).toBeUndefined();
    expect(champ(a, 'statut').default).toBe('brouillon');
  });

  test('médias : mêmes dossiers, 5 Mo comme outils/annale.py, ni banques d’images ni transformations', () => {
    expect(CONFIG.media_libraries.default.config.max_file_size).toBe(CONSTANTES.taille_max);
    expect(CONFIG.media_libraries.stock_assets).toBe(false);
    expect(JSON.stringify(CONFIG)).not.toMatch(/transformations|pexels|pixabay|unsplash|translator/i);
    const fichier = champ(collection('annales').fields, 'fichier');
    expect(fichier).toMatchObject({ widget: 'file', choose_url: false, media_folder: '/medias/depots' });
    expect(fichier.accept.split(',')).toContain('.html');
  });

  test('adresse du site et liens « Afficher sur le site en ligne » accordés à site.json (à revoir à la bascule)', () => {
    expect(CONFIG.site_url).toBe(`${site.origine}${site.base}`);
    const base = site.base.replace(/^\//, '');
    for (const c of [collection('annales'), collection('contenus')]) expect(c.preview_path.startsWith(base), c.name).toBe(true);
  });

  test('les fichiers de données sont au format du back-office (outils/format-donnees.js)', () => {
    expect(aAligner().map((x) => x.fichier), 'lancer « node outils/format-donnees.js --ecrire »').toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------
test.describe('_site/admin/ : construit, hors du site public', () => {
  const ADMIN = path.join(SITE, 'admin');

  test('script et morceaux du paquet (sans .map), traduction, configuration, page', () => {
    for (const f of ['index.html', 'sveltia-cms.js', 'config.yml', 'locales/fr.json', 'LICENSE.txt', 'modules/transliterate/index.js', 'modules/transliterate/license', 'modules/exifr/dist/lite.esm.mjs', 'modules/exifr/LICENSE']) {
      expect(fs.existsSync(path.join(ADMIN, f)), f).toBe(true);
    }
    const morceaux = fs.readdirSync(path.join(ADMIN, 'chunks'), { recursive: true });
    expect(morceaux.filter((f) => f.endsWith('.js')).length).toBeGreaterThan(3);
    expect(fs.readdirSync(ADMIN, { recursive: true }).filter((f) => f.endsWith('.map'))).toEqual([]);
    expect(fs.readFileSync(path.join(ADMIN, 'config.yml'), 'utf8')).toBe(SOURCE);
    const page = fs.readFileSync(path.join(ADMIN, 'index.html'), 'utf8');
    expect(page).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(page).toContain('<title>Administration — industrie.education</title>');
    expect(page).toContain('<script src="./sveltia-cms.js"></script>');
    expect(page).toContain(`<link rel="cms-config-url" type="application/yaml" href="${site.base}admin/config.yml">`);
    expect(page).not.toMatch(/<script[^>]+src="https?:/);
  });

  test('absent du sitemap, interdit dans robots.txt, jamais lié depuis une page publique', () => {
    expect(fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8')).not.toContain('/admin/');
    expect(fs.readFileSync(path.join(SITE, 'robots.txt'), 'utf8')).toMatch(new RegExp(`^Disallow: ${site.base}admin/$`, 'm'));
    for (const chemin of pagesConstruites()) {
      expect(fs.readFileSync(fichierDePage(chemin), 'utf8'), chemin).not.toMatch(/href="[^"]*admin\/?"/);
    }
  });

  test('la construction s’arrête si le paquet @sveltia/cms manque, avec la marche à suivre', () => {
    const racine = depotFactice();
    try {
      const r = construire(racine, { INDUSTRIE_SVELTIA: path.join(os.tmpdir(), 'paquet-absent') });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('le paquet npm @sveltia/cms est introuvable');
      expect(r.stderr).toContain('npm ci');
    } finally {
      fs.rmSync(racine, { recursive: true, force: true });
    }
  });

  test('admin, classe et compte sont des noms réservés', () => {
    for (const nom of ['admin', 'classe', 'compte']) {
      expect(CONSTANTES.reserves).toContain(nom);
      const racine = depotFactice((ecrire) => ecrire(`contenus/${nom}/collection.json`, {
        titre: 'Essai', theme: 'mecanique', publics: ['si'], description: 'Collection factice.',
      }));
      try {
        const r = construire(racine);
        expect(r.status, nom).toBe(1);
        expect(r.stderr).toContain(`Nom de collection réservé : « ${nom} »`);
      } finally {
        fs.rmSync(racine, { recursive: true, force: true });
      }
    }
  });
});

// --------------------------------------------------------------------------------------------------------------
// Dans le navigateur. Les appels vers un autre hôte que le site sont bloqués (GitHub n'est pas joignable ici).
async function ouvrirAdmin(browser, baseURL, options = {}) {
  const contexte = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 }, ...options });
  const origine = new URL(baseURL).origin;
  await contexte.route((url) => url.origin !== origine, (route) => route.abort());
  const page = await contexte.newPage();
  const exterieures = new Set();
  const erreurs = [];
  page.on('request', (r) => { if (!r.url().startsWith(`${origine}/`) && !/^(data|blob):/.test(r.url())) exterieures.add(new URL(r.url()).host); });
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) erreurs.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto(new URL('admin/', baseURL).href);
  return { contexte, page, exterieures, erreurs, adresse: new URL('admin/', baseURL).href };
}

async function entrerEnLocal(page, fichiers) {
  const bouton = page.getByRole('button', { name: 'Travailler avec un dépôt local' });
  await bouton.waitFor();
  await preparerDepotLocal(page, fichiers);
  await bouton.click();
  await page.waitForURL(/#\/collections/, { timeout: 15_000 });
}

test.describe('/admin/ dans le navigateur', () => {
  test.describe.configure({ timeout: 120_000 });

  test('script servi par le site, connexion en français (navigateur en anglais), aucune erreur JavaScript', async ({ browser, baseURL }) => {
    const scripts = [];
    const { contexte, page, exterieures, erreurs } = await ouvrirAdmin(browser, baseURL);
    page.on('request', (r) => { if (r.resourceType() === 'script') scripts.push(r.url()); });
    await expect(page.getByRole('button', { name: 'Se connecter avec un jeton d’accès' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Propulsé par')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('fr');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Se connecter avec un jeton d’accès' })).toBeVisible({ timeout: 15_000 });
    expect(scripts.some((s) => s === new URL('admin/sveltia-cms.js', baseURL).href)).toBe(true);
    // Seules les polices de l'interface viennent d'ailleurs (jsDelivr) : ni unpkg, ni githubstatus.com.
    expect([...exterieures].filter((h) => h !== 'cdn.jsdelivr.net')).toEqual([]);
    expect(erreurs).toEqual([]);
    await contexte.close();
  });

  test('mode dépôt local : chaque rubrique se remplit, chaque fiche s’ouvre, sans avertissement de configuration', async ({ browser, baseURL }) => {
    const { contexte, page, erreurs, adresse, exterieures } = await ouvrirAdmin(browser, baseURL);
    const avertissements = [];
    page.on('console', (m) => { if (m.type() === 'warning') avertissements.push(m.text()); });
    await entrerEnLocal(page);
    const fiches = [
      ...annales({ toutes: true }).map((a) => `annales/entries/${a.id}`),
      ...fs.readdirSync(path.join(DEPOT, 'contenus'), { recursive: true }).filter((f) => f.endsWith('contenu.json'))
        .map((f) => `contenus/entries/${f.split(path.sep).slice(0, 2).join('/')}/contenu`),
      ...lireJSON('catalogue/notions.json').map((_, i) => `notions/entries/${i}`),
      ...themes.map((_, i) => `themes/entries/${i}`),
      ...lireJSON('medias/CREDITS.json').map((_, i) => `credits/entries/${i}`),
      'accueil/entries/a-la-une', 'accueil/entries/a-venir', 'reglages/entries/reglages',
    ];
    expect(fiches.length).toBeGreaterThan(20);
    for (const fiche of fiches) {
      await page.goto(`${adresse}#/collections/${fiche}`);
      await expect(page.getByRole('button', { name: 'Enregistrer', exact: true }), fiche).toBeVisible();
      await expect(page.locator('section[data-key-path]').first(), fiche).toBeVisible();
    }
    expect(avertissements.filter((a) => /configuration|option|schema/i.test(a))).toEqual([]);
    expect([...exterieures].filter((h) => h !== 'cdn.jsdelivr.net')).toEqual([]);
    expect(erreurs).toEqual([]);
    await contexte.close();
  });

  test('enregistrement : seul le champ modifié change, au format de outils/format-donnees.js', async ({ browser, baseURL }) => {
    const { contexte, page, erreurs, adresse } = await ouvrirAdmin(browser, baseURL, { locale: 'fr-FR' });
    await entrerEnLocal(page);
    const geres = Object.fromEntries(fichiersGeres(CONFIG).map(([f, champs, liste]) => [f, { champs, liste }]));
    const annale = annales({ toutes: true })[0];
    const CAS = [
      [`annales/${annale.id}.json`, `annales/entries/${annale.id}`, 'Durée conseillée (en minutes)', '301', (d) => { d.duree_min = 301; }],
      ['contenus/statique/cadre-velo/contenu.json', 'contenus/entries/statique/cadre-velo/contenu', 'Titre', 'Cadre (essai)', (d) => { d.titre = 'Cadre (essai)'; }],
      ['site.json', 'reglages/entries/reglages', 'Adresse de contact', 'contact@exemple.fr', (d) => { d.contact = 'contact@exemple.fr'; }],
      ['catalogue/notions.json', 'notions/entries/1', 'Libellé affiché', 'Dynamique (essai)', (d) => { d[1].nom = 'Dynamique (essai)'; }],
      ['catalogue/themes.json', 'themes/entries/0', 'Nom court (bandeau des cartes)', 'Méca', (d) => { d[0].court = 'Méca'; }],
      ['catalogue/a-venir.json', 'accueil/entries/a-venir', 'Titre', 'Labo (essai)', (d) => { d.labo.titre = 'Labo (essai)'; }],
    ];
    for (const [fichier, fiche, libelle, valeur, modifier] of CAS) {
      const avant = await lireDepotLocal(page, fichier);
      await page.goto(`${adresse}#/collections/${fiche}`);
      const saisie = page.getByRole('textbox', { name: libelle, exact: true }).or(page.getByRole('spinbutton', { name: libelle, exact: true })).first();
      await saisie.fill(valeur);
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await expect(page.getByText('Entrée enregistrée.')).toBeVisible();
      const donnees = JSON.parse(avant);
      modifier(donnees);
      const attendu = formater(JSON.stringify(donnees), geres[fichier].champs, geres[fichier].liste);
      await expect.poll(() => lireDepotLocal(page, fichier), fichier).toBe(attendu);
    }
    expect(erreurs).toEqual([]);
    await contexte.close();
  });

  test('téléphone : déposer une annale tient dans un formulaire, fichier par téléversement, brouillon par défaut', async ({ browser, baseURL }) => {
    const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'depot-annale-'));
    const sujet = path.join(dossier, 'Sujet Pont Roulant.html');
    fs.writeFileSync(sujet, '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>Sujet</title>\n</head>\n<body>\n<h1>Sujet</h1>\n</body>\n</html>\n');
    const lourd = path.join(dossier, 'trop-lourd.html');
    fs.writeFileSync(lourd, `<!DOCTYPE html>\n<html lang="fr"><head><meta charset="utf-8"><title>x</title></head><body><!-- ${'x'.repeat(CONSTANTES.taille_max)} --></body></html>\n`);
    const { contexte, page, erreurs, adresse, exterieures } = await ouvrirAdmin(browser, baseURL,
      { locale: 'fr-FR', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      await entrerEnLocal(page);
      await page.goto(`${adresse}#/collections/annales/new`);
      const fichier = page.locator('section[data-key-path="fichier"]');
      await expect(fichier).toBeVisible();
      // Aucun champ technique : pas d'adresse ni de chemin à saisir pour le fichier, seulement le téléversement.
      await expect(fichier.getByRole('textbox')).toHaveCount(0);
      await expect(fichier.getByRole('button', { name: 'Parcourir' })).toBeVisible();
      // Plus de 5 Mo : refusé avec un message.
      await fichier.locator('input[type=file]').first().setInputFiles(lourd);
      await expect(page.getByText(/dépasse la taille maximale/)).toBeVisible();
      await page.getByRole('button', { name: 'OK' }).click();
      await page.getByRole('textbox', { name: 'Identifiant (adresse de la page)', exact: true }).fill('pont-roulant-essai');
      await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Pont roulant d’essai');
      await page.getByRole('textbox', { name: 'Présentation', exact: true }).fill('Sujet factice déposé depuis un téléphone.');
      await fichier.locator('input[type=file]').first().setInputFiles(sujet);
      await page.getByText('BTS MS', { exact: true }).first().click();
      await page.getByText('Mécanique et conception', { exact: true }).first().click();
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await expect(page.getByText('Entrée enregistrée.')).toBeVisible();
      expect(await listerDepotLocal(page, 'medias/depots')).toContain('sujet-pont-roulant.html');
      const fiche = JSON.parse(await lireDepotLocal(page, 'annales/pont-roulant-essai.json'));
      expect(fiche).toEqual({
        id: 'pont-roulant-essai', titre: 'Pont roulant d’essai', presentation: 'Sujet factice déposé depuis un téléphone.',
        fichier: '/medias/depots/sujet-pont-roulant.html', publics: ['bts-ms'], theme: 'mecanique',
        afficher_origine: false, statut: 'brouillon',
      });
      // Noms de fichiers nettoyés (translittération servie par le site) : aucun autre hôte que les polices.
      expect([...exterieures].filter((h) => h !== 'cdn.jsdelivr.net')).toEqual([]);
      expect(erreurs).toEqual([]);
    } finally {
      await contexte.close();
      fs.rmSync(dossier, { recursive: true, force: true });
    }
  });

  test('notions : le champ propose les libellés de catalogue/notions.json', async ({ browser, baseURL }) => {
    const { contexte, page, adresse } = await ouvrirAdmin(browser, baseURL, { locale: 'fr-FR' });
    await entrerEnLocal(page);
    const annale = annales({ toutes: true })[0];
    await page.goto(`${adresse}#/collections/annales/entries/${annale.id}`);
    const notions = page.locator('section[data-key-path="notions"]');
    const noms = Object.fromEntries(lireJSON('catalogue/notions.json').map((n) => [n.id, n.nom]));
    for (const id of annale.notions) await expect(notions.getByText(noms[id], { exact: true })).toBeVisible();
    await notions.getByRole('combobox').first().click();
    const proposees = await page.getByRole('option').allInnerTexts();
    const restantes = Object.entries(noms).filter(([id]) => !annale.notions.includes(id)).map(([, nom]) => nom);
    for (const nom of restantes) expect(proposees.join('\n')).toContain(nom);
    await contexte.close();
  });
});
