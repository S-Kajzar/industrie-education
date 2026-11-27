// Public mineur : aucune requête vers un autre hôte que le site lui-même (Umami vide), sur chaque page,
// y compris quand on ouvre le calque Projeter (bibliothèque QR) ou qu'on filtre le catalogue. Avec Umami configuré,
// le seul hôte extérieur est celui de site.json → « umami_script » (site factice, script simulé).
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

// Avec Umami (site factice, script simulé) : le seul hôte extérieur contacté est celui de « umami_script ».
test.describe('avec Umami configuré', () => {
  const path = require('node:path');
  const { depotFactice, construire, servirSite } = require('./outils');
  const HOTE = 'umami.exemple.test';
  let racine;
  let serveur;

  test.beforeAll(async () => {
    racine = depotFactice((ecrire) => {
      const reglages = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.json'), 'utf8'));
      ecrire('site.json', { ...reglages, umami: '0f9a8b7c-1234-4cde-9f00-abcdef123456', umami_script: `https://${HOTE}/script.js` });
    });
    const resultat = construire(racine);
    if (resultat.status !== 0) throw new Error(resultat.stderr);
    serveur = await servirSite(path.join(racine, '_site'), 4291 + test.info().workerIndex);
  });

  test.afterAll(() => {
    if (serveur) serveur.arreter();
    if (racine) fs.rmSync(racine, { recursive: true, force: true });
  });

  test('seul l’hôte du script Umami est contacté, sur chaque page', async ({ context, page }) => {
    const hotes = new Set();
    // Script Umami simulé : il définit window.umami et envoie une page vue à son propre hôte, comme le vrai.
    await context.route(`https://${HOTE}/**`, (route) => route.fulfill(route.request().url().endsWith('/script.js')
      ? { contentType: 'text/javascript', body: `window.umami={track:function(){}};fetch('https://${HOTE}/api/send',{method:'POST',body:'{}'});` }
      : { contentType: 'application/json', body: '{}' }));
    const origine = new URL(serveur.adresse).origin;
    page.on('request', (r) => { if (!r.url().startsWith(`${origine}/`) && !/^(data|blob|about):/.test(r.url())) hotes.add(new URL(r.url()).host); });
    const pages = fs.readdirSync(path.join(racine, '_site'), { recursive: true })
      .filter((f) => f.endsWith('index.html') && !f.startsWith('_') && !f.startsWith('admin'))
      .map((f) => f.replace(/index\.html$/, '').split(path.sep).join('/'));
    expect(pages.length).toBeGreaterThan(20);
    for (const chemin of pages) {
      await page.goto(serveur.adresse + chemin, { waitUntil: 'networkidle' });
      expect(await page.locator(`script[src="https://${HOTE}/script.js"]`).count(), chemin).toBe(1);
    }
    expect([...hotes]).toEqual([HOTE]);
  });
});
