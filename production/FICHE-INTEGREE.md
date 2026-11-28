# Fiche intégrée : le bloc de métadonnées d'un fichier HTML

Référence pour le projet Claude « Exercices interactifs » (lot 1e, TRAME § 11). Chaque fichier HTML autonome qu'il
produit (annale ou exercice) contient un **bloc de métadonnées invisible**. Au dépôt sur le site, ce bloc remplit
seul la fiche, en brouillon : Sébastien n'a rien à saisir.

Le bloc est **facultatif** pour le site : sans lui, la fiche est quand même créée, mais seuls le titre, la
présentation et la durée sont lus dans le fichier, et tout le reste est à compléter à la main.

## Où le placer

Dans le `<head>` du fichier, une seule fois, sous cette forme exacte :

```html
<script type="application/json" id="fiche-industrie-education">{ … }</script>
```

- `type="application/json"` : le navigateur ne l'exécute pas et ne l'affiche pas ; le fichier reste neutre pour
  l'élève.
- Le contenu est un objet JSON valide, en UTF-8 : guillemets droits `"`, aucune virgule finale, aucun commentaire.
- Le bloc ne charge rien et ne contient aucune adresse vers une ressource : la source citée dans `source.url` est une
  simple valeur texte.

## Champs, format 1

| Champ | Obligatoire | Contenu |
|---|---|---|
| `format` | oui | `1`. Un autre nombre : le bloc est ignoré, et le fichier est lu comme s'il n'en avait pas. |
| `type` | oui | `"annale"` ou `"exercice"` |
| `id` | oui | Identifiant neutre de la page, sans diplôme ni session : minuscules sans accent, chiffres et tirets (`levage-dechargement-sacs-linge`). Il devient l'adresse : `/annales/<id>/`, ou `/<collection>/<id>/` pour un exercice. |
| `titre` | oui | Titre de la fiche, **70 caractères au plus**, neutre |
| `presentation` | oui | Deux ou trois phrases, **20 à 300 caractères** : le système étudié, les parties, la durée. Elle sert de description pour les moteurs de recherche et sur la carte. |
| `publics` | annale | Liste d'identifiants de filières : `si`, `sti2d`, `bac-pro-mspc`, `bts-ms` |
| `theme` | annale | Un identifiant de thème : `mecanique`, `energie`, `numerique`, `systemes`, `habitat` |
| `notions` | conseillé | Liste d'identifiants de `catalogue/notions.json` (voir plus bas) |
| `notions_proposees` | non | Notions absentes de la liste : `[{"id": "couple-moteur", "nom": "Couple moteur"}]`. Elles ne sont **jamais créées automatiquement** : Sébastien décide. |
| `duree_min` | conseillé | Durée conseillée en minutes, nombre entier (`300`) |
| `niveau` | exercice | `1`, `2` ou `3` |
| `origine` | annale | `{"diplome": "BTS Maintenance industrielle", "epreuve": "E4", "session": 2013}` : classement interne, jamais affiché tant que Sébastien ne le décide pas |
| `source` | annale | `{"editeur": "éduscol STI", "url": "https://…", "licence": "cc-by-nc-sa-2.0-fr", "reference_autorisation": ""}` |
| `requetes` | conseillé | 3 à 5 recherches qu'un élève taperait pour trouver ce sujet (`"annale corrigée levage bts ms"`) |
| `pistes_image` | non | 2 ou 3 idées d'illustration, en texte (`"Planche de brevet d'un palan"`) ; jamais d'image générée par IA |
| `collection` | exercice | Identifiant de la collection du site où ranger l'exercice (`statique`). **Ajout du lot 1e**, voir « Exercices ». |

Valeurs de `source.licence` (liste fermée) : `cc-by-nc-sa-2.0-fr` (sujets d'éduscol STI), `etalab-2.0` (annales du
bac sur eduscol.education.gouv.fr), `autorisation-ecrite` (avec `reference_autorisation` : qui, quand, par quel
écrit), `oeuvre-personnelle`. L'adresse `source.url` est complète, en `https://`.

**Notions connues** à la date de ce document (la liste fait foi dans `catalogue/notions.json`) : `statique`,
`dynamique`, `cinematique-graphique`, `roulements`, `liaisons`, `pfs`, `solide-deux-forces`. Un identifiant inconnu
placé dans `notions` n'est pas perdu : l'import le déplace dans `notions_proposees`.

**Jamais dans le bloc** : `statut`. Une fiche importée est **toujours un brouillon** ; seul Sébastien la passe en
« Relu », depuis le back-office, après relecture. Un `statut` présent est ignoré.

## Exemple complet (annale)

```html
<script type="application/json" id="fiche-industrie-education">{
  "format": 1,
  "type": "annale",
  "id": "levage-dechargement-sacs-linge",
  "titre": "Système de levage et de déchargement des sacs de linge",
  "presentation": "Étude d'un système de manutention dans une blanchisserie : 5 parties, 5 h de travail conseillées, 39 questions notées et 4 tracés.",
  "publics": ["bts-ms"],
  "theme": "mecanique",
  "notions": ["statique", "cinematique-graphique", "roulements"],
  "notions_proposees": [{"id": "verin-pneumatique", "nom": "Vérin pneumatique"}],
  "duree_min": 300,
  "origine": {"diplome": "BTS Maintenance industrielle", "epreuve": "E4", "session": 2013},
  "source": {
    "editeur": "éduscol STI",
    "url": "https://sti.eduscol.education.fr/sites/eduscol.education.fr.sti/files/concours-examens/5111/5111-dossier-questionnaire-epreuve-e4-bts-mi-2013-metropole.docx",
    "licence": "cc-by-nc-sa-2.0-fr",
    "reference_autorisation": ""
  },
  "requetes": ["annale bts ms e4 corrigée", "exercice statique palan corrigé", "étude de cas levage sacs de linge"],
  "pistes_image": ["Planche de l'Encyclopédie : treuil et palan", "Dessin de brevet américain d'un monte-charge"]
}</script>
```

## Exercices

Un exercice est rangé dans une collection du site (`contenus/<collection>/<id>/`), dont il hérite le thème et les
filières. Le format 1 tel que décidé n'a pas de champ pour la collection : le champ **`collection`** est ajouté par
le lot 1e (écart signalé dans `NOTE-DE-LIVRAISON.md`, à valider). Sans collection connue, le fichier n'est pas
importé et l'import le signale ; Sébastien peut aussi créer la fiche à la main (Contenus → la collection →
Nouveau). Collections actuelles : `statique` ; les collections `demo-…` sont des démonstrations.

## Ce que fait le site au dépôt

1. Le fichier est déposé dans la rubrique **Dépôt rapide** du back-office (1 à 10 fichiers par enregistrement), ou
   directement sur GitHub dans `medias/import/`.
2. À la publication suivante (environ 3 minutes), `outils/importer.py` :
   - contrôle le fichier (`outils/annale.py`) : document HTML complet, 5 Mo au plus, aucune ressource extérieure,
     images intégrées, liens internes limités aux ancres du fichier (`#…`) qui existent ;
   - lit le bloc ; sans bloc, lit le titre (`h1`), le premier paragraphe de l'accueil (`#home`) et la durée totale
     des parties (`window.__PARTS__`) ;
   - crée la fiche en **brouillon** (`annales/<id>.json`, ou `contenus/<collection>/<id>/contenu.json`) et range le
     fichier dans `medias/depots/<id>.html`, **sans le modifier** ;
   - fait un seul commit pour tout le dépôt (« Import : 3 fiches créées en brouillon »).
3. Le contrôle **20/20** (une copie entièrement juste obtient 20/20 dans les deux modes) tourne sur chaque annale ; en
   brouillon, un échec n'est qu'un avertissement.
4. Un fichier refusé reste dans `medias/import/` et figure dans « À corriger », avec la raison.

**Nouvelle version.** Un fichier dont l'`id` est déjà celui d'une fiche devient la **nouvelle version à relire** de
cette fiche (`medias/a-relire/<id>.html`) : la version en ligne reste en ligne. Sébastien télécharge la nouvelle
version depuis la fiche, la teste, coche « Valider la nouvelle version » et enregistre ; l'import suivant remplace
l'ancien fichier. Les autres champs du bloc d'une nouvelle version ne modifient pas la fiche existante.

## Ce que le bloc ne change pas

- L'intérieur du fichier n'est jamais réécrit par le site.
- Le statut « Relu », la valeur d'`afficher_origine` et l'image de la carte (avec son crédit) restent des décisions
  de Sébastien, dans le back-office.
