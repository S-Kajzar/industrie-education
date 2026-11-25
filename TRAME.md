# industrie.education — Trame V2 (cahier des charges)

Ce document fait foi. Ce qui n'y est pas décrit n'est pas à faire. Une contradiction entre ce document, `DESIGN.md`
et le code se signale dans la note de livraison au lieu de se trancher seule. Les décisions de fond sont prises
dans le projet Claude « industrie.education » ; ce fichier en est la traduction technique.

## 1. Objet et priorités

Site de référence de cours, exercices interactifs, études de cas et annales en sciences industrielles (SI, STI2D,
Bac Pro MSPC, BTS MS). Priorités, dans l'ordre : **1. contenu et site de qualité, 2. diffusion auprès des
enseignants, 3. monétisation (reportée, rien à coder)**.

Le site est **statique, gratuit, sans compte, sans cookie**. Une partie du public est mineure : aucune donnée
personnelle, aucun traceur tiers, aucune ressource chargée depuis un tiers, sauf la mesure d'audience Umami
(sans cookie).

## 2. Décisions

| Sujet | Décision |
|---|---|
| Dépôt | **Un dépôt unique** `industrie-education`. Les 37 anciens dépôts de cours sont repris dedans (lot 1), puis reçoivent une page relais |
| Hébergement | GitHub Pages, publié par une GitHub Action à chaque envoi sur `main`. Le site généré (`_site/`) n'est jamais versionné |
| Domaine | Préproduction sur `s-kajzar.github.io/industrie-education/`. Le domaine `industrie.education` sera posé sur ce dépôt à la bascule (lot 1) |
| Indexation | **Interdite en préproduction** (`site.json` : `"indexable": false` → `noindex` partout et `robots.txt` fermé), pour ne pas concurrencer l'ancien site |
| Génération | Python 3 + Jinja2. `outils/construire.py` lit `site.json`, `contenus/`, `annales/`, `catalogue/` et écrit `_site/` |
| Design | `DESIGN.md` et `statique/commun.css`. Vitrine minimaliste (accueil, service) ; registre « atelier » (catalogue, collections, contenus) |
| Vignettes | **Aucune image dans les cartes** : bandeau typographique (thème + collection) |
| Mesure d'audience | Umami Cloud, offre gratuite, sans cookie. Script inséré seulement si `site.json` contient un identifiant |
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
| Annale | `/annales/<filiere>/<session>-<epreuve>/` | `annale` (lot 2) |
| Service | `/enseignants/`, `/partenaires/`, `/a-propos/`, `/mentions-legales/` | `service` |
| Erreur | `/404.html` | `service` |

Noms réservés (une collection ne peut pas les prendre, la construction s'arrête sinon) : `catalogue`, `annales`,
`si`, `sti2d`, `bac-pro-mspc`, `bts-ms`, `mecanique`, `energie`, `numerique`, `systemes`, `habitat`, `enseignants`,
`partenaires`, `a-propos`, `mentions-legales`, `_`.

> Le dossier technique `statique/` du dépôt est publié sous `/_/` (`/_/commun.css`, `/_/polices/…`), pour laisser
> l'adresse `/statique/` à la collection Statique.

## 4. Structure du dépôt

```
CLAUDE.md                consignes pour Claude Code
TRAME.md                 ce document
DESIGN.md                design system
site.json                nom, base, indexable, Umami, éditeur, contact, titres d'accueil
catalogue/
  themes.json            les 5 thèmes (id, nom, exemples)
  publics.json           les 4 publics (id, nom, actif)
  a-la-une.json          les 6 contenus de l'accueil (identifiants)
  partenaires.json       vide en V1
contenus/
  <collection>/
    collection.json      titre, thème, publics, ordre des contenus, description
    <contenu>/
      contenu.json       métadonnées (voir § 5)
      index.html         corps du contenu (repris ou natif)
      …                  ses images, scripts propres
annales/                 lot 2
gabarits/                gabarits Jinja2 (accueil, catalogue, liste, collection, contenu, annales, service, base)
statique/                publié sous /_/ : commun.css, commun.js, projeter.js, polices/
outils/
  construire.py          génération du site
  reprendre.py           lot 1 : import d'un ancien dépôt
tests/
.github/workflows/publier.yml
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
  "description": "Isolements successifs d'un cadre de VTT tout suspendu.",
  "mode": "repris",
  "source": "S-Kajzar/STATIQUE : cadre-velo.html"
}
```

- `type` ∈ `cours`, `exercice`, `activite`, `etude`, `qcm`, `formulaire`.
- Thème et publics sont hérités de `collection.json` (surchargeables dans `contenu.json`).
- `mode: "repris"` : `index.html` est le fichier existant, copié tel quel. La construction l'enveloppe : elle
  ajoute dans `<head>` le lien vers `/_/commun.css` **après** les styles du contenu sans les écraser, et insère en
  haut un bandeau de retour (fil d'Ariane : thème / collection / contenu) et en bas « Contenu précédent / suivant »
  et « Signaler une erreur ». Le reste du fichier n'est pas modifié.
- `mode: "natif"` (lots ultérieurs) : le corps est écrit pour le gabarit `contenu`.

## 6. Gabarits

| Gabarit | Contenu | Maquette |
|---|---|---|
| `accueil` | Titre évolutif (DESIGN.md § 7), recherche, index des 5 thèmes, 4 publics, 3 à 6 contenus à la une, lien Annales, bloc Enseignants | Canvas, « Accueil retenue — M1 × charte atelier » |
| `catalogue` | En-tête blanc + titre sur rail ; fond béton ; filtres Thème / Type / Filière / Niveau ; cartes ; compteur ; « Effacer les filtres » ; message si aucun résultat. Fonctionne sans JavaScript (toutes les cartes affichées) | Canvas, « Catalogue — M1 × charte atelier » |
| `liste` | Public ou thème : titre sur rail, collections groupées, cartes | — |
| `collection` | Titre, description, contenus dans l'ordre (cours puis exercices par niveau), cartes numérotées | — |
| `contenu` | Enveloppe des contenus repris (§ 5) ; gabarit complet pour les contenus natifs | Charte atelier existante |
| `annales` | Index par filière, épreuve, session. État vide « Premières annales en préparation » en lot 0 | — |
| `service` | Enseignants, Partenaires (V1 sans partenaire : principes + « Devenir partenaire »), À propos, Mentions légales, 404 | — |

## 7. Lots

Chaque lot : une session Claude Code, des tests verts, une pull request, une `NOTE-DE-LIVRAISON.md` à jour
(fait, testé, à faire par Sébastien, écarts). Puis on s'arrête.

| Lot | Contenu | État |
|---|---|---|
| **0 Socle** | Structure, `commun.css`, gabarits, `construire.py`, 3 collections de démonstration + 1 contenu réel repris (STATIQUE, cadre de vélo), Action de publication, tests. Prompt : `prompts/LOT-0.md` | à faire |
| **1 Reprise** | `reprendre.py` : import des 37 dépôts (ancienne liste `catalogue/depots.json` de l'ancienne vitrine) ; pages relais dans les anciens dépôts (y compris `?ex=`) ; doublons tranchés ; bascule du domaine | à faire |
| **2 Annales** | Gabarit `annale` (DT en panneau, DR interactifs, entraînement / examen chronométré) sur un sujet pilote | à faire |
| **3 Qualité** | Une page par contenu pour les 7 gros dépôts ; checklist qualité appliquée ; mode projection ; bouton Signaler relié à un formulaire | à faire |

## 8. Critères de qualité (tous les lots)

- Accueil < 300 Ko au premier affichage ; aucune page > 1 Mo hors contenus repris.
- Aucune requête vers un tiers, sauf Umami quand il est configuré (test automatique).
- Aucun lien interne cassé (test automatique).
- Contraste AA, focus visible, navigation au clavier, `lang="fr"`, un seul `h1` par page.
- Utilisable à 360 px de large, sur tablette, et au vidéoprojecteur.
- Les pages s'affichent sans JavaScript (les filtres et le titre évolutif sont des améliorations).

## 9. Hors périmètre

Comptes, base de données, publicité, encarts partenaires, monétisation, refonte des contenus repris (au-delà de
l'enveloppe), images de vignettes.
