// « Annale parfaite » (lot 1c, revu au lot 1e) : une copie entièrement juste obtient 20/20, en mode entraînement
// comme en mode examen, sans erreur JavaScript. Code partagé par :
//   - outils/verifier-annales.js, qui contrôle les fichiers source AVANT la construction : une annale relue qui échoue
//     est retenue (non publiée), un brouillon ou une nouvelle version reçoit un avertissement ;
//   - tests/annale-parfaite.spec.js, qui contrôle ensuite les annales publiées, sur leur page enveloppée.
//
// Le contrôle ne modifie pas le fichier : il lit la configuration des questions que le gabarit du projet Claude
// « Exercices interactifs » embarque (window.__QCFG__ : questions et correcteurs ; window.__SKCFG__ : tracés et
// grilles), en déduit la réponse attendue de chaque question, la saisit comme un élève, coche tous les critères de la
// grille de chaque tracé, puis lit la note globale.
//
// Réponse attendue, par type de correcteur :
//   num      valeur et unité (« 831,888 N ») ;          kw       premier motif de mots-clés (« capteur poids ») ;
//   code     référence attendue (equals, contains) ;    intset   ensemble de numéros (« 301, 303 ») ;
//   yesno    « oui » ou « non » ;                       chasles  relation de composition des vitesses construite
//                                                                avec les trois premiers solides.
// Un type inconnu est signalé avec son nom : il faut alors compléter « candidats » ci-dessous.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MODES = { training: 'entraînement', exam: 'examen' };

// Réponses possibles pour un correcteur, de la plus naturelle à la plus brute ; la première acceptée est saisie.
function candidats(g) {
  const nombre = (v) => String(v).replace('.', ',');
  switch (g.type) {
    case 'num': {
      const valeur = nombre(g.value);
      if (!g.unit) return [valeur];
      return [`${valeur} ${g.unit.label}`, ...(g.unit.accept || []).map((u) => `${valeur} ${u}`)];
    }
    case 'kw': return (g.any || []).map((motif) => motif.map((variantes) => variantes[0]).join(' '));
    case 'code': return [...(g.equals || []), ...(g.contains || [])];
    case 'intset': return [g.value.join(', ')];
    case 'yesno': return [g.value ? 'oui' : 'non'];
    case 'chasles': {
      const noms = Object.values(g.solids || {}).map((synonymes) => synonymes[0]);
      return noms.length >= 3 ? [`V(${noms[0]}/${noms[2]}) = V(${noms[0]}/${noms[1]}) + V(${noms[1]}/${noms[2]})`] : [];
    }
    default: return [];
  }
}

// Remplit une copie entièrement juste dans la page déjà ouverte (un mode) ; renvoie la liste des problèmes, vide si
// la note est 20,0/20. Les erreurs JavaScript sont relevées par l'appelant (événements pageerror et console).
async function verifierCopie(page, mode) {
  const problemes = [];
  const config = await page.evaluate(() => ({ questions: window.__QCFG__, traces: window.__SKCFG__ || {} }));
  if (!config.questions) return ['configuration des questions (window.__QCFG__) introuvable : gabarit non reconnu'];

  // Réponse attendue de chaque question, vérifiée auprès du correcteur du fichier quand il est exposé.
  const reponses = {};
  for (const [id, q] of Object.entries(config.questions)) {
    const liste = candidats(q.grader || {});
    const choix = await page.evaluate(({ liste, grader }) => {
      const correcteur = window.Grading;
      if (!correcteur || typeof correcteur.grade !== 'function') return liste[0] || null;
      return liste.find((r) => { const n = correcteur.grade(r, grader); return n && n.ok && n.score === 1; }) || null;
    }, { liste, grader: q.grader });
    if (choix === null) {
      problemes.push(`${q.label} (correcteur « ${(q.grader || {}).type} ») : ${liste.length
        ? `aucune réponse générée acceptée (${liste.join(' | ')})` : 'type de correction non pris en charge par ce contrôle'}`);
    } else reponses[id] = choix;
  }
  if (problemes.length) return problemes;

  try {
    await page.click(`[data-mode="${mode}"]`);
    // Questions simples, puis cases des diagrammes (FAST) ; en entraînement, chaque question est validée.
    const simples = await page.locator('.q[data-q]').evaluateAll((els) => els.map((e) => e.getAttribute('data-q')));
    for (const id of simples) {
      await page.locator(`.q[data-q="${id}"] .q-input`).fill(reponses[id]);
      if (mode === 'training') await page.locator(`.q[data-q="${id}"] .btn-validate`).click();
    }
    for (const groupe of await page.locator('.fast-q').all()) {
      for (const champ of await groupe.locator('.sol input[data-q]').all()) {
        await champ.fill(reponses[await champ.getAttribute('data-q')]);
      }
      if (mode === 'training') await groupe.locator('.btn-fast').click();
    }
    if (mode === 'exam') {
      await page.click('#exam-submit');
      await page.click('#exam-submit');
    }
    // Tracés : validation (entraînement), puis tous les critères de la grille cochés.
    for (const id of Object.keys(config.traces)) {
      const trace = page.locator(`.sketch[data-sketch="${id}"]`);
      if (mode === 'training') await trace.locator('.btn-sketch').click();
      if (!(await trace.locator('.selfeval').isVisible())) {
        await trace.locator('.selfeval').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      }
      if (!(await trace.locator('.selfeval').isVisible())) {
        problemes.push(`grille du tracé ${config.traces[id].label} introuvable`);
        continue;
      }
      for (const critere of await trace.locator('.selfeval input[data-crit]').all()) await critere.check();
      await trace.locator('.btn-self').click();
    }

    const fausses = await page.evaluate((ids) => ids.filter((id) => {
      const statut = document.querySelector(`.q[data-q="${id}"] .q-status`);
      return statut && !/^\W*Juste/.test(statut.textContent.trim());
    }).map((id) => `${window.__QCFG__[id].label} : ${document.querySelector(`.q[data-q="${id}"] .q-status`).textContent.trim()}`), simples);
    problemes.push(...fausses.map((f) => `question non comptée juste, ${f}`));
    const note = (await page.locator('#recap .final-note').textContent({ timeout: 5000 }).catch(() => null) || '').trim();
    if (note !== '20,0/20') problemes.push(`note obtenue : ${note || 'aucune'} (20,0/20 attendu)`);
  } catch (erreur) {
    problemes.push(`copie impossible à remplir : ${String(erreur.message || erreur).split('\n')[0]}`);
  }
  return problemes;
}

// Fichiers d'annales du dépôt à contrôler avant la construction : celui de chaque fiche (relue ou brouillon) et sa
// nouvelle version en attente de relecture, s'il y en a une. Une fiche illisible est sautée (la construction la
// signale).
function fichiersAnnales(racine) {
  const dossier = path.join(racine, 'annales');
  const fichiers = new Map();
  if (!fs.existsSync(dossier)) return [];
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const fiche = e.isDirectory() ? path.join('annales', e.name, 'annale.json') : e.name.endsWith('.json') ? path.join('annales', e.name) : null;
    if (!fiche) continue;
    let donnees;
    try { donnees = JSON.parse(fs.readFileSync(path.join(racine, fiche), 'utf8')); } catch { continue; }
    if (!donnees || typeof donnees !== 'object') continue;
    const statut = donnees.statut === 'relu' ? 'relu' : 'brouillon';
    const nettoyer = (f) => (typeof f === 'string' ? f.trim().replace(/^\/+/, '') : '');
    const principal = nettoyer(donnees.fichier) || (e.isDirectory() ? path.posix.join('annales', e.name, 'index.html') : '');
    if (principal) fichiers.set(principal, { fichier: principal, fiche: fiche.split(path.sep).join('/'), statut });
    const nouvelle = nettoyer(donnees.nouvelle_version && donnees.nouvelle_version.fichier);
    if (nouvelle) fichiers.set(nouvelle, { fichier: nouvelle, fiche: fiche.split(path.sep).join('/'), statut: 'nouvelle-version' });
  }
  return [...fichiers.values()].filter((f) => fs.existsSync(path.join(racine, f.fichier)));
}

module.exports = { MODES, candidats, verifierCopie, fichiersAnnales };
