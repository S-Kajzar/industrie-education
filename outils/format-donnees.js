#!/usr/bin/env node
// Format des fichiers de données modifiés par le back-office (lot 1d), tel que Sveltia CMS les écrit avec
// admin/config.yml : JSON indenté de 2 espaces, listes et objets développés, clés dans l'ordre des champs de la
// configuration, champ facultatif vide (null, "", [], {}) non écrit, objet dont tous les sous-champs sont vides non
// écrit (même obligatoire), retour à la ligne final. Les champs cachés (widget hidden) sont recopiés tels quels.
//
// Aligner les fichiers du dépôt sur ce format évite qu'un premier enregistrement depuis le back-office ne produise un
// diff sans rapport avec la modification. tests/admin.spec.js vérifie que les fichiers sont alignés, et qu'un
// enregistrement réel par Sveltia (mode « dépôt local ») ne change que le champ modifié.
//
// Usage : node outils/format-donnees.js           # liste les fichiers à aligner (code 1 s'il y en a)
//         node outils/format-donnees.js --ecrire  # les réécrit
//         node outils/format-donnees.js --fiches F…  # aligne ces fiches d'annale ou de contenu, d'un dépôt
//                                                   # quelconque (outils/importer.py, lot 1e)
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const DEPOT = path.resolve(__dirname, '..');

function configuration(depot = DEPOT) {
  return YAML.parse(fs.readFileSync(path.join(depot, 'admin', 'config.yml'), 'utf8'), { merge: true });
}

const estObjet = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const vide = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length) || (estObjet(v) && !Object.keys(v).length);

// Une valeur de champ, puis l'objet complet, mis au format du back-office.
function valeur(champ, v) {
  if (champ.widget === 'object' && champ.fields && estObjet(v)) return canonique(v, champ.fields);
  if (champ.widget === 'list' && champ.fields && Array.isArray(v)) return v.map((x) => (estObjet(x) ? canonique(x, champ.fields) : x));
  return v;
}

function canonique(donnees, champs) {
  const sortie = {};
  for (const champ of champs) {
    if (!Object.hasOwn(donnees, champ.name)) continue;
    if (champ.widget === 'hidden') {
      sortie[champ.name] = donnees[champ.name];
      continue;
    }
    const v = valeur(champ, donnees[champ.name]);
    if ((champ.required === false || champ.widget === 'object') && vide(v)) continue;
    sortie[champ.name] = v;
  }
  return sortie;
}

// Fichiers modifiables par le back-office et champs de leur rubrique : [chemin relatif, champs, racine en liste].
function fichiersGeres(config, depot = DEPOT) {
  const collection = (nom) => config.collections.find((c) => c.name === nom);
  const fichierDe = (nom, fichier) => collection(nom).files.find((f) => f.name === fichier);
  const liste = [];
  const json = (dossier) => (fs.existsSync(path.join(depot, dossier))
    ? fs.readdirSync(path.join(depot, dossier)).filter((f) => f.endsWith('.json')).map((f) => `${dossier}/${f}`) : []);
  for (const f of json('annales')) liste.push([f, collection('annales').fields, false]);
  for (const c of fs.readdirSync(path.join(depot, 'contenus'), { withFileTypes: true }).filter((d) => d.isDirectory())) {
    for (const d of fs.readdirSync(path.join(depot, 'contenus', c.name), { withFileTypes: true }).filter((x) => x.isDirectory())) {
      const f = `contenus/${c.name}/${d.name}/contenu.json`;
      if (fs.existsSync(path.join(depot, f))) liste.push([f, collection('contenus').fields, false]);
    }
  }
  for (const nom of ['notions', 'themes']) liste.push([collection(nom).file, collection(nom).fields, true]);
  for (const [nom, fichier] of [['accueil', 'a-la-une'], ['accueil', 'a-venir'], ['reglages', 'reglages']]) {
    const f = fichierDe(nom, fichier);
    liste.push([f.file, f.fields, false]);
  }
  return liste;
}

function formater(texte, champs, racineListe) {
  const donnees = JSON.parse(texte);
  const sortie = racineListe ? donnees.map((x) => canonique(x, champs)) : canonique(donnees, champs);
  return `${JSON.stringify(sortie, null, 2)}\n`;
}

function aAligner(depot = DEPOT) {
  const config = configuration(depot);
  return fichiersGeres(config, depot).map(([fichier, champs, racineListe]) => {
    const texte = fs.readFileSync(path.join(depot, fichier), 'utf8');
    return { fichier, texte, attendu: formater(texte, champs, racineListe) };
  }).filter(({ texte, attendu }) => texte !== attendu);
}

// Fiche d'annale (…/annales/<id>.json) ou de contenu (…/contenus/<collection>/<id>/contenu.json), alignée seule.
function alignerFiche(chemin, config = configuration()) {
  const nom = /(^|[\\/])annales[\\/][^\\/]+\.json$/.test(chemin) ? 'annales' : 'contenus';
  const champs = config.collections.find((c) => c.name === nom).fields;
  const texte = fs.readFileSync(chemin, 'utf8');
  const attendu = formater(texte, champs, false);
  if (attendu !== texte) fs.writeFileSync(chemin, attendu);
}

if (require.main === module && process.argv.includes('--fiches')) {
  const config = configuration();
  for (const fiche of process.argv.slice(process.argv.indexOf('--fiches') + 1)) alignerFiche(path.resolve(fiche), config);
} else if (require.main === module) {
  const ecrire = process.argv.includes('--ecrire');
  const liste = aAligner();
  for (const { fichier, attendu } of liste) {
    if (ecrire) fs.writeFileSync(path.join(DEPOT, fichier), attendu);
    console.log(`${ecrire ? 'aligné' : 'à aligner'} : ${fichier}`);
  }
  if (!liste.length) console.log('Tous les fichiers de données sont au format du back-office.');
  process.exitCode = !ecrire && liste.length ? 1 : 0;
}

module.exports = { configuration, canonique, fichiersGeres, formater, aAligner, alignerFiche };
