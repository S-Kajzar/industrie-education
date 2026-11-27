# industrie.education — Design system

Ce document fait foi pour tout ce qui se voit. Il est extrait de la charte « atelier » déjà utilisée par 32 dépôts
de cours sur 37 (référence : Chaîne fonctionnelle, cours 1), et complété pour l'accueil, le catalogue, le mobile et
la projection. Les valeurs sont codées une seule fois, dans `statique/commun.css`. Aucune page ne redéfinit une
couleur, une police ou une épaisseur de trait en dur.

## 1. Deux registres, une seule charte

| Registre | Pages | Fond | Ton |
|---|---|---|---|
| **Vitrine** | Accueil, pages de service | Papier blanc | Minimaliste : grille de 12 colonnes, très grands titres, peu d'éléments |
| **Atelier** | Catalogue (sous l'en-tête), public, thème, collection, contenu, annale | Béton | Dense et outillé : cartes papier bordées de noir, sections numérotées |

Le passage de l'un à l'autre se fait par les mêmes signatures : rail jaune, bordures noires de 2 px, titres DIN
condensés, carrés noirs à chiffre jaune.

## 2. Couleurs

| Jeton | Valeur | Usage |
|---|---|---|
| `--beton` | `#E3E5E0` | Fond du registre atelier |
| `--papier` | `#FFFFFF` | Fond de la vitrine, des cartes et des parties |
| `--encre` | `#1C2530` | Texte, bordures, carrés de numéro, bandeau des cartes |
| `--encre-2` | `#46525C` | Texte secondaire (contraste 8:1 sur blanc, 6,3:1 sur béton) |
| `--trait` | `#A5ADAA` | Bordures secondaires, éléments désactivés |
| `--trait-fin` | `#D3D8D5` | Séparateurs fins |
| `--jaune` | `#F2B705` | **Couleur de marque** : rails, fonds de bouton principal, badge de type, chiffres sur fond encre |
| `--jaune-pale` | `#FFF3C4` | Survol, élément sélectionné |
| `--bleu` | `#1F5FA8` | Chaîne d'information, liens dans le texte, focus clavier |
| `--orange` | `#B26A00` | Chaîne d'énergie |
| `--vert` / `--vert-pale` | `#1B7A43` / `#E2F1E7` | Réponse juste, badge de niveau |
| `--rouge` / `--rouge-pale` | `#B42318` / `#FBE6E4` | Réponse fausse, erreur |

Règles :
- **Le jaune n'est jamais une couleur de texte sur fond clair** (contraste 1,8:1). Il sert de fond (texte encre
  dessus : 8,5:1), de rail, de soulignement, ou de chiffre sur fond encre.
- Juste et faux portent toujours un symbole en plus de la couleur : ✓ et ✕.
- Une couleur par sens : bleu = information, orange = énergie. Elles ne servent pas de décoration.

## 3. Typographie

| Jeton | Pile | Usage |
|---|---|---|
| `--f-titre` | `"Bahnschrift", "Barlow Condensed", "DIN Alternate", "Roboto Condensed", "Arial Narrow", sans-serif` | Titres, numéros, badges, boutons |
| `--f-texte` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` | Texte courant |

- **Barlow Condensed est auto-hébergée** (`statique/polices/`, licence OFL), en 600, 700 et 800. Jamais de lien vers
  Google Fonts : le site s'adresse à des mineurs et ne fait aucune requête vers un tiers (sauf la mesure d'audience).
- Bahnschrift reste en tête de pile : sur les PC Windows des salles de classe, elle est déjà installée.
- Chiffres tabulaires partout (`font-variant-numeric: tabular-nums`).

| Niveau | Taille | Graisse | Police |
|---|---|---|---|
| Titre d'accueil | `clamp(3.75rem, 9vw, 9.25rem)`, interligne 0,88 | 800 | titre |
| H1 de page | `clamp(2.5rem, 5vw, 4.5rem)`, interligne 0,9 | 800 | titre |
| H2 de partie | 1,45 rem | 700 | titre |
| Titre de carte | 1,5 rem, interligne 1,05 | 700 | titre |
| Texte courant | 1 rem (16 px), interligne 1,55 | 400 | texte |
| Petit texte, métadonnées | 0,875 rem | 400–600 | texte |
| Badge | 0,75 rem | 700 | texte |

## 4. Espacements, traits, grille

- Échelle d'espacement (rem) : 0,25 · 0,5 · 0,75 · 1 · 1,25 · 1,75 · 2,5 · 3,5 · 4.
- Traits : 2 px `--encre` pour les cadres principaux ; 1 px `--trait-fin` pour les séparateurs ; rail jaune de 8 px
  (cartes) ou 10 px (titres de page).
- Pas d'arrondi (au plus 2 px sur les boutons, comme dans la charte). Pas d'ombre, sauf l'ombre portée pleine
  `4px 4px 0 var(--encre)` au survol d'une carte.
- Vitrine : grille de 12 colonnes, gouttière 20 px, marges 40 px (16 px sur téléphone), largeur max. 1360 px.
- Contenus : colonne de lecture de 900 px max., comme dans la charte.

## 5. Composants

| Composant | Description | Classe |
|---|---|---|
| En-tête du site | Bande blanche, bordure basse 2 px. Logo : rail jaune + « industrie.education » en titre 800. Liens Catalogue, Annales, Enseignants, bouton « Projeter » | `.site-tete` |
| Pied de page | Liens de service, mention « gratuit, sans compte, sans cookie » | `.site-pied` |
| Titre d'accueil | Grand titre sur rail jaune de 10 px, change selon le moment (voir § 7) | `.accueil-titre` |
| Index des thèmes | Lignes bordées de noir : carré encre à chiffre jaune, nom du thème, exemples, nombre de contenus et d'annales. Un thème sans contenu publié : carré `--trait-fin` à chiffre `--encre-2`, texte `--encre-2`, « Bientôt » à la place du nombre, sans lien | `.index-themes`, `.index-bientot` |
| Titre de page | H1 sur rail jaune, sous-titre en `--encre-2` | `.page-titre` |
| Recherche | Champ bordé 2 px + bouton jaune collé | `.recherche` |
| Bloc de filtres | En-tête encre à texte jaune, options en lignes de 44 px min., sélection en `--jaune-pale` + gras | `.filtre` |
| Carte de contenu | Bordure 2 px, rail jaune gauche 8 px, en tête **l'image de la carte si elle existe, sinon le bandeau typographique**, puis badges, titre, collection | `.carte` |
| Image de carte | Format 16/9 recadré, fond blanc, bordure basse 2 px encre, `loading="lazy"`, texte alternatif ; même hauteur que le bandeau pour que la grille reste alignée | `.carte-image` |
| Bandeau typographique | Fond encre tramé d'un quadrillage de 16 px (papier millimétré, `--encre-2` à 45 %), thème en petites capitales grises, collection en titre jaune. Utilisé quand la carte n'a pas d'image : la trame en fait un visuel fini, pas un emplacement vide | `.carte-bandeau` |
| Badges | Type : fond jaune. Niveau : fond vert, texte blanc. Thème : bordure `--trait` | `.badge`, `.badge-niveau`, `.badge-theme` |
| Bouton principal | Fond jaune, bordure encre 2 px, texte encre | `.btn-jaune` |
| Bouton secondaire | Fond encre, texte blanc (bouton `.btn` de la charte) | `.btn` |
| Cartouche, partie, barre de question, données, retour juste/faux | Repris tels quels de la charte (`.cartouche`, `.part`, `.part-num`, `.qbar`, `.data`) | — |
| Calque Projeter | Plein écran, QR code d'au moins 60 % de la hauteur, adresse, « Copier le lien », Échap | `.projeter` |
| Bouton « Signaler une erreur » | Lien discret en bas de chaque contenu | `.signaler` |
| Illustration de fond | Planche technique traitée (§ 9) derrière le titre d'accueil ou d'une page de thème | `.illustration-fond` |
| Bloc « Bientôt » | Accueil, rangée après « Annales » (grille M1 : étiquette sur 2 colonnes, corps sur 10) : Labo et Maquettes à venir, deux cases bordées de 2 px, chacune avec sa vignette de planche si elle existe, son titre et sa promesse en une phrase, toute la case est le lien. Pages `/labo/` et `/maquettes/` : la promesse en grand titre dans un cadre à rail jaune, surmontée de « Bientôt » ; aucune date, aucun formulaire | `.bientot`, `.bientot-page` |
| Fiche d'annale | Bandeau compact au-dessus du fichier autonome, dans l'enveloppe : fond papier, rail jaune de 10 px, texte 0,875 rem. Surtitre en petites capitales `--encre-2` (« Annale corrigée et interactive · filières »), puis en ligne : durée, filières, thème, notions (libellé et valeur en gras), « Pour réviser » (liens bleus), ligne de crédit. Pas de titre ni de présentation : ceux du fichier suivent juste en dessous. Au plus 300 px de haut à 360 px ; à 1280 × 800, le titre du sujet reste au premier écran. Masquée en projection et à l'impression | `.enveloppe-fiche` |
| Ligne de crédit | Dernière ligne de la fiche d'annale, 0,75 rem, `--encre-2`, lien bleu sur le nom de l'éditeur ; toujours affichée, quel que soit `afficher_origine`. Reprise sur la page Crédits | `.enveloppe-fiche-credit`, `.credit-ligne` |

## 6. Comportements

- **Focus clavier** : contour bleu 3 px, décalé de 2 px, sur tout élément interactif.
- **Cibles tactiles** : 44 × 44 px au minimum.
- **Mouvement** : transitions de 150 à 250 ms, supprimées si `prefers-reduced-motion`.
- **Mobile (< 640 px)** : la grille de 12 colonnes devient une colonne ; les filtres du catalogue se replient dans
  un bouton « Filtres » ; le sommaire d'un contenu devient une barre en haut de page.
- **Mode projection** (`html[data-mode="projection"]`, interrupteur dans l'en-tête des contenus et touche P) :
  fond blanc, texte de base 20 px, traits de 3 px, navigation masquée. Pour la lisibilité à 3 m.
- **Impression** : A4, marges 12 mm, fond blanc, navigation masquée (règles de la charte).

## 7. Titre d'accueil évolutif

Calculé dans le navigateur à partir de l'heure locale, sans donnée personnelle. La page est livrée avec le titre par
défaut (lu par les moteurs et sans JavaScript), puis le script le remplace. La hauteur du titre est réservée pour
éviter tout saut. Les titres vivent dans `site.json`.

| Moment | Titre |
|---|---|
| Samedi, dimanche | Le week-end aussi, ça tourne. |
| 6 h – 8 h | Bien réveillé ? Un exercice avant le cours. |
| 8 h – 12 h, 14 h – 17 h (par défaut) | Comprendre comment ça marche. |
| 12 h – 14 h | Pause midi. Cinq minutes, un exercice. |
| 17 h – 22 h | Ce soir, on s'entraîne. |
| 22 h – 6 h | Encore debout ? Un dernier pour la route. |

## 8. Ce qu'on ne fait pas

- Pas d'image de carte sans licence déclarée (TRAME § 10) ; pas de scan de manuel.
- Pas d'image générée par IA, pas d'image de banque sous licence propriétaire (voir § 9).
- Pas de police, d'image ou de script chargé depuis un tiers (sauf Umami).
- Pas de couleur en dur dans une page : uniquement les jetons.
- Pas de texte jaune sur fond clair.
- Pas d'animation qui bloque la lecture ou l'usage en classe.

Maquettes de référence : canvas « industrie.education — Directions visuelles », page « M1 — Gabarits »
(accueil et catalogue).

## 9. Illustrations

Une seule famille d'images : **planches techniques anciennes** (gravures de mécanismes, machines, métiers), du
domaine public ou sous CC0. Elles disent littéralement « comprendre comment ça marche » et s'accordent avec l'encre
de la charte. Sources et circuit : TRAME § 10.

| Usage | Traitement | Placement |
|---|---|---|
| Accueil, derrière le titre | Niveaux de gris, fond blanc, opacité 0,18 à 0,25 ou fusion `multiply` | Moitié droite du bandeau, débordant sous le titre ; jamais sous la recherche |
| Page de thème | Idem, opacité 0,25 | En tête, à droite du titre sur rail |
| Index des thèmes (accueil) | Vignette carrée 64 px, encre pleine | Dans la ligne, après le carré numéroté |
| Labo, Maquettes (à venir) | Encre pleine, cadre noir 2 px | Bloc « Bientôt » de l'accueil et pages de section |
| Articles | Encre pleine, légende avec crédit | Dans le corps |

Règles :
- Le titre posé sur une illustration garde un contraste d'au moins 4,5:1 sur toute sa surface (test automatique).
- Sur téléphone (< 640 px), l'illustration d'accueil passe au-dessus du titre, en bandeau de 120 px de haut.
- Une illustration n'est jamais colorisée en jaune ; le jaune reste réservé aux rails, boutons et surlignages.
- Une seule illustration chargée par page en tête ; les autres en chargement différé (`loading="lazy"`).
