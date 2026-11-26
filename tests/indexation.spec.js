// Préproduction non indexée : quand site.json → indexable vaut false, noindex sur chaque page (contenus repris
// compris) et robots.txt fermé. sitemap.xml liste toutes les pages, sauf la 404.
'use strict';

const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { pagesConstruites, fichierDePage, site } = require('./outils');

test('noindex partout et robots.txt fermé quand indexable vaut false', async ({ request }) => {
  test.skip(site.indexable, 'site.json : indexable vaut true');
  const robots = await request.get('robots.txt');
  expect(robots.status()).toBe(200);
  const texte = await robots.text();
  expect(texte).toMatch(/^User-agent: \*$/m);
  expect(texte).toMatch(/^Disallow: \/$/m);
  expect(texte).not.toMatch(/^Allow:/m);
  for (const chemin of pagesConstruites()) {
    expect(fs.readFileSync(fichierDePage(chemin), 'utf8'), chemin)
      .toContain('<meta name="robots" content="noindex, nofollow">');
  }
});

test('sitemap.xml : toutes les pages publiées, sauf la 404', async ({ request }) => {
  const reponse = await request.get('sitemap.xml');
  expect(reponse.status()).toBe(200);
  const xml = await reponse.text();
  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  const adresses = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
  const attendues = pagesConstruites().filter((c) => c !== '404.html').map((c) => site.origine + site.base + c).sort();
  expect(adresses).toEqual(attendues);
});
