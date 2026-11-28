# industrie.education — Trame V2.1 (cahier des charges)

Ce document fait foi. Ce qui n'y est pas décrit n'est pas à faire. Une contradiction entre ce document, `DESIGN.md`
et le code se signale dans la note de livraison au lieu de se trancher seule. Les décisions de fond sont prises
dans le projet Claude « industrie.education » ; ce fichier en est la traduction technique.

Version 2.1 (26 novembre 2026) : ajout du back-office, des illustrations, des sections Labo et Maquettes, de la
chaîne de production des annales, du référencement (moteurs de recherche et moteurs d'IA) et des articles Méthodes.
Révision du même jour : image facultative sur chaque carte ; annales produites par le projet Claude « Exercices
interactifs » (fichier HTML autonome) et déposées par le back-office. Lot 1c : source et licence des annales,
notions avec libellés, mesure d'audience, résumé de publication (§ 7, 9, 11, 13). Lot 1d : back-office Sveltia CMS
à l'adresse /admin/ (§ 2, 3, 4, 7, 9). Lot 1e (décisions du 27/11) : une erreur de contenu retient seulement sa
fiche, crédit saisi avec l'image ou case de risque, bandeau d'état dans /admin/, dépôt rapide et import des fichiers
avec leur bloc de métadonnées, nouvelle version à valider (§ 2, 4, 5, 7, 9, 10, 11, 13).

## 1. Objet et priorités

Site de référence de cours, exercices interactifs, études de cas et annales en sciences industrielles (SI, STI2D,
Bac Pro MSPC, BTS MS). Priorités, dans l'ordre : **1. contenu et site de qualité, 2. diffusion auprès des
enseignants et visibilité auprès des élèves (référencement), 3. monétisation (reportée, rien à coder)**.

Le site est **statique, gratuit, sans compte, sans cookie**. Une partie du public est mineure : aucune donnée
personnelle, aucun traceur tiers, aucune ressource chargée depuis un tiers, sauf la mesure d'audience Umami
(sans cookie).

## 2. Décisions

| Sujet | Décision |
|---|---|
| Dépôt | **Un dépôt unique** `industrie-education`. Les 37 anciens dépôts de cours sont repris dedans (lot 1), puis reçoivent une page relais |
| Hébergement | GitHub Pages, publié par une GitHub Action à chaque envoi sur `main`. Le site généré (`_site/`) n'est jamais versionné |
| Domaine | Préproduction sur `s-kajzar.github.io/industrie-education/`. Le domaine `industrie.education` sera posé sur ce dépôt à la bascule (lot 1) |
| Indexation | **Interdite en préproduction** (`site.json` : `"indexable": false`). Ouverte à la bascule |
| Génération | Python 3 + Jinja2. `outils/construire.py` lit `site.json`, `contenus/`, `annales/`, `methodes/`, `catalogue/` et écrit `_site/` |
| Design | `DESIGN.md` et `statique/commun.css`. Vitrine minimaliste (accueil, service) ; registre « atelier » (catalogue, collections, contenus, annales) |
| Images de cartes | **Facultatives** : chaque contenu ou annale peut recevoir une image, téléversée par le back-office avec son crédit (§ 10) ; sans image, la carte garde le bandeau typographique (thème + collection) |
| Illustrations et images | Planches techniques anciennes du domaine public ou sous CC0 pour l'accueil, les thèmes, Labo, Maquettes et articles ; images de cartes du domaine public, sous CC0, œuvres personnelles de Sébastien ou autorisées par écrit. **Jamais d'image générée par IA** (§ 10) |
| Back-office | **Sveltia CMS** (libre, MIT), servi par le site à l'adresse `/admin/` (lot 1d, remplace Pages CMS) : images, dépôt des contenus et annales autonomes, édition des données et des articles sans toucher au code. Connexion par jeton d'accès GitHub ; chaque enregistrement est un commit sur `main` (§ 9) |
| Back-office dynamique (décision du 27/11) | **Pas de back-office dynamique avant la V2 avec comptes.** La V2 sera une application séparée ; d'ici là, le site reste entièrement statique |
| Publication fiable (décisions du 27/11, lot 1e) | **Une erreur de contenu ne retient que sa fiche** : le reste du site part en ligne, la fiche est signalée « à corriger » (résumé de publication, bandeau de `/admin/`) ; une erreur de code arrête toujours la publication. Contrôles dès la saisie dans `/admin/`, brouillons jamais bloquants. Pas de branche par enregistrement : les commits restent directs sur `main` |
| Annales | Produites hors du dépôt par le **projet Claude « Exercices interactifs »** (gabarit `gabarit-exercice-interactif.html`) : un fichier HTML autonome par sujet. Déposées par le back-office avec une fiche (`annale.json`), enveloppées par le site comme les contenus repris, jamais modifiées. Publication seulement au statut `relu` (§ 11) |
| Référencement | Socle technique dès le lot 1 ; contenus lisibles par les moteurs et les IA ; articles Méthodes relus, publiés à date programmée (§ 12) |
| Mesure d'audience | Umami Cloud, offre gratuite, sans cookie (adresse du script réglable dans `site.json`). Cinq actions comptées, avec le seul identifiant de la page : annale commencée en entraînement ou en examen, copie corrigée, impression, projection. Google Search Console et Bing Webmaster Tools à la bascule |
| Comptes élève / prof | Hors périmètre (V2 ultérieure) |
| Monétisation, encarts partenaires | Hors périmètre. La page Partenaires existe en version « sans partenaire » |

## 3. Arborescence et URL

Adresses relatives à la racine du site (préfixe `/industrie-education/` en préproduction, géré par
`site.json` → `base`). Toutes les URL se terminent par `/` (un dossier, un `index.html`).

| Page | URL | Gabarit |
|---|---|---|
| Accueil | `/` | `accueil` |
| Catalogue | `/catalogue/` (filtres dans l'adresse : `?q=`, `public=`, `theme=`, `type=`, `niveau=`) | `catalogue` |
| Public | `/si/`, `/sti2d/`, `/bac-pro-mspc/`, `/bts-ms/` | `liste` |
| Thème | `/mecanique/`, `/energie/`, `/numerique/`, `/systemes/`, `/habitat/` | `liste` |
| Collection | `/<collection>/` (ex. `/statique/`) | `collection` |
| Contenu | `/<collection>/<contenu>/` (ex. `/statique/cadre-velo/`) | `contenu` |
| Annales | `/annales/`, `/annales/<filiere>/` | `annales` |
| Annale | `/annales/<annale>/` (nom neutre, ex. `/annales/levage-dechargement-sacs-linge/`) | `annale` |
| Labo | `/labo/`, puis `/labo/<tp>/` | `vitrine-section`, puis `labo` |
| Maquettes | `/maquettes/`, puis `/maquettes/<maquette>/` | `vitrine-section`, puis `maquette` |
| Méthodes | `/methodes/`, `/methodes/<article>/` | `methodes`, `article` |
| Service | `/enseignants/`, `/partenaires/`, `/a-propos/`, `/mentions-legales/`, `/credits/` | `service` |
| Back-office (hors du site public) | `/admin/` | `admin` (Sveltia CMS) |
| Erreur | `/404.html` | `service` |

Noms réservés (une collection ne peut pas les prendre, la construction s'arrête sinon) : `catalogue`, `annales`,
`labo`, `maquettes`, `methodes`, `si`, `sti2d`, `bac-pro-mspc`, `bts-ms`, `mecanique`, `energie`, `numerique`,
`systemes`, `habitat`, `enseignants`, `partenaires`, `a-propos`, `mentions-legales`, `credits`, `medias`, `_`,
`admin` (back-office, lot 1d), `classe` et `compte` (gardés pour la V2).

Un thème sans contenu ni annale publiés est traité comme une filière inactive : « Bientôt » sur l'accueil, pas de
page, absent du sitemap, aucun lien vers lui. Le traitement disparaît dès qu'un contenu y est publié (lot 1c).

> Le dossier technique `statique/` du dépôt est publié sous `/_/` (`/_/commun.css`, `/_/polices/…`), pour laisser
> l'adresse `/statique/` à la collection Statique.

## 4. Structure du dépôt

```
CLAUDE.md                consignes pour Claude Code
TRAME.md                 ce document
DESIGN.md                design system
admin/config.yml         configuration du back-office Sveltia CMS, servi à l'adresse /admin/ (§ 9)
site.json                nom, base, indexable, Umami, éditeur, contact, titres d'accueil
catalogue/
  themes.json            les 5 thèmes (id, nom, exemples, illustration)
  publics.json           les 4 publics (id, nom, actif)
  a-la-une.json          les contenus de l'accueil (identifiants)
  notions.json           les notions (id, nom) : identifiants des fiches, libellés affichés (lot 1c)
  partenaires.json       vide en V1
  a-venir.json           Labo et Maquettes « à venir » : titre, promesse, planche (lot 1c)
contenus/<collection>/   collection.json, puis un dossier par contenu (contenu.json, index.html, ressources)
annales/<annale>.json    fiche de l'annale déposée par le back-office : titre, source, origine, statut, image, notions
                         (§ 11) ; le fichier autonome est dans medias/depots/. Variante : annales/<annale>/annale.json
                         + index.html
production/
  FICHE-INTEGREE.md      bloc de métadonnées des fichiers HTML du projet Claude « Exercices interactifs » (§ 11)
methodes/<article>.md    articles Méthodes (front matter + Markdown, § 12)
medias/
  illustrations/         originaux des planches (accueil, thèmes, labo, maquettes, articles)
  cartes/                originaux des images de cartes
  depots/                fichiers HTML autonomes des fiches (contenus déposés, annales)
  import/                dépôt rapide : fichiers HTML déposés, en attente d'import (lot 1e)
  a-relire/              nouvelles versions de fichiers, en attente de validation (lot 1e)
gabarits/                gabarits Jinja2
statique/                publié sous /_/ : commun.css, commun.js, projeter.js, polices/, lib/
outils/
  construire.py          génération du site
  reprendre.py           lot 1 : import d'un ancien dépôt
  illustrations.py       traitement des illustrations (§ 10)
  annale.py              contrôle d'une annale ou d'un contenu autonome (§ 11)
  importer.py            import des fichiers déposés : fiches en brouillon, nouvelles versions (§ 11, lot 1e)
  verifier-annales.js    contrôle 20/20 des annales avant la construction (code commun : annale-parfaite.js)
  chaine.js              chaîne de publication : contrôle 20/20, puis construction
  format-donnees.js      format des données écrit par le back-office ; aligne les fichiers du dépôt (§ 9)
prompts/                 un prompt par lot, plus ANNALE.md et METHODE.md
tests/
.github/workflows/       publier.yml (envoi sur main), quotidien.yml (publication programmée)
```

## 5. Format d'un contenu

`contenu.json` :

```json
{
  "id": "cadre-velo",
  "titre": "Cadre de vélo tout terrain",
  "type": "exercice",
  "niveau": 3,
  "duree_min": 70,
  "mots_cles": ["Statique analytique", "PFS", "Solide soumis à deux forces"],
  "requete_cible": "exercice statique corrigé PFS",
  "description": "Isolements successifs d'un cadre de VTT tout suspendu.",
  "notions": ["pfs", "solide-deux-forces"],
  "image": {"fichier": "medias/cartes/cadre-velo.jpg", "alt": "Cadre de VTT et ses liaisons"},
  "mode": "repris",
  "source": "S-Kajzar/STATIQUE : cadre-velo.html",
  "mis_a_jour": "2026-11-26"
}
```

- `type` ∈ `cours`, `exercice`, `activite`, `etude`, `qcm`, `formulaire`.
- Thème et publics sont hérités de `collection.json` (surchargeables dans `contenu.json`).
- `requete_cible` (facultatif) : la recherche principale visée, utilisée pour le titre et la description (§ 12).
- `image` (facultatif) : image de la carte, avec son crédit ou la case de risque (§ 10) ; sans image, bandeau
  typographique.
- `notions` : identifiants de notions partagés entre contenus, annales et articles ; ils servent au maillage interne
  (« Pour s'entraîner », « Tombé à l'examen », « Méthode associée »).
- `mode: "repris"` : `index.html` est un fichier autonome (ancien dépôt, ou nouvel exercice produit par le projet
  Claude « Exercices interactifs »), copié tel quel. La construction l'enveloppe (fil d'Ariane, précédent / suivant,
  Signaler) sans modifier son corps.
- `mode: "natif"` : le corps est écrit pour le gabarit `contenu`.

## 6. Gabarits

| Gabarit | Contenu | Maquette |
|---|---|---|
| `accueil` | Titre évolutif sur illustration (DESIGN § 7 et § 9), recherche, index des 5 thèmes, 4 publics, contenus à la une, Annales, bloc « Bientôt : Labo et Maquettes », bloc Enseignants | Canvas, « Accueil retenue — M1 × charte atelier » |
| `catalogue` | Filtres Thème / Type / Filière / Niveau ; cartes (image si elle existe, sinon bandeau) ; compteur ; fonctionne sans JavaScript | Canvas, « Catalogue — M1 × charte atelier » |
| `liste` | Public ou thème : titre sur rail, illustration du thème, collections groupées, cartes | — |
| `collection` | Titre, description, contenus dans l'ordre | — |
| `contenu` | Enveloppe des contenus repris ; gabarit complet pour les contenus natifs ; bloc de maillage (§ 12) | Charte atelier existante |
| `annales` | Index par filière, épreuve, session | — |
| `annale` | Enveloppe du fichier autonome (fil d'Ariane, Signaler, annales voisines) + fiche compacte au-dessus du fichier (filières, durée, thème, notions, « Pour réviser », ligne de crédit) ; titre et description de la page générés depuis la fiche | Lot 1b, fiche compacte au lot 1c |
| `vitrine-section` | Labo et Maquettes tant qu'ils sont « à venir » : planche facultative, promesse de `a-venir.json` dans un bloc « Bientôt », sans date ni formulaire | Lot 1c |
| `labo`, `maquette` | TP virtuel ; maquette numérique 3D | Lot 6 |
| `methodes`, `article` | Liste des articles ; article (auteur, date, sommaire, contenus liés) | Lot 4 |
| `service` | Enseignants, Partenaires, À propos (auteur), Mentions légales, Crédits, 404 | — |

## 7. Lots

Chaque lot : une session Claude Code, des tests verts, une pull request, une `NOTE-DE-LIVRAISON.md` à jour
(fait, testé, à faire par Sébastien, écarts). Puis on s'arrête.

| Lot | Contenu | État |
|---|---|---|
| **0 Socle** | Structure, gabarits, construction, démonstrations, 1 contenu repris, publication, tests | **livré** (PR n° 1) |
| **1 Reprise + référencement de base** | `reprendre.py` : import des 37 dépôts ; pages relais (y compris `?ex=`) ; doublons ; socle SEO technique (§ 12.1 et 12.2) ; bascule du domaine | à faire |
| **1b Back-office, images, dépôts** | Pages CMS (§ 9) ; images de cartes et planches (§ 10) ; dépôt des contenus et annales autonomes (§ 11) ; index des annales et première annale ; page Crédits. Prompt : `prompts/LOT-1B.md` | **livré** (PR n° 3) |
| **1c Préproduction montrable** | Corrections du lot 1b (fiche d'annale compacte, filières et thèmes cohérents, notions avec libellés, mentions légales) ; source et licence des annales ; vérification automatique « annale parfaite » ; mesure d'audience (adresse du script, 5 événements) ; résumé de publication ; pages Labo et Maquettes « à venir » ; back-office réordonné. Prompt : `prompts/LOT-1C.md` | **livré** (PR n° 4) |
| **1d Back-office sur le site** | Sveltia CMS à l'adresse `/admin/`, à la place de Pages CMS : connexion par jeton, rubriques reprises, notions choisies dans la liste, une rubrique pour toutes les collections, format des données aligné, guide réécrit. Prompt : `prompts/LOT-1D.md` | **livré** (PR n° 6) |
| **1e Publication fiable et dépôt en un geste** | Une erreur de contenu retient seulement sa fiche ; contrôles dès la saisie ; crédit saisi avec l'image ou case de risque ; brouillons jamais bloquants ; bandeau d'état dans `/admin/` et résumé « À corriger » ; dépôt rapide de 1 à 10 fichiers, import avec le bloc de métadonnées, nouvelle version à valider. Prompt : `prompts/LOT-1E.md` | **livré** (PR n° 9) |
| **2 Annales** | Amélioration du gabarit d'exercice (tracés en priorité) **dans le projet Claude**, puis re-dépôt des annales ; côté site : filtres de l'index des annales | plus tard |
| **3 Qualité + maillage** | Une page par contenu pour les gros dépôts ; notions et blocs de maillage ; mode projection ; Signaler relié à un formulaire ; checklist qualité | à faire |
| **4 Méthodes** | Gabarits `methodes` / `article` ; publication programmée (`quotidien.yml`) ; `prompts/METHODE.md` ; 4 premiers articles relus (§ 12.4) | à faire |
| **5 Automatisation** (optionnel) | Production d'une annale lancée depuis GitHub via l'Action Claude Code (clé d'API payante), avec les instructions du projet Claude | plus tard |
| **6 Labo et Maquettes** | Gabarits `labo` et `maquette` (visionneuse 3D auto-hébergée) ; premiers TP et maquettes | plus tard |

## 8. Critères de qualité (tous les lots)

- Accueil < 300 Ko au premier affichage, illustration comprise ; aucune page > 1 Mo hors fichiers autonomes (contenus repris, annales) ; image de carte ≤ 40 Ko.
- Aucune requête vers un tiers, sauf Umami quand il est configuré (test automatique). Le back-office `/admin/`,
  hors du site public, est une exception documentée (§ 9).
- Aucun lien interne cassé (test automatique).
- Contraste AA (y compris le titre posé sur l'illustration), focus visible, clavier, `lang="fr"`, un seul `h1`.
- Utilisable à 360 px de large, sur tablette, et au vidéoprojecteur.
- Les pages s'affichent sans JavaScript.
- Chaque page publiée a un titre et une description uniques (test automatique, § 12.1).

## 9. Back-office (Sveltia CMS, à l'adresse /admin/)

Depuis le lot 1d, le back-office est **Sveltia CMS** (paquet npm `@sveltia/cms`, version figée, licence MIT), servi
par le site lui-même à l'adresse `/admin/`. Il édite directement les fichiers du dépôt par l'API de GitHub : pas de
serveur, pas de base de données ; chaque enregistrement est un commit sur `main`, et la publication suit le circuit
habituel (Action : import, contrôle 20/20, construction, tests, Pages). Il remplace Pages CMS (lots 1b et 1c). Il sert
uniquement à Sébastien.

- **Connexion** : jeton d'accès personnel GitHub à granularité fine, limité à ce dépôt, permission « Contents » en
  lecture et écriture. Ni application OAuth, ni authentificateur tiers. Pas de flux éditorial : le champ `statut`
  gère les brouillons.
- **Script servi par le site** : la construction copie `dist/sveltia-cms.js` et `dist/chunks/` (sans les `.map`),
  la traduction française et `admin/config.yml` dans `_site/admin/`, et génère `admin/index.html`
  (`gabarits/admin.html`). Rien n'est versionné, rien n'est chargé depuis unpkg. Sans le paquet (`npm ci`), la
  construction s'arrête.
- **Hors du site public** : `noindex, nofollow`, absent du sitemap, `Disallow` dans `robots.txt`, aucun lien depuis
  une page publique. Exception documentée à la règle « aucune requête vers un tiers » (CLAUDE.md) : `api.github.com`,
  `avatars.githubusercontent.com` et `cdn.jsdelivr.net` (polices de l'interface) ; un adulte seul s'y connecte.
- **Interface en français**, quelle que soit la langue du navigateur ; utilisable sur ordinateur et sur téléphone
  (connexion sur mobile par QR code).
- **Format des données** : Sveltia écrit les JSON avec 2 espaces, listes et objets développés, clés dans l'ordre de
  la configuration, sans les champs facultatifs vides. Les fichiers du dépôt sont alignés sur ce format
  (`outils/format-donnees.js`, vérifié par les tests) ; les fiches créées par l'import aussi.
- **Bandeau d'état** (lot 1e, `admin/admin.js`) : en haut de `/admin/`, « Publication en cours », « En ligne depuis
  hh:mm » ou « Échec : voir le détail », avec le nombre de fiches retenues et d'images à régulariser, chacun relié à
  sa liste et aux corrections. Sources : `admin/etat.json`, écrit par la construction, et l'API publique de GitHub,
  sans jeton (au chargement, au retour sur l'onglet, après un enregistrement ; jamais en continu).
- **Tester le fichier** (lot 1e) : depuis une fiche, « Télécharger pour tester » enregistre le fichier HTML sur
  l'ordinateur (jamais ouvert dans `/admin/`) ; une nouvelle version à relire a son propre lien et la case
  « Valider la nouvelle version ».

`admin/config.yml` déclare, dans l'ordre d'usage, chaque rubrique avec sa ligne d'aide en français :

| Rubrique | Fichiers | Champs |
|---|---|---|
| Dépôt rapide (lot 1e) | `medias/import/` (une entrée par dépôt, supprimée par l'import) | 1 à 10 fichiers HTML, rien d'autre à saisir |
| Annales | fiches des annales (`annales/<id>.json`) | Titre (70 caractères au plus), présentation (20 à 300), fichier HTML autonome (téléversé), « Tester le fichier » (téléchargement, validation d'une nouvelle version), image de carte avec son crédit, filières, thème, notions (choisies dans la liste), notions proposées, requêtes d'élèves, pistes d'illustration, durée, origine (diplôme, épreuve, session), affichage de l'origine, **source (éditeur, adresse, licence : obligatoires dès la création ; référence d'autorisation)**, statut |
| Contenus | toutes les collections en arborescence (`contenus/<collection>/<id>/contenu.json`) | Titre, type, niveau, durée, description (20 caractères au moins), mots-clés, requêtes, notions (choisies dans la liste), notions proposées, pistes d'illustration, **image de carte avec son crédit**, fichier HTML autonome (nouveaux contenus), « Tester le fichier », statut |
| Accueil | `catalogue/a-la-une.json`, `catalogue/a-venir.json` | Contenus à la une ; Labo et Maquettes : titre, promesse, planche |
| Notions | `catalogue/notions.json` (une entrée par notion) | Identifiant, libellé affiché |
| Thèmes | `catalogue/themes.json` | Nom, nom court, exemples, illustration avec son crédit |
| Réglages du site | `site.json` | Éditeur, contact, identifiant Umami, adresse du script Umami, indexable, titres de l'accueil par moment, planche de l'accueil |
| Ressources | `medias/cartes/`, `medias/illustrations/` (images), `medias/depots/` (fichiers HTML), `medias/import/` (dépôt rapide en attente) | Téléversement, 5 Mo au plus par fichier, noms nettoyés ; aucune transformation des images, aucune banque d'images |
| Articles (lot 4) | `methodes/*.md` | Titre, résumé, date de publication, statut (brouillon, relu), notions, corps |

Règles (lot 1e) : la construction ne publie pas un article, un contenu ou une annale au statut `brouillon`. Une
**erreur de contenu** (titre ou présentation manquants ou trop courts, filière, thème ou notion inconnus, identifiant
en double, annale `relu` sans source valide, fichier autonome qui charge une ressource extérieure ou dont un lien
interne est cassé, annale relue sous 20/20) **retient seulement sa fiche** : elle n'est pas publiée (retirée si elle
était en ligne), toutes ses erreurs sont listées avec le champ à corriger et la correction ; pour un brouillon, ce ne
sont que des avertissements ; une fiche illisible est ignorée et signalée. Une image ne retient jamais sa fiche
(§ 10). Une **erreur de structure ou de code** (gabarit, `site.json`, catalogue, test de page) arrête la publication,
de même que `indexable: true` tant que le nom de l'éditeur, le directeur de la publication ou le contact sont vides. Le
statut `relu` est posé par Sébastien seul, depuis le back-office. Chaque publication écrit le résumé de publication
dans le récapitulatif de l'Action : « À corriger » d'abord, puis les images à régulariser et le tableau de bord
(comptes seulement). Attention : le dépôt étant public, un fichier au statut `brouillon` est invisible sur le site mais
lisible sur GitHub.

## 10. Illustrations

- **Crédit saisi avec l'image** (lot 1e) : chaque champ image (cartes des contenus et annales, planches de l'accueil,
  des thèmes, de Labo et Maquettes) est un objet : fichier, texte alternatif, licence, source (adresse), auteur,
  référence d'autorisation, et la case `risque_accepte`. Plus de registre `medias/CREDITS.json` : la page `/credits/`
  et le résumé de publication sont produits à partir des fiches.
- **Licences acceptées** (liste fermée) : `domaine-public`, `cc0`, `oeuvre-personnelle` (photo ou dessin de
  Sébastien), `autorisation-ecrite` (référence de l'autorisation obligatoire, ex. un constructeur). Les anciennes
  vignettes du site ne sont reprises qu'une fois leur licence vérifiée et déclarée.
- **Case de risque** (V1) : « J'accepte le risque : image publiée sans crédit », décochée par défaut, cochée par
  Sébastien seul. Trois cas : crédit complet (licence de la liste, et référence pour une autorisation écrite) →
  image publiée et citée sur `/credits/` ; crédit absent ou incomplet et case cochée → image publiée, absente de
  `/credits/`, listée « Images à régulariser » ; ni l'un ni l'autre → image non publiée (bandeau typographique à la
  place), signalée « À corriger ». La case ne couvre que l'absence de crédit : une licence hors liste n'est jamais
  publiée, et **jamais d'image générée par IA**. Une image ne retient jamais sa fiche. Claude n'ajoute aucune image et
  ne coche jamais la case. Une image téléversée que plus aucune fiche ne cite est signalée « image orpheline ».
- **Sources des planches** : œuvres du domaine public (planches de l'Encyclopédie de Diderot et d'Alembert via
  Wikimedia Commons, dessins de brevets américains sans mention de droit d'auteur, gravures techniques anciennes)
  et fichiers sous CC0 (Smithsonian Open Access, autres musées en accès ouvert). **Interdits** : images générées par
  IA, banques d'images à licence propriétaire, copies Gallica (réutilisation commerciale payante, incompatible avec
  une monétisation future).
- **Traitement** (`outils/illustrations.py`, à partir de l'original de `medias/illustrations/`) : niveaux de gris,
  contraste renforcé, fond rendu blanc pur, recadrage, export WebP en plusieurs largeurs (`srcset`). Budgets : 150 Ko
  pour l'illustration d'accueil en grand écran, 60 Ko pour une illustration de thème, 40 Ko pour une image de carte
  (480 px, plus une variante 960 px pour les écrans denses), recadrée au format de la carte.
- **Affichage** : voir DESIGN § 9. Texte alternatif facultatif : laissé vide, l'image est décorative (`alt=""`), ce
  qui convient à une image de carte posée à côté de son titre.
- **Crédits** : page `/credits/` générée à partir des fiches (usage, auteur, licence, source), sans les images à
  régulariser.
- **Circuit** : Claude propose des planches (lien, licence) ; Sébastien les télécharge et les téléverse par le
  back-office ; la construction les traite et les publie.

## 11. Annales et contenus autonomes : chaîne de production

Les annales et les nouveaux exercices sont produits **hors du dépôt**, dans le projet Claude « Exercices
interactifs ». Ses instructions et son gabarit `gabarit-exercice-interactif.html` (charte, modes entraînement et
examen, chronomètre, notation pondérée, tracés, impression) font foi pour l'intérieur de ces fichiers. Le site ne
les modifie jamais : il les range, les enveloppe et les référence. Exemple de référence : l'étude « Système de
levage et de déchargement des sacs de linge » (fichier autonome de 1,8 Mo).

1. **Production** : Sébastien dépose le sujet (PDF ou Word) dans le projet Claude, qui livre un fichier HTML
   autonome et une note de livraison. Sébastien le teste.
2. **Dépôt** (lot 1e) : dans le back-office, rubrique **Dépôt rapide**, 1 à 10 fichiers HTML en un seul
   enregistrement, sans rien saisir (ou, en repli, sur GitHub, dans `medias/import/`). À la publication suivante,
   `outils/importer.py` crée une fiche **en brouillon** par fichier, à partir de son bloc de métadonnées. La saisie
   à la main (« Nouvelle annale », « Nouveau contenu ») reste possible.
3. **Relecture** : Sébastien télécharge le brouillon depuis sa fiche (« Télécharger pour tester »), le teste en local,
   complète la fiche (image et crédit, notions…) et passe le statut à `relu`.
4. **Construction** : `outils/annale.py` contrôle le fichier (HTML complet, aucune ressource extérieure, liens et
   ancres, poids) ; la construction l'enveloppe et génère la fiche, l'index des annales, les cartes, le sitemap.
5. **Publication** : seulement au statut `relu`.

**Bloc de métadonnées** (lot 1e, référence pour le projet Claude : `production/FICHE-INTEGREE.md`). Chaque fichier
contient, dans son `<head>`, un bloc invisible `<script type="application/json" id="fiche-industrie-education">`,
format 1 : `format` (1), `type` (`annale` ou `exercice`), `id` (neutre, minuscules sans accents, tirets), `titre` (70
caractères au plus), `presentation` (300 au plus), `publics`, `theme`, `notions` (identifiants des listes du site),
`notions_proposees` (`[{id, nom}]`), `duree_min`, `niveau` (exercices, 1 à 3), `origine` (`{diplome, epreuve,
session}`, annales), `source` (`{editeur, url, licence, reference_autorisation}`), `requetes` (3 à 5 requêtes
d'élèves), `pistes_image` (2 ou 3 pistes d'illustration). Ajout du lot 1e, à valider : `collection` (exercices).

**Import** (`outils/importer.py`, lancé par l'Action avant la construction, dans la même exécution) : contrôles de
`outils/annale.py` ; lecture du bloc ou, sans bloc, extraction déterministe (titre `h1`, premier paragraphe de
l'accueil, durée et nombre de parties, de questions et de tracés lus dans la configuration du gabarit ; filières,
thème, notions et source « à compléter ») ; fiche **toujours au statut `brouillon`** (l'import ne pose jamais `relu`) ;
fichier rangé dans `medias/depots/<id>.html` sans être modifié ; notions inconnues dans `notions_proposees`, jamais
créées. Un fichier refusé reste dans `medias/import/` et n'empêche pas les autres. Un seul commit pour tout le dépôt
(« Import : 3 fiches créées en brouillon »).

**Nouvelle version** : un fichier dont l'identifiant est celui d'une fiche existante est rangé dans
`medias/a-relire/<id>.html` et la fiche reçoit `nouvelle_version` (« Nouvelle version à relire ») ; la version en
ligne reste en ligne, la nouvelle n'est publiée nulle part. Quand Sébastien coche « Valider la nouvelle version » et
enregistre, l'import suivant remplace l'ancien fichier par le nouveau (même chemin, même adresse), supprime le fichier
de `medias/a-relire/` et retire les deux champs.

**Origine du sujet.** Les instructions du projet Claude imposent un fichier neutre (ni diplôme, ni session, ni
épreuve), pour servir dans plusieurs filières. La fiche `annale.json` enregistre quand même l'origine (diplôme,
épreuve, session) pour le classement interne, et un champ `afficher_origine` décide si le site l'affiche dans la
fiche, le titre de page et l'index. Valeur par défaut : à trancher par Sébastien (§ 13). Le fichier HTML reste neutre
dans tous les cas.

`annale.json` :

```json
{
  "id": "levage-dechargement-sacs-linge",
  "titre": "Système de levage et de déchargement des sacs de linge",
  "presentation": "…",
  "fichier": "medias/depots/levage-dechargement-sacs-linge.html",
  "image": {"fichier": "medias/cartes/levage-linge.jpg", "alt": "…"},
  "publics": ["bts-ms"], "theme": "mecanique",
  "notions": ["statique", "cinematique-graphique", "roulements"],
  "duree_min": 240,
  "origine": {"diplome": "BTS Maintenance industrielle", "epreuve": "E4", "session": 2013},
  "afficher_origine": false,
  "source": {
    "editeur": "éduscol STI",
    "url": "https://sti.eduscol.education.fr/…/5111-dossier-questionnaire-epreuve-e4-bts-mi-2013-metropole.docx",
    "licence": "cc-by-nc-sa-2.0-fr",
    "reference_autorisation": ""
  },
  "statut": "relu",
  "mis_a_jour": "2026-11-26"
}
```

**Source et licence (lot 1c).** Le champ `source` est obligatoire pour publier (statut `relu`) ; depuis le lot 1e, le
back-office l'exige dès la création, et la construction le signale en avertissement pour un brouillon importé ; `outils/annale.py` le contrôle aussi (`python3 outils/annale.py annales/<id>.json`). `licence` prend une
valeur de la liste fermée : `cc-by-nc-sa-2.0-fr` (sujets d'éduscol STI : attribution, usage non commercial, partage
dans les mêmes conditions), `etalab-2.0` (annales du bac sur eduscol.education.gouv.fr), `autorisation-ecrite`
(`reference_autorisation` obligatoire), `oeuvre-personnelle`. L'éditeur est obligatoire sauf pour une œuvre
personnelle ; l'adresse (https) l'est pour les deux licences ouvertes. Une **ligne de crédit est toujours affichée**
dans la fiche, **indépendamment de `afficher_origine`**, avec un lien sur le nom de l'éditeur :

- CC BY-NC-SA : « D'après un sujet publié par éduscol STI, licence CC BY-NC-SA 2.0 FR. Adaptation interactive :
  industrie.education, sous la même licence. »
- Licence Ouverte : « D'après un document publié par éduscol, Licence Ouverte 2.0. Adaptation : industrie.education. »
- Autorisation écrite : « Reproduit avec l'autorisation de <éditeur>. »
- Œuvre personnelle : « Sujet original : industrie.education. »

La page `/credits/` a une section « Annales » (titre, éditeur et lien source, licence). Contrôle « annale parfaite »
(lot 1e) : avant la construction, chaque fichier d'annale doit obtenir 20/20 avec une copie entièrement juste, dans
les deux modes, sans erreur JavaScript (`outils/verifier-annales.js`). Une annale relue qui échoue est retenue ; pour
un brouillon ou une nouvelle version, c'est un avertissement. Le test « annale parfaite » vérifie ensuite les annales
publiées, sur leur page enveloppée.

Améliorations du gabarit d'exercice (tracés en premier) : dans le projet Claude, puis re-dépôt des fichiers
concernés. Plus tard (lot 5), la production pourra être lancée depuis GitHub par l'Action Claude Code.

## 12. Référencement (moteurs de recherche et moteurs d'IA)

Objectif : que les élèves trouvent le site en cherchant « exercice corrigé », « annale corrigée », « cours » +
notion + filière. Le référencement s'ouvre à la bascule ; tout ce qui suit est construit avant.

### 12.1 Socle technique (lot 1)

- Titre et description uniques par page, générés depuis les données. Modèles : contenu « {Titre} — {type} corrigé
  de {collection} ({filières}) | industrie.education » ; annale « {Titre} : sujet corrigé interactif ({filières}) », complété
  de « {diplôme} {session} {épreuve} » seulement si `afficher_origine` vaut `true`. Test : aucun doublon, longueur raisonnable.
- URL propres et stables, `canonical` sur chaque page, `sitemap.xml` avec `lastmod`, `robots.txt` à la racine du
  domaine.
- Fil d'Ariane visible sur toutes les pages internes.
- Contenus en **HTML textuel** : énoncés, corrections et articles lisibles sans JavaScript (pas d'image de texte, pas
  de PDF comme page).
- Performance : pages légères (déjà mesuré), images dimensionnées, aucune ressource bloquante tierce.

### 12.2 Données structurées (lot 1)

`Organization` et `WebSite` (accueil), `BreadcrumbList` (pages internes), `LearningResource` (contenus et annales :
niveau, durée, type, notions enseignées), `Article` (méthodes). À ce jour, Google n'affiche plus de résultat enrichi
« exercices » et son carrousel de questions éducatives n'existe pas en français : ces données servent à la bonne
compréhension des pages par les moteurs et les IA, sans promesse d'affichage enrichi. Ne pas en faire plus.

### 12.3 Moteurs d'IA

- Chaque page commence par l'essentiel en une ou deux phrases (définition, réponse, objectif).
- Auteur identifié : page À propos (enseignant agrégé, contenus testés en classe), date de mise à jour sur chaque
  contenu.
- Fichier `/llms.txt` (proposition non standardisée, coût faible) : présentation du site et liens vers les index.
- Les robots des moteurs d'IA ne sont pas bloqués (décision : visibilité).

### 12.4 Articles « Méthodes »

- But : répondre aux vraies questions des élèves (« Comment isoler un solide », « Méthode pour une annale de E41 »,
  « Lire un dessin d'ensemble ») et renvoyer vers les exercices et annales liés.
- **Pas de génération automatique d'articles en masse.** Google considère comme du spam la production de nombreuses
  pages destinées avant tout à manipuler le classement, qu'elles soient écrites par IA ou non. Règle : un brouillon
  rédigé avec Claude (`prompts/METHODE.md`) à partir d'un sujet choisi et de supports de cours réels, relu et corrigé
  par Sébastien (statut `relu`), puis **publié à sa date programmée** par l'Action quotidienne. Rythme cible : 1 à 2
  articles par semaine, à ajuster selon les résultats de Search Console.
- Chaque article : un auteur, une date, un sommaire, au moins trois liens vers des contenus ou annales du site.

### 12.5 Maillage interne et liens entrants

- Maillage : thème → collection → contenu ; sur chaque contenu, « Pour s'entraîner », « Tombé à l'examen »,
  « Méthode associée » (par les `notions`).
- Liens entrants : uniquement par des moyens naturels (sites académiques STI et SII, réseau Canopé, associations de
  professeurs, groupes d'enseignants, établissements partenaires, CCI). Aucun achat ni échange de liens. Suivi dans
  `seo/liens-entrants.md`.
- Mots-clés : un fichier `seo/requetes.md` liste les familles de requêtes (notion × format × filière) ; il est
  réordonné chaque mois à partir des données réelles de Search Console.

## 13. Points en attente (à trancher avant la livraison finale)

Écarts relevés au lot 0 (voir sa note de livraison) : n° 2 liens d'origine des contenus repris, n° 3 hauteur du
titre d'accueil, n° 5 champs ajoutés aux données. Sébastien les tranche avant la livraison finale ; d'ici là, les
choix du lot 0 s'appliquent.

Autre point à trancher : valeur par défaut de `afficher_origine` pour les annales (§ 11).

En attente : autorisation écrite de la DGESCO pour présenter des annales sous licence NC sur un site qui affichera
des partenaires. D'ici là, aucun encart partenaire sur une page qui porte un contenu sous licence NC.

Écarts relevés aux lots 1b à 1e encore ouverts : voir `NOTE-DE-LIVRAISON.md` (section « Écarts » et annexes).

À venir, hors du lot 1e : **bibliothèque d'images libres de droits accessible depuis `/admin/`, avec des crédits
pré-remplis**.

## 14. Hors périmètre

Comptes, base de données, publicité, encarts partenaires, monétisation, réécriture des fichiers autonomes (contenus repris, annales) au-delà de l'enveloppe, génération automatique
d'articles en masse.
