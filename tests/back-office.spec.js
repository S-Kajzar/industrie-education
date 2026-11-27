// Back-office Pages CMS (.pages.yml, TRAME § 9) : configuration valide selon le schéma de Pages CMS lui-même,
// chemins existants, listes fermées synchronisées avec les données, une rubrique par collection, aucun champ des
// données oublié dans les fichiers enregistrés en entier.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const YAML = require('yaml');
const { test, expect } = require('@playwright/test');
const { DEPOT, themes, publics, lireJSON } = require('./outils');

const SOURCE = fs.readFileSync(path.join(DEPOT, '.pages.yml'), 'utf8');
const DOCUMENT = YAML.parseDocument(SOURCE, { strict: false, prettyErrors: false });
const CONFIG = DOCUMENT.toJSON();

// Listes fermées de la construction (outils/construire.py), lues dans le code lui-même.
const CONSTANTES = JSON.parse(spawnSync('python3', ['-c', [
  'import json, sys', `sys.path.insert(0, ${JSON.stringify(path.join(DEPOT, 'outils'))})`, 'import construire as c',
  'import annale as a',
  'print(json.dumps({"types": list(c.TYPES), "niveaux": [str(n) for n in c.NIVEAUX], "licences": list(c.LICENCES),'
  + ' "statuts": list(c.STATUTS), "identifiant": c.IDENTIFIANT.pattern, "licences_annale": list(a.LICENCES_ANNALE),'
  + ' "a_venir": list(c.A_VENIR)}))',
].join('\n')], { encoding: 'utf8' }).stdout);

// Champ avec sa définition de composant fusionnée, comme le fait Pages CMS (resolveComponent).
function resoudre(champ) {
  const def = champ.component ? CONFIG.components[champ.component] : {};
  const resolu = { ...def, ...champ, type: def.type || champ.type };
  delete resolu.component;
  if (resolu.fields) resolu.fields = resolu.fields.map(resoudre);
  return resolu;
}

// Toutes les entrées de contenu (groupes dépliés), champs résolus.
function entrees(liste = CONFIG.content) {
  return liste.flatMap((e) => (e.type === 'group' ? entrees(e.items) : [{ ...e, fields: (e.fields || []).map(resoudre) }]));
}

function champs(entree, nom) {
  return entree.fields.find((f) => f.name === nom);
}

const valeurs = (champ) => champ.options.values.map((v) => (typeof v === 'object' ? String(v.value) : String(v)));

test('.pages.yml est valide selon le schéma de configuration de Pages CMS', async () => {
  expect(DOCUMENT.errors.map((e) => e.message)).toEqual([]);
  const { ConfigSchema } = await import('./pages-cms/config-schema.ts');
  const resultat = ConfigSchema.safeParse(CONFIG);
  expect(resultat.success ? [] : resultat.error.errors.map((e) => `${e.path.join('.')} : ${e.message}`)).toEqual([]);
});

test('rubriques rangées par fréquence d’usage, libellés en français, une ligne d’aide chacune', () => {
  expect(CONFIG.content.map((e) => e.label))
    .toEqual(['Annales', 'Contenus', 'Images et crédits', 'Accueil', 'Notions', 'Thèmes', 'Réglages du site']);
  for (const e of CONFIG.content) expect(e.description, e.label).toBeTruthy();
  expect(CONFIG.media.map((m) => m.input)).toEqual(['medias/cartes', 'medias/illustrations', 'medias/depots']);
  expect(CONFIG.settings.content.merge).toBe(true);
});

test('chemins des rubriques et des médias existants ; médias cités définis', () => {
  for (const m of CONFIG.media) expect(fs.statSync(path.join(DEPOT, m.input)).isDirectory(), m.input).toBe(true);
  const medias = new Set(CONFIG.media.map((m) => m.name));
  for (const e of entrees()) {
    const cible = path.join(DEPOT, e.path);
    if (e.type === 'collection') expect(fs.statSync(cible).isDirectory(), e.path).toBe(true);
    else expect(fs.statSync(cible).isFile(), e.path).toBe(true);
    const parcourir = (liste) => liste.forEach((f) => {
      if (['image', 'file'].includes(f.type)) expect(medias.has(f.options.media), `${e.name}.${f.name}`).toBe(true);
      if (f.fields) parcourir(f.fields);
    });
    parcourir(e.fields);
  }
});

test('listes fermées synchronisées avec les données et la construction', () => {
  const annales = entrees().find((e) => e.name === 'annales');
  const contenus = entrees().filter((e) => e.name.startsWith('contenus-'));
  const credits = entrees().find((e) => e.name === 'credits');
  const idsThemes = themes.map((t) => t.id);
  const idsPublics = publics.map((p) => p.id);

  expect(valeurs(champs(annales, 'theme'))).toEqual(idsThemes);
  expect(valeurs(champs(annales, 'publics'))).toEqual(idsPublics);
  expect(valeurs(champs(annales, 'statut'))).toEqual(CONSTANTES.statuts);
  for (const e of contenus) {
    expect(valeurs(champs(e, 'type')), e.name).toEqual(CONSTANTES.types);
    expect(valeurs(champs(e, 'niveau')), e.name).toEqual(CONSTANTES.niveaux);
    expect(valeurs(champs(e, 'statut')), e.name).toEqual(CONSTANTES.statuts);
  }
  expect(valeurs(champs(credits, 'licence'))).toEqual(CONSTANTES.licences);
  // Source des annales : licences de outils/annale.py.
  const source = champs(annales, 'source');
  expect(source.fields.map((f) => f.name)).toEqual(['editeur', 'url', 'licence', 'reference_autorisation']);
  expect(valeurs(source.fields.find((f) => f.name === 'licence'))).toEqual(CONSTANTES.licences_annale);
  // Labo et Maquettes : les deux sections attendues par la construction.
  const aVenir = entrees().find((e) => e.name === 'a-venir');
  expect(aVenir.fields.map((f) => f.name)).toEqual(CONSTANTES.a_venir);
  expect(Object.keys(lireJSON('catalogue/a-venir.json'))).toEqual(CONSTANTES.a_venir);
  // Notions : identifiant au même format que la construction ; Umami : adresse https.
  expect(champs(entrees().find((e) => e.name === 'notions'), 'id').pattern.regex).toBe(CONFIG.components.identifiant.pattern.regex);
  const script = champs(entrees().find((e) => e.name === 'reglages'), 'umami_script');
  expect(new RegExp(script.pattern.regex).test(lireJSON('site.json').umami_script)).toBe(true);
  expect(new RegExp(script.pattern.regex).test('http://cloud.umami.is/script.js')).toBe(false);
  // Identifiants imposés en minuscules, sans accent, avec des tirets : même règle que la construction.
  expect(new RegExp(CONFIG.components.identifiant.pattern.regex).source).toBe(new RegExp(CONSTANTES.identifiant).source);
  for (const e of [annales, ...contenus]) expect(champs(e, 'id').pattern.regex, e.name).toBe(CONFIG.components.identifiant.pattern.regex);
});

test('le statut d’un contenu n’a pas de valeur par défaut (une fiche existante ne passe jamais en brouillon)', () => {
  // Pages CMS applique la valeur par défaut aux champs absents d'une fiche existante : un défaut « brouillon »
  // dépublierait un contenu existant au premier enregistrement.
  for (const e of entrees().filter((x) => x.name.startsWith('contenus-'))) {
    expect(champs(e, 'statut').default, e.name).toBeUndefined();
  }
  expect(champs(entrees().find((e) => e.name === 'annales'), 'afficher_origine').default).toBe(false);
});

test('une sous-rubrique « Contenus » par collection de contenus/', () => {
  const collections = fs.readdirSync(path.join(DEPOT, 'contenus'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => `contenus/${d.name}`).sort();
  const groupe = CONFIG.content.find((e) => e.name === 'contenus');
  expect(groupe.items.map((i) => i.path).sort(), 'ajouter la sous-rubrique de la collection dans .pages.yml').toEqual(collections);
  for (const item of groupe.items) {
    expect(item.label).toBe(lireJSON(`${item.path}/collection.json`).titre);
    expect(item.exclude).toContain('collection.json');
    expect(item.view.node).toBe('contenu.json');
    expect(item.filename).toBe('{fields.id}.json');
  }
});

test('fichiers enregistrés en entier (listes) : chaque clé des données est un champ du back-office', () => {
  // Pour un fichier dont la racine est une liste, Pages CMS réécrit tout le fichier sans fusion : une clé non
  // déclarée serait perdue au premier enregistrement.
  for (const e of entrees().filter((x) => x.type === 'file' && x.list)) {
    const declares = new Set(e.fields.map((f) => f.name));
    for (const element of lireJSON(e.path)) {
      for (const cle of Object.keys(element)) expect(declares.has(cle), `${e.path} : « ${cle} »`).toBe(true);
    }
  }
});

test('les fiches du back-office arrivent là où la construction les attend', () => {
  const annales = entrees().find((e) => e.name === 'annales');
  expect([annales.path, annales.filename, annales.subfolders]).toEqual(['annales', '{fields.id}.json', false]);
  const media = (nom) => CONFIG.media.find((m) => m.name === nom);
  expect(media(champs(annales, 'fichier').options.media).output).toBe('medias/depots');
  expect(media(champs(annales, 'image').fields.find((f) => f.name === 'fichier').options.media).output).toBe('medias/cartes');
  const accueil = entrees().find((e) => e.name === 'a-la-une');
  expect(Object.keys(lireJSON(accueil.path))).toEqual(['contenus']);
});
