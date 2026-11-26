# Note de livraison — lot 1b : back-office, images de cartes, dépôts et annales autonomes

Branche `claude/gifted-mccarthy-1rs5w8`, partie de `trame-v2-1` (trame V2.1, DESIGN mis à jour, prompt du lot) : la
pull request contient donc aussi ces deux commits de documentation. `npm test` : **282 tests, tous verts** (environ
50 s, sans réseau). La note du lot 0 est conservée en annexe (TRAME § 13 renvoie à ses écarts).

## Fait

1. **Modèle de données**
   - `contenu.json` : champs facultatifs `image` (`{"fichier", "alt"}`), `notions`, `statut` (`brouillon` | `relu`,
     absent = publié, comme au lot 0) et `fichier` (fichier HTML déposé). `niveau` et `duree_min` acceptent les
     valeurs que le back-office écrit (`"3"`, `""`, `null`).
   - `annale.json` (TRAME § 11) : `id`, `titre`, `presentation`, `fichier`, `image`, `publics`, `theme`, `notions`,
     `duree_min`, `origine` (`diplome`, `epreuve`, `session`), `afficher_origine` (`false` par défaut), `statut`
     (absent = brouillon), `mis_a_jour`.
   - `medias/CREDITS.json` : une entrée par image (`fichier`, `titre`, `auteur`, `date`, `source`, `licence`,
     `reference_autorisation`, `usage`, `decorative`). Licences, liste fermée : `domaine-public`, `cc0`,
     `oeuvre-personnelle`, `autorisation-ecrite` (référence obligatoire).
   - Planches : `illustration` dans chaque thème (`catalogue/themes.json`), `illustration_accueil` dans `site.json`.
   - Dossiers `medias/cartes/`, `medias/illustrations/`, `medias/depots/`.
2. **Organisation des fichiers choisie pour le back-office** (justification) :
   - **Annales : une fiche à plat** `annales/<id>.json`, le fichier HTML dans `medias/depots/`. Pages CMS sait
     écrire une fiche dans un sous-dossier, mais le fichier HTML passe de toute façon par un dossier de médias : un
     dossier par annale ne contiendrait que la fiche. Une liste à plat est l'écran le plus simple (une ligne par
     annale, un bouton d'ajout).
   - **Contenus : une sous-rubrique par collection.** Les fiches existantes (`<id>/contenu.json`, avec
     `index.html` et ressources) restent en place et se modifient comme des « nœuds » de Pages CMS. Les nouveaux
     contenus autonomes sont créés à plat (`contenus/<collection>/<id>.json` + `medias/depots/`), directement dans
     la bonne collection : pas de champ « collection » à remplir, pas de fiche perdue à la racine.
   - `construire.py` accepte les **deux organisations** pour les contenus et les annales (`annales/<id>/annale.json`
     + `index.html` reste possible). Les adresses publiques ne changent pas.
3. **`.pages.yml`** : rubriques Annales, Contenus, Accueil (contenus à la une, titres par moment, planche), Thèmes,
   Crédits, Réglages du site ; médias cartes, illustrations (jpg, png, webp) et dépôts (html), noms de fichiers
   nettoyés ; listes fermées (type, niveau, thème, filières, licence, statut) ; aides en français sur chaque champ
   délicat ; identifiants imposés (minuscules, sans accent, tirets) ; messages de commit en français ;
   `settings.content.merge: true`, sans quoi un enregistrement effacerait les champs non affichés (`mode`, `source`).
4. **Images** : `outils/illustrations.py` (Pillow) produit les variantes WebP : cartes 480 et 960 px, 16/9 centré,
   ≤ 40 Ko à 480 px ; planches en niveaux de gris, contraste renforcé, fond blanc pur (accueil 640/1280 px
   ≤ 150 Ko, thème 480/960 px ≤ 60 Ko, vignette 128 px). Cache dans `.cache/images/` (jamais versionné, repris
   par l'Action). Seules les variantes sont publiées (`/medias/…`), pas les originaux.
   - Cartes : image (`srcset`, `sizes`, `alt`, `width`/`height`, `loading="lazy"`) si elle existe, sinon bandeau ;
     même hauteur.
   - Accueil : planche en filigrane dans la moitié droite du titre (opacité 0,2, `multiply`), sans effet sur la
     hauteur réservée au titre ; bandeau de 120 px au-dessus du titre sur téléphone ; vignette de 64 px dans
     l'index des thèmes. Page de thème : planche à droite du titre (opacité 0,25). Sans planche, rendu inchangé.
   - Page `/credits/` générée depuis `CREDITS.json`, liée depuis le pied de page.
   - La construction s'arrête sur : image absente de `CREDITS.json`, licence hors liste, autorisation écrite sans
     référence, texte alternatif manquant (sauf image déclarée décorative), image introuvable.
5. **Fichiers autonomes** : `outils/annale.py` contrôle chaque fichier publié (contenus repris et annales) :
   - document HTML complet ;
   - aucune ressource extérieure (`src`, `href` hors `<a>`, `srcset`, `url()`, `@import`, adresses dans les
     scripts, `<base>`, redirection) ;
   - taille ≤ 5 Mo, UTF-8 ;
   - ressources relatives présentes, ou interdites pour un fichier déposé seul.

   Messages avec fichier et ligne ; l'outil se lance aussi seul : `python3 outils/annale.py fichier.html`.
6. **Annales dans la construction** :
   - page `/annales/<id>/` = le fichier, enveloppé comme un contenu repris. La **fiche indexable** est placée
     **au-dessus** du fichier, dans l'enveloppe : titre, présentation, durée, filières, thème, notions, contenus
     liés par les notions, bouton « Commencer » vers le début du sujet. Placée à côté, elle aurait recouvert ou été
     recouverte par le rail de documents du sujet ;
   - index `/annales/` (par filière) et `/annales/<filiere>/`, cartes du catalogue (type « Annale »), bloc Annales
     de l'accueil (les 3 plus récentes selon `mis_a_jour`), sitemap ;
   - **rien n'est publié au statut brouillon** (ni page, ni carte, ni sitemap), contenus compris ;
   - `afficher_origine` : à `false`, l'origine n'apparaît nulle part (ni titre, ni description, ni fiche, ni
     index, ni recherche du catalogue) ; à `true`, dans la fiche, le titre de page et l'index.
7. **Première annale** : `S-Kajzar/etude-systeme-dechargement-et-levage-de-linge`, commit `53e9a51`
   (15 septembre 2026). `index.html` est copié octet pour octet dans
   `medias/depots/levage-dechargement-sacs-linge.html` ; la fiche est `annales/levage-dechargement-sacs-linge.json` :
   - `titre` et `presentation` tirés du fichier ;
   - `publics` : `bts-ms`, `theme` : `mecanique`, `statut` : `relu`, origine vide, `afficher_origine` : `false` ;
   - durée de 300 min, d'après le fichier (« 5 h ») ;
   - notions d'après sa description : statique, dynamique, cinématique graphique, roulements, liaisons.

   Le contenu `cadre-velo` reçoit les notions `statique`, `pfs` et `solide-deux-forces`, ce qui le relie à l'annale.
8. **Documentation** : `GUIDE-BACK-OFFICE.md` (installation, dépôt d'une annale, image de carte, planche, échec de
   publication, dépôt public), `README.md` et `annales/LISEZ-MOI.md` mis à jour.

## Testé

| Exigence du lot | Test |
|---|---|
| `.pages.yml` valide **selon le schéma de Pages CMS lui-même** (copie de `lib/config-schema.ts`, même analyse YAML) ; rubriques dans l'ordre ; chemins existants ; médias cités définis ; listes fermées égales à `catalogue/` et à `construire.py` ; une sous-rubrique par collection ; aucun champ des données oublié dans les fichiers-listes ; pas de statut par défaut sur les contenus | `tests/back-office.spec.js` |
| Carte avec image (`alt`, `srcset`, dimensions, `loading="lazy"`) ou bandeau, même hauteur à 1280 et 360 px ; image de carte ≤ 40 Ko ; originaux non publiés | `tests/images-annales.spec.js` |
| Arrêt sur chaque erreur d'image (crédit, licence, autorisation, texte alternatif, fichier) ; image décorative acceptée ; arrêt sur un fichier autonome qui charge une ressource extérieure (fichier et ligne) | `tests/images-annales.spec.js` |
| Annale brouillon : ni page, ni carte, ni sitemap (contenu brouillon aussi) ; relue : page, index, filière, catalogue, accueil, sitemap ; contenu autonome déposé à plat publié et enveloppé | `tests/images-annales.spec.js` |
| `afficher_origine` : à `false`, diplôme, épreuve et session absents de toutes les pages générées ; à `true`, présents dans la fiche, le titre et l'index | `tests/images-annales.spec.js` |
| Accueil avec planche < 300 Ko (mesuré : **145 ko**) ; contraste du titre sur la planche ≥ 4,5:1 (mesuré sur la capture) ; planche en bandeau de 120 px sur téléphone ; planche de thème et vignette ; `/credits/` complète et liée depuis le pied | `tests/images-annales.spec.js` |
| Annale de référence : fichier publié = original + ajouts de l'enveloppe à leur place ; aucun style modifié, élément par élément (accueil du sujet et entraînement) ; fiche et « Commencer » ; entraînement, documents, correction, tracé, plein écran, « Imprimer les DR » (4 feuilles) ; examen et remise de copie ; impression identique à l'original ; aucune erreur JavaScript ni requête tierce | `tests/annale.spec.js` |
| Garde-fou « aucun style écrasé » étendu à tous les fichiers autonomes publiés | `tests/repris.spec.js` |
| Tous les tests du lot 0 (adaptés : l'annale dans le catalogue, les nouvelles pages, la limite de 1 Mo hors annales) | lot 0 |

Le dépôt d'origine de l'annale ne contient pas de réponses de test : le 20/20 n'est pas vérifié (une réponse fausse
et sa correction le sont). La correction d'un tracé n'apparaît, par conception du gabarit, qu'après les questions
dont il dépend : le test vérifie l'enregistrement du tracé.

## À faire par Sébastien

1. **Installer Pages CMS** sur ce seul dépôt (`GUIDE-BACK-OFFICE.md`, partie 1) et vérifier que la source de
   GitHub Pages est « GitHub Actions ».
2. **Première annale** : renseigner son origine (rubrique Annales → Origine du sujet) et **décider la valeur par
   défaut de `afficher_origine`** (TRAME § 13 ; `false` en attendant). Relire sa fiche (titre, présentation,
   notions, durée de 300 min).
3. **Ajouter les images et leurs licences** : images de cartes, planches de l'accueil et des thèmes, chacune
   déclarée dans les Crédits (guide, parties 3 et 4).
4. **BTS MS** : l'annale concerne cette filière, encore `actif: false` dans `catalogue/publics.json` (affichée
   « Bientôt » sur l'accueil). Le filtre du catalogue la rend déjà choisissable puisqu'elle a une carte. Passer
   `actif` à `true` quand vous le souhaitez.
5. **Trancher** les écarts n° 1, 2, 3 et 7 ci-dessous.

## Limites constatées de Pages CMS

Le site pagescms.org n'était pas joignable depuis la session (nom de domaine non résolu). Les constats viennent du
code source de Pages CMS 2.1.8 (dépôt `pages-cms/pages-cms`, commit `6f4e860`, juin 2026). Ils n'ont pas pu être
vérifiés dans l'application hébergée.

- **Taille de téléversement** : aucune limite dans le code. Le fichier part encodé en base64 (+ 33 %) dans une seule
  requête vers l'application hébergée. Si l'hébergeur applique la limite courante de 4,5 Mo par requête, un fichier
  HTML de plus de 3,3 Mo environ ne passerait pas. Non vérifiable ici ; l'annale de référence (1,8 Mo) est en deçà.
  Repli : déposer le fichier par l'interface web de GitHub dans `medias/depots/` (guide, dernière ligne).
- **Création de dossiers** : possible par le modèle de nom de fichier et les « nœuds », mais pensé pour des
  arborescences de pages ; j'ai préféré des fiches à plat (voir « Fait », point 2).
- **Une sous-rubrique par collection** : une rubrique ne lit qu'un niveau de dossier. Le lot 1 (37 dépôts) devra
  ajouter les sous-rubriques des nouvelles collections ; le test le rappelle.
- **Fichiers dont la racine est une liste** (`themes.json`, `CREDITS.json`) : réécrits en entier, sans fusion.
  Tous leurs champs sont déclarés, et un test vérifie qu'aucun n'est oublié.
- **Liste de textes à la racine** : impossible à éditer, d'où le nouveau format de `a-la-une.json` (écart n° 2).
- **Valeurs par défaut** appliquées aux champs absents d'une fiche **existante** : le statut des contenus n'a donc
  pas de valeur par défaut. Il est obligatoire : en modifiant une fiche existante, il faut choisir « Relu ».
- **Listes fermées** enregistrées en texte (`"3"` au lieu de `3`) : acceptées par la construction.
- **Références** : elles ne visent que des rubriques de type collection ; les thèmes et filières sont donc recopiés,
  avec un test de synchronisation.
- **Interface** en anglais (les aides de saisie et les rubriques sont en français). Les enregistrements
  échouent si `main` exige des pull requests.

## Écarts avec TRAME, DESIGN et CLAUDE.md

1. **Licences des images** : CLAUDE.md n'admet que « domaine public ou CC0 », TRAME § 10 et le prompt ajoutent
   `oeuvre-personnelle` et `autorisation-ecrite`. J'ai appliqué la liste de TRAME. **À trancher** : mettre
   CLAUDE.md à jour.
2. **`catalogue/a-la-une.json`** passe de `[…]` à `{"contenus": […]}` (limite de Pages CMS). L'ancien format reste
   accepté par la construction. **À valider.**
3. **Bandeau des cartes passé du format 16/7 au 16/9** : DESIGN § 5 veut une image 16/9 de même hauteur que le
   bandeau ; toutes les cartes sont un peu plus hautes. Alternative : garder 16/7 et rogner l'image à l'affichage.
   **À trancher.**
4. **Champs ajoutés** :
   - `decorative` dans `CREDITS.json` : TRAME § 10 dit « déclaré dans CREDITS.json » sans nommer le champ ;
   - `illustration_accueil` dans `site.json` : TRAME ne dit pas où ranger la planche de l'accueil ;
   - `illustration` dans les thèmes, au format `{fichier, alt}` ;
   - `statut` et `fichier` dans les contenus.
5. **Annales dans le catalogue** : type « Annale » ajouté au filtre Type (hors des types de contenu de TRAME § 5).
   Une filière inactive devient choisissable dès qu'elle a une carte.
6. **Titre et description des pages d'annale** : insérés au début de `<head>` (juste après `<meta charset>`).
   Le document a ainsi deux `<title>` : le premier, celui du site, est celui qu'utilisent navigateurs et moteurs ;
   celui du fichier reste en place. Le corps du fichier n'est pas modifié (test).
7. **Pages Labo et Maquettes « à venir », bloc « Bientôt » de l'accueil, rubriques « À venir » et « Articles »** :
   TRAME § 6, 7 et 9 les rattachent au lot 1b, le prompt ne les demande pas. **Non faits**, à confirmer pour un
   prochain lot.
8. **Notions** affichées à partir de leurs identifiants, donc sans accents (« cinematique graphique »). Un petit
   dictionnaire `catalogue/notions.json` (identifiant → libellé) serait utile au lot 3 (maillage).
9. **« Liens vers les cours de mêmes notions »** : la fiche cite tous les contenus qui partagent une notion, cours
   en tête. Aucun cours n'en partage encore : le seul lien est l'exercice `cadre-velo`.
10. **Données structurées** (TRAME § 12.2) : pas encore générées (lot 1). L'exigence « aucune mention de l'origine
    dans les données structurées » est donc tenue d'office.
11. **Niveaux** : liste fermée 1 à 3 (`NIVEAUX` dans `construire.py`, recopiée dans `.pages.yml`), à étendre au
    besoin.
12. **Origine** : au format de TRAME § 12.1, « diplôme session épreuve » ; `session` est un nombre (année).
13. **Couche CSS** : la fiche d'annale rejoint les pièces de l'enveloppe dans les préfixes `:where(…)` de
    `commun.css`. L'enveloppe prend la typographie du fichier (police de titre et graisse des boutons de la
    charte).

Dépendances ajoutées :
- **Pillow 13.0.0** : lecture des JPEG, PNG et WebP, recadrage et encodage WebP, demandé par le lot.
- **`yaml` 2.9.1 et `zod` 4.6.7**, pour les tests seulement : ils valident `.pages.yml` avec le schéma de Pages CMS
  (MIT, copié dans `tests/pages-cms/`). `zod` 3.25.76, la version de Pages CMS, a une faille connue de
  consommation mémoire ; `zod` 4.6.7 en donne l'API v3 (`zod/v3`) sans faille (`npm audit` : 0).

---

# Annexe : note de livraison du lot 0 (socle)


Branche `claude/gifted-mccarthy-1rs5w8`. `npm test` : **240 tests, tous verts** (environ 40 s, sans réseau).

### Fait

1. **Structure du dépôt** conforme à TRAME § 4 : `site.json`, `catalogue/`, `contenus/`, `annales/` (vide,
   lot 2), `gabarits/`, `statique/`, `outils/construire.py`, `tests/`, `.github/workflows/publier.yml`.
   `requirements.txt` (Jinja2 3.1.6), `package.json` + `package-lock.json` (`@playwright/test` 1.63.0,
   `@fontsource/barlow-condensed` 5.3.0), `.gitignore` (`_site/`, `node_modules/`…). `outils/reprendre.py` n'est
   pas créé (lot 1).
2. **`site.json`** : nom, `base` = `/industrie-education/`, `indexable: false`, `umami` vide, éditeur et contact
   vides, les 6 titres d'accueil (coupures de ligne de la maquette M1), plus deux champs signalés plus bas
   (`origine`, `hebergeur`).
3. **`statique/`**, publié sous `/_/` :
   - `commun.css` complété : classes de la charte reprises (cartouche, consignes, parties, barre de question,
     données, tableau), accueil, catalogue, listes, collection, contenu natif, pages de service, enveloppe, calque
     Projeter, mobile, projection, impression. Aucun jeton modifié (voir l'écart n° 1 sur la portée des règles).
   - `polices/` : Barlow Condensed 600, 700, 800 (sous-ensemble latin, woff2) et `OFL.txt`.
   - `commun.js` : titre évolutif, filtres du catalogue avec état dans l'adresse, mode projection (interrupteur et
     touche P). Sans cookie, sans stockage, sans requête.
   - `projeter.js` : calque plein écran, QR code (64 % de la hauteur de l'écran), adresse, « Copier le lien »,
     Échap, focus piégé et rendu au bouton, reste de la page inerte. La bibliothèque QR (`lib/qrcode.js`,
     qrcode-generator 2.0.4, MIT, licence à côté) n'est chargée qu'à la première ouverture.
4. **Gabarits Jinja2** : `base`, `accueil`, `catalogue`, `liste`, `collection`, `contenu`, `annales`, `service`
   (+ `_composants.html`, `_enveloppe.html` et les textes de `service/`). Accueil et catalogue suivent les maquettes
   « Accueil retenue — M1 × charte atelier » et « Catalogue — M1 × charte atelier » du canvas.
5. **`outils/construire.py`** : toutes les pages de TRAME § 3 sauf `annale` (34 pages), `statique/` copié sous
   `_/`, enveloppe des contenus repris (TRAME § 5), `sitemap.xml`, `robots.txt`. La construction se fait dans
   `_site.en-cours/` et ne remplace `_site/` qu'en cas de succès. Arrêt avec message clair sur : nom de collection
   réservé, type, thème ou public inconnu, identifiant en double ou différent du nom de dossier, contenu de
   `a-la-une.json` introuvable, contenu repris sans `<head>`/`<body>` explicites.
6. **Contenus** :
   - 3 collections de démonstration (`demo-leviers` en mécanique, `demo-rendement` en énergie, `demo-binaire` en
     numérique), 8 contenus natifs courts à la charte atelier, marqués « Démonstration » (titre de collection,
     description, encadré en tête de page).
   - 1 contenu réel repris : `cadre-velo.html` de `S-Kajzar/STATIQUE` (commit `accf56b`, 8 octobre 2026), copié
     octet pour octet dans `contenus/statique/cadre-velo/index.html`. Ses images sont intégrées au fichier : il n'a
     aucune autre ressource. Il fonctionne enveloppé : corrections (20/20), impression, plein écran du tracé.
7. **Pages de service** : Enseignants (utiliser en classe, Projeter, Pronote), Partenaires (version sans
   partenaire : principes, « Devenir partenaire » avec le contact de `site.json`), À propos, Mentions légales
   (champs de `site.json`, mention « À renseigner » quand ils sont vides), 404 (recherche + Accueil, Catalogue,
   Annales).
8. **`.github/workflows/publier.yml`** : sur envoi vers `main`, installe, construit, teste (`npm test`) puis publie
   `_site/` (`actions/upload-pages-artifact` + `actions/deploy-pages`). Si les tests échouent, rien n'est publié.
9. **Documentation** : `README.md` (rôle du dépôt, commandes, ajouter un contenu en 3 étapes) et cette note.

### Testé

| Exigence du lot | Test |
|---|---|
| Chaque page de TRAME § 3 existe, un seul `h1`, `lang="fr"`, titre, description, focus visible | `tests/pages.spec.js` |
| Chaque page s'affiche sans JavaScript ; adresse inconnue → 404 avec recherche et 3 liens | `tests/pages.spec.js` |
| Aucun lien interne cassé (href, src, action, ancres, polices de `commun.css`) | `tests/liens.spec.js` |
| Aucune requête vers un autre hôte (chaque page, calque Projeter, catalogue filtré, contenu en entraînement) ; pas d'Umami | `tests/requetes.spec.js` |
| `noindex` partout et `robots.txt` fermé ; `sitemap.xml` complet | `tests/indexation.spec.js` |
| Accueil < 300 Ko au premier affichage (mesuré : **106 ko**, sans compression) ; aucune page > 1 Mo | `tests/poids.spec.js` |
| Titre évolutif : 16 dates simulées couvrant les 6 moments et leurs limites ; titre par défaut sans JavaScript ; aucun saut à 360 et 1280 px | `tests/titre.spec.js` |
| Catalogue : thème, type, filière, niveau, recherche sans accents, état dans l'adresse, « Effacer les filtres », aucun résultat, recherche de l'accueil, repli « Filtres » sur téléphone ; sans JavaScript, toutes les cartes | `tests/catalogue.spec.js` |
| 360 px : pas de défilement horizontal (toutes les pages, catalogue filtré, calque Projeter) | `tests/mobile.spec.js` |
| Contenu repris : fichier publié = original + ajouts de l'enveloppe ; aucun style du contenu modifié (élément par élément) ; 20/20 ; impression identique à l'original (même nombre de pages) ; plein écran ; mode projection | `tests/repris.spec.js` |
| Calque Projeter : QR ≥ 60 % de la hauteur, QR = adresse de la page, focus piégé, copie, Échap | `tests/projeter.spec.js` |
| Gabarit contenu natif : fil d'Ariane, précédent/suivant, Signaler, projection, corrections sans JavaScript | `tests/contenu.spec.js` |
| La construction s'arrête sur un nom réservé (dépôt factice) et sur les autres erreurs ; Umami et indexation suivent `site.json` | `tests/construction.spec.js` |

Contrôles à la main : captures à 1440 et 360 px comparées aux maquettes M1 ; vérification que le garde-fou « aucun
style écrasé » échoue bien quand on introduit une fuite volontaire dans `commun.css`.

### À faire par Sébastien

1. **Activer GitHub Pages en mode « GitHub Actions »** : Settings → Pages → Build and deployment → Source :
   « GitHub Actions ». Pages paraît déjà activé sur le dépôt : vérifier que la source n'est pas restée sur
   « Deploy from a branch ». Puis fusionner la pull request : la première publication part de `main`.
2. **Renseigner `site.json`** : `editeur.nom`, `editeur.adresse`, `editeur.directeur_publication`, `contact`
   (sert aussi à « Signaler une erreur » et « Devenir partenaire »). Vérifier `hebergeur`, prérempli avec GitHub.
   Plus tard : `umami` (identifiant du site), puis `indexable: true` à la bascule.
3. **Relire les textes** des pages Enseignants (en particulier la rubrique Pronote, restée volontairement générale),
   Partenaires, À propos et Mentions légales.
4. **Trancher les écarts n° 2, 3 et 5** ci-dessous.
5. **Retirer les contenus de démonstration** (`contenus/demo-*`) avant la bascule, et les remplacer dans
   `catalogue/a-la-une.json`.

### Écarts avec TRAME et DESIGN, points à trancher

1. **Lien vers `commun.css` dans un contenu repris** (TRAME § 5 : « après les styles du contenu sans les
   écraser »).
   - Un simple `<link>` placé après les styles du contenu écrasait ceux-ci : fond, boutons, couleurs de liens, et
     même l'impression (9 pages au lieu de 12).
   - Deux mesures ont été prises :
     - le lien est inséré sous la forme `<style>@import url("…/_/commun.css") layer(site);</style>` : en cas de
       conflit, le contenu gagne toujours ;
     - chaque règle de `commun.css` qui vise un élément HTML ou une classe susceptible d'exister dans un contenu est
       limitée aux pages du site (`body.vitrine`, `body.atelier`) et aux pièces de l'enveloppe par un préfixe
       `:where(…)`.
   - Ce préfixe a une spécificité nulle : le rendu des pages du site est inchangé (comparé au pixel près).
   - Un test compare désormais, pour chaque contenu repris, les styles calculés de chaque élément avec ceux du
     fichier d'origine : au lot 1, une fuite sera détectée automatiquement.
   - Conséquences :
     - l'enveloppe prend la typographie du contenu (police de titre de la charte, sans Barlow ; graisse des
       boutons) ;
     - un navigateur antérieur à 2022 affiche le bandeau sans mise en forme, mais le contenu reste intact.
   - Autres retouches de règles existantes (jetons inchangés) :
     - `!important` sur le fond et la taille de texte du mode projection, pour qu'il agisse aussi sur un contenu
       repris ;
     - `.visuellement-cache` rendu robuste (`!important`), car une légende masquée débordait de 82 px ;
     - le sélecteur du titre d'accueil est étendu à ses variantes.
2. **Liens d'origine du contenu repris** : `cadre-velo.html` contient trois liens `index.html`, qui mènent désormais
   à la page elle-même au lieu de l'accueil de STATIQUE, et un lien `cours-statique-analytique.html`, cassé tant
   que le cours 3 n'est pas repris. Le corps ne pouvant pas être modifié (TRAME § 5) alors qu'aucun lien interne ne
   doit être cassé (TRAME § 8), ce lien figure comme exception connue dans `tests/liens-connus.json`. **À trancher
   pour le lot 1** : réécrire ces liens à la reprise, ajouter des redirections, ou accepter des exceptions.
3. **Titre d'accueil évolutif** : la hauteur réservée est celle du plus long des six titres, pour qu'aucun moment
   ne fasse sauter la page (DESIGN § 7). Les titres de deux lignes, dont celui par défaut, laissent donc un espace
   vide sous eux (bien visible sur téléphone). La maquette réservait seulement 1,8 em, avec un saut d'une ligne
   pour les titres plus longs. **À choisir** : pas de saut (actuel) ou espace minimal.
4. **Deux `h1` dans `cadre-velo.html`** : un sur l'écran de choix du mode, un sur le sujet. Un seul est affiché à la
   fois. Pour les contenus repris, le test compte les `h1` affichés ; pour les autres pages, les `h1` présents.
5. **Champs ajoutés** :
   - dans `site.json` : `origine` (adresse du site, nécessaire aux URL absolues du sitemap) et `hebergeur`
     (mentions légales) ; `editeur` est un objet (nom, adresse, directeur de la publication) ;
   - dans `themes.json` : `court`, pour les noms courts des bandeaux de cartes de la maquette (« Mécanique » pour
     « Mécanique et conception ») ;
   - `niveau` et `duree_min` sont facultatifs (un formulaire n'a pas de niveau, comme dans la maquette).

   **À valider.**
6. **Défaut d'origine de `cadre-velo.html`** : à 360 px, en mode entraînement, le cartouche déborde de 4 px (grille
   `1fr` et champ « Nom et prénom »). Le défaut existe déjà dans STATIQUE et ne peut être corrigé qu'à la source.
   Le test vérifie que l'enveloppe n'ajoute rien. À l'ouverture, la page ne déborde pas.
7. **`robots.txt` en préproduction** : publié sous `/industrie-education/robots.txt`, il n'est pas lu par les
   moteurs, qui ne lisent que la racine du domaine `s-kajzar.github.io`. Ce qui protège la préproduction, c'est la
   balise `noindex` présente sur chaque page, contenus repris compris. Le fichier prendra effet avec le domaine.
8. **Catalogue** :
   - le bloc « Filière » est en lignes comme les autres filtres (DESIGN § 5), au lieu des pastilles de la maquette ;
   - le filtre « Niveau » (TRAME § 6), absent de la maquette, est ajouté sur le même modèle ;
   - Bac Pro MSPC et BTS MS sont `actif: false`, donc affichés « bientôt » comme dans la maquette ; leurs pages
     (`/bac-pro-mspc/`, `/bts-ms/`, `/annales/…/`) existent avec un message « en préparation ».
9. **Accueil** :
   - l'accroche de la maquette est conservée (« … corrigés automatiquement ») ; elle sera exacte après la reprise,
     les contenus de démonstration se corrigeant par dépliage ;
   - le moment affiché à gauche du titre (« Mercredi · 14 h ») vient aussi de la maquette.
10. **Mode projection** : il n'est pas mémorisé d'une page à l'autre (aucun stockage dans le navigateur). La touche
    P n'agit que sur les pages de contenu, où se trouve l'interrupteur. Les traits de 3 px ne s'appliquent qu'aux
    pages du site : un contenu repris garde ses traits.
11. **« Signaler une erreur »** : sans contact dans `site.json`, le lien mène à la rubrique « Signaler une erreur »
    d'À propos. Avec un contact, il ouvre un courriel prérempli (titre et adresse de la page). Le formulaire est
    prévu au lot 3.
12. **Identifiants et page 404** :
    - les identifiants de contenus sont uniques sur tout le site ; `a-la-une.json` accepte `cadre-velo` ou
      `statique/cadre-velo`, et de 3 à 6 entrées (TRAME § 6) ;
    - la 404 utilise des liens absolus (base de `site.json`), car GitHub Pages la sert à n'importe quelle adresse.

Dépendances : uniquement celles demandées par le lot (Jinja2, `@playwright/test`, `@fontsource/barlow-condensed`).
La bibliothèque QR est copiée dans `statique/lib/` (licence MIT jointe), sans dépendance npm. Les réponses du test
20/20 (`tests/reponses-cadre-velo.js`) sont reprises des tests de STATIQUE.
