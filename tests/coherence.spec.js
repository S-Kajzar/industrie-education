// Lot 1c : cohérence éditoriale du site publié et règles de construction.
//   - filières : toute filière visée par un contenu ou une annale publiés est active ;
//   - notions : libellés de catalogue/notions.json, identifiant inconnu refusé avec les identifiants proches ;
//   - thèmes sans contenu publié : « Bientôt », sans page, absents du sitemap, jamais liés ; traitement automatique ;
//   - mentions légales : indexable refusé tant qu'elles sont incomplètes ; « À compléter avant l'ouverture » ;
//   - source des annales : obligatoire au statut « relu », ligne de crédit sur chaque annale, section des crédits ;
//   - pages Labo et Maquettes « à venir », bloc « Bientôt » de l'accueil ; icône vide (pas de requête favicon.ico) ;
//   - résumé de publication (--resume) pour le récapitulatif de l'Action.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  DEPOT, SITE, site, themes, publics, annales, cartesCatalogue, themeActif, pagesConstruites, fichierDePage,
  depotFactice, construire, lireJSON,
} = require('./outils');

const NOTIONS = lireJSON('catalogue/notions.json');
const lire = (chemin) => fs.readFileSync(fichierDePage(chemin), 'utf8');

function avecDepot(modifier, verifier) {
  const racine = depotFactice(modifier);
  try {
    return verifier(construire(racine), racine);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
}

// Annale factice minimale : fichier autonome déposé et fiche à plat.
function deposerAnnale(ecrire, id, autres = {}) {
  ecrire(`medias/depots/${id}.html`, '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>Sujet</title>\n'
    + '</head>\n<body>\n<h1>Sujet</h1>\n</body>\n</html>\n');
  ecrire(`annales/${id}.json`, {
    id, titre: `Annale ${id}`, presentation: 'Sujet factice.', fichier: `medias/depots/${id}.html`, publics: ['si'],
    theme: 'mecanique', notions: ['statique'], duree_min: 60, statut: 'relu', mis_a_jour: '2026-11-20',
    source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr', reference_autorisation: '' },
    ...autres,
  });
}

// --------------------------------------------------------------------------------------------------------------
test('filières : toute filière visée par un contenu ou une annale publiés est active', () => {
  const inactives = new Set(publics.filter((p) => !p.actif).map((p) => p.id));
  const fautes = [];
  for (const c of cartesCatalogue()) {
    for (const p of c.publics) if (inactives.has(p)) fautes.push(`« ${p} » est inactive mais visée par ${c.chemin} (${c.titre})`);
  }
  expect(fautes, 'passer ces filières à actif: true dans catalogue/publics.json').toEqual([]);
});

// --------------------------------------------------------------------------------------------------------------
test.describe('notions', () => {
  test('les pages affichent les libellés accentués de catalogue/notions.json', () => {
    const nom = Object.fromEntries(NOTIONS.map((n) => [n.id, n.nom]));
    for (const a of annales()) {
      const page = lire(a.chemin);
      for (const n of a.notions) expect(page, `${a.chemin} : ${n}`).toContain(nom[n]);
      expect(page).not.toContain('cinematique graphique');
    }
  });

  test('un identifiant inconnu arrête la construction, avec les identifiants proches', () => avecDepot((ecrire) => {
    ecrire('contenus/essai/un/contenu.json', {
      id: 'un', titre: 'Contenu un', type: 'cours', niveau: 1, description: 'x', mode: 'natif', notions: ['cinematique'],
    });
  }, (resultat) => {
    expect(resultat.status).toBe(1);
    expect(resultat.stderr).toMatch(/Notion inconnue « cinematique » dans contenus\/essai\/un\/contenu\.json\. Identifiants proches : cinematique-graphique\./);
    expect(resultat.stderr).toContain('rubrique « Notions » du back-office');
  }));

  test('catalogue/notions.json : identifiants valides et uniques, libellés renseignés', () => {
    const ids = NOTIONS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of NOTIONS) {
      expect(n.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(n.nom.trim()).not.toBe('');
    }
  });
});

// --------------------------------------------------------------------------------------------------------------
test.describe('thèmes sans contenu publié', () => {
  const vides = themes.filter((t) => !themeActif(t.id));

  test('au moins un thème est concerné (sinon ce bloc ne vérifie rien)', () => {
    expect(vides.length).toBeGreaterThan(0);
  });

  test('pas de page, absents du sitemap, aucun lien vers eux', () => {
    const sitemap = fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8');
    for (const t of vides) {
      expect(fs.existsSync(path.join(SITE, t.id)), `${t.id}/ ne doit pas être généré`).toBe(false);
      expect(sitemap).not.toContain(`${site.base}${t.id}/<`);
    }
    for (const chemin of pagesConstruites()) {
      const page = lire(chemin);
      for (const t of vides) {
        expect(page, `${chemin} : lien vers ${t.id}/`).not.toMatch(new RegExp(`href="(?:\\.\\./|\\./)*${t.id}/"`));
        expect(page, `${chemin} : lien vers ${t.id}/`).not.toContain(`href="${site.base}${t.id}/"`);
      }
    }
  });

  test('accueil : « Bientôt » à la place du nombre, sans lien ; catalogue : filtre « bientôt » désactivé', async ({ page }) => {
    await page.goto('');
    for (const t of vides) {
      const ligne = page.locator('.index-themes li').filter({ hasText: t.nom });
      await expect(ligne.locator('.index-nb')).toHaveText('Bientôt');
      await expect(ligne.locator('a')).toHaveCount(0);
    }
    await page.goto('catalogue/');
    for (const t of vides) {
      const option = page.locator(`[data-filtre="theme"][data-valeur="${t.id}"]`);
      await expect(option).toBeDisabled();
      await expect(option).toContainText('bientôt');
    }
  });

  test('automatique : un contenu publié dans le thème lui rend sa page et son lien', () => avecDepot((ecrire) => {
    ecrire('contenus/maisons/collection.json', {
      titre: 'Maisons', theme: 'habitat', publics: ['sti2d'], description: 'Collection factice.',
    });
    ecrire('contenus/maisons/isolation/contenu.json', {
      id: 'isolation', titre: 'Isolation', type: 'cours', niveau: 1, description: 'x', mode: 'natif',
    });
    ecrire('contenus/maisons/isolation/index.html', '<p>Cours factice.</p>\n');
  }, (resultat, racine) => {
    expect(resultat.status, resultat.stderr).toBe(0);
    const sortie = path.join(racine, '_site');
    expect(fs.existsSync(path.join(sortie, 'habitat', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(sortie, 'systemes'))).toBe(false);
    expect(fs.readFileSync(path.join(sortie, 'index.html'), 'utf8')).toContain('href="./habitat/"');
    expect(fs.readFileSync(path.join(sortie, 'sitemap.xml'), 'utf8')).toContain('/habitat/<');
  }));
});

// --------------------------------------------------------------------------------------------------------------
test.describe('mentions légales', () => {
  const COMPLETES = {
    editeur: { nom: 'Éditeur d’essai', adresse: '', directeur_publication: 'Directeur d’essai' }, contact: 'contact@exemple.test',
  };

  test('indexable: true refusé tant que les mentions sont incomplètes, avec le champ à remplir', () => {
    for (const [manque, modifier] of [
      ['Nom de l\'éditeur', (s) => { s.editeur.nom = ''; }],
      ['Directeur de la publication', (s) => { s.editeur.directeur_publication = ''; }],
      ['Adresse de contact', (s) => { s.contact = ''; }],
    ]) {
      avecDepot((ecrire) => {
        const reglages = { ...lireJSON('site.json'), ...structuredClone(COMPLETES), indexable: true };
        modifier(reglages);
        ecrire('site.json', reglages);
      }, (resultat) => {
        expect(resultat.status, manque).toBe(1);
        expect(resultat.stderr).toContain('« indexable » ne peut pas valoir true tant que les mentions légales sont incomplètes');
        expect(resultat.stderr).toContain(`rubrique « Réglages du site »`);
        expect(resultat.stderr).toContain(`« ${manque} »`);
      });
    }
    avecDepot((ecrire) => ecrire('site.json', { ...lireJSON('site.json'), ...COMPLETES, indexable: true }), (resultat) => {
      expect(resultat.status, resultat.stderr).toBe(0);
    });
  });

  test('préproduction : « À compléter avant l’ouverture » pour chaque champ vide ; section « Sources et licences »', async ({ page }) => {
    test.skip(site.indexable, 'site ouvert aux moteurs');
    await page.goto('mentions-legales/');
    const editeur = site.editeur || {};
    const vides = [editeur.nom, editeur.adresse, editeur.directeur_publication, site.contact].filter((v) => !v).length;
    await expect(page.locator('.a-renseigner', { hasText: 'À compléter avant l’ouverture' })).toHaveCount(vides);
    await expect(page.getByRole('heading', { name: 'Sources et licences' })).toBeVisible();
    await expect(page.locator('#sources-et-licences + p').getByRole('link', { name: 'crédits' })).toHaveAttribute('href', '../credits/');
  });
});

// --------------------------------------------------------------------------------------------------------------
test.describe('source et licence des annales', () => {
  test('source obligatoire au statut « relu », facultative en brouillon', () => {
    avecDepot((ecrire) => deposerAnnale(ecrire, 'sans-source', { source: undefined }), (resultat) => {
      expect(resultat.status).toBe(1);
      expect(resultat.stderr).toContain('annales/sans-source.json : champ « source » manquant');
    });
    avecDepot((ecrire) => deposerAnnale(ecrire, 'licence-inconnue', {
      source: { editeur: 'X', url: 'https://exemple.test/a', licence: 'cc-by-sa', reference_autorisation: '' },
    }), (resultat) => {
      expect(resultat.status).toBe(1);
      expect(resultat.stderr).toContain('licence de la source non acceptée « cc-by-sa »');
    });
    avecDepot((ecrire) => deposerAnnale(ecrire, 'autorisation', {
      source: { editeur: 'Constructeur', url: '', licence: 'autorisation-ecrite', reference_autorisation: '' },
    }), (resultat) => {
      expect(resultat.status).toBe(1);
      expect(resultat.stderr).toContain('autorisation écrite sans référence');
    });
    avecDepot((ecrire) => deposerAnnale(ecrire, 'brouillon-sans-source', { source: undefined, statut: 'brouillon' }), (resultat) => {
      expect(resultat.status, resultat.stderr).toBe(0);
      expect(resultat.stdout).toContain('annales/brouillon-sans-source.json');
    });
  });

  test('ligne de crédit selon la licence, quel que soit afficher_origine', () => {
    const CAS = [
      ['cc-by-nc-sa-2.0-fr', 'éduscol STI', 'D’après un sujet publié par <a href="https://exemple.test/s">éduscol STI</a>, licence CC BY-NC-SA 2.0 FR. Adaptation interactive : industrie.education, sous la même licence.'],
      ['etalab-2.0', 'éduscol', 'D’après un document publié par <a href="https://exemple.test/s">éduscol</a>, Licence Ouverte 2.0. Adaptation : industrie.education.'],
      ['autorisation-ecrite', 'Constructeur', 'Reproduit avec l’autorisation de <a href="https://exemple.test/s">Constructeur</a>.'],
      ['oeuvre-personnelle', '', 'Sujet original : industrie.education.'],
    ];
    for (const [licence, editeur, ligne] of CAS) {
      for (const afficher of [false, true]) {
        avecDepot((ecrire) => deposerAnnale(ecrire, 'essai', {
          afficher_origine: afficher, origine: { diplome: 'BTS', epreuve: 'E4', session: 2013 },
          source: { editeur, url: 'https://exemple.test/s', licence, reference_autorisation: licence === 'autorisation-ecrite' ? 'Courriel du 1er mars 2027' : '' },
        }), (resultat, racine) => {
          expect(resultat.status, resultat.stderr).toBe(0);
          const page = fs.readFileSync(path.join(racine, '_site', 'annales', 'essai', 'index.html'), 'utf8');
          expect(page, `${licence}, afficher_origine ${afficher}`).toContain(`<p class="enveloppe-fiche-credit">${ligne}</p>`);
        });
      }
    }
  });

  test('chaque annale publiée porte sa ligne de crédit et figure dans la section « Annales » des crédits', async ({ page }) => {
    const publiees = annales();
    expect(publiees.length).toBeGreaterThan(0);
    for (const a of publiees) {
      await page.goto(a.chemin);
      const ligne = page.locator('.enveloppe-fiche-credit');
      await expect(ligne).toHaveCount(1);
      await expect(ligne).not.toBeEmpty();
      if (a.source.url) await expect(ligne.getByRole('link', { name: a.source.editeur })).toHaveAttribute('href', a.source.url);
    }
    await page.goto('credits/');
    const entrees = page.locator('#annales + .credits > .credit');
    await expect(entrees).toHaveCount(publiees.length);
    for (const a of publiees) {
      const entree = entrees.filter({ hasText: a.titre });
      await expect(entree.getByRole('link', { name: a.titre })).toHaveAttribute('href', `../${a.chemin}`);
      await expect(entree).toContainText(a.source.editeur);
      await expect(entree.locator(`a[href="${a.source.url}"]`).first()).toBeVisible();
    }
  });

  test('outils/annale.py contrôle aussi la source d’une fiche : exigée au statut « relu », rappel en brouillon', () => {
    const { spawnSync } = require('node:child_process');
    const annalePy = (fichiers) => spawnSync('python3', [path.join(DEPOT, 'outils', 'annale.py'), ...fichiers], { encoding: 'utf8' });
    // Les fiches du dépôt, brouillons compris (un brouillon peut ne pas avoir encore de source).
    const reelles = annales({ toutes: true }).map((a) => path.join(DEPOT, 'annales', `${a.id}.json`)).filter((f) => fs.existsSync(f));
    const r = annalePy(reelles);
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toContain('prêt à publier');
    // Fiches d'essai, sans source : brouillon accepté avec un rappel, « relu » refusé.
    const racine = depotFactice((ecrire) => {
      deposerAnnale(ecrire, 'essai-brouillon', { source: undefined, statut: 'brouillon' });
      deposerAnnale(ecrire, 'essai-relu', { source: undefined });
    });
    try {
      const brouillon = annalePy([path.join(racine, 'annales', 'essai-brouillon.json')]);
      expect(brouillon.status, brouillon.stdout).toBe(0);
      expect(brouillon.stdout).toContain('brouillon : à régler avant de passer en « relu »');
      expect(brouillon.stdout).toContain('la fiche reste un brouillon');
      const relu = annalePy([path.join(racine, 'annales', 'essai-relu.json')]);
      expect(relu.status).toBe(1);
      expect(relu.stdout).toContain('champ « source » manquant');
    } finally {
      fs.rmSync(racine, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------------------------------------------------------------------
test.describe('Labo et Maquettes « à venir »', () => {
  const A_VENIR = lireJSON('catalogue/a-venir.json');

  for (const id of ['labo', 'maquettes']) {
    test(`/${id}/ : promesse dans un bloc « Bientôt », sans date ni formulaire, hors navigation principale`, async ({ page }) => {
      await page.goto(`${id}/`);
      await expect(page.locator('h1')).toHaveText(A_VENIR[id].titre);
      await expect(page.locator('.bientot-page .bientot-promesse')).toHaveText(A_VENIR[id].promesse);
      await expect(page.locator('main form, main input, main select, main textarea')).toHaveCount(0);
      expect(await page.locator('main').innerText()).not.toMatch(/\b(19|20)\d\d\b|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/i);
      await expect(page.locator('.site-nav').getByRole('link', { name: A_VENIR[id].titre })).toHaveCount(0);
    });
  }

  test('accueil : bloc « Bientôt » après « Annales », qui renvoie vers les deux pages', async ({ page }) => {
    await page.goto('');
    const titres = await page.locator('main h2').allTextContents();
    expect(titres.indexOf('Bientôt')).toBe(titres.indexOf('Annales') + 1);
    const bloc = page.locator('.bientot');
    await expect(bloc.getByRole('link', { name: new RegExp(A_VENIR.labo.titre) })).toHaveAttribute('href', './labo/');
    await expect(bloc.getByRole('link', { name: new RegExp(A_VENIR.maquettes.titre) })).toHaveAttribute('href', './maquettes/');
  });
});

// --------------------------------------------------------------------------------------------------------------
test('chaque page déclare une icône vide : pas de requête /favicon.ico (erreur 404 en console)', () => {
  for (const chemin of pagesConstruites()) {
    expect(lire(chemin), chemin).toContain('<link rel="icon" href="data:,">');
  }
});

// --------------------------------------------------------------------------------------------------------------
test('résumé de publication (--resume) : comptes seulement, aucun secret', () => {
  const racine = depotFactice((ecrire) => {
    deposerAnnale(ecrire, 'publiee');
    deposerAnnale(ecrire, 'en-attente', { statut: 'brouillon', source: undefined });
  });
  try {
    const resume = path.join(racine, 'resume.md');
    const { spawnSync } = require('node:child_process');
    const r = spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine, '--sortie',
      path.join(racine, '_site'), '--resume', resume], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    const texte = fs.readFileSync(resume, 'utf8');
    expect(texte).toContain('## Tableau de bord éditorial');
    expect(texte).toMatch(/\| Cours \| 3 \| 0 \|/);
    expect(texte).toMatch(/\| Annale \| 1 \| 1 \|/);
    expect(texte).toContain('Annales sans source : **1**');
    expect(texte).toContain('Cartes sans image : **4** sur 4');
    expect(texte).toContain('Planche de l’accueil : **absente**');
    expect(texte).toMatch(/Poids de l’accueil : \*\*\d+ ko\*\*/);
    expect(texte).toContain('Mentions légales : **incomplètes**');
    expect(texte).toContain('(indexable) : **non**');
    // Une construction arrêtée est aussi résumée, avec le message.
    fs.writeFileSync(path.join(racine, 'annales', 'publiee.json'), '{');
    const echec = spawnSync('python3', [path.join(DEPOT, 'outils', 'construire.py'), '--racine', racine, '--sortie',
      path.join(racine, '_site'), '--resume', resume], { encoding: 'utf8' });
    expect(echec.status).toBe(1);
    expect(fs.readFileSync(resume, 'utf8')).toContain('**Publication arrêtée.**');
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
});
