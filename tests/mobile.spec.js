// Lisible à 360 px de large : aucun défilement horizontal, sur chaque page (accueil, catalogue et contenu repris
// en tête), y compris quand le contenu repris est ouvert en entraînement et quand les filtres sont dépliés.
'use strict';

const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { pagesConstruites, DEPOT } = require('./outils');

test.use({ viewport: { width: 360, height: 740 } });

const debordement = (page) => page.evaluate(async () => {
  await document.fonts.ready;
  return document.documentElement.scrollWidth - document.documentElement.clientWidth;
});

const PRIORITAIRES = ['', 'catalogue/', 'statique/cadre-velo/'];
const pages = [...PRIORITAIRES, ...pagesConstruites().filter((c) => !PRIORITAIRES.includes(c))];

for (const chemin of pages) {
  test(`${chemin || '(accueil)'} : pas de défilement horizontal à 360 px`, async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto(chemin);
    expect(await debordement(page)).toBeLessThanOrEqual(0);
  });
}

// En entraînement, cadre-velo.html déborde déjà de 4 px à 360 px dans son dépôt d'origine (cartouche : grille 1fr
// et champ « Nom »), défaut signalé dans NOTE-DE-LIVRAISON.md. Le corps n'étant pas modifié, on vérifie ici que
// l'enveloppe n'ajoute aucun débordement à celui de l'original.
test('contenu repris ouvert en entraînement, à 360 px : l’enveloppe n’ajoute aucun débordement', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  const mesurer = async (adresse) => {
    await page.goto(adresse);
    await page.click('[data-mode=training]');
    return debordement(page);
  };
  const original = await mesurer(`file://${path.join(DEPOT, 'contenus', 'statique', 'cadre-velo', 'index.html')}`);
  const enveloppe = await mesurer('statique/cadre-velo/');
  expect(enveloppe).toBeLessThanOrEqual(Math.max(0, original));
});

test('catalogue, filtres dépliés et filtre choisi, à 360 px', async ({ page }) => {
  await page.goto('catalogue/');
  await page.locator('[data-filtres-ouvrir]').click();
  await page.locator('[data-filtre="type"][data-valeur="cours"]').click();
  expect(await debordement(page)).toBeLessThanOrEqual(0);
});

test('calque Projeter à 360 px', async ({ page }) => {
  await page.goto('');
  await page.locator('.site-tete [data-projeter]').click();
  await expect(page.locator('.projeter-qr svg')).toBeVisible();
  expect(await debordement(page)).toBeLessThanOrEqual(0);
  const boite = await page.locator('.projeter-qr').boundingBox();
  expect(boite.x).toBeGreaterThanOrEqual(0);
  expect(boite.x + boite.width).toBeLessThanOrEqual(360);
});
