// Sveltia CMS en mode « Travailler avec un dépôt local », sans GitHub : une copie des fichiers du dépôt est placée
// dans le système de fichiers privé du navigateur (OPFS), et le sélecteur de dossier (showDirectoryPicker) la renvoie.
// Sveltia y lit et y écrit les fichiers exactement comme il le ferait dans le dépôt, ce qui permet de vérifier que
// chaque fiche s'ouvre et ce qu'un enregistrement écrit. Ce mode n'est proposé que sur 127.0.0.1 ou localhost.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DEPOT } = require('./outils');

// Fichiers lus ou écrits par le back-office : données, contenus, fiches d'annales et médias.
function fichiersDuDepot(modifier = (f) => f) {
  const liste = [];
  const ajouter = (rel) => liste.push(modifier({ chemin: rel, b64: fs.readFileSync(path.join(DEPOT, rel)).toString('base64') }));
  for (const f of ['site.json', 'medias/CREDITS.json']) ajouter(f);
  for (const d of ['catalogue', 'annales', 'medias/depots', 'medias/cartes', 'medias/illustrations']) {
    for (const f of fs.readdirSync(path.join(DEPOT, d), { recursive: true })) {
      if (fs.statSync(path.join(DEPOT, d, f)).isFile()) ajouter(`${d}/${f}`);
    }
  }
  for (const f of fs.readdirSync(path.join(DEPOT, 'contenus'), { recursive: true })) {
    if (f.endsWith('.json')) ajouter(`contenus/${f}`);
  }
  return liste;
}

async function preparerDepotLocal(page, fichiers = fichiersDuDepot()) {
  await page.evaluate(async (fichiers) => {
    const racine = await navigator.storage.getDirectory();
    for await (const [nom] of racine.entries()) await racine.removeEntry(nom, { recursive: true });
    const depot = await racine.getDirectoryHandle('depot', { create: true });
    await depot.getDirectoryHandle('.git', { create: true });
    for (const { chemin, b64 } of fichiers) {
      const morceaux = chemin.split('/');
      let dossier = depot;
      for (const m of morceaux.slice(0, -1)) dossier = await dossier.getDirectoryHandle(m, { create: true });
      const ecriture = await (await dossier.getFileHandle(morceaux.at(-1), { create: true })).createWritable();
      await ecriture.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
      await ecriture.close();
    }
    window.showDirectoryPicker = async () => depot;
  }, fichiers);
}

async function lireDepotLocal(page, chemin) {
  return page.evaluate(async (chemin) => {
    let dossier = await (await navigator.storage.getDirectory()).getDirectoryHandle('depot');
    const morceaux = chemin.split('/');
    for (const m of morceaux.slice(0, -1)) dossier = await dossier.getDirectoryHandle(m);
    return (await (await dossier.getFileHandle(morceaux.at(-1))).getFile()).text();
  }, chemin);
}

async function listerDepotLocal(page, chemin) {
  return page.evaluate(async (chemin) => {
    let dossier = await (await navigator.storage.getDirectory()).getDirectoryHandle('depot');
    for (const m of chemin.split('/').filter(Boolean)) dossier = await dossier.getDirectoryHandle(m);
    const noms = [];
    for await (const [nom, h] of dossier.entries()) noms.push(nom + (h.kind === 'directory' ? '/' : ''));
    return noms.sort();
  }, chemin);
}

module.exports = { fichiersDuDepot, preparerDepotLocal, lireDepotLocal, listerDepotLocal };
