# industrie-education

Site de cours, exercices interactifs, études de cas et annales en sciences industrielles (SI, STI2D, Bac Pro MSPC,
BTS MS). Le site est statique, gratuit, sans compte et sans cookie : une partie du public est mineure.

Ce dépôt contient les contenus, les gabarits et l'outil qui fabrique le site. À chaque envoi sur `main`, une
GitHub Action importe les fichiers déposés, contrôle les annales (20/20), construit le site, lance les tests et,
s'ils passent, le publie sur GitHub Pages. Une erreur de contenu retient seulement sa fiche (lot 1e) ; une erreur de
code arrête la publication.

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
| `GUIDE-BACK-OFFICE.md` | Mode d'emploi du back-office (`/admin/`, Sveltia CMS) : accès, dépôt rapide, annales, images, notions, réglages, « À corriger » |
| `production/FICHE-INTEGREE.md` | Bloc de métadonnées des fichiers HTML produits par le projet Claude « Exercices interactifs » |

## Commandes

```sh
pip install -r requirements.txt     # Jinja2, Pillow
npm ci                              # Playwright, @fontsource/barlow-condensed, back-office @sveltia/cms
npx playwright install chromium     # navigateur des tests, une seule fois
python3 outils/construire.py        # écrit _site/ (sans le contrôle 20/20)
npm run chaine                      # contrôle 20/20 des annales (outils/verifier-annales.js), puis construction
python3 outils/importer.py          # importe les fichiers HTML de medias/import/ (l'Action le fait, avec --commit)
python3 outils/annale.py F.html     # contrôle un fichier autonome (ou une fiche d'annale .json) avant dépôt
npm run servir                      # http://127.0.0.1:4173/industrie-education/, comme GitHub Pages
npm test                            # chaîne (20/20 + construction), puis tous les tests (sans réseau)
node outils/format-donnees.js       # vérifie que les données sont au format du back-office (--ecrire pour aligner)
```

`python3 outils/construire.py --resume FICHIER.md` écrit en plus le résumé de publication : « À corriger » d'abord
(fiches retenues, avertissements des brouillons, images non publiées, images orphelines, fichiers non importés),
puis les images à régulariser et le tableau de bord éditorial. L'Action l'écrit dans le récapitulatif de chaque
publication ; le même état est dans `_site/admin/etat.json`, lu par le bandeau de `/admin/`.

`python3 -m http.server -d _site 8000` sert aussi le site, à la racine : toutes les pages fonctionnent, sauf les
liens de la page 404, écrits pour l'adresse de préproduction. Le dossier `_site/` est généré : on ne le modifie
jamais à la main et on ne le versionne pas.

## Back-office

Le plus simple : le back-office du site, à l'adresse **`/admin/`** (Sveltia CMS, configuré par `admin/config.yml`),
avec un jeton d'accès GitHub. Il permet de déposer d'un coup 1 à 10 fichiers HTML (« Dépôt rapide » : les fiches se
créent seules, en brouillon), de compléter une annale ou un exercice, d'ajouter une image avec son crédit, de gérer les
notions et les réglages, sans toucher au code ; un bandeau en haut de page montre l'état de la publication. Voir
`GUIDE-BACK-OFFICE.md`. Chaque enregistrement est un commit sur `main`, publié par l'Action habituelle (environ
2 minutes). Le statut `relu`, qui publie, n'est posé que par Sébastien.

`/admin/` est hors du site public (`noindex`, absent du sitemap, interdit dans `robots.txt`, jamais lié). En local,
`npm run servir` puis <http://127.0.0.1:4173/industrie-education/admin/> propose aussi « Travailler avec un dépôt
local » (Chrome ou Edge) : les modifications sont alors écrites directement dans la copie du dépôt choisie.

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

Si un nom est réservé, un type, un thème ou un public inconnu, un identifiant en double, la fiche (ou la collection)
est retenue : elle n'est pas publiée, le reste du site l'est, et le résumé de publication dit quoi corriger.

## Organisation

```
admin/config.yml         configuration du back-office Sveltia CMS (servi à /admin/)
site.json                nom, base, origine, indexable, Umami, éditeur, contact, hébergeur, titres et planche d'accueil
catalogue/               thèmes, publics, notions (libellés), contenus à la une, Labo et Maquettes à venir,
                         partenaires (vide en V1)
contenus/<collection>/   collection.json, puis un contenu par dossier (contenu.json, index.html et ressources, ou
                         fichier HTML déposé par le back-office dans medias/depots/)
annales/                 une fiche par annale (<id>.json, avec sa source et sa licence), fichier HTML dans
                         medias/depots/
medias/                  cartes/, illustrations/ (originaux des images), depots/ (fichiers HTML), import/ (dépôt
                         rapide, en attente d'import), a-relire/ (nouvelles versions à valider)
production/              FICHE-INTEGREE.md : bloc de métadonnées des fichiers du projet Claude
gabarits/                base, accueil, catalogue, liste, collection, contenu, annales, service (+ textes), admin
admin/admin.js, admin.css   bandeau d'état de la publication et champ « Tester le fichier » de /admin/
statique/                publié sous /_/ : commun.css, commun.js, projeter.js, polices/, lib/ (QR code)
outils/construire.py     génération du site dans _site/
outils/annale.py         contrôle d'un fichier autonome (HTML complet, aucune ressource extérieure, 5 Mo) et de la
                         source d'une annale
outils/illustrations.py  variantes WebP des images (cache hors dépôt dans .cache/)
outils/importer.py       import des fichiers déposés : fiches en brouillon, nouvelles versions (lot 1e)
outils/verifier-annales.js, annale-parfaite.js   contrôle 20/20 des annales avant la construction
outils/chaine.js         chaîne de publication : contrôle 20/20, puis construction
outils/format-donnees.js format des JSON écrit par le back-office (alignement des données)
tests/                   tests Playwright (npm test) et serveur local
.github/workflows/       publication sur GitHub Pages
```

Licences des fichiers tiers copiés dans le dépôt : Barlow Condensed (SIL Open Font License 1.1,
`statique/polices/OFL.txt`) et qrcode-generator (MIT, `statique/lib/LICENCE-qrcode.txt`). Le back-office (Sveltia CMS,
MIT, et les modules de translittération, exifr et Immutable.js, MIT) n'est pas versionné : la construction le copie depuis
`node_modules/` dans `_site/admin/`, avec ses fichiers de licence.
