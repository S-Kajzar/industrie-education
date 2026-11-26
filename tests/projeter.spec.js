// Calque « Projeter » (DESIGN.md § 5) : plein écran, QR code d'au moins 60 % de la hauteur qui encode l'adresse
// de la page, adresse lisible, « Copier le lien », fermeture par Échap, focus piégé puis rendu au bouton.
'use strict';

const { test, expect } = require('@playwright/test');
const qrcode = require('../statique/lib/qrcode.js');

// Même tracé que projeter.js : un carré par module noir, marge de 4 modules.
function traceAttendu(texte) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  const qr = qrcode(0, 'M');
  qr.addData(texte);
  qr.make();
  let d = '';
  for (let l = 0; l < qr.getModuleCount(); l++) {
    for (let c = 0; c < qr.getModuleCount(); c++) if (qr.isDark(l, c)) d += `M${c + 4} ${l + 4}h1v1h-1z`;
  }
  return d;
}

test.describe('au vidéoprojecteur (1280 × 720)', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('accueil : QR code, adresse, focus piégé, copier, Échap', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('');
    const bouton = page.locator('.site-tete [data-projeter]');
    await bouton.focus();
    await page.keyboard.press('Enter');

    const calque = page.getByRole('dialog', { name: 'Scanner pour ouvrir cette page' });
    await expect(calque).toBeVisible();
    const svg = calque.locator('.projeter-qr svg');
    await expect(svg).toBeVisible();
    const boite = await calque.locator('.projeter-qr').boundingBox();
    expect(boite.height).toBeGreaterThanOrEqual(0.6 * 720);
    expect(boite.y).toBeGreaterThanOrEqual(0);
    expect(boite.y + boite.height).toBeLessThanOrEqual(720);
    expect(await svg.locator('path').getAttribute('d')).toBe(traceAttendu(page.url()));
    await expect(calque.locator('.projeter-adresse')).toHaveText(page.url().replace(/^https?:\/\//, ''));

    // Focus piégé entre « Copier le lien » et « Fermer ».
    const copier = calque.getByRole('button', { name: 'Copier le lien' });
    const fermer = calque.getByRole('button', { name: /Fermer/ });
    await expect(copier).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(fermer).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(copier).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(fermer).toBeFocused();
    // Le reste de la page est inerte tant que le calque est ouvert.
    await expect(page.locator('body > main')).toHaveAttribute('inert', '');

    await copier.click();
    await expect(calque.locator('.projeter-etat')).toHaveText('Lien copié.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url());

    await page.keyboard.press('Escape');
    await expect(calque).toBeHidden();
    await expect(bouton).toBeFocused();
    await expect(page.locator('body > main')).not.toHaveAttribute('inert', '');
  });

  test('catalogue filtré : le QR code garde les filtres de l’adresse', async ({ page }) => {
    await page.goto('catalogue/?theme=mecanique');
    await page.locator('.site-tete [data-projeter]').click();
    const svg = page.locator('.projeter-qr svg');
    await expect(svg).toBeVisible();
    expect(page.url()).toContain('?theme=mecanique');
    expect(await svg.locator('path').getAttribute('d')).toBe(traceAttendu(page.url()));
    await page.getByRole('button', { name: /Fermer/ }).click();
    await expect(page.locator('.projeter')).toBeHidden();
  });

  test('contenu repris : le calque s’ouvre depuis l’enveloppe, Échap le ferme sans toucher au contenu', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.goto('statique/cadre-velo/');
    await page.click('[data-mode=training]');
    await page.locator('.enveloppe-tete [data-projeter]').click();
    const calque = page.locator('.projeter');
    await expect(calque.locator('svg')).toBeVisible();
    const boite = await calque.locator('.projeter-qr').boundingBox();
    expect(boite.height).toBeGreaterThanOrEqual(0.6 * 720);
    // Le calque passe au-dessus du bandeau de note et du rail du contenu.
    expect(await page.evaluate(() => Boolean(document.elementFromPoint(640, 700).closest('.projeter')))).toBe(true);
    expect(await page.evaluate(() => Boolean(document.elementFromPoint(1270, 100).closest('.projeter')))).toBe(true);
    // La touche P ne bascule pas le mode projection derrière le calque.
    await page.keyboard.press('p');
    await expect(page.locator('html')).not.toHaveAttribute('data-mode', 'projection');
    await page.keyboard.press('Escape');
    await expect(calque).toBeHidden();
    await expect(page.locator('.banner')).toBeVisible();
  });
});

test.describe('sans JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('« Projeter » mène à la rubrique Projeter de la page Enseignants', async ({ page }) => {
    await page.goto('');
    await page.locator('.site-tete [data-projeter]').click();
    await expect(page).toHaveURL(/\/enseignants\/#projeter$/);
    await expect(page.locator('#projeter')).toBeVisible();
  });
});
