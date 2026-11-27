# industrie-education

Site de cours, exercices interactifs, études de cas et annales en sciences industrielles (SI, STI2D, Bac Pro MSPC,
BTS MS). Le site est statique, gratuit, sans compte et sans cookie : une partie du public est mineure.

Ce dépôt contient les contenus, les gabarits et l'outil qui fabrique le site. À chaque envoi sur `main`, une
GitHub Action construit le site, lance les tests et, s'ils passent, le publie sur GitHub Pages.

- Préproduction : <https://s-kajzar.github.io/industrie-education/> (non indexée tant que `site.json` → `indexable`
  vaut `false`).
- Domaine définitif : `industrie.education`, posé au lot 1.

## Documents de référence

| Fichier | Rôle |
|---|---|
| `TRAME.md` | Cahier des charges : il fait foi |
| `DESIGN.md` | Tout ce qui se voit ; les valeurs sont dans `statique/commun.css` |
| `CLAUDE.md` | Consignes pour Claude Code |
| `prompts/LOT-<n>.md` | Le travail de chaque lot |
| `NOTE-DE-LIVRAISON.md` | Ce qui a été fait, testé, ce qui reste à faire, les écarts |
| `GUIDE-BACK-OFFICE.md` | Mode d'emploi du back-office (Pages CMS) : annales, images, planches, crédits |

## Commandes

```sh
pip install -r requirements.txt     # Jinja2, Pillow
npm install                         # Playwright, @fontsource/barlow-condensed
npx playwright install chromium     # navigateur des tests, une seule fois
python3 outils/construire.py        # écrit _site/
python3 outils/annale.py F.html     # contrôle un fichier autonome (ou une fiche d'annale .json) avant dépôt
npm run servir                      # http://127.0.0.1:4173/industrie-education/, comme GitHub Pages
npm test                            # construit le site puis lance tous les tests (sans réseau)
```

`python3 outils/construire.py --resume FICHIER.md` ajoute en plus le tableau de bord éditorial (publiés, brouillons,
annales sans source, cartes sans image, poids de l'accueil, mentions légales) : l'Action l'écrit dans le récapitulatif
de chaque publication.

`python3 -m http.server -d _site 8000` sert aussi le site, à la racine : toutes les pages fonctionnent, sauf les
liens de la page 404, écrits pour l'adresse de préproduction. Le dossier `_site/` est généré : on ne le modifie
jamais à la main et on ne le versionne pas.

## Back-office

Le plus simple : le back-office **Pages CMS**, branché sur ce dépôt (`.pages.yml`). Il permet de déposer une annale
ou un exercice autonome, d'ajouter une image de carte ou une planche et de déclarer les crédits, sans toucher au
code : voir `GUIDE-BACK-OFFICE.md`. Chaque enregistrement est un commit sur `main`, publié par l'Action habituelle
(environ 2 minutes). Le statut `relu`, qui publie, n'est posé que par Sébastien.

## Ajouter un contenu à la main, en 3 étapes

1. **Créer le dossier** `contenus/<collection>/<contenu>/` (minuscules, sans accent, avec des tirets). Pour une
   nouvelle collection, créer aussi `contenus/<collection>/collection.json` (titre, thème, publics, ordre,
   description), sur le modèle des collections existantes. Les noms de pages du site (`catalogue`, `annales`,
   `si`, `mecanique`, `enseignants`…) sont réservés.
2. **Y déposer le contenu** : `contenu.json` (identifiant égal au nom du dossier, titre, type, niveau, durée,
   mots-clés, description, mode) et `index.html`, avec ses images et scripts. En mode `repris`, `index.html` est le
   fichier d'origine copié tel quel : la construction l'enveloppe sans toucher à son corps. En mode `natif`, c'est un
   fragment HTML (sans `<html>` ni `<body>`) écrit avec les classes de la charte.
3. **Le ranger et vérifier** : ajouter son identifiant à `ordre` dans `collection.json` (et, si besoin, à
   `catalogue/a-la-une.json`), lancer `npm test`, puis envoyer sur `main` : la publication suit si les tests passent.

La construction s'arrête avec un message clair si un nom est réservé, un type, un thème ou un public inconnu, un
identifiant en double, ou un contenu de `a-la-une.json` introuvable.

## Organisation

```
.pages.yml               configuration du back-office (Pages CMS)
site.json                nom, base, origine, indexable, Umami, éditeur, contact, hébergeur, titres et planche d'accueil
catalogue/               thèmes, publics, notions (libellés), contenus à la une, Labo et Maquettes à venir,
                         partenaires (vide en V1)
contenus/<collection>/   collection.json, puis un contenu par dossier (contenu.json, index.html, ressources)
                         ou par fiche à plat déposée par le back-office (<id>.json, fichier dans medias/depots/)
annales/                 une fiche par annale (<id>.json, avec sa source et sa licence), fichier HTML dans
                         medias/depots/
medias/                  cartes/, illustrations/ (originaux des images), depots/ (fichiers HTML), CREDITS.json
gabarits/                base, accueil, catalogue, liste, collection, contenu, annales, service (+ textes)
statique/                publié sous /_/ : commun.css, commun.js, projeter.js, polices/, lib/ (QR code)
outils/construire.py     génération du site dans _site/
outils/annale.py         contrôle d'un fichier autonome (HTML complet, aucune ressource extérieure, 5 Mo) et de la
                         source d'une annale
outils/illustrations.py  variantes WebP des images (cache hors dépôt dans .cache/)
tests/                   tests Playwright (npm test) et serveur local
.github/workflows/       publication sur GitHub Pages
```

Licences des fichiers tiers copiés dans le dépôt : Barlow Condensed (SIL Open Font License 1.1,
`statique/polices/OFL.txt`), qrcode-generator (MIT, `statique/lib/LICENCE-qrcode.txt`) et, pour les tests, le
schéma de configuration de Pages CMS (MIT, `tests/pages-cms/LICENSE`).
