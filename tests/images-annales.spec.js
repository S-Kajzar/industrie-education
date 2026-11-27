// Lot 1b sur un dépôt factice illustré : images de cartes et planches (TRAME § 10, DESIGN § 9), crédits saisis dans les
// fiches (lot 1e), annales (statut, afficher_origine) et contenus autonomes déposés par le back-office (TRAME § 11).
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { DEPOT, depotFactice, construire, servirSite } = require('./outils');

// Images d'essai dessinées par programme (tests/images_essai.py), produites une fois pour tout le fichier.
let IMAGES;
function imagesEssai() {
  if (!IMAGES) {
    IMAGES = fs.mkdtempSync(path.join(os.tmpdir(), 'images-essai-'));
    const r = spawnSync('python3', [path.join(DEPOT, 'tests', 'images_essai.py'), IMAGES], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
  }
  return IMAGES;
}

const AUTONOME = (titre) => `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>${titre}</title>\n`
  + `<meta name="description" content="Sujet d'essai neutre.">\n</head>\n<body>\n<h1>${titre}</h1>\n<p>Énoncé neutre.</p>\n</body>\n</html>\n`;

// Mots de l'origine de l'annale factice : ils ne doivent apparaître nulle part tant que afficher_origine vaut false.
const ORIGINE = { diplome: 'Brevet Zéphyr', epreuve: 'Épreuve Quokka', session: 1987 };

// Image d'une fiche avec son crédit (lot 1e) : complet par défaut.
const image = (fichier, alt, credit = {}) => ({
  fichier, alt, licence: 'domaine-public', source: 'https://commons.wikimedia.org/', auteur: 'Atelier d’essai', ...credit,
});

const annale = (id, autres = {}) => ({
  id, titre: `Annale ${id}`, presentation: 'Sujet factice pour les tests du site.', fichier: `medias/depots/${id}.html`,
  publics: ['si'], theme: 'mecanique', notions: ['statique'], duree_min: 120, origine: { diplome: '', epreuve: '', session: null },
  afficher_origine: false,
  source: { editeur: 'Éditeur d’essai', url: 'https://exemple.test/sujets/essai.docx', licence: 'etalab-2.0', reference_autorisation: '' },
  statut: 'relu', mis_a_jour: '2026-11-20',
  ...autres,
});

const contenuUn = (img) => ({
  id: 'un', titre: 'Contenu un', type: 'cours', niveau: 1, description: 'Contenu factice illustré.', mode: 'natif',
  notions: ['statique'], image: img,
});

// Dépôt factice illustré ; « modifier » permet d'y introduire une erreur ou une variante.
function depotIllustre(modifier) {
  return depotFactice((ecrire, racine) => {
    const images = imagesEssai();
    fs.mkdirSync(path.join(racine, 'medias', 'cartes'), { recursive: true });
    fs.mkdirSync(path.join(racine, 'medias', 'illustrations'), { recursive: true });
    fs.copyFileSync(path.join(images, 'photo.jpg'), path.join(racine, 'medias', 'cartes', 'photo.jpg'));
    fs.copyFileSync(path.join(images, 'transparente.png'), path.join(racine, 'medias', 'cartes', 'transparente.png'));
    fs.copyFileSync(path.join(images, 'planche.png'), path.join(racine, 'medias', 'illustrations', 'planche.png'));
    // Contenu « un » avec image, « deux » sans image (bandeau).
    ecrire('contenus/essai/un/contenu.json', contenuUn(image('medias/cartes/photo.jpg', 'Photo d’essai : disques colorés')));
    // Nouveau contenu autonome créé à plat (Pages CMS) : fiche à plat, fichier dans medias/depots/.
    ecrire('contenus/essai/quatre.json', {
      id: 'quatre', titre: 'Contenu quatre', type: 'exercice', niveau: '2', description: 'Contenu autonome déposé.',
      fichier: 'medias/depots/quatre.html', statut: 'relu',
      image: image('medias/cartes/transparente.png', 'Disque orange', { licence: 'oeuvre-personnelle', source: '', auteur: 'Auteur du site' }),
    });
    ecrire('medias/depots/quatre.html', AUTONOME('Contenu quatre'));
    ecrire('contenus/essai/cinq.json', {
      id: 'cinq', titre: 'Contenu Xylophage', type: 'exercice', description: 'Brouillon jamais publié.',
      fichier: 'medias/depots/cinq.html', statut: 'brouillon',
    });
    ecrire('medias/depots/cinq.html', AUTONOME('Contenu Xylophage'));
    // Planches : un thème et l'accueil, sans texte alternatif (décoratives).
    const planche = image('medias/illustrations/planche.png', '', { licence: 'cc0', auteur: 'Musée d’essai' });
    const themes = JSON.parse(fs.readFileSync(path.join(racine, 'catalogue', 'themes.json'), 'utf8'));
    themes[0].illustration = planche;
    ecrire('catalogue/themes.json', themes);
    const site = JSON.parse(fs.readFileSync(path.join(racine, 'site.json'), 'utf8'));
    ecrire('site.json', { ...site, illustration_accueil: planche });
    // Annales : une relue (origine renseignée, non affichée), une en brouillon.
    ecrire('annales/essai-relu.json', annale('essai-relu', { origine: ORIGINE }));
    ecrire('medias/depots/essai-relu.html', AUTONOME('Annale essai-relu'));
    ecrire('annales/essai-brouillon.json', annale('essai-brouillon', { titre: 'Annale Brouillonne Xylophage', statut: 'brouillon' }));
    ecrire('medias/depots/essai-brouillon.html', AUTONOME('Annale Brouillonne Xylophage'));
    if (modifier) modifier(ecrire, racine);
  });
}

function textesDuSite(dossier) {
  return fs.readdirSync(dossier, { recursive: true })
    .filter((f) => /\.(html|xml|txt)$/.test(f))
    .map((f) => [f, fs.readFileSync(path.join(dossier, f), 'utf8')]);
}

function avecConstruction(modifier, verifier) {
  const racine = depotIllustre(modifier);
  try {
    const resultat = construire(racine);
    return verifier(resultat, path.join(racine, '_site'), racine);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
}

const lireEtat = (site) => JSON.parse(fs.readFileSync(path.join(site, 'admin', 'etat.json'), 'utf8'));

test.afterAll(() => { if (IMAGES) fs.rmSync(IMAGES, { recursive: true, force: true }); });

// --------------------------------------------------------------------------------------------------------------
// Lot 1e : le crédit se saisit avec l'image, dans la fiche ; une image ne retient jamais sa fiche.
test.describe('images : crédit complet, case de risque, ni l’un ni l’autre', () => {
  const carte = (site) => fs.readFileSync(path.join(site, 'catalogue', 'index.html'), 'utf8')
    .match(/<a class="carte[^"]*" href="\.\.\/essai\/un\/"[\s\S]*?<\/a>/)[0];
  const credits = (site) => fs.readFileSync(path.join(site, 'credits', 'index.html'), 'utf8');

  test('crédit complet : image publiée, citée sur /credits/, aucun signalement ; fiche publiée', () => avecConstruction(null, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(carte(site)).toMatch(/<img src="\.\.\/medias\/cartes\/photo-480\.webp"/);
    expect(credits(site)).toContain('Carte du contenu « Contenu un »');
    const etat = lireEtat(site);
    expect(etat.images_a_regulariser).toEqual([]);
    expect(etat.a_corriger.images_non_publiees).toEqual([]);
  }));

  test('crédit absent, case cochée : image publiée, absente de /credits/, « à régulariser » ; fiche publiée', () => avecConstruction((ecrire) => {
    ecrire('contenus/essai/un/contenu.json', contenuUn({ fichier: '/medias/cartes/photo.jpg', alt: 'Photo', risque_accepte: true }));
  }, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(carte(site)).toMatch(/<img src="\.\.\/medias\/cartes\/photo-480\.webp"[^>]* alt="Photo"/);
    expect(credits(site)).not.toContain('Contenu un');
    const etat = lireEtat(site);
    expect(etat.images_a_regulariser.map((i) => [i.fichier, i.fiche])).toEqual([['medias/cartes/photo.jpg', 'contenus/essai/un/contenu.json']]);
    expect(etat.images_a_regulariser[0].correction).toContain('Complétez le crédit');
    expect(etat.comptes.images_a_regulariser).toBe(1);
    expect(etat.a_corriger.images_non_publiees).toEqual([]);
  }));

  test('ni crédit complet ni case cochée : image non publiée (bandeau), « à corriger » ; fiche publiée', () => avecConstruction((ecrire) => {
    ecrire('contenus/essai/un/contenu.json', contenuUn({ fichier: '/medias/cartes/photo.jpg', alt: 'Photo', auteur: 'Quelqu’un' }));
  }, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(fs.existsSync(path.join(site, 'essai', 'un', 'index.html'))).toBe(true);
    expect(carte(site)).toContain('carte-bandeau');
    expect(carte(site)).not.toContain('<img');
    expect(fs.existsSync(path.join(site, 'medias', 'cartes', 'photo-480.webp'))).toBe(false);
    expect(credits(site)).not.toContain('Contenu un');
    const [signal] = lireEtat(site).a_corriger.images_non_publiees;
    expect(signal.fichier).toBe('medias/cartes/photo.jpg');
    expect(signal.champ).toBe('Image de la carte');
    expect(signal.correction).toContain('Cochez la case « J’accepte le risque : image publiée sans crédit » ou complétez le crédit');
  }));

  const NON_PUBLIEES = [
    ['licence hors liste, même case cochée', image('medias/cartes/photo.jpg', 'Photo', { licence: 'cc-by', risque_accepte: true }),
      /Licence non acceptée « cc-by » pour medias\/cartes\/photo\.jpg/],
    ['autorisation écrite sans référence', image('medias/cartes/photo.jpg', 'Photo', { licence: 'autorisation-ecrite' }),
      /référence de l’autorisation écrite manquante/],
    ['fichier introuvable', image('medias/cartes/absente.jpg', 'Photo'), /Image introuvable : medias\/cartes\/absente\.jpg/],
  ];
  for (const [nom, img, message] of NON_PUBLIEES) {
    test(`image non publiée, fiche publiée : ${nom}`, () => avecConstruction((ecrire) => {
      ecrire('contenus/essai/un/contenu.json', contenuUn(img));
    }, (resultat, site) => {
      expect(resultat.status, resultat.stderr).toBe(0);
      expect(fs.existsSync(path.join(site, 'essai', 'un', 'index.html'))).toBe(true);
      expect(carte(site)).toContain('carte-bandeau');
      expect(lireEtat(site).a_corriger.images_non_publiees.map((i) => i.message).join('\n')).toMatch(message);
    }));
  }

  test('texte alternatif vide : image décorative, alt=""', () => avecConstruction((ecrire) => {
    ecrire('contenus/essai/un/contenu.json', contenuUn(image('medias/cartes/photo.jpg', '')));
  }, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(carte(site)).toMatch(/<img src="\.\.\/medias\/cartes\/photo-480\.webp"[^>]* alt=""/);
  }));

  test('image orpheline (téléversée, citée par aucune fiche) : signalée, rien n’est bloqué', () => avecConstruction((ecrire, racine) => {
    fs.copyFileSync(path.join(imagesEssai(), 'photo.jpg'), path.join(racine, 'medias', 'cartes', 'oubliee.jpg'));
  }, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(lireEtat(site).a_corriger.images_orphelines.map((i) => i.fichier)).toEqual(['medias/cartes/oubliee.jpg']);
    // Les images des brouillons ne sont pas orphelines ; aucune variante n'est publiée pour l'orpheline.
    expect(fs.existsSync(path.join(site, 'medias', 'cartes', 'oubliee-480.webp'))).toBe(false);
  }));
});

test('fichier autonome qui charge une ressource extérieure : annale retenue, le reste se construit', () => avecConstruction((ecrire) => {
  ecrire('medias/depots/essai-relu.html', AUTONOME('Annale essai-relu')
    .replace('</head>', '<script src="https://cdn.exemple.com/outil.js"></script>\n</head>'));
}, (resultat, site) => {
  expect(resultat.status, resultat.stderr).toBe(0);
  const [retenue] = lireEtat(site).a_corriger.fiches_retenues;
  expect(retenue.fiche).toBe('annales/essai-relu.json');
  expect(retenue.erreurs[0].champ).toBe('Fichier HTML du sujet');
  expect(retenue.erreurs[0].message).toMatch(/medias\/depots\/essai-relu\.html, ligne 7 : ressource extérieure interdite \(<script src>\) : https:\/\/cdn\.exemple\.com\/outil\.js/);
  expect(fs.existsSync(path.join(site, 'annales', 'essai-relu'))).toBe(false);
  expect(fs.existsSync(path.join(site, 'essai', 'un', 'index.html'))).toBe(true);
}));

// --------------------------------------------------------------------------------------------------------------
test('annale « brouillon » : aucune page, aucune carte, absente du sitemap ; « relu » : publiée partout', () => avecConstruction(null, (resultat, site) => {
  expect(resultat.status, resultat.stderr).toBe(0);
  expect(fs.existsSync(path.join(site, 'annales', 'essai-brouillon'))).toBe(false);
  expect(fs.existsSync(path.join(site, 'essai', 'cinq'))).toBe(false);
  for (const [fichier, texte] of textesDuSite(site)) {
    expect(texte, fichier).not.toContain('Xylophage');
    expect(texte, fichier).not.toContain('essai-brouillon');
  }
  // L'annale relue : sa page, l'index, la filière, le catalogue, l'accueil, le sitemap.
  expect(fs.existsSync(path.join(site, 'annales', 'essai-relu', 'index.html'))).toBe(true);
  const lien = 'annales/essai-relu/';
  for (const page of ['annales/index.html', 'annales/si/index.html', 'catalogue/index.html', 'index.html']) {
    expect(fs.readFileSync(path.join(site, page), 'utf8'), page).toContain(lien);
  }
  expect(fs.readFileSync(path.join(site, 'sitemap.xml'), 'utf8')).toContain(`/industrie-education/${lien}</loc>`);
  // Le contenu autonome créé à plat par le back-office est publié à son adresse, enveloppé.
  const quatre = fs.readFileSync(path.join(site, 'essai', 'quatre', 'index.html'), 'utf8');
  expect(quatre).toContain('<!-- début de l’enveloppe industrie.education -->');
  expect(quatre).toContain('<h1>Contenu quatre</h1>');
}));

test('afficher_origine à false : diplôme, épreuve et session n’apparaissent dans aucune page générée', () => avecConstruction(null, (resultat, site) => {
  expect(resultat.status, resultat.stderr).toBe(0);
  for (const [fichier, texte] of textesDuSite(site)) {
    for (const mot of ['Zéphyr', 'Quokka', '1987']) expect(texte, `${fichier} : ${mot}`).not.toContain(mot);
  }
}));

test('afficher_origine à true : l’origine apparaît dans la fiche, le titre et l’index', () => avecConstruction((ecrire) => {
  ecrire('annales/essai-relu.json', annale('essai-relu', { origine: ORIGINE, afficher_origine: true }));
}, (resultat, site) => {
  expect(resultat.status, resultat.stderr).toBe(0);
  const page = fs.readFileSync(path.join(site, 'annales', 'essai-relu', 'index.html'), 'utf8');
  const titre = page.match(/<title>([^<]*)<\/title>/)[1];
  expect(titre).toContain('Brevet Zéphyr 1987 Épreuve Quokka');
  const fiche = page.match(/<section class="enveloppe-fiche"[\s\S]*?<\/section>/)[0];
  expect(fiche).toContain('<dt>Origine</dt>');
  expect(fiche).toContain('Brevet Zéphyr 1987 Épreuve Quokka');
  expect(fs.readFileSync(path.join(site, 'annales', 'index.html'), 'utf8')).toContain('Brevet Zéphyr 1987 Épreuve Quokka');
}));

// --------------------------------------------------------------------------------------------------------------
test.describe('site factice illustré, dans le navigateur', () => {
  let racine;
  let serveur;

  test.beforeAll(async () => {
    racine = depotIllustre();
    const resultat = construire(racine);
    if (resultat.status !== 0) throw new Error(resultat.stderr);
    serveur = await servirSite(path.join(racine, '_site'), 4191 + test.info().workerIndex);
  });

  test.afterAll(() => {
    if (serveur) serveur.arreter();
    if (racine) fs.rmSync(racine, { recursive: true, force: true });
  });

  for (const largeur of [1280, 360]) {
    test(`cartes à ${largeur} px : image (alt, srcset, dimensions, chargement différé) ou bandeau, même hauteur`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      await page.goto(`${serveur.adresse}catalogue/`);
      const avec = page.locator('a.carte[href$="essai/un/"]');
      const sans = page.locator('a.carte[href$="essai/deux/"]');
      const image = avec.locator('.carte-image img');
      await expect(image).toHaveAttribute('alt', 'Photo d’essai : disques colorés');
      await expect(image).toHaveAttribute('srcset', /photo-480\.webp 480w, .*photo-960\.webp 960w/);
      await expect(image).toHaveAttribute('width', '480');
      await expect(image).toHaveAttribute('height', '270');
      await expect(image).toHaveAttribute('loading', 'lazy');
      await expect(sans.locator('.carte-bandeau')).toBeVisible();
      await expect(sans.locator('img')).toHaveCount(0);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty('complete', true);
      const hauteur = async (l) => (await l.boundingBox()).height;
      const h1 = await hauteur(avec.locator('.carte-image'));
      const h2 = await hauteur(sans.locator('.carte-bandeau'));
      expect(Math.abs(h1 - h2)).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }

  test('image de carte ≤ 40 Ko (480 px), variantes WebP', () => {
    const cartes = path.join(racine, '_site', 'medias', 'cartes');
    const variantes = fs.readdirSync(cartes);
    expect(variantes.sort()).toEqual(['photo-480.webp', 'photo-960.webp', 'transparente-480.webp', 'transparente-960.webp']);
    for (const v of variantes.filter((f) => f.endsWith('-480.webp'))) {
      expect(fs.statSync(path.join(cartes, v)).size, v).toBeLessThanOrEqual(40 * 1000);
    }
    // Les originaux ne sont pas publiés.
    expect(fs.existsSync(path.join(racine, '_site', 'medias', 'cartes', 'photo.jpg'))).toBe(false);
  });

  test('accueil avec planche : < 300 Ko au premier affichage', async ({ page }) => {
    const mesures = [];
    page.on('requestfinished', (r) => mesures.push(r.sizes().then((s) => s.responseBodySize + s.responseHeadersSize)));
    await page.goto(serveur.adresse, { waitUntil: 'networkidle' });
    await expect(page.locator('.illustration-accueil')).toBeVisible();
    const total = (await Promise.all(mesures)).reduce((a, b) => a + b, 0);
    console.log(`Accueil avec planche : ${(total / 1000).toFixed(1)} ko.`);
    expect(total).toBeLessThan(300 * 1000);
  });

  test('titre d’accueil posé sur la planche : contraste d’au moins 4,5:1 sur toute sa surface', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(serveur.adresse, { waitUntil: 'networkidle' });
    const planche = page.locator('.illustration-accueil');
    await expect(planche).toHaveJSProperty('complete', true);
    // Fond réel sous le texte : on rend le texte transparent et on cherche le pixel le plus sombre sous le titre.
    await page.addStyleTag({ content: '#titre-accueil{color:transparent!important}' });
    const zone = await page.locator('#titre-accueil').boundingBox();
    const capture = await page.screenshot({ clip: zone });
    const plusSombre = await page.evaluate(async (donnees) => {
      const img = new Image();
      img.src = `data:image/png;base64,${donnees}`;
      await img.decode();
      const toile = new OffscreenCanvas(img.width, img.height);
      const ctx = toile.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
      const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      let min = 1;
      for (let i = 0; i < pixels.length; i += 4) {
        min = Math.min(min, 0.2126 * lin(pixels[i]) + 0.7152 * lin(pixels[i + 1]) + 0.0722 * lin(pixels[i + 2]));
      }
      return min;
    }, capture.toString('base64'));
    const encre = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--encre').trim());
    const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const [r, g, b] = encre.match(/[0-9a-f]{2}/gi).map((h) => parseInt(h, 16));
    const lEncre = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const contraste = (plusSombre + 0.05) / (lEncre + 0.05);
    expect(plusSombre).toBeLessThan(1); // la planche est bien sous le titre
    expect(contraste).toBeGreaterThanOrEqual(4.5);
  });

  test('planche d’accueil sur téléphone : bandeau de 120 px au-dessus du titre', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(serveur.adresse);
    const planche = await page.locator('.illustration-accueil').boundingBox();
    const titre = await page.locator('#titre-accueil').boundingBox();
    expect(Math.round(planche.height)).toBe(120);
    expect(planche.y + planche.height).toBeLessThanOrEqual(titre.y + 1);
  });

  test('planche de thème et vignette ; sans planche, rendu inchangé', async ({ page }) => {
    await page.goto(`${serveur.adresse}mecanique/`);
    await expect(page.locator('.bande .illustration-theme')).toBeVisible();
    await page.goto(`${serveur.adresse}energie/`);
    await expect(page.locator('.illustration-theme')).toHaveCount(0);
    await page.goto(serveur.adresse);
    await expect(page.locator('.index-themes .illustration-vignette')).toHaveCount(1);
  });

  test('page /credits/ complète (images et annales), liée depuis le pied de page', async ({ page }) => {
    await page.goto(serveur.adresse);
    await page.locator('.site-pied').getByRole('link', { name: 'Crédits' }).click();
    await expect(page.locator('h1')).toHaveText('Crédits');
    // Section « Annales » : les annales publiées seulement, avec titre, éditeur, lien source, licence, ligne de crédit.
    const annales = page.locator('#annales + .credits > .credit');
    await expect(annales).toHaveCount(1);
    await expect(annales.getByRole('link', { name: 'Annale essai-relu' })).toHaveAttribute('href', '../annales/essai-relu/');
    await expect(annales).toContainText('Éditeur d’essai');
    await expect(annales).toContainText('Licence Ouverte 2.0 (Etalab)');
    await expect(annales.locator('a[href="https://exemple.test/sujets/essai.docx"]')).toHaveCount(2);
    await expect(annales.locator('.credit-ligne')).toHaveText(
      'D’après un document publié par Éditeur d’essai, Licence Ouverte 2.0. Adaptation : industrie.education.');
    await expect(page.locator('body')).not.toContainText('Xylophage');
    // Section « Images » : une entrée par image publiée avec un crédit complet, produite à partir des fiches.
    const entrees = page.locator('#images + .credits > .credit');
    await expect(entrees).toHaveCount(3);
    for (const [usage, auteur, licence] of [
      ['Carte du contenu « Contenu un »', 'Atelier d’essai', 'Domaine public'],
      ['Carte du contenu « Contenu quatre »', 'Auteur du site', 'Œuvre personnelle'],
      ['Planche de l’accueil', 'Musée d’essai', 'CC0'],
    ]) {
      const entree = entrees.filter({ hasText: usage });
      await expect(entree).toHaveCount(1);
      await expect(entree).toContainText(auteur);
      await expect(entree).toContainText(licence);
    }
    // La planche sert à l'accueil et au thème : une seule entrée, deux usages.
    await expect(entrees.filter({ hasText: 'Planche du thème « Mécanique et conception »' })).toHaveCount(1);
  });
});
