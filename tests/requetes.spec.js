// Public mineur : aucune requête vers un autre hôte que le site lui-même (Umami vide), sur chaque page,
// y compris quand on ouvre le calque Projeter (bibliothèque QR) ou qu'on filtre le catalogue.
'use strict';

const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { pagesConstruites, fichierDePage, site } = require('./outils');

function surveiller(page, baseURL) {
  const origine = new URL(baseURL).origin;
  const autres = [];
  page.on('request', (requete) => {
    const adresse = requete.url();
    if (!adresse.startsWith(`${origine}/`) && !/^(data|blob|about):/.test(adresse)) autres.push(adresse);
  });
  page.on('dialog', (d) => d.accept());
  return autres;
}

test.describe('aucune requête vers un autre hôte', () => {
  for (const chemin of pagesConstruites()) {
    test(chemin || '(accueil)', async ({ page, baseURL }) => {
      const autres = surveiller(page, baseURL);
      await page.goto(chemin, { waitUntil: 'networkidle' });
      expect(autres).toEqual([]);
    });
  }

  test('Projeter, catalogue filtré et contenu repris en entraînement', async ({ page, baseURL }) => {
    const autres = surveiller(page, baseURL);
    await page.goto('', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Projeter' }).click();
    await expect(page.locator('.projeter-qr svg')).toBeVisible();
    await page.goto('catalogue/?theme=mecanique&q=velo', { waitUntil: 'networkidle' });
    await page.goto('statique/cadre-velo/', { waitUntil: 'networkidle' });
    await page.click('[data-mode=training]');
    await page.waitForLoadState('networkidle');
    expect(autres).toEqual([]);
  });
});

test('pas de script Umami tant que site.json ne donne pas d’identifiant', () => {
  test.skip(Boolean(site.umami), 'Umami est configuré dans site.json');
  for (const chemin of pagesConstruites()) {
    expect(fs.readFileSync(fichierDePage(chemin), 'utf8'), chemin).not.toMatch(/umami/i);
  }
});
