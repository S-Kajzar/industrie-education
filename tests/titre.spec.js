// Titre évolutif de l'accueil (DESIGN.md § 7) : avec une date simulée, le bon titre pour chacun des six moments ;
// sans JavaScript, le titre par défaut ; la hauteur est réservée, le changement de titre ne fait rien sauter.
'use strict';

const { test, expect } = require('@playwright/test');
const { site } = require('./outils');

const TITRES = site.titres_accueil;

// Dates en UTC, lues dans un navigateur réglé sur UTC. Le 25 novembre 2026 est un mercredi.
const CAS = [
  ['2026-11-25T06:00:00Z', 'matin', 'mercredi 6 h'],
  ['2026-11-25T07:59:00Z', 'matin', 'mercredi 7 h 59'],
  ['2026-11-25T08:00:00Z', 'cours', 'mercredi 8 h'],
  ['2026-11-25T11:59:00Z', 'cours', 'mercredi 11 h 59'],
  ['2026-11-25T12:00:00Z', 'midi', 'mercredi 12 h'],
  ['2026-11-25T13:59:00Z', 'midi', 'mercredi 13 h 59'],
  ['2026-11-25T14:00:00Z', 'cours', 'mercredi 14 h'],
  ['2026-11-25T16:59:00Z', 'cours', 'mercredi 16 h 59'],
  ['2026-11-25T17:00:00Z', 'soir', 'mercredi 17 h'],
  ['2026-11-25T21:59:00Z', 'soir', 'mercredi 21 h 59'],
  ['2026-11-25T22:00:00Z', 'nuit', 'mercredi 22 h'],
  ['2026-11-26T05:59:00Z', 'nuit', 'jeudi 5 h 59'],
  ['2026-11-27T23:30:00Z', 'nuit', 'vendredi 23 h 30'],
  ['2026-11-28T01:00:00Z', 'week-end', 'samedi 1 h'],
  ['2026-11-28T10:00:00Z', 'week-end', 'samedi 10 h'],
  ['2026-11-29T23:30:00Z', 'week-end', 'dimanche 23 h 30'],
];

test.describe('avec une date simulée', () => {
  test.use({ timezoneId: 'UTC' });

  for (const [date, moment, libelle] of CAS) {
    test(`${libelle} → ${moment}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(date));
      await page.goto('');
      const h1 = page.locator('h1');
      await expect(h1).toHaveAttribute('data-moment', moment);
      expect(await h1.textContent()).toBe(TITRES[moment]);
    });
  }

  test('les six moments sont couverts', () => {
    expect(new Set(CAS.map((c) => c[1]))).toEqual(new Set(Object.keys(TITRES)));
  });
});

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('le titre par défaut', async ({ page }) => {
    await page.goto('');
    expect(await page.locator('h1').textContent()).toBe(TITRES.cours);
  });
});

for (const largeur of [360, 1280]) {
  test(`hauteur réservée à ${largeur} px : le texte qui suit le titre ne bouge pas`, async ({ browser, baseURL }) => {
    const position = async (options, date) => {
      const contexte = await browser.newContext({ baseURL, timezoneId: 'UTC', viewport: { width: largeur, height: 900 }, ...options });
      const page = await contexte.newPage();
      if (date) await page.clock.setFixedTime(new Date(date));
      await page.goto('');
      await page.evaluate(() => document.fonts.ready);
      const haut = await page.locator('.accueil-suite').evaluate((e) => Math.round(e.getBoundingClientRect().top));
      await contexte.close();
      return haut;
    };
    const reference = await position({ javaScriptEnabled: false });
    for (const [date, moment] of CAS.filter((c, i, t) => t.findIndex((d) => d[1] === c[1]) === i)) {
      expect(await position({}, date), moment).toBe(reference);
    }
  });
}
