// Poids au premier affichage (TRAME § 8) : accueil < 300 Ko ; aucune page > 1 Mo, hors contenus repris.
// Mesure : tout ce que le navigateur télécharge jusqu'au repos du réseau, cache vide, sans compression.
'use strict';

const { test, expect } = require('@playwright/test');
const { pagesConstruites, estRepris } = require('./outils');

async function poids(page, chemin) {
  const mesures = [];
  page.on('requestfinished', (requete) => {
    mesures.push(requete.sizes().then((s) => ({ adresse: requete.url(), octets: s.responseBodySize + s.responseHeadersSize })));
  });
  await page.goto(chemin, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const liste = await Promise.all(mesures);
  return { total: liste.reduce((somme, m) => somme + m.octets, 0), liste };
}

test('accueil < 300 Ko au premier affichage', async ({ page }) => {
  const { total, liste } = await poids(page, '');
  console.log(`Accueil : ${(total / 1000).toFixed(1)} ko au premier affichage (${liste.length} fichiers).`);
  expect(total, JSON.stringify(liste, null, 1)).toBeLessThan(300 * 1000);
});

test.describe('aucune page > 1 Mo hors contenus repris', () => {
  for (const chemin of pagesConstruites().filter((c) => !estRepris(c))) {
    test(chemin || '(accueil)', async ({ page }) => {
      const { total, liste } = await poids(page, chemin);
      expect(total, JSON.stringify(liste, null, 1)).toBeLessThan(1000 * 1000);
    });
  }
});
