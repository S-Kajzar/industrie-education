// Lot 1b sur un dépôt factice illustré : images de cartes et planches (TRAME § 10, DESIGN § 9), crédits, annales
// (statut, afficher_origine) et contenus autonomes déposés par le back-office (TRAME § 11).
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

const credit = (fichier, titre, autres = {}) => ({
  fichier, titre, auteur: 'Atelier d’essai', date: '1770', source: 'https://commons.wikimedia.org/', licence: 'domaine-public',
  reference_autorisation: '', usage: 'Essai', decorative: false, ...autres,
});

const annale = (id, autres = {}) => ({
  id, titre: `Annale ${id}`, presentation: 'Sujet factice pour les tests du site.', fichier: `medias/depots/${id}.html`,
  image: { fichier: null, alt: '' }, publics: ['si'], theme: 'mecanique', notions: ['statique'], duree_min: 120,
  origine: { diplome: '', epreuve: '', session: null }, afficher_origine: false,
  source: { editeur: 'Éditeur d’essai', url: 'https://exemple.test/sujets/essai.docx', licence: 'etalab-2.0', reference_autorisation: '' },
  statut: 'relu', mis_a_jour: '2026-11-20',
  ...autres,
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
    ecrire('medias/CREDITS.json', [
      credit('medias/cartes/photo.jpg', 'Photo d’essai'),
      credit('medias/cartes/transparente.png', 'Disque d’essai', { licence: 'oeuvre-personnelle' }),
      credit('medias/illustrations/planche.png', 'Engrenages, planche d’essai', { licence: 'cc0', decorative: true }),
    ]);
    // Contenu « un » avec image, « deux » sans image (bandeau).
    ecrire('contenus/essai/un/contenu.json', {
      id: 'un', titre: 'Contenu un', type: 'cours', niveau: 1, description: 'Contenu factice illustré.', mode: 'natif',
      notions: ['statique'], image: { fichier: 'medias/cartes/photo.jpg', alt: 'Photo d’essai : disques colorés' },
    });
    // Nouveau contenu autonome créé par le back-office : fiche à plat, fichier dans medias/depots/.
    ecrire('contenus/essai/quatre.json', {
      id: 'quatre', titre: 'Contenu quatre', type: 'exercice', niveau: '2', description: 'Contenu autonome déposé.',
      fichier: 'medias/depots/quatre.html', statut: 'relu', image: { fichier: 'medias/cartes/transparente.png', alt: 'Disque orange' },
    });
    ecrire('medias/depots/quatre.html', AUTONOME('Contenu quatre'));
    ecrire('contenus/essai/cinq.json', {
      id: 'cinq', titre: 'Contenu Xylophage', type: 'exercice', description: 'Brouillon jamais publié.',
      fichier: 'medias/depots/cinq.html', statut: 'brouillon',
    });
    ecrire('medias/depots/cinq.html', AUTONOME('Contenu Xylophage'));
    // Planches : un thème et l'accueil (décorative).
    const themes = JSON.parse(fs.readFileSync(path.join(racine, 'catalogue', 'themes.json'), 'utf8'));
    themes[0].illustration = { fichier: 'medias/illustrations/planche.png', alt: '' };
    ecrire('catalogue/themes.json', themes);
    const site = JSON.parse(fs.readFileSync(path.join(racine, 'site.json'), 'utf8'));
    ecrire('site.json', { ...site, illustration_accueil: { fichier: 'medias/illustrations/planche.png', alt: '' } });
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

test.afterAll(() => { if (IMAGES) fs.rmSync(IMAGES, { recursive: true, force: true }); });

// --------------------------------------------------------------------------------------------------------------
test.describe('la construction s’arrête sur une image mal déclarée', () => {
  const lireJson = (racine, f) => JSON.parse(fs.readFileSync(path.join(racine, f), 'utf8'));
  const CAS = [
    ['image absente de CREDITS.json', (ecrire, racine) => {
      ecrire('medias/CREDITS.json', lireJson(racine, 'medias/CREDITS.json').filter((c) => !c.fichier.endsWith('photo.jpg')));
    }, /Image sans crédit : medias\/cartes\/photo\.jpg \(citée par contenus\/essai\/un\/contenu\.json\)/],
    ['licence hors liste', (ecrire, racine) => {
      ecrire('medias/CREDITS.json', lireJson(racine, 'medias/CREDITS.json').map((c) => ({ ...c, licence: c.fichier.endsWith('photo.jpg') ? 'cc-by' : c.licence })));
    }, /Licence non acceptée « cc-by » pour medias\/cartes\/photo\.jpg/],
    ['autorisation écrite sans référence', (ecrire, racine) => {
      ecrire('medias/CREDITS.json', lireJson(racine, 'medias/CREDITS.json').map((c) => ({ ...c, licence: 'autorisation-ecrite' })));
    }, /Autorisation écrite sans référence pour medias\/cartes\/photo\.jpg/],
    ['texte alternatif manquant', (ecrire) => {
      ecrire('contenus/essai/un/contenu.json', {
        id: 'un', titre: 'Contenu un', type: 'cours', description: 'x', mode: 'natif', image: { fichier: 'medias/cartes/photo.jpg', alt: '' },
      });
    }, /Texte alternatif manquant pour medias\/cartes\/photo\.jpg \(citée par contenus\/essai\/un\/contenu\.json\)/],
    ['fichier image introuvable', (ecrire, racine) => {
      fs.rmSync(path.join(racine, 'medias', 'cartes', 'photo.jpg'));
    }, /Image introuvable : medias\/cartes\/photo\.jpg/],
  ];
  for (const [nom, modifier, message] of CAS) {
    test(nom, () => avecConstruction(modifier, (resultat, site) => {
      expect(resultat.status, resultat.stdout + resultat.stderr).toBe(1);
      expect(resultat.stderr).toMatch(message);
      expect(fs.existsSync(site)).toBe(false);
    }));
  }

  test('image décorative sans texte alternatif : acceptée, alt vide', () => avecConstruction((ecrire, racine) => {
    ecrire('medias/CREDITS.json', lireJson(racine, 'medias/CREDITS.json').map((c) => ({ ...c, decorative: true })));
    ecrire('contenus/essai/un/contenu.json', {
      id: 'un', titre: 'Contenu un', type: 'cours', description: 'x', mode: 'natif', image: { fichier: 'medias/cartes/photo.jpg', alt: '' },
    });
  }, (resultat, site) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    expect(fs.readFileSync(path.join(site, 'catalogue', 'index.html'), 'utf8')).toMatch(/<img src="..\/medias\/cartes\/photo-480\.webp"[^>]* alt=""/);
  }));
});

test('la construction s’arrête sur un fichier autonome qui charge une ressource extérieure', () => avecConstruction((ecrire) => {
  ecrire('medias/depots/essai-relu.html', AUTONOME('Annale essai-relu')
    .replace('</head>', '<script src="https://cdn.exemple.com/outil.js"></script>\n</head>'));
}, (resultat, site) => {
  expect(resultat.status, resultat.stdout).toBe(1);
  expect(resultat.stderr).toMatch(/medias\/depots\/essai-relu\.html, ligne 7 : ressource extérieure interdite \(<script src>\) : https:\/\/cdn\.exemple\.com\/outil\.js/);
  expect(fs.existsSync(site)).toBe(false);
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
    const credits = JSON.parse(fs.readFileSync(path.join(racine, 'medias', 'CREDITS.json'), 'utf8'));
    const entrees = page.locator('#images + .credits > .credit');
    await expect(entrees).toHaveCount(credits.length);
    for (const c of credits) {
      const entree = entrees.filter({ hasText: c.titre });
      await expect(entree).toHaveCount(1);
      await expect(entree).toContainText(c.auteur);
      await expect(entree).toContainText({ 'domaine-public': 'Domaine public', cc0: 'CC0', 'oeuvre-personnelle': 'Œuvre personnelle' }[c.licence]);
    }
  });
});
