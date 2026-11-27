#!/usr/bin/env node
// Contrôle 20/20 des annales AVANT la construction (lot 1e) : pour chaque fichier d'annale du dépôt (relue,
// brouillon, nouvelle version en attente), une copie entièrement juste doit obtenir 20/20 dans les deux modes, sans
// erreur JavaScript (outils/annale-parfaite.js). Le fichier source est ouvert tel quel, dans Chromium (Playwright).
//
// Le résultat est écrit en JSON ; outils/construire.py le lit (--verifications) : une annale relue qui échoue est
// retenue, sans bloquer le reste du site ; pour un brouillon ou une nouvelle version, c'est un avertissement. Ce
// contrôle ne fait donc jamais échouer la publication par lui-même ; seule une panne du navigateur l'arrête.
//
// Usage : node outils/verifier-annales.js [--racine DÉPÔT] [--sortie .cache/verifications.json]
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('@playwright/test');
const { MODES, verifierCopie, fichiersAnnales } = require('./annale-parfaite');

function option(nom, defaut) {
  const i = process.argv.indexOf(nom);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

async function principal() {
  const racine = path.resolve(option('--racine', path.join(__dirname, '..')));
  const sortie = path.resolve(option('--sortie', path.join(racine, '.cache', 'verifications.json')));
  const fichiers = fichiersAnnales(racine);
  const resultats = {};
  const navigateur = await chromium.launch();
  try {
    for (const { fichier, fiche, statut } of fichiers) {
      const erreurs = [];
      for (const [mode, libelle] of Object.entries(MODES)) {
        const contexte = await navigateur.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris' });
        // Fichier autonome : aucune requête vers l'extérieur pendant le contrôle.
        await contexte.route(/^https?:\/\//, (route) => route.abort());
        const page = await contexte.newPage();
        page.setDefaultTimeout(15_000);
        const js = [];
        page.on('pageerror', (e) => js.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') js.push(m.text()); });
        page.on('dialog', (d) => d.accept());
        let problemes;
        try {
          await page.goto(pathToFileURL(path.join(racine, fichier)).href);
          problemes = await verifierCopie(page, mode);
        } catch (erreur) {
          problemes = [`fichier impossible à ouvrir : ${String(erreur.message || erreur).split('\n')[0]}`];
        }
        problemes.push(...js.map((e) => `erreur JavaScript : ${e.slice(0, 200)}`));
        erreurs.push(...problemes.map((p) => `mode ${libelle} : ${p}`));
        await contexte.close();
      }
      resultats[fichier] = { ok: erreurs.length === 0, fiche, statut, erreurs: erreurs.slice(0, 20) };
      console.log(`${erreurs.length ? '✗' : '✓'} ${fichier} (${statut}) : ${erreurs.length ? `${erreurs.length} problème(s)` : '20/20 dans les deux modes'}`);
      for (const e of erreurs.slice(0, 5)) console.log(`    ${e}`);
    }
  } finally {
    await navigateur.close();
  }
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, `${JSON.stringify({ format: 1, resultats }, null, 2)}\n`);
  console.log(`Contrôle 20/20 : ${fichiers.length} fichier(s), résultats dans ${path.relative(process.cwd(), sortie) || sortie}.`);
}

principal().catch((erreur) => {
  console.error(`Contrôle 20/20 impossible : ${erreur.message || erreur}`);
  process.exit(1);
});
