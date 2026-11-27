// « Annale parfaite » (lot 1c) : pour chaque annale déposée, quel que soit son statut, une copie entièrement juste
// obtient 20/20, en mode entraînement comme en mode examen, sans erreur JavaScript. Un échec bloque la publication.
//
// Le test ne modifie pas le fichier : il lit la configuration des questions que le gabarit du projet Claude
// « Exercices interactifs » embarque (window.__QCFG__ : questions et correcteurs ; window.__SKCFG__ : tracés et
// grilles), en déduit la réponse attendue de chaque question, la saisit comme un élève, coche tous les critères de
// la grille de chaque tracé, puis lit la note globale. Annale publiée : la page enveloppée du site ; brouillon : le
// fichier d'origine.
//
// Réponse attendue, par type de correcteur :
//   num      valeur et unité (« 831,888 N ») ;          kw       premier motif de mots-clés (« capteur poids ») ;
//   code     référence attendue (equals, contains) ;    intset   ensemble de numéros (« 301, 303 ») ;
//   yesno    « oui » ou « non » ;                       chasles  relation de composition des vitesses construite
//                                                                avec les trois premiers solides.
// Un type inconnu fait échouer le test avec son nom : il faut alors compléter « candidats » ci-dessous.
'use strict';

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { test, expect } = require('@playwright/test');
const { DEPOT, annales } = require('./outils');

// Réponses possibles pour un correcteur, de la plus naturelle à la plus brute ; la première acceptée est saisie.
function candidats(g) {
  const nombre = (v) => String(v).replace('.', ',');
  switch (g.type) {
    case 'num': {
      const valeur = nombre(g.value);
      if (!g.unit) return [valeur];
      return [`${valeur} ${g.unit.label}`, ...(g.unit.accept || []).map((u) => `${valeur} ${u}`)];
    }
    case 'kw': return (g.any || []).map((motif) => motif.map((variantes) => variantes[0]).join(' '));
    case 'code': return [...(g.equals || []), ...(g.contains || [])];
    case 'intset': return [g.value.join(', ')];
    case 'yesno': return [g.value ? 'oui' : 'non'];
    case 'chasles': {
      const noms = Object.values(g.solids || {}).map((synonymes) => synonymes[0]);
      return noms.length >= 3 ? [`V(${noms[0]}/${noms[2]}) = V(${noms[0]}/${noms[1]}) + V(${noms[1]}/${noms[2]})`] : [];
    }
    default: return [];
  }
}

const AUTONOMES = annales({ toutes: true }).map((a) => ({
  id: a.id,
  statut: a.statut === 'relu' ? 'relu' : 'brouillon',
  chemin: a.chemin,
  original: path.join(DEPOT, a.fichier || path.join('annales', a.id, 'index.html')),
}));

test.describe('annale parfaite : 20/20 dans les deux modes, sans erreur JavaScript', () => {
  for (const annale of AUTONOMES) {
    for (const mode of ['training', 'exam']) {
      test(`${annale.id} (${annale.statut}) — ${mode === 'training' ? 'entraînement' : 'examen'}`, async ({ page, baseURL }) => {
        test.setTimeout(120_000);
        const erreurs = [];
        page.on('pageerror', (e) => erreurs.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
        page.on('dialog', (d) => d.accept());
        await page.goto(annale.statut === 'relu' ? new URL(annale.chemin, baseURL).href : pathToFileURL(annale.original).href);

        const config = await page.evaluate(() => ({ questions: window.__QCFG__, traces: window.__SKCFG__ || {} }));
        expect(config.questions, 'configuration des questions (window.__QCFG__) introuvable : gabarit non reconnu').toBeTruthy();

        // Réponse attendue de chaque question, vérifiée auprès du correcteur du fichier quand il est exposé.
        const reponses = {};
        const refusees = [];
        for (const [id, q] of Object.entries(config.questions)) {
          const liste = candidats(q.grader);
          const choix = await page.evaluate(({ liste, grader }) => {
            const correcteur = window.Grading;
            if (!correcteur || typeof correcteur.grade !== 'function') return liste[0] || null;
            return liste.find((r) => { const n = correcteur.grade(r, grader); return n && n.ok && n.score === 1; }) || null;
          }, { liste, grader: q.grader });
          if (choix === null) refusees.push(`${q.label} (correcteur « ${q.grader.type} ») : ${liste.length ? `aucune réponse générée acceptée (${liste.join(' | ')})` : 'type de correction non pris en charge par ce test'}`);
          else reponses[id] = choix;
        }
        expect(refusees, 'questions dont la réponse attendue ne peut pas être produite').toEqual([]);

        await page.click(`[data-mode="${mode}"]`);
        // Questions simples, puis cases des diagrammes (FAST) ; en entraînement, chaque question est validée.
        const simples = await page.locator('.q[data-q]').evaluateAll((els) => els.map((e) => e.getAttribute('data-q')));
        for (const id of simples) {
          await page.locator(`.q[data-q="${id}"] .q-input`).fill(reponses[id]);
          if (mode === 'training') await page.locator(`.q[data-q="${id}"] .btn-validate`).click();
        }
        for (const groupe of await page.locator('.fast-q').all()) {
          for (const champ of await groupe.locator('.sol input[data-q]').all()) {
            await champ.fill(reponses[await champ.getAttribute('data-q')]);
          }
          if (mode === 'training') await groupe.locator('.btn-fast').click();
        }
        if (mode === 'exam') {
          await page.click('#exam-submit');
          await page.click('#exam-submit');
        }
        // Tracés : validation (entraînement), puis tous les critères de la grille cochés.
        for (const id of Object.keys(config.traces)) {
          const trace = page.locator(`.sketch[data-sketch="${id}"]`);
          if (mode === 'training') await trace.locator('.btn-sketch').click();
          await expect(trace.locator('.selfeval'), `grille du tracé ${config.traces[id].label}`).toBeVisible();
          for (const critere of await trace.locator('.selfeval input[data-crit]').all()) await critere.check();
          await trace.locator('.btn-self').click();
        }

        const fausses = await page.evaluate((ids) => ids.filter((id) => {
          const statut = document.querySelector(`.q[data-q="${id}"] .q-status`);
          return statut && !/^\W*Juste/.test(statut.textContent.trim());
        }).map((id) => `${window.__QCFG__[id].label} : ${document.querySelector(`.q[data-q="${id}"] .q-status`).textContent.trim()}`), simples);
        expect(fausses, 'questions non comptées justes').toEqual([]);
        await expect(page.locator('#recap .final-note')).toHaveText('20,0/20');
        expect(erreurs, 'erreurs JavaScript').toEqual([]);
      });
    }
  }
});
