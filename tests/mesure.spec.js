// Mesure d'audience (lot 1c) : cinq événements au plus, envoyés par commun.js via umami.track(), seulement si
// window.umami existe ; seule propriété : l'identifiant de la page. Ici, window.umami est simulé (le site de test n'a
// pas d'identifiant Umami). Les boutons des annales sont reconnus à leur libellé, depuis l'enveloppe, sans rien
// ajouter au fichier. Recherche et filtres n'envoient pas d'événement : l'adresse suffit, et elle n'est réécrite
// qu'après une pause dans la frappe (Umami compte une page vue à chaque changement d'adresse).
'use strict';

const { test, expect } = require('@playwright/test');
const { annales } = require('./outils');

const ANNALE = annales()[0];

// window.umami simulé : il note les événements. window.print est neutralisé (« Imprimer ma copie »).
async function simulerUmami(page) {
  await page.addInitScript(() => {
    window.__evenements = [];
    window.umami = { track: (nom, donnees) => window.__evenements.push([nom, donnees]) };
    window.print = () => {};
  });
}
const evenements = (page) => page.evaluate(() => window.__evenements);

test('annale : entraînement, impression, examen et copie corrigée comptés une fois, avec l’identifiant seul', async ({ page }) => {
  await simulerUmami(page);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.goto(ANNALE.chemin);
  await page.getByRole('button', { name: 'Commencer l’entraînement' }).or(page.getByRole('button', { name: 'Commencer l\'entraînement' })).first().click();
  await page.getByRole('button', { name: 'Imprimer ma copie' }).first().click();
  expect(await evenements(page)).toEqual([
    ['annale-entrainement', { page: ANNALE.id }],
    ['annale-impression', { page: ANNALE.id }],
  ]);

  await page.goto(ANNALE.chemin);
  await page.getByRole('button', { name: 'Composer en mode examen' }).click();
  await page.click('#exam-submit'); // « J'ai fini, je fais corriger ma copie »
  await page.click('#exam-submit'); // « Confirmer… » : pas de second événement
  expect(await evenements(page)).toEqual([
    ['annale-examen', { page: ANNALE.id }],
    ['annale-copie-corrigee', { page: ANNALE.id }],
  ]);
  expect(erreurs).toEqual([]);
});

test('Projeter : un événement « projeter » avec l’identifiant de la page', async ({ page }) => {
  await simulerUmami(page);
  await page.goto('');
  await page.getByRole('link', { name: 'Projeter' }).click();
  await expect(page.locator('.projeter-qr svg')).toBeVisible();
  await page.goto(ANNALE.chemin);
  await page.locator('.enveloppe-tete').getByRole('link', { name: 'Projeter' }).click();
  expect(await evenements(page)).toEqual([['projeter', { page: ANNALE.id }]]);
});

test('sans window.umami : rien n’est envoyé et rien ne casse', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('dialog', (d) => d.accept());
  await page.addInitScript(() => { window.print = () => {}; });
  await page.goto(ANNALE.chemin);
  expect(await page.evaluate(() => typeof window.umami)).toBe('undefined');
  await page.locator('[data-mode=training]').click();
  await page.getByRole('button', { name: 'Imprimer ma copie' }).first().click();
  await page.locator('.enveloppe-tete').getByRole('link', { name: 'Projeter' }).click();
  expect(erreurs).toEqual([]);
});

test('recherche et filtres : aucun événement ; l’adresse garde les paramètres, réécrite une fois après la frappe', async ({ page }) => {
  await simulerUmami(page);
  await page.addInitScript(() => {
    window.__reecritures = 0;
    const original = history.replaceState.bind(history);
    history.replaceState = (...args) => { window.__reecritures += 1; return original(...args); };
  });
  await page.goto('catalogue/');
  await page.locator('#q-catalogue').pressSequentially('statique', { delay: 40 });
  await expect(page).toHaveURL(/\/catalogue\/\?q=statique$/);
  expect(await page.evaluate(() => window.__reecritures)).toBe(1);
  await page.locator('[data-filtre="type"][data-valeur="exercice"]').click();
  await expect(page).toHaveURL(/\?q=statique&type=exercice$/);
  expect(await page.evaluate(() => window.__reecritures)).toBe(2);
  expect(await evenements(page)).toEqual([]);
});

test('avant de projeter, l’adresse en attente est écrite : le QR code reprend la recherche', async ({ page }) => {
  await page.goto('catalogue/');
  await page.locator('#q-catalogue').fill('brouette');
  await page.getByRole('link', { name: 'Projeter' }).click();
  await expect(page.locator('.projeter-adresse')).toContainText('catalogue/?q=brouette');
});
