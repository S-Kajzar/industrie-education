// Gabarit « contenu » pour un contenu natif (contenus de démonstration) : fil d'Ariane, cartouche, contenu
// précédent / suivant, « Signaler une erreur », mode projection, corrections lisibles sans JavaScript.
'use strict';

const { test, expect } = require('@playwright/test');
const { collections, site } = require('./outils');

const leviers = collections().find((c) => c.id === 'demo-leviers');
const [premier, milieu, dernier] = leviers.ordre;

test('fil d’Ariane, cartouche, précédent et suivant dans l’ordre de la collection', async ({ page }) => {
  await page.goto(`demo-leviers/${milieu}/`);
  const fil = page.locator('.fil-ariane');
  await expect(fil.getByRole('link', { name: 'Mécanique' })).toHaveAttribute('href', '../../mecanique/');
  await expect(fil.getByRole('link', { name: leviers.titre })).toHaveAttribute('href', '../../demo-leviers/');
  await expect(page.locator('.cartouche h1')).toHaveText(await fil.locator('[aria-current="page"]').textContent());
  await expect(page.locator('.contenu-suite .precedent')).toHaveAttribute('href', `../../demo-leviers/${premier}/`);
  await expect(page.locator('.contenu-suite .suivant')).toHaveAttribute('href', `../../demo-leviers/${dernier}/`);
  await page.goto(`demo-leviers/${premier}/`);
  await expect(page.locator('.contenu-suite .precedent')).toHaveCount(0);
  await page.goto(`demo-leviers/${dernier}/`);
  await expect(page.locator('.contenu-suite .suivant')).toHaveCount(0);
});

test('« Signaler une erreur » en bas de chaque contenu', async ({ page }) => {
  await page.goto(`demo-leviers/${milieu}/`);
  const lien = page.locator('.contenu-signaler .signaler');
  await expect(lien).toHaveText('Signaler une erreur');
  if (site.contact) await expect(lien).toHaveAttribute('href', new RegExp(`^mailto:${site.contact}`));
  else await expect(lien).toHaveAttribute('href', '../../a-propos/#signaler');
});

test('mode projection : texte de base 20 px, traits de 3 px, navigation masquée', async ({ page }) => {
  await page.goto(`demo-leviers/${milieu}/`);
  const interrupteur = page.locator('[data-projection]');
  await interrupteur.click();
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'projection');
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('20px');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.cartouche')).borderTopWidth)).toBe('3px');
  for (const s of ['.site-tete', '.site-pied', '.fil-ariane', '.contenu-suite', '.contenu-signaler']) {
    await expect(page.locator(s)).toBeHidden();
  }
  await expect(interrupteur).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', 'projection');
});

test('QCM de démonstration : correction dans la page', async ({ page }) => {
  await page.goto('demo-binaire/qcm-octets/');
  await page.getByLabel('256').check();
  await page.getByLabel('5', { exact: true }).check();
  await page.getByRole('button', { name: 'Vérifier mes réponses' }).click();
  const retours = page.locator('.qcm-retour');
  await expect(retours.nth(0)).toHaveText('Juste.');
  await expect(retours.nth(0)).toHaveClass(/retour-juste/);
  await expect(retours.nth(1)).toHaveClass(/retour-faux/);
  await expect(retours.nth(2)).toHaveText('Pas encore de réponse.');
});

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('les corrections se déplient, l’interrupteur de projection reste masqué', async ({ page }) => {
    await page.goto(`demo-leviers/${milieu}/`);
    const correction = page.locator('details.correction').first();
    await expect(correction.locator('.retour-juste')).toBeHidden();
    await correction.locator('summary').click();
    await expect(correction.locator('.retour-juste')).toBeVisible();
    await expect(page.locator('[data-projection]')).toBeHidden();
  });
});
