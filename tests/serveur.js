// Serveur de test : sert _site/ comme GitHub Pages le fera en préproduction.
// - le site est publié sous la base de site.json (/industrie-education/) ;
// - une adresse de dossier sans « / » final est redirigée vers l'adresse avec « / » ;
// - une adresse inconnue reçoit 404.html avec le statut 404.
// Aucun accès au réseau : écoute sur 127.0.0.1 seulement.
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const DEPOT = path.resolve(__dirname, '..');
const SITE = path.join(DEPOT, '_site');
const BASE = JSON.parse(fs.readFileSync(path.join(DEPOT, 'site.json'), 'utf8')).base;
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

function envoyer(res, statut, fichier) {
  res.writeHead(statut, { 'Content-Type': TYPES[path.extname(fichier).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(fichier).pipe(res);
}

function introuvable(res) {
  const page = path.join(SITE, '404.html');
  if (fs.existsSync(page)) envoyer(res, 404, page);
  else { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Introuvable'); }
}

const serveur = http.createServer((req, res) => {
  const adresse = new URL(req.url, `http://${req.headers.host}`);
  let chemin;
  try { chemin = decodeURIComponent(adresse.pathname); } catch { return introuvable(res); }
  if (!chemin.startsWith(BASE)) {
    if (chemin + '/' === BASE) { res.writeHead(301, { Location: BASE }); return res.end(); }
    return introuvable(res);
  }
  const relatif = chemin.slice(BASE.length);
  const fichier = path.normalize(path.join(SITE, relatif));
  if (fichier !== SITE && !fichier.startsWith(SITE + path.sep)) return introuvable(res);
  fs.stat(fichier, (erreur, infos) => {
    if (erreur) return introuvable(res);
    if (infos.isDirectory()) {
      if (!chemin.endsWith('/')) { res.writeHead(301, { Location: adresse.pathname + '/' + adresse.search }); return res.end(); }
      const index = path.join(fichier, 'index.html');
      return fs.existsSync(index) ? envoyer(res, 200, index) : introuvable(res);
    }
    return envoyer(res, 200, fichier);
  });
});

serveur.listen(PORT, '127.0.0.1', () => {
  console.log(`Site de test : http://127.0.0.1:${PORT}${BASE}`);
});
