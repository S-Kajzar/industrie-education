#!/usr/bin/env node
// Chaîne de publication (lot 1e), dans l'Action comme dans « npm test » :
//   1. contrôle 20/20 des fichiers d'annales (outils/verifier-annales.js) ;
//   2. construction (outils/construire.py), qui retient les annales relues qui échouent et note les avertissements ;
// puis, hors de ce script, les tests (Playwright) sur le site construit.
// L'import des fichiers déposés (outils/importer.py) se fait avant, dans l'Action seulement (il fait un commit).
//
// Les options sont transmises à outils/construire.py (--resume, --precedent, --import…).
// Usage : node outils/chaine.js [options de outils/construire.py]
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEPOT = path.resolve(__dirname, '..');
const VERIFICATIONS = path.join(DEPOT, '.cache', 'verifications.json');

function lancer(commande, args) {
  const r = spawnSync(commande, args, { cwd: DEPOT, stdio: 'inherit' });
  if (r.error) throw r.error;
  return r.status;
}

const verification = lancer(process.execPath, [path.join(__dirname, 'verifier-annales.js'), '--sortie', VERIFICATIONS]);
if (verification !== 0) process.exit(verification);
process.exit(lancer('python3', [path.join(__dirname, 'construire.py'), '--verifications', VERIFICATIONS,
  ...process.argv.slice(2)]));
