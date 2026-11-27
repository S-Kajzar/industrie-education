// Lot 1e : bandeau d'état de la publication et champ « Tester le fichier » de /admin/ (admin/admin.js).
// Aucune requête réelle : le fichier d'état (admin/etat.json) et l'API de GitHub sont simulés ; tout autre hôte est
// bloqué. Le bandeau n'utilise jamais le jeton de Sveltia (aucun en-tête Authorization).
'use strict';

const { test, expect } = require('@playwright/test');
const { fichiersDuDepot, preparerDepotLocal, lireDepotLocal } = require('./depot-local');

const API_RUNS = /^https:\/\/api\.github\.com\/repos\/S-Kajzar\/industrie-education\/actions\/workflows\/publier\.yml\/runs\?/;
const API_CONTENU = /^https:\/\/api\.github\.com\/repos\/S-Kajzar\/industrie-education\/contents\//;

const ETAT = {
  format: 1,
  construit_le: new Date().toISOString(),
  publiees: ['annales/levage-dechargement-sacs-linge/'],
  comptes: { publiees: 1, fiches_retenues: 1, a_corriger: 3, images_a_regulariser: 1, brouillons: 1, nouvelles_versions: 0 },
  a_corriger: {
    fiches_retenues: [{
      fiche: 'annales/essai-retenue.json', titre: 'Essai retenu', rubrique: 'Annales', statut: 'relu', etait_en_ligne: true,
      erreurs: [{ champ: 'Source et licence du sujet', message: 'annales/essai-retenue.json : champ « source » manquant.', correction: 'Remplissez l’éditeur, l’adresse et la licence.' }],
    }],
    brouillons: [{
      fiche: 'annales/essai-brouillon.json', titre: 'Essai brouillon', rubrique: 'Annales', statut: 'brouillon', etait_en_ligne: false,
      erreurs: [{ champ: 'Thème', message: 'Champ « theme » manquant.', correction: 'Choisissez le thème dans la liste.' }],
    }],
    nouvelles_versions: [],
    images_non_publiees: [{ fichier: 'medias/cartes/sans-credit.jpg', usage: 'Carte du contenu « Un »', fiche: 'contenus/essai/un/contenu.json', champ: 'Image de la carte', message: 'Image sans crédit complet.', correction: 'Cochez la case ou complétez le crédit.' }],
    images_orphelines: [], fichiers_non_importes: [], notions_proposees: [], autres: [],
  },
  images_a_regulariser: [{ fichier: 'medias/cartes/a-regulariser.jpg', usage: 'Carte de l’annale « Deux »', fiche: 'annales/deux.json', champ: 'Image de la carte', message: 'Image publiée sans crédit complet.', correction: 'Complétez le crédit dès que possible.' }],
  nouvelles_versions: [],
};

const RUNS = {
  'en cours': [{ status: 'in_progress', conclusion: null, html_url: 'https://github.com/S-Kajzar/industrie-education/actions/runs/2' }],
  'échec': [
    { status: 'completed', conclusion: 'cancelled', html_url: 'https://github.com/S-Kajzar/industrie-education/actions/runs/4' },
    { status: 'completed', conclusion: 'failure', html_url: 'https://github.com/S-Kajzar/industrie-education/actions/runs/3' },
  ],
  'en ligne': [{ status: 'completed', conclusion: 'success', html_url: 'https://github.com/S-Kajzar/industrie-education/actions/runs/1' }],
};

// /admin/ avec un état et une API simulés ; renvoie la page et les requêtes faites vers l'API de GitHub.
async function ouvrir(browser, baseURL, { runs, etat = ETAT, contenus = {}, viewport = { width: 1280, height: 900 } }) {
  const contexte = await browser.newContext({ locale: 'fr-FR', timezoneId: 'Europe/Paris', viewport, acceptDownloads: true });
  const origine = new URL(baseURL).origin;
  const api = [];
  await contexte.route('**/admin/etat.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(etat) }));
  await contexte.route((url) => url.origin !== origine, (route) => {
    const requete = route.request();
    if (API_RUNS.test(requete.url())) {
      api.push({ url: requete.url(), autorisation: requete.headers().authorization });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workflow_runs: runs }) });
    }
    if (API_CONTENU.test(requete.url())) {
      api.push({ url: requete.url(), autorisation: requete.headers().authorization, accept: requete.headers().accept });
      const chemin = decodeURIComponent(new URL(requete.url()).pathname.split('/contents/')[1]);
      return contenus[chemin] ? route.fulfill({ status: 200, contentType: 'text/plain', body: contenus[chemin] }) : route.fulfill({ status: 404, body: '{}' });
    }
    return route.abort();
  });
  const page = await contexte.newPage();
  page.setDefaultTimeout(20_000);
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.goto(new URL('admin/', baseURL).href);
  return { contexte, page, api, erreurs, adresse: new URL('admin/', baseURL).href };
}

test.describe('bandeau d’état de la publication', () => {
  test.describe.configure({ timeout: 60_000 });

  for (const [nom, attendu] of [['en cours', /^Publication en cours$/], ['échec', /^Échec : voir le détail$/], ['en ligne', /^En ligne depuis \d{2}:\d{2}$/]]) {
    test(`état « ${nom} »`, async ({ browser, baseURL }) => {
      const { contexte, page, api, erreurs } = await ouvrir(browser, baseURL, { runs: RUNS[nom] });
      const bandeau = page.getByRole('region', { name: 'État de la publication' });
      await expect(bandeau.locator('.etat-statut')).toHaveText(attendu);
      if (nom !== 'en ligne') {
        // Lien vers l'exécution sur GitHub (une exécution annulée par la file d'attente est sautée).
        await expect(bandeau.locator('.etat-ligne a').first()).toHaveAttribute('href', RUNS[nom].find((r) => r.conclusion !== 'cancelled').html_url);
      }
      // Une seule requête au chargement, sans le jeton de Sveltia.
      expect(api.length).toBe(1);
      expect(api[0].autorisation).toBeUndefined();
      expect(erreurs).toEqual([]);
      await contexte.close();
    });
  }

  test('API indisponible : « En ligne depuis » d’après le fichier d’état, avec une note', async ({ browser, baseURL }) => {
    const contexte = await browser.newContext({ locale: 'fr-FR' });
    await contexte.route('**/admin/etat.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ETAT) }));
    await contexte.route((url) => url.origin !== new URL(baseURL).origin, (route) => route.abort());
    const page = await contexte.newPage();
    await page.goto(new URL('admin/', baseURL).href);
    await expect(page.locator('#etat-publication .etat-statut')).toHaveText(/^En ligne depuis \d{2}:\d{2}$/);
    await expect(page.locator('#etat-publication .etat-note')).toContainText('état de GitHub indisponible');
    await contexte.close();
  });

  test('fiches retenues et images à régulariser : comptes reliés à leur liste, avec les corrections', async ({ browser, baseURL }) => {
    const { contexte, page } = await ouvrir(browser, baseURL, { runs: RUNS['en ligne'] });
    const bandeau = page.locator('#etat-publication');
    const retenues = bandeau.locator('[data-compte="fiches-retenues"]');
    await expect(retenues).toHaveText('1 fiche retenue');
    await expect(bandeau.locator('[data-compte="images-a-regulariser"]')).toHaveText('1 image à régulariser');
    await expect(bandeau.locator('[data-compte="autres"]')).toHaveText('2 autres points à corriger');
    await expect(bandeau.locator('#etat-a-corriger')).not.toHaveAttribute('open', '');
    await retenues.click();
    const liste = bandeau.locator('#etat-a-corriger');
    await expect(liste).toHaveAttribute('open', '');
    await expect(liste).toContainText('Annales : « Essai retenu »');
    await expect(liste).toContainText('Retirée du site : elle était en ligne.');
    await expect(liste).toContainText('Source et licence du sujet');
    await expect(liste).toContainText('→ Remplissez l’éditeur, l’adresse et la licence.');
    await expect(liste).toContainText('Brouillons : avertissements (1)');
    await expect(liste).toContainText('Images non publiées (1)');
    await expect(liste.getByRole('link', { name: 'ouvrir la fiche' }).first()).toHaveAttribute('href', '#/collections/annales/entries/essai-retenue');
    await bandeau.locator('[data-compte="images-a-regulariser"]').click();
    await expect(bandeau.locator('#etat-a-regulariser')).toHaveAttribute('open', '');
    await expect(bandeau.locator('#etat-a-regulariser')).toContainText('Carte de l’annale « Deux »');
    await expect(bandeau.locator('#etat-a-regulariser')).toContainText('→ Complétez le crédit dès que possible.');
    await contexte.close();
  });

  test('l’interface de Sveltia commence sous le bandeau ; « Actualiser » interroge de nouveau', async ({ browser, baseURL }) => {
    const { contexte, page, api } = await ouvrir(browser, baseURL, { runs: RUNS['en cours'] });
    await page.getByRole('button', { name: 'Travailler avec un dépôt local' }).waitFor();
    const bas = await page.locator('#etat-publication').evaluate((e) => e.getBoundingClientRect().bottom);
    const haut = await page.locator('.app-shell').evaluate((e) => e.getBoundingClientRect().top);
    expect(haut).toBeGreaterThanOrEqual(Math.floor(bas));
    await page.getByRole('button', { name: 'Actualiser' }).click();
    await expect.poll(() => api.length).toBe(2);
    await contexte.close();
  });
});

test.describe('champ « Tester le fichier »', () => {
  test.describe.configure({ timeout: 90_000 });

  const SUJET = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>Essai</title>\n</head>\n<body>\n<h1>Essai</h1>\n</body>\n</html>\n';
  const NOUVEAU = SUJET.replace('<h1>Essai</h1>', '<h1>Essai, nouvelle version</h1>');
  const FICHE = {
    id: 'essai-version', titre: 'Annale d’essai', presentation: 'Sujet factice pour tester la nouvelle version.',
    fichier: '/medias/depots/essai-version.html',
    nouvelle_version: { fichier: '/medias/a-relire/essai-version.html', deposee_le: '2026-11-28' },
    publics: ['si'], theme: 'mecanique', afficher_origine: false,
    source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr' },
    statut: 'relu', mis_a_jour: '2026-11-20',
  };
  const b64 = (texte) => Buffer.from(texte).toString('base64');

  async function ouvrirFiche(browser, baseURL) {
    const outil = await ouvrir(browser, baseURL, {
      runs: RUNS['en ligne'],
      contenus: { 'medias/depots/essai-version.html': SUJET, 'medias/a-relire/essai-version.html': NOUVEAU },
    });
    const { page, adresse } = outil;
    await page.getByRole('button', { name: 'Travailler avec un dépôt local' }).waitFor();
    await preparerDepotLocal(page, [...fichiersDuDepot(), { chemin: 'annales/essai-version.json', b64: b64(`${JSON.stringify(FICHE, null, 2)}\n`) },
      { chemin: 'medias/depots/essai-version.html', b64: b64(SUJET) }, { chemin: 'medias/a-relire/essai-version.html', b64: b64(NOUVEAU) }]);
    await page.getByRole('button', { name: 'Travailler avec un dépôt local' }).click();
    await page.waitForURL(/#\/collections/, { timeout: 15_000 });
    await page.goto(`${adresse}#/collections/annales/entries/essai-version`);
    await expect(page.locator('section[data-key-path="valider_nouvelle_version"]')).toBeVisible();
    return outil;
  }

  test('« Télécharger pour tester » : fichier enregistré sur l’ordinateur, nouvelle version à part, sans jeton', async ({ browser, baseURL }) => {
    const { contexte, page, api } = await ouvrirFiche(browser, baseURL);
    const champ = page.locator('section[data-key-path="valider_nouvelle_version"]');
    await expect(champ).toContainText('Nouvelle version à relire (déposée le 2026-11-28)');
    for (const [bouton, nom, contenu] of [['Télécharger pour tester', 'essai-version.html', SUJET],
      ['Télécharger la nouvelle version pour tester', 'essai-version-nouvelle-version.html', NOUVEAU]]) {
      const [telechargement] = await Promise.all([page.waitForEvent('download'), champ.getByRole('button', { name: bouton, exact: true }).click()]);
      expect(telechargement.suggestedFilename()).toBe(nom);
      expect(require('node:fs').readFileSync(await telechargement.path(), 'utf8')).toBe(contenu);
    }
    await expect(champ.getByRole('status')).toContainText('Fichier enregistré sur votre ordinateur');
    const contenus = api.filter((a) => API_CONTENU.test(a.url));
    expect(contenus.length).toBe(2);
    for (const a of contenus) {
      expect(a.autorisation).toBeUndefined();
      expect(a.accept).toBe('application/vnd.github.raw');
    }
    // Le fichier n'est jamais ouvert dans l'onglet du back-office.
    expect(contexte.pages().length).toBe(1);
    await contexte.close();
  });

  test('« Valider la nouvelle version » : décochée, rien n’est écrit ; cochée, true', async ({ browser, baseURL }) => {
    const { contexte, page } = await ouvrirFiche(browser, baseURL);
    const enregistrer = async () => {
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await expect(page.getByText('Entrée enregistrée.')).toBeVisible();
    };
    // Un enregistrement ordinaire n'ajoute pas la case.
    await page.getByRole('textbox', { name: 'Titre', exact: true }).fill('Annale d’essai (modifiée)');
    await enregistrer();
    const fiche = JSON.parse(await lireDepotLocal(page, 'annales/essai-version.json'));
    expect(fiche.titre).toBe('Annale d’essai (modifiée)');
    expect(fiche).not.toHaveProperty('valider_nouvelle_version');
    expect(fiche.nouvelle_version).toEqual(FICHE.nouvelle_version);
    // Cochée puis enregistrée : l'import suivant remplacera le fichier (tests/import.spec.js).
    await page.goto(`${new URL('admin/', baseURL).href}#/collections/annales/entries/essai-version`);
    await page.getByRole('checkbox', { name: 'Valider la nouvelle version' }).check();
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect.poll(async () => JSON.parse(await lireDepotLocal(page, 'annales/essai-version.json')).valider_nouvelle_version).toBe(true);
    await contexte.close();
  });
});
