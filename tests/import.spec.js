// Lot 1e : import des fichiers déposés (outils/importer.py), sur des dépôts factices.
//   - fichier avec bloc de métadonnées : fiche complète en brouillon, champs identiques au bloc ;
//   - fichier sans bloc : titre, présentation et durée extraits, le reste « à compléter » ;
//   - fichier invalide : ignoré, laissé dans medias/import/, signalé ; les autres sont importés ;
//   - notion inconnue : proposée, jamais créée ; l'import ne pose jamais « relu » ;
//   - nouvelle version : l'ancienne reste publiée jusqu'à la validation, puis elle est remplacée ;
//   - un seul commit pour tout l'import (--commit), poussé sur main.
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, expect } = require('@playwright/test');
const { DEPOT, depotFactice, construire } = require('./outils');

const AUJOURDHUI = '2026-11-28';
const importer = (racine, ...options) => spawnSync('python3', [path.join(DEPOT, 'outils', 'importer.py'), '--racine', racine,
  '--date', AUJOURDHUI, ...options], { encoding: 'utf8' });
const lire = (racine, fichier) => fs.readFileSync(path.join(racine, fichier), 'utf8');
const lireJSON = (racine, fichier) => JSON.parse(lire(racine, fichier));
const existe = (racine, fichier) => fs.existsSync(path.join(racine, fichier));

const BLOC = {
  format: 1, type: 'annale', id: 'bras-robot-palettiseur', titre: 'Bras de robot palettiseur',
  presentation: 'Étude d’un robot qui empile des cartons sur une palette : cinématique, efforts, choix du moteur.',
  publics: ['sti2d', 'bts-ms'], theme: 'mecanique', notions: ['statique', 'robotique-inconnue'],
  notions_proposees: [{ id: 'couple-moteur', nom: 'Couple moteur' }], duree_min: 180,
  origine: { diplome: 'BTS MS', epreuve: 'E4', session: 2019 },
  source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr', reference_autorisation: '' },
  requetes: ['annale robot corrigée', 'exercice palettiseur', 'cinématique robot bts'],
  pistes_image: ['Planche de brevet d’un bras articulé', 'Gravure d’une grue ancienne'],
  statut: 'relu',
};
const autonome = (titre, bloc) => `<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>${titre}</title>\n`
  + (bloc ? `<script type="application/json" id="fiche-industrie-education">${JSON.stringify(bloc)}</script>\n` : '')
  + `</head>\n<body>\n<h1>${titre}</h1>\n<p>Énoncé.</p>\n</body>\n</html>\n`;
const INVALIDE = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<title>X</title>\n'
  + '<script src="https://cdn.exemple.com/outil.js"></script>\n</head>\n<body>\n<h1>X</h1>\n</body>\n</html>\n';
const ANNALE_LEVAGE = path.join(DEPOT, 'medias', 'depots', 'levage-dechargement-sacs-linge.html');

function avecDepot(modifier, verifier) {
  const racine = depotFactice(modifier);
  try {
    return verifier(racine);
  } finally {
    fs.rmSync(racine, { recursive: true, force: true });
  }
}

test('dépôt de 3 fichiers : avec bloc, sans bloc, invalide ; un fichier en échec n’empêche pas les autres', () => avecDepot((ecrire) => {
  ecrire('medias/import/bras-robot.html', autonome('Bras de robot palettiseur', BLOC));
  ecrire('medias/import/Copie Levage 2013.html', fs.readFileSync(ANNALE_LEVAGE, 'utf8'));
  ecrire('medias/import/invalide.html', INVALIDE);
  ecrire('medias/import/depot-20261128-101500.json', { fichiers: ['/medias/import/bras-robot.html', '/medias/import/invalide.html'] });
}, (racine) => {
  const notionsAvant = lire(racine, 'catalogue/notions.json');
  const r = importer(racine, '--rapport', path.join(racine, 'import.md'));
  expect(r.status, r.stderr).toBe(0);

  // Avec bloc : fiche complète en brouillon, champs identiques au bloc ; fichier rangé sans être modifié.
  const fiche = lireJSON(racine, 'annales/bras-robot-palettiseur.json');
  expect(fiche).toEqual({
    id: BLOC.id, titre: BLOC.titre, presentation: BLOC.presentation, fichier: '/medias/depots/bras-robot-palettiseur.html',
    publics: BLOC.publics, theme: BLOC.theme, notions: ['statique'],
    notions_proposees: [{ id: 'couple-moteur', nom: 'Couple moteur' }, { id: 'robotique-inconnue', nom: 'robotique-inconnue' }],
    requetes: BLOC.requetes, pistes_image: BLOC.pistes_image, duree_min: 180, origine: BLOC.origine, afficher_origine: false,
    source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr' },
    statut: 'brouillon', mis_a_jour: AUJOURDHUI,
  });
  expect(lire(racine, 'medias/depots/bras-robot-palettiseur.html')).toBe(autonome('Bras de robot palettiseur', BLOC));
  // Notion inconnue : proposée, jamais créée.
  expect(lire(racine, 'catalogue/notions.json')).toBe(notionsAvant);

  // Sans bloc : titre, présentation et durée lus dans le fichier ; le reste à compléter.
  const extraite = lireJSON(racine, 'annales/copie-levage-2013.json');
  expect(extraite).toEqual({
    id: 'copie-levage-2013', titre: 'Système de levage et de déchargement des sacs de linge',
    presentation: expect.stringMatching(/^Étude d'un système industriel de manutention, dans une blanchisserie\. Sujet complet : 5 parties/),
    fichier: '/medias/depots/copie-levage-2013.html', duree_min: 300, afficher_origine: false, statut: 'brouillon', mis_a_jour: AUJOURDHUI,
  });
  expect(fs.readFileSync(path.join(racine, 'medias/depots/copie-levage-2013.html'))).toEqual(fs.readFileSync(ANNALE_LEVAGE));

  // Invalide : laissé dans medias/import/, signalé ; l'entrée de dépôt rapide est supprimée.
  expect(fs.readdirSync(path.join(racine, 'medias', 'import')).sort()).toEqual(['invalide.html']);
  const rapport = lire(racine, 'import.md');
  expect(rapport).toMatch(/^## Import de cette publication/);
  expect(rapport).toContain('Fiche créée en brouillon : `annales/bras-robot-palettiseur.json`');
  expect(rapport).toContain('À compléter dans /admin/ : filières, thème, notions, source');
  expect(rapport).toContain('5 parties, 39 questions, 4 tracés');
  expect(rapport).toContain('Fichier refusé, laissé dans `medias/import/` : `medias/import/invalide.html`');
  expect(rapport).toContain('ressource extérieure interdite');
  expect(rapport).toContain('notions proposées (non créées) : Couple moteur, robotique-inconnue');

  // Les fiches créées sont au format du back-office ; la construction signale le reste, sans rien bloquer.
  const c = construire(racine);
  expect(c.status, c.stderr).toBe(0);
  const etat = lireJSON(racine, '_site/admin/etat.json');
  expect(etat.a_corriger.fiches_retenues).toEqual([]);
  expect(etat.a_corriger.fichiers_non_importes.map((n) => n.fichier)).toEqual(['medias/import/invalide.html']);
  expect(etat.a_corriger.notions_proposees.map((n) => n.id)).toEqual(['couple-moteur', 'robotique-inconnue']);
  const brouillon = etat.a_corriger.brouillons.find((b) => b.fiche === 'annales/copie-levage-2013.json');
  expect(brouillon.erreurs.map((e) => e.champ)).toEqual(expect.arrayContaining(['Filières', 'Thème', 'Source et licence du sujet']));
  expect(existe(racine, '_site/annales/bras-robot-palettiseur')).toBe(false);
}));

test('l’import ne pose jamais « relu » et ne crée aucune notion ; un exercice va dans sa collection', () => avecDepot((ecrire) => {
  ecrire('medias/import/exercice.html', autonome('Levier', {
    format: 1, type: 'exercice', id: 'levier-essai', titre: 'Levier d’essai', presentation: 'Calculer l’effort sur un levier.',
    collection: 'essai', niveau: 2, duree_min: 20, notions: ['statique'], statut: 'relu',
  }));
  ecrire('medias/import/sans-collection.html', autonome('Sans collection', {
    format: 1, type: 'exercice', id: 'sans-collection', titre: 'Sans collection', presentation: 'Exercice sans collection.',
  }));
}, (racine) => {
  const r = importer(racine, '--rapport', path.join(racine, 'import.md'));
  expect(r.status, r.stderr).toBe(0);
  expect(lireJSON(racine, 'contenus/essai/levier-essai/contenu.json')).toEqual({
    id: 'levier-essai', titre: 'Levier d’essai', type: 'exercice', niveau: 2, duree_min: 20,
    description: 'Calculer l’effort sur un levier.', notions: ['statique'], fichier: '/medias/depots/levier-essai.html', statut: 'brouillon',
  });
  expect(lire(racine, 'import.md')).toContain('exercice sans collection connue');
  expect(existe(racine, 'medias/import/sans-collection.html')).toBe(true);
  expect(existe(racine, 'annales')).toBe(false);
}));

test('nouvelle version : l’ancienne reste publiée jusqu’à la validation, puis elle est remplacée', () => avecDepot((ecrire) => {
  ecrire('medias/depots/en-ligne.html', autonome('Version en ligne'));
  ecrire('annales/en-ligne.json', {
    id: 'en-ligne', titre: 'Annale en ligne', presentation: 'Sujet factice déjà publié sur le site.', fichier: '/medias/depots/en-ligne.html',
    publics: ['si'], theme: 'mecanique', notions: ['statique'], duree_min: 60, afficher_origine: false,
    source: { editeur: 'éduscol STI', url: 'https://sti.eduscol.education.fr/sujet.docx', licence: 'cc-by-nc-sa-2.0-fr' },
    statut: 'relu', mis_a_jour: '2026-11-20',
  });
  ecrire('medias/import/en-ligne-v2.html', autonome('Version corrigée', { format: 1, type: 'annale', id: 'en-ligne', titre: 'Annale en ligne' }));
}, (racine) => {
  const page = () => lire(racine, '_site/annales/en-ligne/index.html');
  let r = importer(racine);
  expect(r.status, r.stderr).toBe(0);
  let fiche = lireJSON(racine, 'annales/en-ligne.json');
  expect(fiche.nouvelle_version).toEqual({ fichier: '/medias/a-relire/en-ligne.html', deposee_le: AUJOURDHUI });
  expect(fiche.statut).toBe('relu');
  expect(lire(racine, 'medias/depots/en-ligne.html')).toBe(autonome('Version en ligne'));
  // Avant validation : la version en ligne reste en ligne, la nouvelle n'est publiée nulle part.
  expect(construire(racine).status).toBe(0);
  expect(page()).toContain('<h1>Version en ligne</h1>');
  expect(fs.readdirSync(path.join(racine, '_site'), { recursive: true }).join('\n')).not.toMatch(/a-relire/);
  expect(lireJSON(racine, '_site/admin/etat.json').nouvelles_versions.map((n) => n.fiche)).toEqual(['annales/en-ligne.json']);
  // Validation (case cochée dans /admin/) : l'import suivant remplace l'ancien fichier, même chemin.
  fs.writeFileSync(path.join(racine, 'annales/en-ligne.json'), `${JSON.stringify({ ...fiche, valider_nouvelle_version: true }, null, 2)}\n`);
  r = importer(racine);
  expect(r.status, r.stderr).toBe(0);
  fiche = lireJSON(racine, 'annales/en-ligne.json');
  expect(fiche).not.toHaveProperty('nouvelle_version');
  expect(fiche).not.toHaveProperty('valider_nouvelle_version');
  expect(fiche.mis_a_jour).toBe(AUJOURDHUI);
  expect(existe(racine, 'medias/a-relire/en-ligne.html')).toBe(false);
  expect(lire(racine, 'medias/depots/en-ligne.html')).toContain('<h1>Version corrigée</h1>');
  expect(construire(racine).status).toBe(0);
  expect(page()).toContain('<h1>Version corrigée</h1>');
}));

test('--commit : un seul commit pour tout l’import, poussé sur main, au message en français', () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'import-git-'));
  const git = (cwd, ...a) => spawnSync('git', ['-c', 'user.name=Essai', '-c', 'user.email=essai@exemple.test', '-c', 'init.defaultBranch=main', ...a], { cwd, encoding: 'utf8' });
  try {
    const distant = path.join(dossier, 'distant.git');
    expect(git(dossier, 'init', '-q', '--bare', distant).status).toBe(0);
    const racine = depotFactice((ecrire) => {
      ecrire('medias/import/un.html', autonome('Un', { format: 1, type: 'annale', id: 'un-essai', titre: 'Un' }));
      // Sans bloc : identifiant tiré du nom du fichier (« deux » est déjà un contenu : ce serait une nouvelle version).
      ecrire('medias/import/Deux Essai.html', autonome('Deux'));
      ecrire('medias/import/depot-1.json', { fichiers: ['/medias/import/un.html'] });
    });
    try {
      expect(git(racine, 'init', '-q', '-b', 'main').status).toBe(0);
      git(racine, 'add', '-A');
      expect(git(racine, 'commit', '-q', '-m', 'Départ').status).toBe(0);
      git(racine, 'remote', 'add', 'origin', distant);
      expect(git(racine, 'push', '-q', 'origin', 'main').status).toBe(0);
      const r = importer(racine, '--commit');
      expect(r.status, r.stderr).toBe(0);
      expect(git(distant, 'log', '--format=%s', 'main').stdout.trim().split('\n'))
        .toEqual(['Import : 2 fiches créées en brouillon', 'Départ']);
      const fichiers = git(distant, 'show', '--no-renames', '--name-status', '--format=', 'main').stdout;
      for (const f of ['A\tannales/un-essai.json', 'A\tannales/deux-essai.json', 'A\tmedias/depots/un-essai.html', 'D\tmedias/import/depot-1.json']) {
        expect(fichiers).toContain(f);
      }
      expect(git(distant, 'log', '-1', '--format=%an', 'main').stdout.trim()).toBe('github-actions[bot]');
      // Rien à importer : aucun commit.
      expect(importer(racine, '--commit').status).toBe(0);
      expect(git(distant, 'rev-list', '--count', 'main').stdout.trim()).toBe('2');
    } finally {
      fs.rmSync(racine, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});
