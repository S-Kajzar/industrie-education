# Lot 1d — Back-office sur le site : Sveltia CMS à l'adresse /admin/

À coller dans une session Claude Code ouverte sur le dépôt `S-Kajzar/industrie-education`.

Tu travailles sur le dépôt `industrie-education`, après le lot 1c (pull request n° 4).

Lis d'abord en entier, car ils font foi :

- `CLAUDE.md` ;
- `TRAME.md`, surtout § 2, 3, 4, 9, 10, 11 et 13 ;
- `DESIGN.md` ;
- `NOTE-DE-LIVRAISON.md` du lot 1c, en particulier l'annexe A, qui liste les limites de Pages CMS constatées ;
- `GUIDE-BACK-OFFICE.md` et `.pages.yml`.

Ensuite, copie ce prompt dans `prompts/LOT-1D.md`.

**Objectif du lot.** Remplacer Pages CMS par un back-office servi par le site lui-même, à l'adresse `/admin/`. Ce
back-office :

- est en français, utilisable sur ordinateur et sur téléphone ;
- modifie les mêmes fichiers du dépôt, par le même circuit de publication (commit sur `main`, puis Action, tests et
  Pages) ;
- ne demande aucun serveur ni aucune base de données.

Propose-moi d'abord un plan court (étapes, fichiers créés, modifiés ou supprimés). Réalise-le ensuite étape par
étape, tests à l'appui.

## Décisions déjà prises avec Sébastien (le 27/11, à ne pas rediscuter)

- Pas de back-office dynamique avant la V2 avec comptes. La V2 sera une application séparée. Ce lot reste dans le
  modèle statique.
- Outil : Sveltia CMS, paquet npm `@sveltia/cms`, version 5.x (5.0.2 au 27/11), licence MIT. Backend `github`, dépôt
  `S-Kajzar/industrie-education`, branche `main`, commits directs. Pas de flux éditorial : le champ `statut` gère
  déjà les brouillons.
- Connexion : jeton d'accès personnel GitHub (« Se connecter avec un jeton d'accès »), à granularité fine, limité
  au dépôt, avec le contenu en lecture et écriture. Pas d'application OAuth ni d'authentificateur tiers (Cloudflare
  ou autre).
- Script servi par le site. Ajoute `@sveltia/cms` aux dépendances, avec une version figée dans `package.json` et
  `package-lock.json`. La construction copie `dist/sveltia-cms.js` et `dist/chunks/` (sans les fichiers `.map`) dans
  `_site/admin/`. Rien de tout cela n'est versionné, et rien n'est chargé depuis unpkg. Justifie la dépendance dans
  la note de livraison.
- Pages CMS est retiré : `.pages.yml` est supprimé, ses tests et fixtures sont remplacés, le guide est réécrit. En
  cas de panne du back-office, le repli est l'interface web de GitHub (section du guide).
- `/admin/` reste hors du site public :
  - `noindex, nofollow` ;
  - absent du sitemap ;
  - `Disallow: /admin/` dans `robots.txt`, s'il existe (sinon, ne le crée pas pour ce seul usage : signale-le) ;
  - aucun lien depuis une page publique.

  Ajoute `admin`, `classe` et `compte` aux noms réservés (TRAME § 3) : les deux derniers sont gardés pour la V2.

## À vérifier dans le paquet, pas de mémoire

Le paquet contient `schema/sveltia-cms.json` (schéma JSON de la configuration) et `locales/fr.json`. Vérifie chaque
point dans le code ou le schéma du paquet installé, et consigne le résultat dans la note de livraison.

1. Interface en français, quelle que soit la langue du navigateur : quelle option l'impose ? D'où vient la
   traduction : du bundle, de fichiers à côté du script, ou d'un CDN ?
2. Notions : un widget `relation` peut-il proposer les notions de `catalogue/notions.json` (option `file`,
   `value_field` sur une liste) ? Un fichier dont la racine est une liste est-il éditable ? Si ce n'est pas le cas,
   propose `{"notions": [...]}`. La construction doit alors accepter les deux formats ; signale-le comme écart.
3. Fichier HTML d'annale : widget `file` limité aux `.html`, dossier `medias/depots/`, `max_file_size` de 5 Mo,
   aligné sur `outils/annale.py`.
4. Images :
   - dossiers de médias identiques à ceux d'aujourd'hui ;
   - transformations d'images de Sveltia désactivées : les originaux restent dans le dépôt et les variantes sont
     produites par `outils/illustrations.py` ;
   - intégrations de banques d'images (Pexels, Pixabay, Unsplash), de traduction et d'IA désactivées ou absentes,
     car `CLAUDE.md` interdit ces sources.
5. Messages de commit en français (`commit_messages`), par exemple « Annales : mise à jour de
   levage-dechargement-sacs-linge ».
6. Lien « voir en préproduction » sur chaque fiche (`site_url`, `preview_path` ou équivalent), si le paquet le
   permet.
7. Valeurs par défaut : s'appliquent-elles seulement à la création, ou aussi aux fiches existantes (problème
   rencontré avec Pages CMS sur `statut`) ?
8. Format d'écriture des JSON : indentation, ordre des clés, retour à la ligne final. Si Sveltia réécrit autrement
   que les fichiers actuels, aligne une fois pour toutes les fichiers du dépôt dans un commit à part (« Format des
   données aligné sur le back-office »), pour que les diffs restent lisibles.
9. Hôtes contactés par `/admin/` au chargement et à l'usage : API GitHub, polices, traductions, vérification de
   version, etc. Désactive ce qui peut l'être et sers depuis le site ce qui est raisonnable. Liste ce qui reste dans
   la note. La règle « aucune requête vers un tiers » reste entière pour toutes les autres pages. `/admin/` devient
   une exception documentée : un adulte seul s'y connecte, sans aucune donnée de visiteur.

## À livrer

### 1. Le dossier `admin/` du dépôt

- `admin/config.yml`, qui commence par le lien vers son schéma.
- La page `admin/index.html`, produite par la construction avec la bonne `base`. Titre : « Administration —
  industrie.education ». Elle charge `./sveltia-cms.js` depuis le site.
- La construction copie le tout dans `_site/admin/`. Si le paquet manque, elle s'arrête avec un message clair.
- Ajoute à `CLAUDE.md`, règle « Public mineur », une phrase sur l'exception `/admin/` et sur ses hôtes autorisés.

### 2. Reprise de toutes les rubriques de `.pages.yml`

Rubriques, dans le même ordre : Annales, Contenus, Images et crédits, Accueil (avec « à la une » et « à venir »),
Notions, Thèmes, Réglages du site.

Pour chacune, garde :

- les mêmes lignes d'aide ;
- les mêmes champs et libellés ;
- les champs obligatoires ;
- les motifs de contrôle, avec des messages en français ;
- les listes fermées : publics, thèmes, licences des images, licences des sources, statut.

Ensuite :

- Lève les limites de Pages CMS quand Sveltia le permet, et note pour chacune si elle est levée ou non :
  - notions choisies dans la liste ;
  - taille de téléversement ;
  - fichiers dont la racine est une liste ;
  - une sous-rubrique par collection de contenus. Si une rubrique « Contenus » peut couvrir toutes les collections,
    fais-le ; sinon, garde le test qui exige une sous-rubrique par collection.
- Saisie des annales. Sur mobile, déposer une annale (fichier HTML, fiche, source) doit tenir sur un seul écran de
  formulaire, sans champ technique visible. Masque `fichier` derrière le téléversement.

### 3. Retrait de Pages CMS

- Supprime `.pages.yml`, `tests/pages-cms/` et les tests qui ne servent qu'à lui.
- Mets à jour `README.md`, TRAME § 2 et § 9 (le back-office devient Sveltia CMS à `/admin/`), § 3 (noms réservés)
  et § 7 (nouvelle ligne « 1d »).
- Dans le tableau des décisions de TRAME § 2, ajoute celle du 27/11 : pas de back-office dynamique avant la V2, et
  la V2 sera une application séparée.

### 4. Tests

- La configuration est valide selon le schéma du paquet.
- Chaque rubrique pointe vers des fichiers ou dossiers existants, et chaque fiche existante s'ouvre.
- Aucune clé des fichiers de données n'est absente de la configuration, pour éviter qu'un enregistrement ne la
  perde. Les clés techniques volontairement non éditables sont listées dans le test.
- Les listes fermées de la configuration sont identiques à celles de `construire.py` et `annale.py`.
- `/admin/` servi en local :
  - le script vient du site lui-même ;
  - l'écran de connexion s'affiche en français ;
  - aucune erreur JavaScript (les appels vers GitHub sont bloqués dans le test).
- `/admin/` : `noindex`, absent du sitemap, jamais lié depuis une page publique.
- Aucune requête tierce sur toutes les autres pages : le test existant exclut désormais `/admin/` seulement.
- Les règles de poids ne s'appliquent pas à `/admin/` (bundle d'environ 3 Mo) ; indique le poids réel dans la note.

**Limite connue** : depuis une session Claude Code, l'API GraphQL de GitHub n'est pas joignable. Tu ne peux donc pas
tester un vrai enregistrement. Sébastien fera cette recette (§ 6).

### 5. `GUIDE-BACK-OFFICE.md` réécrit pour `/admin/`

- Accès :
  - créer le jeton : chemin dans GitHub, nom, dépôt unique, permission « Contents » en lecture et écriture, durée ;
  - se connecter, mettre en favori ;
  - se connecter sur mobile par QR code, si le paquet le propose ;
  - renouveler et révoquer le jeton.
- Chaque rubrique, puis : déposer une annale, ajouter une image et son crédit, gérer les notions, les réglages,
  Umami et le résumé de publication.
- En cas de problème :
  - annuler une modification depuis l'historique GitHub ;
  - repli par l'interface web de GitHub (dossiers, limite de 25 Mo par fichier) ;
  - jeton expiré ou refusé.
- Sécurité : le jeton est un mot de passe. Il se range dans un gestionnaire de mots de passe et ne sert que sur des
  appareils personnels.

### 6. `NOTE-DE-LIVRAISON.md` du lot 1d

Elle reprend les rubriques habituelles (fait, testé, écarts), plus :

- le résultat des 9 vérifications ;
- les hôtes contactés par `/admin/` ;
- le poids du dossier ;
- une recette à faire par Sébastien, qui comprend au minimum :
  1. connexion par jeton ;
  2. modifier un réglage, puis voir la préproduction à jour ;
  3. déposer en brouillon le fichier de test de 2,9 Mo que Sébastien a reçu (copie de l'annale existante,
     complétée par un commentaire HTML), puis supprimer la fiche et le fichier ;
  4. choisir une notion dans la liste ;
  5. ajouter une image et son crédit ;
  6. vérifier que le commit est en français dans l'historique ;
  7. annuler une modification ;
  8. se connecter sur téléphone.

Garde en annexe les écarts encore ouverts des lots précédents.

## Hors périmètre

- Les comptes, l'authentification OAuth et le flux éditorial.
- Toute modification de l'intérieur d'un fichier autonome.
- Tout changement de structure des données, sauf nécessité démontrée et signalée.
- La reprise des 37 dépôts et le référencement (lot 1).
- Toute autre dépendance que `@sveltia/cms`.

## Fin de session

`npm test` est vert, la note de livraison est à jour et la pull request est ouverte. Ensuite, arrête-toi.
