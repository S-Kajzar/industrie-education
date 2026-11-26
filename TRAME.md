# industrie.education — Trame V2.1 (cahier des charges)

Ce document fait foi. Ce qui n'y est pas décrit n'est pas à faire. Une contradiction entre ce document, `DESIGN.md`
et le code se signale dans la note de livraison au lieu de se trancher seule. Les décisions de fond sont prises
dans le projet Claude « industrie.education » ; ce fichier en est la traduction technique.

Version 2.1 (26 novembre 2026) : ajout du back-office, des illustrations, des sections Labo et Maquettes, de la
chaîne de production des annales, du référencement (moteurs de recherche et moteurs d'IA) et des articles Méthodes.

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
| Vignettes | **Aucune image dans les cartes de contenu** : bandeau typographique (thème + collection) |
| Illustrations | Planches techniques anciennes du **domaine public ou sous CC0**, jamais d'image générée par IA. Usage : accueil, thèmes, Labo, Maquettes, articles (§ 10) |
| Back-office | **Pages CMS** (libre, MIT) branché sur le dépôt : téléversement d'illustrations et de PDF, édition des données et des articles sans toucher au code. Chaque enregistrement est un commit (§ 9) |
| Annales | Une annale = **des données** (`annale.json`) rendues par un gabarit unique, jamais une page HTML écrite à la main. Production assistée par Claude, relecture humaine obligatoire avant publication (§ 11) |
| Référencement | Socle technique dès le lot 1 ; contenus lisibles par les moteurs et les IA ; articles Méthodes relus, publiés à date programmée (§ 12) |
| Mesure d'audience | Umami Cloud, offre gratuite, sans cookie. Google Search Console et Bing Webmaster Tools à la bascule |
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
| Annale | `/annales/<filiere>/<session>-<epreuve>/` (ex. `/annales/bts-ms/2025-e41/`) | `annale` |
| Labo | `/labo/`, puis `/labo/<tp>/` | `vitrine-section`, puis `labo` |
| Maquettes | `/maquettes/`, puis `/maquettes/<maquette>/` | `vitrine-section`, puis `maquette` |
| Méthodes | `/methodes/`, `/methodes/<article>/` | `methodes`, `article` |
| Service | `/enseignants/`, `/partenaires/`, `/a-propos/`, `/mentions-legales/`, `/credits/` | `service` |
| Erreur | `/404.html` | `service` |

Noms réservés (une collection ne peut pas les prendre, la construction s'arrête sinon) : `catalogue`, `annales`,
`labo`, `maquettes`, `methodes`, `si`, `sti2d`, `bac-pro-mspc`, `bts-ms`, `mecanique`, `energie`, `numerique`,
`systemes`, `habitat`, `enseignants`, `partenaires`, `a-propos`, `mentions-legales`, `credits`, `medias`, `_`.

> Le dossier technique `statique/` du dépôt est publié sous `/_/` (`/_/commun.css`, `/_/polices/…`), pour laisser
> l'adresse `/statique/` à la collection Statique.

## 4. Structure du dépôt

```
CLAUDE.md                consignes pour Claude Code
TRAME.md                 ce document
DESIGN.md                design system
.pages.yml               configuration du back-office Pages CMS (§ 9)
site.json                nom, base, indexable, Umami, éditeur, contact, titres d'accueil
catalogue/
  themes.json            les 5 thèmes (id, nom, exemples, illustration)
  publics.json           les 4 publics (id, nom, actif)
  a-la-une.json          les contenus de l'accueil (identifiants)
  partenaires.json       vide en V1
  a-venir.json           labos et maquettes annoncés (§ 10)
contenus/<collection>/   collection.json, puis un dossier par contenu (contenu.json, index.html, ressources)
annales/<filiere>/<session>-<epreuve>/
  sources/               PDF déposés (sujet, corrigé officiel éventuel) — jamais publiés tels quels
  annale.json            l'annale structurée (§ 11)
  documents/             DT et DR extraits en images (WebP)
methodes/<article>.md    articles Méthodes (front matter + Markdown, § 12)
medias/
  illustrations/         originaux téléversés (domaine public / CC0)
  CREDITS.json           source, auteur, date, licence de chaque illustration
gabarits/                gabarits Jinja2
statique/                publié sous /_/ : commun.css, commun.js, projeter.js, polices/, lib/
outils/
  construire.py          génération du site
  reprendre.py           lot 1 : import d'un ancien dépôt
  illustrations.py       traitement des illustrations (§ 10)
  annale.py              extraction des pages d'un PDF d'annale et contrôle de annale.json (§ 11)
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
  "mode": "repris",
  "source": "S-Kajzar/STATIQUE : cadre-velo.html",
  "mis_a_jour": "2026-11-26"
}
```

- `type` ∈ `cours`, `exercice`, `activite`, `etude`, `qcm`, `formulaire`.
- Thème et publics sont hérités de `collection.json` (surchargeables dans `contenu.json`).
- `requete_cible` (facultatif) : la recherche principale visée, utilisée pour le titre et la description (§ 12).
- `notions` : identifiants de notions partagés entre contenus, annales et articles ; ils servent au maillage interne
  (« Pour s'entraîner », « Tombé à l'examen », « Méthode associée »).
- `mode: "repris"` : `index.html` est le fichier existant, copié tel quel. La construction l'enveloppe (fil d'Ariane,
  précédent / suivant, Signaler) sans modifier son corps.
- `mode: "natif"` : le corps est écrit pour le gabarit `contenu`.

## 6. Gabarits

| Gabarit | Contenu | Maquette |
|---|---|---|
| `accueil` | Titre évolutif sur illustration (DESIGN § 7 et § 9), recherche, index des 5 thèmes, 4 publics, contenus à la une, Annales, bloc « Bientôt : Labo et Maquettes », bloc Enseignants | Canvas, « Accueil retenue — M1 × charte atelier » |
| `catalogue` | Filtres Thème / Type / Filière / Niveau ; cartes ; compteur ; fonctionne sans JavaScript | Canvas, « Catalogue — M1 × charte atelier » |
| `liste` | Public ou thème : titre sur rail, illustration du thème, collections groupées, cartes | — |
| `collection` | Titre, description, contenus dans l'ordre | — |
| `contenu` | Enveloppe des contenus repris ; gabarit complet pour les contenus natifs ; bloc de maillage (§ 12) | Charte atelier existante |
| `annales` | Index par filière, épreuve, session | — |
| `annale` | Rendu de `annale.json` : énoncé en HTML, DT en panneau, DR interactifs, entraînement / examen chronométré, correction, notions et cours liés | Lot 2 |
| `vitrine-section` | Labo et Maquettes tant qu'ils sont « à venir » : illustration, promesse, liste de `a-venir.json` | Lot 1b |
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
| **1b Back-office + illustrations + vitrines** | `.pages.yml` (§ 9) ; `outils/illustrations.py` et `medias/CREDITS.json` (§ 10) ; illustration de l'accueil et des 5 thèmes ; page Crédits ; pages `/labo/` et `/maquettes/` « à venir » et bloc d'accueil | à faire |
| **2 Annales** | Format `annale.json` + validation ; gabarit `annale` ; `outils/annale.py` ; `prompts/ANNALE.md` ; un sujet pilote de bout en bout (§ 11) | à faire |
| **3 Qualité + maillage** | Une page par contenu pour les gros dépôts ; notions et blocs de maillage ; mode projection ; Signaler relié à un formulaire ; checklist qualité | à faire |
| **4 Méthodes** | Gabarits `methodes` / `article` ; publication programmée (`quotidien.yml`) ; `prompts/METHODE.md` ; 4 premiers articles relus (§ 12.4) | à faire |
| **5 Automatisation annales** (optionnel) | La conversion PDF → `annale.json` lancée par une étiquette GitHub via l'Action Claude Code (clé d'API payante) | plus tard |
| **6 Labo et Maquettes** | Gabarits `labo` et `maquette` (visionneuse 3D auto-hébergée) ; premiers TP et maquettes | plus tard |

## 8. Critères de qualité (tous les lots)

- Accueil < 300 Ko au premier affichage, illustration comprise ; aucune page > 1 Mo hors contenus repris.
- Aucune requête vers un tiers, sauf Umami quand il est configuré (test automatique).
- Aucun lien interne cassé (test automatique).
- Contraste AA (y compris le titre posé sur l'illustration), focus visible, clavier, `lang="fr"`, un seul `h1`.
- Utilisable à 360 px de large, sur tablette, et au vidéoprojecteur.
- Les pages s'affichent sans JavaScript.
- Chaque page publiée a un titre et une description uniques (test automatique, § 12.1).

## 9. Back-office (Pages CMS)

Pages CMS est un CMS libre (licence MIT) qui édite directement les fichiers d'un dépôt GitHub : pas de base de
données, chaque enregistrement est un commit, la publication suit le circuit habituel (Action, tests, Pages). Il
sert uniquement à Sébastien : il n'ajoute rien au site public (aucune requête, aucun script).

Accès : application hébergée de Pages CMS (connexion GitHub, application installée sur ce seul dépôt), ou version
auto-hébergée plus tard.

`.pages.yml` déclare :

| Rubrique | Fichiers | Champs |
|---|---|---|
| Médias | `medias/illustrations/` (images), `annales/*/*/sources/` (PDF) | Téléversement par glisser-déposer |
| Illustrations | `medias/CREDITS.json` | Fichier, titre, auteur, date, source (URL), licence (liste fermée : domaine public, CC0), usage (accueil, thème, labo, maquette, article) |
| Accueil | `catalogue/a-la-une.json`, `site.json` → `titres_accueil` | Contenus à la une, titres par moment |
| Thèmes | `catalogue/themes.json` | Nom, exemples, illustration |
| À venir | `catalogue/a-venir.json` | Titre, type (labo, maquette), description, échéance indicative |
| Articles | `methodes/*.md` | Titre, résumé, date de publication, statut (brouillon, relu), notions, corps |
| Annales | `annales/*/*/annale.json` (statut, métadonnées) | Filière, épreuve, session, statut |
| Site | `site.json` | Éditeur, contact, Umami, indexable |

Règles : la construction refuse une illustration absente de `CREDITS.json` ou sous une licence hors liste, un
article ou une annale au statut `brouillon` (jamais publiés), et un PDF placé ailleurs que dans `sources/`.

## 10. Illustrations

- **Sources autorisées** : œuvres du domaine public (planches de l'Encyclopédie de Diderot et d'Alembert via
  Wikimedia Commons, dessins de brevets américains sans mention de droit d'auteur, gravures techniques anciennes)
  et fichiers sous CC0 (Smithsonian Open Access, autres musées en accès ouvert). **Interdits** : images générées par
  IA, banques d'images à licence propriétaire, copies Gallica (réutilisation commerciale payante, incompatible avec
  une monétisation future).
- **Traitement** (`outils/illustrations.py`, à partir de l'original de `medias/illustrations/`) : niveaux de gris,
  contraste renforcé, fond rendu blanc pur, recadrage, export WebP en plusieurs largeurs (`srcset`). Budgets : 150 Ko
  pour l'illustration d'accueil en grand écran, 60 Ko pour une illustration de thème.
- **Affichage** : voir DESIGN § 9. Texte alternatif obligatoire (ou `alt=""` si purement décoratif, déclaré dans
  `CREDITS.json`).
- **Crédits** : page `/credits/` générée depuis `CREDITS.json` (titre, auteur, date, source, licence).
- **Circuit** : Claude propose des planches (lien, licence) ; Sébastien les télécharge et les téléverse par le
  back-office ; la construction les traite et les publie.

## 11. Annales : chaîne de production

Objectif : passer d'un PDF de sujet à une annale interactive publiée **sans écrire de HTML**, avec une relecture
humaine obligatoire.

1. **Dépôt** : Sébastien crée l'annale dans le back-office (filière, épreuve, session) et téléverse le sujet PDF
   (et le corrigé officiel s'il existe) dans `sources/`. Statut `brouillon`.
2. **Extraction** : `outils/annale.py` découpe les pages en images (documents techniques et réponses) dans
   `documents/` et extrait le texte du PDF.
3. **Structuration** : une session Claude Code avec `prompts/ANNALE.md` produit `annale.json` (schéma ci-dessous) et
   un **rapport de relecture** listant chaque réponse attendue, sa justification et les points incertains. Elle
   ouvre une pull request.
4. **Relecture** : Sébastien vérifie les réponses et les tolérances (aperçu de préproduction de la branche), corrige
   dans le back-office ou la PR, puis passe le statut à `relu`.
5. **Publication** : fusion. La construction refuse toute annale `brouillon` ou non conforme au schéma.

Plus tard (lot 5), l'étape 3 peut être lancée par une étiquette GitHub via l'Action officielle Claude Code (clé
d'API Anthropic, coût par annale à mesurer sur le sujet pilote).

Schéma de `annale.json` (validé par `outils/annale.py`) :

```json
{
  "id": "bts-ms-2025-e41",
  "filiere": "bts-ms", "epreuve": "E41", "session": 2025,
  "titre": "… (exemple de structure, valeurs fictives)",
  "duree_min": 240, "statut": "brouillon",
  "source": "Sujet officiel, session 2025",
  "mise_en_situation": "…",
  "documents": [{"id": "DT1", "titre": "…", "image": "documents/dt1.webp", "credit": "…"}],
  "parties": [{
    "id": "A", "titre": "…", "duree_min": 60, "notions": ["…"],
    "questions": [{
      "id": "A1", "enonce": "…", "documents": ["DT1"], "points": 2,
      "reponse": {"type": "nombre", "valeur": 219.6, "unite": "N", "tolerance": 0.5},
      "correction": "…", "cours_lies": ["statique/cours-pfs"]
    }]
  }]
}
```

Types de réponse : `nombre` (valeur, unité, tolérance), `choix` (options, bonne(s) réponse(s)), `texte_court`
(réponses acceptées), `trace` (sur un DR, correction visuelle) et `ouverte` (correction affichée, auto-évaluation).
Les documents constructeurs inclus dans un sujet sont signalés dans le rapport : à redessiner ou à faire autoriser
avant publication.

## 12. Référencement (moteurs de recherche et moteurs d'IA)

Objectif : que les élèves trouvent le site en cherchant « exercice corrigé », « annale corrigée », « cours » +
notion + filière. Le référencement s'ouvre à la bascule ; tout ce qui suit est construit avant.

### 12.1 Socle technique (lot 1)

- Titre et description uniques par page, générés depuis les données. Modèles : contenu « {Titre} — {type} corrigé
  de {collection} ({filières}) | industrie.education » ; annale « Annale {filière} {session} {épreuve} corrigée :
  {titre} ». Test : aucun doublon, longueur raisonnable.
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

## 14. Hors périmètre

Comptes, base de données, publicité, encarts partenaires, monétisation, réécriture des contenus repris (au-delà de
l'enveloppe), vignettes de contenus, génération automatique d'articles en masse.
