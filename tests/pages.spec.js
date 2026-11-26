// Chaque page de TRAME § 3 (sauf « annale », lot 2) : existe, lang="fr", un seul h1, un titre, une description,
// noindex en préproduction, focus visible ; s'affiche aussi sans JavaScript.
'use strict';

const { test, expect } = require('@playwright/test');
const { pagesAttendues, site } = require('./outils');

const nom = (chemin) => chemin || '(accueil)';

test.describe('pages de TRAME § 3', () => {
  for (const [chemin, gabarit] of pagesAttendues()) {
    test(`${nom(chemin)} — ${gabarit}`, async ({ page }) => {
      page.on('dialog', (d) => d.accept());
      const reponse = await page.goto(chemin);
      expect(reponse.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
      expect((await page.title()).trim()).not.toBe('');
      const description = await page.locator('meta[name="description"]').first().getAttribute('content');
      expect((description || '').trim().length).toBeGreaterThan(20);

      // Un seul h1 affiché. Un contenu repris garde son propre second h1, masqué tant qu'aucun mode n'est choisi.
      const h1Affiches = await page.locator('h1').evaluateAll((hs) => hs.filter((h) => h.getClientRects().length).length);
      expect(h1Affiches).toBe(1);
      if (!['contenu repris', 'annale'].includes(gabarit)) await expect(page.locator('h1')).toHaveCount(1);

      if (!site.indexable) {
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      }

      // Focus visible : contour d'au moins 2 px sur le premier arrêt de tabulation.
      await page.keyboard.press('Tab');
      const contour = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement);
        return { style: s.outlineStyle, largeur: parseFloat(s.outlineWidth), balise: document.activeElement.tagName };
      });
      expect(contour.balise).toBe('A');
      expect(contour.style).not.toBe('none');
      expect(contour.largeur).toBeGreaterThanOrEqual(2);
    });
  }
});

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const [chemin] of pagesAttendues()) {
    test(`${nom(chemin)} s’affiche`, async ({ page }) => {
      const reponse = await page.goto(chemin);
      expect(reponse.status()).toBe(200);
      const h1 = page.locator('h1:visible');
      await expect(h1).toHaveCount(1);
      expect((await h1.textContent()).trim()).not.toBe('');
      expect((await page.locator('body').innerText()).length).toBeGreaterThan(200);
    });
  }
});

test('adresse inconnue : page 404 avec recherche et trois liens', async ({ page }) => {
  const reponse = await page.goto('nexiste/pas/du-tout/');
  expect(reponse.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page introuvable');
  await expect(page.locator('main form[role="search"] input[name="q"]')).toBeVisible();
  const liens = page.locator('.liens-erreur a');
  await expect(liens).toHaveCount(3);
  // Servie à n'importe quelle profondeur : la feuille de style et les liens restent valides (adresses absolues).
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.site-tete')).borderBottomStyle)).toBe('solid');
  for (const href of await liens.evaluateAll((as) => as.map((a) => a.href))) {
    expect((await page.request.get(href)).status(), href).toBe(200);
  }
});
