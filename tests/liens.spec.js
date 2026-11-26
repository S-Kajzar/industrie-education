// Aucun lien interne cassé : chaque href, src et action de chaque page construite mène à une ressource qui existe
// (statut 200, sans redirection), et chaque ancre (#…) à un élément qui porte cet identifiant.
// Les liens cassés connus du corps des contenus repris sont listés dans liens-connus.json.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { pagesConstruites, fichierDePage, SITE } = require('./outils');
const CONNUS = require('./liens-connus.json').liens;

const IGNORES = /^(mailto:|tel:|javascript:|data:|blob:)/i;

test('aucun lien interne cassé', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const contexte = await browser.newContext({ baseURL, javaScriptEnabled: false });
  const page = await contexte.newPage();
  const origine = new URL(baseURL).origin;
  const cache = new Map();

  // Statut et identifiants d'une adresse du site (sans l'ancre).
  async function cible(adresse) {
    if (!cache.has(adresse)) {
      cache.set(adresse, (async () => {
        const reponse = await contexte.request.get(adresse, { maxRedirects: 0 });
        const type = reponse.headers()['content-type'] || '';
        const ids = new Set();
        if (reponse.status() === 200 && type.startsWith('text/html')) {
          for (const m of (await reponse.text()).matchAll(/\s(?:id|name)=["']([^"']+)["']/g)) ids.add(m[1]);
        }
        return { statut: reponse.status(), ids };
      })());
    }
    return cache.get(adresse);
  }

  const casses = [];
  for (const chemin of pagesConstruites()) {
    await page.goto(chemin);
    const liens = await page.evaluate(() => [...document.querySelectorAll('[href], [src], form[action]')].map((e) => {
      const attribut = e.hasAttribute('href') ? 'href' : e.hasAttribute('src') ? 'src' : 'action';
      return e.getAttribute(attribut);
    }));
    // Feuilles importées par l'enveloppe des contenus repris : @import url("…").
    const source = fs.readFileSync(fichierDePage(chemin), 'utf8');
    for (const m of source.matchAll(/@import url\("([^"]+)"\)/g)) liens.push(m[1]);

    const adressePage = page.url();
    for (const brut of liens) {
      if (!brut || !brut.trim() || IGNORES.test(brut.trim())) continue;
      const adresse = new URL(brut.trim(), adressePage);
      if (adresse.origin !== origine) continue; // lien externe : hors du périmètre de ce test
      const ancre = decodeURIComponent(adresse.hash.slice(1));
      adresse.hash = '';
      const resultat = await cible(adresse.href);
      if (resultat.statut !== 200) casses.push({ page: chemin, lien: brut, probleme: `statut ${resultat.statut}` });
      else if (ancre && !resultat.ids.has(ancre)) casses.push({ page: chemin, lien: brut, probleme: `ancre #${ancre} absente` });
    }
  }

  // Les polices référencées par commun.css existent.
  const css = fs.readFileSync(path.join(SITE, '_', 'commun.css'), 'utf8');
  for (const m of css.matchAll(/url\("?([^")]+)"?\)/g)) {
    if (!fs.existsSync(path.join(SITE, '_', m[1]))) casses.push({ page: '_/commun.css', lien: m[1], probleme: 'fichier absent' });
  }

  const estConnu = (c) => CONNUS.some((k) => k.page === c.page && k.lien === c.lien);
  expect(casses.filter((c) => !estConnu(c)), 'liens cassés').toEqual([]);
  const inutiles = CONNUS.filter((k) => !casses.some((c) => c.page === k.page && c.lien === k.lien));
  expect(inutiles, 'exceptions de liens-connus.json devenues inutiles : les retirer').toEqual([]);
  await contexte.close();
});
