// « Annale parfaite » (lot 1c, revu au lot 1e) : chaque annale PUBLIÉE obtient 20/20 avec une copie entièrement
// juste, en mode entraînement comme en mode examen, sans erreur JavaScript, sur sa page enveloppée par le site.
//
// Le même contrôle a déjà tourné sur le fichier source avant la construction (outils/verifier-annales.js) : une annale
// relue qui échouait a été retenue, et un brouillon n'a reçu qu'un avertissement. Aucun brouillon n'est donc testé ici
// comme s'il était publié. Si ce test échoue, c'est l'enveloppe du site qui casse une annale : erreur de code.
// Code commun : outils/annale-parfaite.js.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { DEPOT, annales, depotFactice, construire } = require('./outils');
const { MODES, verifierCopie } = require('../outils/annale-parfaite');

test.describe('annale parfaite : 20/20 dans les deux modes, sans erreur JavaScript (annales publiées)', () => {
  for (const annale of annales()) {
    for (const [mode, libelle] of Object.entries(MODES)) {
      test(`${annale.id} — ${libelle}`, async ({ page }) => {
        test.setTimeout(120_000);
        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
        page.on('dialog', (d) => d.accept());
        await page.goto(annale.chemin);
        expect(await verifierCopie(page, mode), 'copie entièrement juste').toEqual([]);
        expect(erreurs, 'erreurs JavaScript').toEqual([]);
      });
    }
  }
});

test('contrôle avant construction : une annale relue sous 20/20 est retenue, un brouillon reçoit un avertissement', () => {
  test.setTimeout(120_000);
  // Fichiers factices sans la configuration du gabarit : une copie juste ne peut pas y obtenir 20/20.
  const autonome = (titre) => `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>${titre}</title>\n`
    + `</head>\n<body>\n<h1>${titre}</h1>\n</body>\n</html>\n`;
  const fiche = (id, statut) => ({
    id, titre: `Annale ${id}`, presentation: 'Sujet factice pour les tests du site.', fichier: `medias/depots/${id}.html`,
    publics: ['si'], theme: 'mecanique', notions: ['statique'], duree_min: 60, statut, mis_a_jour: '2026-11-20',
    source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr' },
  });
  const racine = depotFactice((ecrire) => {
    for (const [id, statut] of [['imparfaite', 'relu'], ['brouillon-imparfait', 'brouillon']]) {
      ecrire(`medias/depots/${id}.html`, autonome(`Annale ${id}`));
      ecrire(`annales/${id}.json`, fiche(id, statut));
    }
  });
  try {
    const verifications = path.join(racine, 'verifications.json');
    const v = spawnSync(process.execPath, [path.join(DEPOT, 'outils', 'verifier-annales.js'), '--racine', racine,
      '--sortie', verifications], { encoding: 'utf8' });
    expect(v.status, v.stdout + v.stderr).toBe(0);
    const resultats = JSON.parse(fs.readFileSync(verifications, 'utf8')).resultats;
    expect(resultats['medias/depots/imparfaite.html'].ok).toBe(false);
    expect(resultats['medias/depots/imparfaite.html'].erreurs.join('\n')).toContain('window.__QCFG__');

    const r = spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine, '--sortie',
      path.join(racine, '_site'), '--verifications', verifications], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    const etat = JSON.parse(fs.readFileSync(path.join(racine, '_site', 'admin', 'etat.json'), 'utf8'));
    const [retenue] = etat.a_corriger.fiches_retenues;
    expect(retenue.fiche).toBe('annales/imparfaite.json');
    expect(retenue.erreurs.map((e) => e.message).join('\n')).toContain('une copie entièrement juste n’obtient pas 20/20');
    expect(retenue.erreurs[0].champ).toBe('Fichier HTML du sujet');
    expect(fs.existsSync(path.join(racine, '_site', 'annales', 'imparfaite'))).toBe(false);
    const [brouillon] = etat.a_corriger.brouillons;
    expect(brouillon.fiche).toBe('annales/brouillon-imparfait.json');
    expect(brouillon.erreurs.map((e) => e.message).join('\n')).toContain('n’obtient pas 20/20');
    // Sans le résultat du contrôle (construction seule), l'annale relue est publiée : c'est la chaîne qui l'exclut.
    expect(construire(racine).status).toBe(0);
    expect(fs.existsSync(path.join(racine, '_site', 'annales', 'imparfaite', 'index.html'))).toBe(true);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
});
