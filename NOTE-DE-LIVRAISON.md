# Note de livraison — lot 1d : back-office Sveltia CMS à l'adresse /admin/

Branche `claude/gifted-mccarthy-1rs5w8`, repartie de `main` après la fusion du lot 1c et de son correctif (PR n° 4
et n° 5) ; pull request n° 6. Prompt : `prompts/LOT-1D.md`. `npm test` : **321 tests, tous verts** (environ 1 min 20, sans réseau).

**Dépendance ajoutée** : `@sveltia/cms` **5.0.2**, figée (`dependencies` de `package.json` et `package-lock.json`),
licence MIT. Justification :
- c'est l'outil décidé le 27/11 ;
- le site sert lui-même son script, copié depuis `node_modules/` à la construction (rien n'est versionné ni chargé
  depuis unpkg) ;
- sa licence est jointe dans `_site/admin/LICENSE.txt`.

npm installe aussi les dépendances du paquet (Shiki, Leaflet, pdf.js, SVGO, exifr, translittération…), qui ne
servent qu'à son entrée npm. Deux d'entre elles sont servies par le site, voir la vérification n° 9.

`zod` est retiré (il ne servait qu'au test de Pages CMS). Aucune autre dépendance.

## Fait

1. **Back-office servi par le site, à `/admin/`** :
   - `outils/construire.py` copie dans `_site/admin/` :
     - `dist/sveltia-cms.js` et `dist/chunks/`, sans les `.map` ;
     - `locales/fr.json` et la licence ;
     - deux petits modules (translittération et `exifr`), avec leur licence ;
     - `admin/config.yml`.
   - La page `admin/index.html` est générée par `gabarits/admin.html`, avec la base de `site.json` :
     - titre « Administration — industrie.education » ;
     - `noindex, nofollow` ;
     - `<script src="./sveltia-cms.js">` ;
     - un petit script de mise en route (langue, requêtes coupées) et une table d'import.
   - **Sans le paquet**, la construction s'arrête : « le paquet npm @sveltia/cms est introuvable … Lancez « npm ci » ».
   - **Hors du site public** :
     - absent du sitemap, `Disallow: /industrie-education/admin/` dans `robots.txt` (en préproduction comme
       après l'ouverture) ;
     - jamais lié depuis une page publique (test).
   - **Noms réservés** : `admin`, `classe` et `compte` ajoutés (TRAME § 3).
2. **`admin/config.yml`**, qui commence par le lien vers son schéma :
   - **Rubriques**, dans l'ordre : Annales, Contenus, Images et crédits, Accueil (« à la une », « à venir »),
     Notions, Thèmes, Réglages du site.
   - **Repris de `.pages.yml`** : les mêmes aides, les mêmes champs et libellés, les champs obligatoires, les motifs
     de contrôle (messages en français) et les listes fermées.
   - **Connexion et commits** : backend `github`, ce dépôt, branche `main`, **connexion par jeton seulement**
     (`auth_methods: [token]`), commits directs, messages en français.
   - **Médias** :
     - les mêmes trois dossiers (`asset_collections`) ;
     - 5 Mo au plus, noms nettoyés (minuscules, sans accent) ;
     - aucune transformation, **banques d'images désactivées**.
   - **Mobile** : sur téléphone, le dépôt d'une annale tient dans un seul formulaire. Le fichier HTML ne se choisit
     que par téléversement (« Parcourir »), sans chemin à saisir ; les blocs facultatifs (image, origine) sont
     repliés ; le type de contenu s'affiche en boutons plutôt qu'en liste déroulante.
   - **Lien vers la préproduction** : « Afficher sur le site en ligne » sur chaque annale et chaque contenu.
3. **Limites de Pages CMS** (annexe A du lot 1c), levées ou non :

   | Limite | Avec Sveltia |
   |---|---|
   | Notions en saisie libre | **Levée** : choisies dans la liste de `catalogue/notions.json` (libellés accentués) |
   | Taille de téléversement (environ 3 Mo) | **Levée a priori** : 5 Mo, comme `outils/annale.py` ; le passage par GitHub est à confirmer par la recette (fichier de 2,9 Mo) |
   | Fichiers dont la racine est une liste | **Levée** : notions, thèmes et crédits se modifient entrée par entrée |
   | Une sous-rubrique par collection | **Levée** : une seule rubrique « Contenus », en arborescence ; une nouvelle collection apparaît d'elle-même (le test qui exigeait une sous-rubrique est retiré) |
   | Valeurs par défaut appliquées aux fiches existantes | **Non levée** : même comportement (vérification n° 7) ; pas de statut par défaut sur les contenus |
   | Listes fermées enregistrées en texte | **Levée** : le niveau reste un nombre |
   | Interface en anglais | **Levée** : interface en français |
   | `main` sans règle « pull request obligatoire » | **Inchangée** : commits directs |

4. **Format des données aligné sur le back-office**, dans un commit à part :
   - `outils/format-donnees.js` calcule le format qu'écrit Sveltia et réaligne les fichiers ;
   - 14 fichiers sont concernés ;
   - le test « fichiers alignés » garde ce format ;
   - six enregistrements réels par Sveltia, en mode « dépôt local », ne changent que le champ modifié (test).
5. **Construction** : un `editeur` absent de `site.json` est accepté (Sveltia n'écrit pas un objet vide).
6. **Pages CMS retiré** : `.pages.yml`, `tests/pages-cms/`, `tests/back-office.spec.js` et `zod` sont supprimés ;
   le guide est réécrit.
7. **Documentation** :
   - `CLAUDE.md` : exception `/admin/` et ses hôtes, dans la règle « Public mineur » ;
   - `TRAME.md` : § 2 (back-office, décision du 27/11), § 3 (noms réservés, `/admin/`), § 4, § 7 (ligne 1d),
     § 8 et § 9 réécrit ;
   - `README.md` ;
   - `GUIDE-BACK-OFFICE.md`, réécrit.

## Les 9 vérifications, dans le paquet installé

Résultats tirés du code de `dist/sveltia-cms.js` 5.0.2, de `schema/sveltia-cms.json` et `locales/fr.json`, et
d'essais dans Chromium en mode « dépôt local ».

1. **Interface en français.**
   - **Option** : aucune option de configuration ne fixe la langue. Sveltia prend d'abord la langue choisie dans
     ses préférences (`localStorage`, clé `sveltia-cms.prefs`, propriété `locale`), puis celle du navigateur. La
     page `/admin/` y inscrit `fr` si aucune langue n'a été choisie ; un autre choix fait dans les préférences reste
     respecté.
   - **Traductions** : seul l'anglais est dans le bundle. Les autres langues sont téléchargées sur
     `https://unpkg.com/@sveltia/cms@5.0.2/locales/<langue>.json`, puis gardées dans IndexedDB. La page redirige
     cette requête vers `./locales/fr.json`, copiée par la construction.
   - **Testé** avec un navigateur en anglais : écran de connexion en français, aucune requête vers unpkg.
2. **Notions.**
   - **Liste** : oui. Une collection peut lire un fichier JSON dont la racine est une liste d'objets (option `file`
     d'une collection d'entrées, chaque objet étant une entrée). La rubrique « Notions » pointe sur
     `catalogue/notions.json`, et le champ `relation` (`collection: notions`, `value_field: id`, `display_fields:
     [nom]`, `multiple: true`) propose les libellés.
   - **Format** : le fichier garde sa forme ; `{"notions": [...]}` n'est pas nécessaire, donc pas d'écart.
   - **Autres fichiers** : thèmes et crédits sont traités de même.
3. **Fichier HTML d'annale** :
   - widget `file`, `accept: ".html,text/html"`, dossier `/medias/depots`, `choose_url: false` ;
   - `max_file_size: 5242880`, soit la valeur `TAILLE_MAX` de `outils/annale.py` (test d'égalité) ;
   - au-delà, refus « Fichier volumineux … dépasse la taille maximale de 5,2 Mo » : Sveltia compte les mégaoctets
     en puissances de 10 (testé).
4. **Images.**
   - **Dossiers** : `medias/cartes`, `medias/illustrations` et `medias/depots`, les mêmes qu'avant.
   - **Transformations** : aucune option `transformations` ; le code n'en applique que si elle est définie. Les
     originaux restent tels quels, et `outils/illustrations.py` fait les variantes.
   - **Banques d'images** : actives par défaut (dont Lorem Picsum, sans clé), désactivées par
     `media_libraries.stock_assets: false`.
   - **Traduction et IA** : ces services (Google, DeepL, OpenAI, Anthropic, Gemini…) ne servent qu'aux sites
     multilingues (option `i18n`, absente). Ils restent dans le bundle et dans les préférences de l'utilisateur,
     mais n'apparaissent nulle part dans le formulaire ; aucune clé n'est configurée.
5. **Messages de commit** :
   - modèles `{{collection}} : création | mise à jour | suppression de {{slug}}` et `Médias : ajout | suppression de
     {{path}}` ;
   - `{{collection}}` prend le **libellé au singulier**, d'où par exemple « Annale : mise à jour de
     levage-dechargement-sacs-linge » ;
   - pour Notions, Thèmes et Images et crédits, `{{slug}}` est la **position** dans la liste (« Notion : mise à
     jour de 1 ») ;
   - non testable ici : le mode local ne fait pas de commit. Recette.
6. **Lien « Afficher sur le site en ligne »** :
   - `preview_path` sur Annales et Contenus ;
   - Sveltia ne garde que le domaine de `site_url`, donc chaque `preview_path` commence par la base
     (`industrie-education/`) ;
   - adresses vérifiées : `…/industrie-education/annales/levage-dechargement-sacs-linge/` et
     `…/industrie-education/statique/cadre-velo/` ;
   - un test compare `site_url` et les `preview_path` à `site.json`, pour la bascule.
7. **Valeurs par défaut** : elles s'appliquent **aussi aux fiches existantes** auxquelles le champ manque. Essai :
   une annale sans `statut` s'ouvre en « Brouillon » et s'enregistre ainsi.
   - **Annales** : le défaut `brouillon` reste sans risque, car toutes ont un statut et la construction traite déjà
     un statut absent comme un brouillon.
   - **Contenus** : pas de valeur par défaut sur le statut (test).
8. **Format d'écriture des JSON**, observé :
   - indentation de 2 espaces, listes et objets toujours développés, retour à la ligne final ;
   - clés dans l'ordre des champs de la configuration ;
   - avec `omit_empty_optional_fields: true` (choisi), un champ facultatif vide n'est pas écrit, et un objet dont
     tous les sous-champs sont vides non plus, même obligatoire ;
   - les champs cachés sont recopiés tels quels.

   Sans cette option, Sveltia écrivait `"statut": ""`, `"fichier": ""` et `"image": null` dans chaque contenu. Les
   fichiers du dépôt sont alignés dans un commit à part, « Format des données aligné sur le back-office » (voir
   l'écart n° 2).
9. **Hôtes contactés** : voir la section suivante.

## Hôtes contactés par /admin/

| Hôte | Quand | Statut |
|---|---|---|
| le site lui-même | page, script, morceaux, configuration, traduction, modules | servi par le site |
| `api.github.com` | lecture du dépôt (REST et GraphQL) et commits | **nécessaire** |
| `avatars.githubusercontent.com` | avatar du compte connecté | reste |
| `cdn.jsdelivr.net` | polices de l'interface : Source Sans 3 (2 fichiers) et Material Symbols (icônes) | **reste** : déclarées dans le CSS du bundle ; les servir demanderait de copier ces polices, donc une autre dépendance |
| `unpkg.com` — traductions | chargement | **redirigé** vers `./locales/fr.json` |
| `unpkg.com` — vérification de nouvelle version | chargement, puis toutes les heures | **coupée** |
| `unpkg.com` — translittération des noms de fichiers, lecture EXIF des images | à la demande | **servies par le site** (table d'import `importmap`) |
| `www.githubstatus.com` | état de GitHub | **coupé** |
| `unpkg.com` — autres modules à la demande : HEIC, transformations, pdf.js, SVGO, carte, éditeur de code, Markdown, langues de dates | jamais avec cette configuration (aucun de ces champs ni formats) | non concerné |

**Testé** : au chargement, sans connexion, le seul hôte extérieur est `cdn.jsdelivr.net`. En mode local, à
l'ouverture des fiches et à la création d'une annale avec téléversement, aucun autre. L'exception est documentée
dans `CLAUDE.md` et TRAME § 9 ; la règle « aucune requête vers un tiers » reste entière, et testée, pour toutes les
autres pages.

## Poids de /admin/

Le dossier pèse **3,50 Mo** (3 495 844 octets) :

| Fichier | Poids |
|---|---|
| `sveltia-cms.js` | 2,68 Mo |
| `chunks/`, chargés à la demande | 0,56 Mo |
| `locales/fr.json` | 130 ko |
| modules | 133 ko |
| `config.yml` | 26 ko |

À l'ouverture de l'écran de connexion, le navigateur télécharge **2,93 Mo** non compressés (GitHub Pages les
compresse), plus les polices de jsDelivr. Les règles de poids du site public ne s'appliquent pas à `/admin/`.

## Testé

| Exigence | Test |
|---|---|
| Configuration valide selon le schéma du paquet : chargée par Sveltia sans aucun avertissement de configuration (son validateur embarque `schema/sveltia-cms.json`) ; YAML sans erreur ; lien vers le schéma en tête | `tests/admin.spec.js` |
| Chaque rubrique et chaque dossier de médias pointe vers un fichier ou un dossier existant ; **chaque fiche existante s'ouvre** (25 fiches en mode dépôt local, sans autre hôte extérieur que jsDelivr) | `tests/admin.spec.js` |
| Aucune clé des données absente de la configuration ; clés techniques listées (`mode` et `source` des contenus ; `nom`, `base`, `origine`, `hebergeur` du site) ; chaque fichier modifié par une seule rubrique | `tests/admin.spec.js` |
| Listes fermées identiques à `construire.py`, `annale.py` et `catalogue/` (types, niveaux, statuts, filières, thèmes, licences d'images, licences des sources, identifiants) ; notions en relation ; 5 Mo = `TAILLE_MAX` | `tests/admin.spec.js` |
| Données au format du back-office ; enregistrement réel = seul le champ modifié change (6 fichiers) | `tests/admin.spec.js` |
| `/admin/` en local : script servi par le site, écran de connexion en français avec un navigateur en anglais, aucune erreur JavaScript, seul hôte extérieur jsDelivr (appels extérieurs bloqués) | `tests/admin.spec.js` |
| Dépôt d'une annale sur téléphone : un formulaire, fichier par téléversement sans chemin à saisir, refus au-delà de 5 Mo, fiche écrite en brouillon, fichier rangé et renommé | `tests/admin.spec.js` |
| `/admin/` : `noindex`, absent du sitemap, `Disallow` dans `robots.txt`, jamais lié ; construction arrêtée sans le paquet ; noms réservés | `tests/admin.spec.js`, `tests/construction.spec.js` |
| Aucune requête tierce sur toutes les autres pages (`/admin/` seul exclu) ; poids, liens, `h1` : `/admin/` exclu des règles du site public | `tests/outils.js` (`pagesConstruites`), suite complète |
| Tous les tests des lots précédents | suite complète |

**Non testé ici**, faute d'accès à l'API GraphQL de GitHub : un vrai enregistrement (commit), les messages de
commit, la connexion par jeton et par QR code, le téléversement d'une image. Dans le navigateur de test, le dépôt
d'une image ne déclenche rien, alors que celui d'un fichier HTML fonctionne. C'est la recette ci-dessous.

## Recette à faire par Sébastien

Sur <https://s-kajzar.github.io/industrie-education/admin/>, une fois la pull request fusionnée et publiée :

1. **Connexion par jeton** : créer le jeton (guide, « Accès »), se connecter. Vérifier que l'interface est en
   français et que les 7 rubriques sont là.
2. **Réglage** : modifier un titre d'accueil (Réglages du site), enregistrer ; environ 2 minutes plus tard, voir la
   préproduction à jour.
3. **Fichier de 2,9 Mo** : déposer en **brouillon** le fichier de test reçu (copie de l'annale, complétée par un
   commentaire HTML), avec une fiche d'essai. Vérifier le commit sur GitHub, puis supprimer la fiche (bouton
   « Supprimer » de la fiche) et le fichier (Ressources → Fichiers HTML déposés → Supprimer).
4. **Notion** : dans une fiche, ajouter une notion choisie dans la liste ; enregistrer.
5. **Image** : ajouter une image à une carte (guide, « Ta première image en 5 minutes ») puis son crédit ; vérifier
   la carte et la page Crédits en préproduction.
6. **Commit en français** : sur GitHub, onglet Code → Commits, vérifier les messages (« Annale : mise à jour de … »).
7. **Annuler** une modification (guide, « Annuler une modification »).
8. **Téléphone** : se connecter sur mobile par le code QR (menu du compte → « Se connecter sur mobile ») ou en
   collant le jeton ; ouvrir une annale.

Pendant la recette, dans l'onglet Réseau du navigateur (outils de développement), noter les hôtes contactés et les
comparer au tableau ci-dessus.

## À faire par Sébastien

1. **Recette** ci-dessus ; signaler tout écart.
2. **Révoquer l'accès de Pages CMS**, qui ne sert plus : sur GitHub, *Settings* → *Applications* → *Installed
   GitHub Apps* → Pages CMS → *Uninstall*.
3. Les points encore ouverts des lots précédents (annexes), dont la confirmation de l'annale existante (origine,
   source, statut `relu`, valeur par défaut de `afficher_origine`), les mentions légales et Umami.
4. **Trancher** les écarts n° 1 et 2 ci-dessous.

## Écarts avec TRAME, DESIGN, CLAUDE.md et le prompt

1. **Titres et planche de l'accueil déplacés de la rubrique « Accueil » vers « Réglages du site »**.
   - Ils sont dans `site.json`, comme les réglages. Avec deux rubriques sur ce même fichier, Sveltia réécrivait, en
     enregistrant l'une, des valeurs vides gardées en mémoire de l'autre (essai).
   - Une seule rubrique par fichier évite ce risque, et un test le vérifie.
   - « Accueil » garde « à la une » et « à venir », comme le demande le prompt.
   - Autre solution possible : un fichier `catalogue/accueil.json` à part, qui change la structure des données.
   - **À valider.**
2. **Format des données aligné** (commit à part) :
   - les champs facultatifs vides disparaissent : `"image": {"fichier": null, "alt": ""}`,
     `"reference_autorisation": ""`, l'éditeur vide, `"contact": ""`, `"umami": ""` ;
   - des clés de `site.json` changent d'ordre ;
   - certaines listes passent sur plusieurs lignes.

   Aucune donnée réelle ne change ; la construction accepte un éditeur absent. **À valider.**
3. **Chemins des médias écrits avec une barre oblique initiale** (`/medias/depots/x.html`) : c'est imposé par
   Sveltia (`public_folder`). La construction accepte les deux formes ; les fiches existantes gardent la leur
   jusqu'au premier changement d'image ou de fichier.
4. **Nouveaux contenus** : créés dans leur collection, sous la forme `<id>/contenu.json`, avec leur fichier HTML
   dans `medias/depots/`. Les fiches « à plat » (`<collection>/<id>.json`) créées par Pages CMS restent acceptées
   par la construction mais n'apparaissent pas dans le back-office ; il n'en existe aucune.
5. **Messages de commit** : « Annale : … » (libellé au singulier) plutôt que « Annales : … » ; position dans la
   liste pour Notions, Thèmes et crédits (vérification n° 5).
6. **Base dans `preview_path`** (`industrie-education/`), comme `site_url` : à changer à la bascule du domaine ;
   un test le rappelle.
7. **Polices de jsDelivr et avatar GitHub** : exceptions restantes de `/admin/` (tableau des hôtes).
8. **Bandeau « Sveltia CMS is now available in English (US)! »** : il s'affiche seulement avec un navigateur réglé
   dans une autre langue que le français, et se ferme d'un clic (« Later ») ; son état est gardé par Sveltia dans
   IndexedDB.
9. **Stockage dans le navigateur** : sur `/admin/` seulement, Sveltia garde le jeton et ses préférences dans le
   navigateur (localStorage, IndexedDB). C'est une exception à « aucun stockage », documentée, pour un adulte seul.
10. **Fichier `sveltia-cms.js`** : il garde sa ligne `//# sourceMappingURL=…`, et les `.map` ne sont pas copiés.
    Seuls les outils de développement, s'ils sont ouverts, réclament ce fichier (erreur 404 sans effet).
11. **Mode « Travailler avec un dépôt local »** : Sveltia ne le propose que sur `localhost` ou `127.0.0.1`. Il sert
    aux tests et à un usage sur ordinateur avec une copie du dépôt ; il est absent en préproduction.
12. **« À la une »** : reste une liste d'identifiants (l'ordre d'affichage compte), et non une relation.
13. **Avertissement de l'Action** sur `actions/cache@v4` (Node.js 20, voir le correctif du lot 1c) : inchangé.

---

# Annexe A : écarts du lot 1c encore ouverts

À trancher : **n° 1** annales sur les pages de filière et de thème ; **n° 2** bandeau des cartes tramé ; **n° 9**
`catalogue/a-venir.json` en objet `{labo, maquettes}` sans date ; **n° 11** titre « Crédits ».

Pour information :
- **Comptage et adresse** :
  - n° 3, bouton « Commencer » supprimé ;
  - n° 4, `annale-copie-corrigee` compté au premier clic ;
  - n° 5, propriété `page` ;
  - n° 6, adresse du catalogue réécrite après 800 ms ;
  - n° 7, poids de l'accueil estimé dans le résumé.
- **Règles et réglages** :
  - n° 8, règles ajoutées à la source ;
  - n° 10, champ facultatif vide masqué en production ;
  - n° 13, hôte d'envoi d'Umami Cloud à vérifier ;
  - n° 14, limites du plan gratuit d'Umami à vérifier ;
  - n° 15, double construction dans l'Action ;
  - n° 16, adresse du script Umami.

**N° 12**, notions en saisie libre : **résolu** par le lot 1d.

À faire depuis le lot 1c :
- confirmer l'annale existante (origine, source, statut `relu`, `afficher_origine`) ;
- remplir les mentions légales ;
- créer le compte Umami ;
- ajouter les premières images ;
- dans le projet Claude, `id` ou `name` des champs du gabarit et ligne de crédit dans le fichier ;
- autorisation de la DGESCO (TRAME § 13).

# Annexe B : écarts du lot 1b encore ouverts

- **n° 2 `catalogue/a-la-une.json`** en `{"contenus": […]}` (l'ancien format reste accepté). **À valider.**
- **n° 3 Bandeau des cartes en 16/9** au lieu de 16/7. **À trancher.**
- **n° 4 Champs ajoutés** :
  - lot 1b : `decorative`, `illustration_accueil`, `illustration` des thèmes, `statut` et `fichier` des contenus ;
  - lot 1c : `umami_script` et `source`.

  **À valider.**
- **Pour information** :
  - n° 5, type « Annale » dans le catalogue ;
  - n° 6, deux `<title>` sur une page d'annale ;
  - n° 9, « Pour réviser » limité à `cadre-velo` ;
  - n° 10, données structurées au lot 1 ;
  - n° 11, niveaux 1 à 3 ;
  - n° 12, format de l'origine ;
  - n° 13, couche CSS de la fiche.

Les limites de Pages CMS de l'annexe A du lot 1c sont traitées au point 3 de « Fait » ci-dessus.

# Annexe C : écarts du lot 0 encore ouverts (TRAME § 13)

- **n° 2 Liens d'origine des contenus repris** : `cadre-velo.html` cite `cours-statique-analytique.html`, cassé
  tant que le cours n'est pas repris (exception de `tests/liens-connus.json`). **À trancher pour le lot 1.**
- **n° 3 Hauteur du titre d'accueil** : hauteur du plus long des six titres, sans saut. **À choisir.**
- **n° 5 Champs ajoutés au lot 0** : `origine`, `hebergeur`, `editeur` en objet (désormais facultatif),
  `court`, `niveau` et `duree_min` facultatifs. **À valider.**
