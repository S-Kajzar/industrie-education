// Contenu repris (TRAME § 5) : cadre-velo.html de S-Kajzar/STATIQUE, enveloppé sans modification de son corps.
// On vérifie que le fichier publié est l'original plus les seuls ajouts de l'enveloppe, que commun.css n'écrase
// aucun style du contenu, et que le contenu fonctionne enveloppé : corrections, impression, plein écran.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { DEPOT, SITE, contenus, annales, stylesDuCorps } = require('./outils');
const REPONSES = require('./reponses-cadre-velo');

const CHEMIN = 'statique/cadre-velo/';
const SOURCE = path.join(DEPOT, 'contenus', 'statique', 'cadre-velo', 'index.html');
const ENVELOPPE = /<!-- début de l’enveloppe industrie\.education -->[\s\S]*?<!-- fin de l’enveloppe industrie\.education -->/g;

async function ouvrir(page, adresse = CHEMIN) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto(adresse);
  return erreurs;
}

async function tracer(page, croquis, x1, y1, x2, y2) {
  await page.click(`#${croquis} [data-tool=line]`);
  const boite = await page.locator(`#${croquis} canvas`).boundingBox();
  await page.mouse.move(boite.x + boite.width * x1, boite.y + boite.height * y1);
  await page.mouse.down();
  await page.mouse.move(boite.x + boite.width * x2, boite.y + boite.height * y2, { steps: 6 });
  await page.mouse.up();
}

test('le fichier publié est l’original, plus les seuls ajouts de l’enveloppe, à leur place', () => {
  const original = fs.readFileSync(SOURCE, 'utf8');
  const publie = fs.readFileSync(path.join(SITE, CHEMIN, 'index.html'), 'utf8');
  const [tete, haut, bas, ...reste] = publie.match(ENVELOPPE) || [];
  expect(reste).toHaveLength(0);
  expect(publie.replace(ENVELOPPE, '')).toBe(original);
  // tête juste avant </head>, bandeau juste après <body…>, pied juste avant le dernier </body>
  expect(publie.indexOf(tete) + tete.length).toBe(publie.indexOf('</head>'));
  const body = publie.match(/<body[^>]*>/)[0];
  expect(publie.indexOf(body) + body.length).toBe(publie.indexOf(haut));
  expect(publie.indexOf(bas) + bas.length).toBe(publie.lastIndexOf('</body>'));
  expect(tete).toContain('@import url("../../_/commun.css") layer(site);');
});

test('commun.css n’écrase aucun style du contenu', async ({ browser, baseURL }) => {
  const PROPRIETES = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'borderTopWidth',
    'borderTopColor', 'borderLeftWidth', 'paddingTop', 'paddingLeft', 'marginBottom', 'display', 'textDecorationLine'];
  const ACCUEIL = ['body', '#home h1', '.home-sub', '.home-facts', '.mode-card', '.mc-tag', '.pastille', '.btn-mode', '.retour-accueil'];
  const SUJET = ['body', '.cartouche', '.cartouche h1', '.consignes', '.part', '.part-num', '.part-head h2', '.qbar', '.q-stem',
    '.q-input', '.btn-validate', '.banner', '.rail .tab', '.c-top a', '.small'];
  // Exécutée dans la page : styles calculés de chaque sélecteur.
  const relever = ({ selecteurs, proprietes }) => selecteurs.map((s) => {
    const e = document.querySelector(s);
    if (!e) return [s, null];
    const style = getComputedStyle(e);
    return [s, proprietes.map((p) => `${p}=${style[p]}`).join(' ; ')];
  });

  async function styles(adresse) {
    const contexte = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await contexte.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(adresse);
    const accueil = await page.evaluate(relever, { selecteurs: ACCUEIL, proprietes: PROPRIETES });
    await page.click('[data-mode=training]');
    const sujet = await page.evaluate(relever, { selecteurs: SUJET, proprietes: PROPRIETES });
    await contexte.close();
    return { accueil, sujet };
  }

  const original = await styles(`file://${SOURCE}`);
  const enveloppe = await styles(new URL(CHEMIN, baseURL).href);
  // Les sélecteurs relevés existent bien dans le contenu.
  expect([...original.accueil, ...original.sujet].filter(([, v]) => v === null)).toEqual([]);
  expect(enveloppe).toEqual(original);
});

// Garde-fou général : pour chaque fichier autonome publié (contenu repris, en dossier ou déposé par le back-office, et
// annale), chaque élément du corps a exactement les mêmes styles calculés qu'avec le fichier d'origine ; seules les
// pièces de l'enveloppe sont ignorées.
const AUTONOMES = [
  ...contenus().filter((c) => c.mode === 'repris' || c.fichier)
    .map((c) => [c.chemin, c.fichier ? path.join(DEPOT, c.fichier) : path.join(DEPOT, 'contenus', c.chemin, 'index.html')]),
  ...annales().map((a) => [a.chemin, a.fichier ? path.join(DEPOT, a.fichier) : path.join(DEPOT, 'annales', a.id, 'index.html')]),
];

test.describe('aucun style écrasé, élément par élément', () => {
  for (const [chemin, original] of AUTONOMES) {
    test(chemin, async ({ browser, baseURL }) => {
      const avant = await stylesDuCorps(browser, `file://${original}`);
      const apres = await stylesDuCorps(browser, new URL(chemin, baseURL).href);
      expect(apres.length).toBe(avant.length);
      const differences = avant.map((o, i) => [i, o, apres[i]]).filter(([, o, e]) => o !== e).slice(0, 5);
      expect(differences).toEqual([]);
    });
  }
});

test('corrections : sujet entièrement juste = 20/20 en entraînement, une fois enveloppé', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await page.click('[data-mode=training]');
  for (const [id, reponse] of Object.entries(REPONSES)) {
    await page.fill(`#in-${id}`, reponse);
    await page.click(`#${id} .btn-validate`);
    await expect(page.locator(`#${id} .q-status`), `${id} : « ${reponse} »`).toContainText('Juste');
  }
  await tracer(page, 'sk_q1_3', 0.2, 0.5, 0.4, 0.2);
  await page.click('#sk_q1_3 .btn-sketch');
  await expect(page.locator('#sk_q1_3 .selfeval')).toBeVisible();
  for (const case_ of await page.locator('#sk_q1_3 .se-item input').all()) await case_.check();
  await page.click('#sk_q1_3 .btn-self');
  await expect(page.locator('#score-val')).toContainText('20,0');
  await expect(page.locator('#recap .final-note')).toHaveText('20,0/20');
  expect(erreurs).toEqual([]);
});

test('corrections : une réponse fausse affiche sa correction', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await page.click('[data-mode=training]');
  await page.fill('#in-q4_5', '780,4 N');
  await page.click('#q4_5 .btn-validate');
  await expect(page.locator('#q4_5 .q-status')).not.toContainText(/^Juste/);
  await expect(page.locator('#q4_5 .q-expl')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('impression : l’enveloppe disparaît, la copie s’imprime comme l’original', async ({ browser, baseURL }) => {
  async function imprimer(adresse) {
    const contexte = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await contexte.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(adresse);
    await page.click('[data-mode=training]');
    await page.emulateMedia({ media: 'print' });
    const visibles = await page.evaluate(() => ['.enveloppe-tete', '.enveloppe-pied', '.banner', '.print-summary', '.cartouche h1']
      .map((s) => { const e = document.querySelector(s); return [s, Boolean(e && e.getClientRects().length)]; }));
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await contexte.close();
    return { visibles: Object.fromEntries(visibles), pages: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length };
  }
  const original = await imprimer(`file://${SOURCE}`);
  const enveloppe = await imprimer(new URL(CHEMIN, baseURL).href);
  expect(enveloppe.visibles).toEqual({
    '.enveloppe-tete': false, '.enveloppe-pied': false, '.banner': false, '.print-summary': true, '.cartouche h1': true,
  });
  expect(original.pages).toBeGreaterThan(0);
  expect(enveloppe.pages).toBe(original.pages);
});

test('plein écran du tracé : couvre l’écran, par-dessus l’enveloppe ; Échap pour sortir', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await page.click('[data-mode=training]');
  await page.click('#sk_q1_3 [data-act="full"]');
  const plein = page.locator('.sketch.is-full');
  await expect(plein).toHaveCount(1);
  await expect(page.locator('body')).toHaveClass(/sk-full-open/);
  const taille = page.viewportSize();
  const boite = await plein.boundingBox();
  expect(Math.round(boite.y)).toBe(0);
  expect(Math.round(boite.height)).toBe(taille.height);
  expect(await page.evaluate(() => Boolean(document.elementFromPoint(30, 20).closest('.sketch.is-full')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(plein).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('enveloppe : fil d’Ariane, suite de la collection, Signaler une erreur', async ({ page }) => {
  await ouvrir(page);
  const fil = page.locator('.enveloppe-tete .fil-ariane');
  await expect(fil.getByRole('link', { name: 'Mécanique' })).toHaveAttribute('href', '../../mecanique/');
  await expect(fil.getByRole('link', { name: 'Statique' })).toHaveAttribute('href', '../../statique/');
  await expect(fil.locator('[aria-current="page"]')).toHaveText('Cadre de vélo tout terrain');
  await expect(page.locator('.enveloppe-pied .contenu-suite a')).toHaveAttribute('href', '../../statique/');
  await expect(page.locator('.enveloppe-pied .signaler')).toHaveText('Signaler une erreur');
});

test('mode projection : touche P et interrupteur, sauf dans un champ de saisie', async ({ page }) => {
  await ouvrir(page);
  const interrupteur = page.locator('.enveloppe-tete [data-projection]');
  await expect(interrupteur).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'projection');
  await expect(interrupteur).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe('20px');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
  await expect(page.locator('.enveloppe-tete .fil-ariane')).toBeHidden();
  await expect(page.locator('.enveloppe-pied')).toBeHidden();
  await interrupteur.click();
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', 'projection');
  await expect(interrupteur).toHaveAttribute('aria-pressed', 'false');

  await page.click('[data-mode=training]');
  await page.locator('#in-q2_3').press('p');
  await expect(page.locator('#in-q2_3')).toHaveValue('p');
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', 'projection');
});
