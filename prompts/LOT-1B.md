# Lot 1b — Back-office, images de cartes, dépôt des contenus et annales autonomes

À coller dans une session Claude Code ouverte sur le dépôt `S-Kajzar/industrie-education`.

---

Tu travailles sur le dépôt `industrie-education`, après le lot 0. Lis d'abord en entier `CLAUDE.md`, `TRAME.md`
(surtout § 2, 4, 5, 9, 10, 11 et 13), `DESIGN.md` (§ 5 et § 9) et `NOTE-DE-LIVRAISON.md` du lot 0 : ils font foi.

Objectif du lot : **Sébastien doit pouvoir, depuis un navigateur et sans toucher au code**,
1. ajouter ou changer l'image de n'importe quelle carte (contenu ou annale) ;
2. déposer une annale ou un nouvel exercice produit par son projet Claude « Exercices interactifs » (un fichier HTML
   autonome), le décrire, et le voir publié sur le site ;
3. téléverser les planches de l'accueil et des thèmes, et gérer leurs crédits.

Propose-moi d'abord un plan court (étapes, fichiers créés ou modifiés, choix de stockage), puis réalise-le étape
par étape, tests à l'appui.

## Contexte à connaître

- **Back-office retenu : Pages CMS** (libre, licence MIT), qui édite directement les fichiers du dépôt via GitHub :
  configuration dans `.pages.yml` à la racine, collections de fichiers, champs typés (texte, liste, image, fichier,
  booléen…), dossiers de médias avec téléversement. Chaque enregistrement est un commit sur `main`, donc la
  publication passe par l'Action habituelle (construction + tests). Consulte sa documentation (site pagescms.org ou
  dépôt GitHub `pages-cms/pages-cms`) avant d'écrire `.pages.yml`. Si tu ne peux pas y accéder, dis-le et appuie-toi
  sur le dépôt GitHub du projet.
- **Fichiers autonomes** : les exercices et annales produits par le projet Claude sont des fichiers HTML uniques,
  sans dépendance externe, images intégrées (jusqu'à environ 2 Mo). Leur intérieur (charte, modes, chronomètre,
  notation, tracés, impression) ne te concerne pas : **tu ne les modifies jamais**, tu les ranges et tu les
  enveloppes exactement comme les contenus repris du lot 0 (même mécanisme, mêmes garde-fous de styles).
- **Annale de référence** : `S-Kajzar/etude-systeme-dechargement-et-levage-de-linge`, fichier `index.html`
  (dépôt public, 1,8 Mo). C'est la première annale à publier dans ce lot.

## À livrer

### 1. Modèle de données

- `contenu.json` accepte un champ facultatif `image` : `{"fichier": "medias/cartes/…", "alt": "…"}`.
- Nouveau `annale.json` (TRAME § 11) : `id`, `titre`, `presentation`, `fichier`, `image`, `publics`, `theme`,
  `notions`, `duree_min`, `origine` (`diplome`, `epreuve`, `session`), `afficher_origine`, `statut`
  (`brouillon` | `relu`), `mis_a_jour`.
- `medias/CREDITS.json` : une entrée par image (`fichier`, `titre`, `auteur`, `date`, `source`, `licence`,
  `reference_autorisation`, `usage`). Licences acceptées, liste fermée : `domaine-public`, `cc0`,
  `oeuvre-personnelle`, `autorisation-ecrite` (avec `reference_autorisation` obligatoire).
- Choisis l'organisation des fichiers qui rend le back-office **le plus simple pour Sébastien**. Si Pages CMS ne
  sait pas créer un dossier par entrée (`contenus/<collection>/<id>/contenu.json`), stocke les fiches créées par le
  back-office à plat (par exemple `annales/<id>.json`, `contenus/<collection>/<id>.json`) avec le fichier HTML dans
  `medias/depots/`, et fais accepter les deux organisations à `construire.py`. Les URL publiques ne changent pas
  (TRAME § 3). Justifie le choix dans la note de livraison.

### 2. `.pages.yml` — le back-office

Rubriques, dans cet ordre, libellés en français :

| Rubrique | Ce que Sébastien y fait |
|---|---|
| **Annales** | Créer, modifier une annale : fiche complète, téléverser le fichier HTML, image de carte, statut |
| **Contenus** | Modifier la fiche d'un contenu existant (titre, description, notions, **image de carte**…) ; créer un nouveau contenu autonome (fiche + fichier HTML) dans une collection existante |
| **Accueil** | Contenus à la une, titres d'accueil par moment |
| **Thèmes** | Nom, exemples, planche d'illustration |
| **Crédits** | Toutes les images et leur licence |
| **Réglages du site** | Champs de `site.json` (éditeur, contact, Umami, indexable) |

- Médias : `medias/cartes/` et `medias/illustrations/` (images jpg, png, webp), `medias/depots/` (html).
- Champs à liste fermée pour : type, niveau, thème, publics, licence, statut (valeurs lues dans `catalogue/` quand
  Pages CMS le permet, sinon recopiées, avec un test qui vérifie qu'elles restent synchronisées).
- Aides de saisie en français sur chaque champ délicat (licence, statut, afficher l'origine).
- Les identifiants (`id`) sont imposés en minuscules, sans accent, avec des tirets.

### 3. Images de cartes et planches

- `outils/illustrations.py` (Pillow, à justifier dans la note) : à partir de l'original, produit les variantes WebP
  (cartes : 480 et 960 px de large, recadrage 16/9 centré, ≤ 40 Ko pour 480 px ; planches : budgets de TRAME § 10,
  niveaux de gris et fond blanc pour les planches seulement). Résultats mis en cache, jamais versionnés (`_site/`).
- Cartes (`_composants.html`) : image si `image` existe, avec `srcset`, `alt`, `loading="lazy"`, dimensions fixées
  (aucun décalage de mise en page) ; sinon bandeau typographique actuel. Même hauteur dans les deux cas.
- Accueil et pages de thème : la planche s'affiche selon DESIGN § 9 quand elle est renseignée ; sans planche, rendu
  actuel inchangé.
- Page `/credits/` générée depuis `CREDITS.json`, liée depuis le pied de page.
- **La construction s'arrête** sur : image référencée absente de `CREDITS.json`, licence hors liste,
  `autorisation-ecrite` sans référence, texte alternatif manquant (sauf image déclarée décorative), fichier image
  introuvable.

### 4. Dépôt et publication des annales et contenus autonomes

- `outils/annale.py` contrôle chaque fichier autonome avant publication : document HTML complet (`<html>`,
  `<head>`, `<body>`), **aucune ressource extérieure** (`src`, `href`, `url()`, `@import`, `fetch` vers `http(s)://`
  sauf les liens de navigation `<a>` explicitement autorisés), taille ≤ 5 Mo, encodage UTF-8. Message d'erreur clair
  indiquant le fichier et la ligne.
- `construire.py` :
  - range chaque fichier dans son URL publique (`/annales/<id>/`, `/<collection>/<id>/`) et l'enveloppe comme un
    contenu repris (lot 0) ;
  - génère pour chaque annale une **fiche indexable** au-dessus ou à côté du fichier, selon ce qui préserve le mieux
    le fonctionnement du fichier : titre, présentation, durée, filières, notions, liens vers les cours de mêmes
    notions, bouton « Commencer » ;
  - met à jour l'index `/annales/` (et `/annales/<filiere>/`), les cartes du catalogue, l'accueil (bloc Annales :
    les 3 dernières publiées), le sitemap ;
  - **ne publie rien au statut `brouillon`** (ni page, ni carte, ni entrée de sitemap) ;
  - respecte `afficher_origine` : à `false`, aucune mention du diplôme, de l'épreuve ou de la session nulle part sur
    le site (titre, description, fiche, index, données structurées) ; à `true`, elles apparaissent dans la fiche, le
    titre de page et l'index. **Valeur par défaut : `false`**, en attendant la décision de Sébastien (TRAME § 13).
- **Première annale** : importe `index.html` de `S-Kajzar/etude-systeme-dechargement-et-levage-de-linge` (clone le
  dépôt public), crée sa fiche (`titre` et `presentation` tirés du fichier, `publics` : `bts-ms`, `theme` :
  `mecanique`, `statut` : `relu` car déjà publiée par Sébastien, `origine` vide), et vérifie qu'elle fonctionne
  enveloppée : modes entraînement et examen, documents, tracés, impression, « Imprimer les DR ».

### 5. Documentation pour Sébastien

`GUIDE-BACK-OFFICE.md`, en français simple, pas à pas :
1. installer Pages CMS sur ce seul dépôt et s'y connecter ;
2. déposer une annale produite par le projet Claude (de la fiche à la publication, avec le délai de mise en ligne) ;
3. ajouter ou changer l'image d'une carte, avec sa licence ;
4. ajouter une planche d'illustration ;
5. que faire si la publication échoue (où lire le message d'erreur de l'Action) ;
6. rappel : le dépôt est public, un fichier au statut `brouillon` est invisible sur le site mais lisible sur GitHub.

### 6. Tests (`npm test`, sans réseau)

- `.pages.yml` est valide, ses chemins existent, ses listes fermées correspondent aux données.
- Carte avec image : `img` avec `alt`, `srcset`, dimensions ; sans image : bandeau ; même hauteur (à 1280 et 360 px).
- La construction s'arrête sur chaque erreur d'image listée au § 3, et sur un fichier autonome qui charge une
  ressource extérieure (dépôt factice).
- Annale `brouillon` : aucune page, aucune carte, absente du sitemap ; `relu` : publiée partout.
- `afficher_origine` : à `false`, les mots du diplôme, de l'épreuve et de la session (dans une annale factice dont
  l'origine est renseignée) n'apparaissent dans aucune page générée ; à `true`, ils apparaissent dans la fiche, le
  titre et l'index.
- Annale de référence enveloppée : fichier publié = original + ajouts de l'enveloppe ; aucun style du fichier modifié
  (réutilise le test du lot 0) ; modes, documents, tracés, impression et fenêtre des DR fonctionnent ; aucune erreur
  JavaScript ; aucune requête tierce. Si le dépôt d'origine contient des réponses de test, vérifie le 20/20.
- Page `/credits/` complète ; poids de l'accueil toujours < 300 Ko avec une planche ; image de carte ≤ 40 Ko.
- Tous les tests du lot 0 restent verts.

## Hors de ce lot

Reprise des 37 dépôts (lot 1), domaine, modification de l'intérieur des fichiers autonomes, gabarits Labo et
Maquettes réels, articles Méthodes, choix des planches (Sébastien les téléversera).

## À la fin

Tests verts, pull request, `NOTE-DE-LIVRAISON.md` avec : ce qui est fait, ce qui est testé, ce que Sébastien doit
faire (installer Pages CMS sur le dépôt, renseigner l'origine de la première annale et décider de
`afficher_origine`, ajouter les images et leurs licences), les limites constatées de Pages CMS (taille de
téléversement, création de dossiers) et les écarts avec TRAME ou DESIGN. Puis arrête-toi.
