// Annale de référence (TRAME § 11) : « Système de levage et de déchargement des sacs de linge », fichier autonome
// de S-Kajzar/etude-systeme-dechargement-et-levage-de-linge, publié tel quel et enveloppé. On vérifie que le fichier
// publié est l'original plus les seuls ajouts de l'enveloppe, qu'aucun de ses styles n'est modifié, et qu'il
// fonctionne enveloppé : modes entraînement et examen, documents, tracés, impression, fenêtre « Imprimer les DR »,
// sans erreur JavaScript ni requête vers un autre site. La fiche du site, au-dessus du fichier, est un bandeau
// compact (lot 1c). Le 20/20 de chaque annale est vérifié par tests/annale-parfaite.spec.js.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { DEPOT, SITE, annales, stylesDuCorps } = require('./outils');

const ANNALE = annales().find((a) => a.id === 'levage-dechargement-sacs-linge');
const CHEMIN = ANNALE.chemin;
const ORIGINAL = path.join(DEPOT, ANNALE.fichier);
const ENVELOPPE = /<!-- début de l’enveloppe industrie\.education -->[\s\S]*?<!-- fin de l’enveloppe industrie\.education -->/g;

async function ouvrir(page, baseURL, adresse = CHEMIN) {
  const erreurs = [];
  const tierces = [];
  const origine = new URL(baseURL).origin;
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  page.context().on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(`${origine}/`) && !/^(data|blob|about):/.test(u)) tierces.push(u);
  });
  await page.goto(adresse);
  return { erreurs, tierces };
}

async function tracer(page, croquis) {
  await page.click(`#${croquis} [data-tool=line]`);
  await page.locator(`#${croquis} canvas`).scrollIntoViewIfNeeded();
  const boite = await page.locator(`#${croquis} canvas`).boundingBox();
  await page.mouse.move(boite.x + boite.width * 0.2, boite.y + boite.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(boite.x + boite.width * 0.45, boite.y + boite.height * 0.25, { steps: 6 });
  await page.mouse.up();
}

test('le fichier publié est l’original, plus les seuls ajouts de l’enveloppe, à leur place', () => {
  const original = fs.readFileSync(ORIGINAL, 'utf8');
  const publie = fs.readFileSync(path.join(SITE, CHEMIN, 'index.html'), 'utf8');
  const [debutTete, tete, haut, bas, ...reste] = publie.match(ENVELOPPE) || [];
  expect(reste).toHaveLength(0);
  expect(publie.replace(ENVELOPPE, '')).toBe(original);
  const meta = publie.match(/<meta charset="utf-8">/)[0];
  expect(publie.indexOf(meta) + meta.length).toBe(publie.indexOf(debutTete));
  expect(debutTete).toMatch(/<title>Système de levage et de déchargement des sacs de linge : sujet corrigé interactif \(BTS MS\)/);
  expect(publie.indexOf(tete) + tete.length).toBe(publie.indexOf('</head>'));
  const body = publie.match(/<body[^>]*>/)[0];
  expect(publie.indexOf(body) + body.length).toBe(publie.indexOf(haut));
  expect(publie.indexOf(bas) + bas.length).toBe(publie.lastIndexOf('</body>'));
});

test('aucun style du fichier n’est modifié, élément par élément (accueil du sujet, puis entraînement)', async ({ browser, baseURL }) => {
  for (const apres of [null, (page) => page.click('[data-mode=training]')]) {
    const original = await stylesDuCorps(browser, `file://${ORIGINAL}`, apres);
    const enveloppe = await stylesDuCorps(browser, new URL(CHEMIN, baseURL).href, apres);
    expect(enveloppe.length).toBe(original.length);
    expect(original.map((o, i) => [i, o, enveloppe[i]]).filter(([, o, e]) => o !== e).slice(0, 5)).toEqual([]);
  }
});

test('fiche compacte au-dessus du sujet : informations, « Pour réviser », crédit ; ni titre ni présentation répétés', async ({ page, baseURL }) => {
  const { erreurs } = await ouvrir(page, baseURL);
  // Titre et description du site inchangés (premiers <title> et meta description du document).
  expect(await page.title()).toBe(`${ANNALE.titre} : sujet corrigé interactif (BTS MS) — industrie.education`);
  expect(await page.locator('meta[name="description"]').first().getAttribute('content')).toBe(ANNALE.presentation);
  const fiche = page.locator('.enveloppe-fiche');
  await expect(fiche).not.toContainText(ANNALE.titre);
  await expect(fiche).not.toContainText(ANNALE.presentation);
  await expect(fiche.locator('.enveloppe-fiche-surtitre')).toHaveText('Annale corrigée et interactive · BTS MS');
  const info = (terme) => fiche.locator('.enveloppe-fiche-infos > div').filter({ has: page.locator('dt', { hasText: terme }) }).locator('dd');
  await expect(info('Durée')).toHaveText('5 h');
  await expect(info('Filière').getByRole('link', { name: 'BTS MS' })).toHaveAttribute('href', '../../annales/bts-ms/');
  await expect(info('Thème').getByRole('link', { name: 'Mécanique et conception' })).toHaveAttribute('href', '../../mecanique/');
  // Libellés de catalogue/notions.json, accentués.
  await expect(info('Notions')).toHaveText('Statique, Dynamique, Cinématique graphique, Roulements, Liaisons mécaniques');
  await expect(fiche.locator('.enveloppe-fiche-liens').getByRole('link', { name: 'Cadre de vélo tout terrain' }))
    .toHaveAttribute('href', '../../statique/cadre-velo/');
  // Ligne de crédit (licence CC BY-NC-SA), lien sur le nom de l'éditeur ; l'origine n'est pas affichée.
  const credit = fiche.locator('.enveloppe-fiche-credit');
  await expect(credit).toHaveText('D’après un sujet publié par éduscol STI, licence CC BY-NC-SA 2.0 FR. Adaptation '
    + 'interactive : industrie.education, sous la même licence.');
  await expect(credit.getByRole('link', { name: 'éduscol STI' })).toHaveAttribute('href', ANNALE.source.url);
  expect(ANNALE.afficher_origine).toBe(false);
  await expect(page.locator('body')).not.toContainText(ANNALE.origine.diplome);
  // Plus de bouton « Commencer » : le titre du sujet est juste sous la fiche. Un seul h1 affiché, celui du sujet.
  await expect(fiche.getByRole('link', { name: 'Commencer' })).toHaveCount(0);
  await expect(page.locator('h1:visible')).toHaveCount(1);
  expect(erreurs).toEqual([]);
});

// La hauteur dépend de la police : system-ui vaut Inter ici, DejaVu Sans sur le serveur de GitHub (15 % plus large).
// À 360 px, on mesure donc aussi avec DejaVu Sans imposée, pour que le test donne le même résultat partout.
test('fiche : au plus 300 px de haut à 360 px de large ; titre du sujet visible sans défiler à 1280 × 800', async ({ browser, baseURL }) => {
  for (const [largeur, hauteur, police] of [[360, 740, null], [360, 740, 'DejaVu Sans'], [1280, 800, null]]) {
    const contexte = await browser.newContext({ viewport: { width: largeur, height: hauteur } });
    const page = await contexte.newPage();
    await page.goto(new URL(CHEMIN, baseURL).href);
    if (police) await page.addStyleTag({ content: `.enveloppe-fiche, .enveloppe-fiche * { font-family: "${police}" !important }` });
    const fiche = await page.locator('.enveloppe-fiche').boundingBox();
    const titre = await page.locator('#home h1').boundingBox();
    if (largeur === 360) expect(fiche.height, `hauteur de la fiche à 360 px (${police || 'polices de la charte'})`).toBeLessThanOrEqual(300);
    else expect(titre.y + titre.height, 'bas du titre du sujet à 1280 × 800').toBeLessThanOrEqual(hauteur);
    await contexte.close();
  }
});

test('entraînement : documents, correction d’une réponse fausse, tracé, plein écran, « Imprimer les DR »', async ({ page, baseURL }) => {
  const { erreurs, tierces } = await ouvrir(page, baseURL);
  await page.click('[data-mode=training]');
  await expect(page.locator('main.page')).toBeVisible();

  // Documents : onglet du rail, panneau, fermeture par Échap.
  await page.click('.rail .tab[data-doc="DT1"]');
  await expect(page.locator('body')).toHaveClass(/panel-open/);
  await expect(page.locator('#doc-DT1')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('body')).not.toHaveClass(/panel-open/);

  // Réponse fausse : la correction s'affiche.
  const question = page.locator('.q[data-q]').first();
  const id = await question.getAttribute('id');
  await page.fill(`#in-${id}`, '999999');
  await page.click(`#${id} .btn-validate`);
  await expect(page.locator(`#${id} .q-status`)).not.toContainText(/^Juste/);
  await expect(page.locator(`#${id} .q-expl`)).toBeVisible();

  // Tracé sur le document réponse : le trait est enregistré à la validation. (La correction et l'auto-évaluation
  // du tracé n'apparaissent, par conception du gabarit, qu'après les questions dont il dépend.)
  await tracer(page, 'sk_q3_1');
  await page.click('#sk_q3_1 .btn-sketch');
  await expect(page.locator('#sk_q3_1 .btn-sketch')).toHaveText('Tracé validé');
  await expect(page.locator('#sk_q3_1 .q-status').first()).toHaveText('Tracé enregistré');

  // Plein écran du tracé, par-dessus l'enveloppe ; Échap pour sortir.
  await page.click('#sk_q3_1 [data-act="full"]');
  await expect(page.locator('.sketch.is-full')).toHaveCount(1);
  expect(await page.evaluate(() => Boolean(document.elementFromPoint(30, 20).closest('.sketch.is-full')))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sketch.is-full')).toHaveCount(0);

  // « Imprimer les DR » : fenêtre avec les quatre documents réponses.
  const [fenetre] = await Promise.all([page.waitForEvent('popup'), page.click('#sk_q3_1 [data-act="drprint"]')]);
  await fenetre.waitForLoadState();
  expect(await fenetre.title()).toBe('Documents réponses à imprimer');
  await expect(fenetre.locator('.sheet')).toHaveCount(4);
  expect(await fenetre.locator('.sheet img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0))).toBe(true);
  await fenetre.close();

  expect(erreurs).toEqual([]);
  expect(tierces).toEqual([]);
});

test('examen : pas de correction pendant la composition, puis remise de la copie et note', async ({ page, baseURL }) => {
  const { erreurs, tierces } = await ouvrir(page, baseURL);
  await page.click('[data-mode=exam]');
  const id = await page.locator('.q[data-q]').first().getAttribute('id');
  await page.fill(`#in-${id}`, '12');
  await expect(page.locator(`#${id} .q-expl`)).toBeHidden();
  await page.click('#exam-submit');
  await page.click('#exam-submit');
  await expect(page.locator(`#${id} .q-expl`)).toBeVisible();
  await expect(page.locator('#recap .final-note')).toContainText('/20');
  expect(erreurs).toEqual([]);
  expect(tierces).toEqual([]);
});

test('impression : l’enveloppe et la fiche disparaissent, la copie s’imprime comme l’original', async ({ browser, baseURL }) => {
  async function imprimer(adresse) {
    const contexte = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await contexte.newPage();
    page.on('dialog', (d) => d.accept());
    await page.goto(adresse);
    await page.click('[data-mode=training]');
    await page.emulateMedia({ media: 'print' });
    const visibles = await page.evaluate(() => ['.enveloppe-tete', '.enveloppe-fiche', '.enveloppe-pied', '.banner', '.cartouche h1']
      .map((s) => { const e = document.querySelector(s); return [s, Boolean(e && e.getClientRects().length)]; }));
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await contexte.close();
    return { visibles: Object.fromEntries(visibles), pages: (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length };
  }
  const original = await imprimer(`file://${ORIGINAL}`);
  const enveloppe = await imprimer(new URL(CHEMIN, baseURL).href);
  expect(enveloppe.visibles).toEqual({
    '.enveloppe-tete': false, '.enveloppe-fiche': false, '.enveloppe-pied': false, '.banner': false, '.cartouche h1': true,
  });
  expect(original.pages).toBeGreaterThan(0);
  expect(enveloppe.pages).toBe(original.pages);
});
