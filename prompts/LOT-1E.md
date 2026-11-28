# Lot 1e — Publication fiable et dépôt en un geste

À coller dans une session Claude Code ouverte sur le dépôt S-Kajzar/industrie-education.

Tu travailles sur le dépôt industrie-education, après le lot 1d (pull requests n° 6 et 7). Lis d'abord en entier, car
ils font foi :

- CLAUDE.md, TRAME.md, DESIGN.md ;
- NOTE-DE-LIVRAISON.md du lot 1d ;
- GUIDE-BACK-OFFICE.md, admin/config.yml, outils/construire.py, outils/annale.py, le workflow de publication ;
- les tests tests/annale-parfaite.spec.js et tests/coherence.spec.js.

Copie ensuite ce prompt dans prompts/LOT-1E.md.

## Pourquoi ce lot

Le 27/11, des enregistrements faits depuis /admin/ ont bloqué toute la publication à trois reprises :

- un brouillon refusé par un test ;
- une fiche relue sans source ;
- une image sans crédit.

Six causes s'additionnent :

- les règles ne sont contrôlées qu'après l'enregistrement ;
- la construction s'arrête à la première fiche invalide ;
- elle ne signale qu'une erreur à la fois ;
- l'échec n'est visible que sur GitHub ;
- certains contrôles traitent les brouillons comme des fiches publiées ;
- Sveltia ne sait pas exprimer certaines règles.

Par ailleurs, Sébastien va déposer beaucoup de fichiers HTML déjà produits et testés dans le projet Claude « Exercices
interactifs ». Aujourd'hui, chaque dépôt oblige à remplir la fiche à la main.

**Objectif.**

- Une erreur de contenu ne retient que sa fiche et se voit tout de suite dans /admin/.
- Déposer un ou plusieurs fichiers HTML suffit : la fiche se remplit seule, en brouillon.

Propose-moi d'abord un plan court. Réalise-le ensuite étape par étape, tests à l'appui.

## Décisions prises avec Sébastien (27/11, à ne pas rediscuter)

- Options A, B, C et E de l'analyse de l'incident. L'option D (passer par une branche à chaque enregistrement) est
  écartée.
- La source d'une annale (éditeur, adresse, licence) est obligatoire dès la création dans /admin/, même en brouillon.
- Une fiche déjà en ligne qui devient invalide est retirée du site et signalée.
- Le crédit d'une image se saisit avec l'image, dans la fiche qui l'utilise. Le registre des crédits est produit à
  partir des fiches.
- Image sans crédit (V1) : le dépositaire assume le risque. Il peut publier une image sans crédit en cochant
  « J'accepte le risque : image publiée sans crédit ». L'image est alors publiée et listée « à régulariser ». Une image
  ne retient jamais sa fiche.
- Plus tard, hors de ce lot : une bibliothèque d'images libres de droits, accessible depuis /admin/, avec des crédits
  pré-remplis.
- Aucune clé d'API, aucun appel à un modèle d'IA dans ce lot. Tout ce qui est automatisé ici est déterministe.
- Les brouillons ne sont jamais publiés. Sébastien les teste en les téléchargeant.

## À livrer

### 1. Une fiche retenue plutôt qu'un site bloqué (option A)

- Classe chaque contrôle en deux catégories :
  - erreur de contenu, propre à une fiche : source, notion inconnue, fichier autonome invalide, note différente de
    20/20. Les images suivent leur propre règle (§ 3) : elles ne retiennent jamais une fiche ;
  - erreur de code : gabarit, style, lien interne produit par le code du site, test de page.
- Une erreur de contenu retire seulement la fiche concernée ; tout le reste part en ligne. Les blocs qui renverraient
  vers une fiche retenue n'affichent rien et ne cassent aucun lien : accueil, listes, « Pour réviser », sitemap.
- Une erreur de code bloque toujours la publication.
- Une fiche déjà en ligne qui devient invalide est retirée et signalée comme telle.
- Le contrôle 20/20 (« annale parfaite ») ne s'applique qu'aux annales relues. Il s'exécute avant la construction
  finale : une annale relue qui échoue est retenue, sans bloquer le reste. Organise l'enchaînement comme tu le juges le
  plus simple (construction candidate, contrôles, construction finale, tests) et explique-le dans la note.
- Toutes les erreurs d'une fiche sont listées en une fois, chacune avec sa correction en une phrase et le nom du champ
  à corriger dans /admin/.

### 2. Contrôles dès la saisie (option B)

Dans admin/config.yml :

- Source d'une annale : éditeur, adresse et licence obligatoires.
- Image : texte alternatif facultatif. Laissé vide, l'image est traitée comme décorative (alt=""), ce qui convient à
  une image de carte posée à côté de son titre.
- Champs de crédit facultatifs dans le formulaire, plus une case de risque (voir § 3).
- Motifs et listes fermées avec des messages d'erreur en français, qui disent quoi faire.

Ce que Sveltia ne sait pas exiger reste contrôlé par la construction. Exemples : la référence d'autorisation quand la
licence est « autorisation écrite », une notion inconnue. Liste ces règles dans la note.

### 3. Crédit saisi avec l'image, ou risque accepté

- Chaque champ image devient un objet : fiches de contenu et d'annale, accueil, thèmes, Labo, Maquettes. Ses champs :
  - fichier et alt ;
  - le crédit : licence (liste fermée actuelle), source (adresse), auteur, reference_autorisation ;
  - risque_accepte, une case libellée « J'accepte le risque : image publiée sans crédit », décochée par défaut, avec
    une aide d'une ligne : « À régulariser dès que possible ; la case ne couvre que l'absence de crédit ».
- Trois cas à la construction :

  | Situation | Image | Fiche | Signalement |
  |---|---|---|---|
  | Crédit complet | publiée, citée sur /credits/ | publiée | aucun |
  | Case cochée, crédit absent ou incomplet | publiée, absente de /credits/ | publiée | « Images à régulariser » |
  | Ni crédit complet ni case cochée | non publiée : bandeau typographique à la place | publiée | « À corriger » : « cocher la case ou compléter le crédit » |

- /credits/ et le résumé de publication sont produits à partir de ces objets. Migre une fois le contenu actuel de
  medias/CREDITS.json dans les fiches, puis :
  - soit supprime le fichier ;
  - soit garde-le, produit par la construction et non versionné.

  Choisis et explique.
- Supprime la rubrique « Crédits » de /admin/.
- Une image téléversée mais citée par aucune fiche est signalée dans le résumé (« image orpheline »), sans rien bloquer.
- Mets à jour la règle « Images » de CLAUDE.md et TRAME § 10 :
  - chaque image porte son crédit dans sa fiche, sous la même liste fermée de licences, ou la case de risque cochée par
    Sébastien ;
  - la case ne couvre que l'absence de crédit : jamais d'image générée par IA ;
  - Claude n'ajoute aucune image et ne coche jamais la case.
- Ajoute à TRAME (§ 13 ou § 14) le point à venir : « Bibliothèque d'images libres de droits accessible depuis /admin/,
  avec des crédits pré-remplis ».

### 4. Un brouillon ne bloque jamais (option C)

- Pour un brouillon, tous les contrôles de contenu deviennent des avertissements, listés dans le résumé. Seule
  exception : un fichier qui empêcherait la construction elle-même, par exemple un JSON illisible. Le fichier fautif
  est alors ignoré et signalé, sans arrêter la construction.
- Aucun test ne porte sur un brouillon comme s'il était publié.

### 5. Échec visible tout de suite (option E)

- En haut de /admin/, ajoute un bandeau d'état de publication, en français :
  - « Publication en cours », « En ligne depuis hh:mm » ou « Échec : voir le détail » ;
  - le nombre de fiches retenues et le nombre d'images à régulariser, chacun relié à sa liste avec les corrections.
- Il s'appuie sur :
  - un fichier d'état écrit par la construction dans _site/admin/ ;
  - l'API publique de GitHub pour l'exécution en cours. Reste sous la limite de 60 requêtes par heure sans
    authentification : interroge au chargement, au retour sur l'onglet et après un enregistrement, pas en continu.
- N'utilise pas le jeton de Sveltia.
- Le résumé de publication commence par une rubrique « À corriger ». Elle regroupe les fiches retenues, les
  avertissements de brouillons, les images non publiées faute de crédit et les images orphelines. Les images à
  régulariser suivent, dans leur propre rubrique.
- Guide : comment activer l'alerte e-mail d'échec de GitHub (Settings → Notifications → Actions → « Only notify for
  failed workflows »).

### 6. Dépôt en un geste : la fiche se remplit seule

**Bloc de métadonnées.** Le projet Claude « Exercices interactifs » va inclure, dans chaque fichier HTML qu'il produit,
un bloc invisible :

```html
<script type="application/json" id="fiche-industrie-education">{ … }</script>
```

Champs du bloc, format 1 :

| Champ | Contenu |
|---|---|
| format | 1 |
| type | annale ou exercice |
| id | identifiant neutre, minuscules, sans accents, tirets |
| titre, presentation | textes de la fiche (70 et 300 caractères au plus) |
| publics, theme, notions | identifiants des listes du site |
| notions_proposees | notions absentes de la liste : [{"id", "nom"}] |
| duree_min | entier |
| niveau | exercices seulement : 1 à 3 |
| origine | {diplome, epreuve, session} (annales) |
| source | {editeur, url, licence, reference_autorisation} |
| requetes | 3 à 5 requêtes d'élèves (référencement) |
| pistes_image | 2 ou 3 pistes d'illustration (texte) |

Documente ce format dans TRAME.md (§ 11) et dans production/FICHE-INTEGREE.md. Ce dernier fichier est la référence pour
le projet Claude.

**Dépôt.**

- Dans /admin/, une rubrique « Dépôt rapide » permet de déposer 1 à 10 fichiers HTML en un seul enregistrement, sans
  rien saisir. Choisis le moyen le plus fluide que permet Sveltia (dossier de la médiathèque, liste de fichiers…) et
  justifie-le.
- Le dépôt reste possible en repli par l'interface web de GitHub, dans le même dossier.

**Import.** outils/importer.py est appelé par le workflow de publication, dans la même exécution, avant la construction.
Pour chaque fichier déposé :

1. Contrôles de outils/annale.py.
2. Lecture du bloc de métadonnées, s'il existe.
3. Sinon, extraction déterministe du fichier :
   - titre (h1) et présentation (premier paragraphe de l'accueil) ;
   - durée, nombre de parties, de questions et de tracés, lus dans la configuration du gabarit ;
   - publics, thème, notions et source laissés vides, signalés « à compléter ».
4. Création de la fiche (annales/<id>.json ou fiche de contenu pour un exercice), toujours au statut brouillon. Le
   fichier est rangé à sa place définitive.
5. Notions : seuls les identifiants connus sont repris. Les autres vont dans notions_proposees et sont listés dans le
   résumé, sans création automatique.
6. Contrôle 20/20 en avertissement.

Puis :

- Un seul commit du workflow pour tout le lot de fichiers, avec un message en français (« Import : 3 fiches créées en
  brouillon »).
- Règle les permissions du workflow et une file d'attente (concurrency), pour que deux exécutions ne se marchent pas
  dessus.
- Un fichier en échec n'empêche pas l'import des autres.

**Nouvelle version d'une fiche existante (même id)** :

- la version en ligne reste en ligne ;
- la nouvelle version attend la relecture ;
- dans /admin/, la fiche indique « Nouvelle version à relire », avec une case « Valider la nouvelle version ». Une
  fois la case cochée, l'enregistrement remplace l'ancien fichier ; l'ancien est supprimé.

Le nouveau fichier n'est jamais publié avant cette validation. Choisis la façon de ranger les deux fichiers et
documente-la.

**Récupérer un brouillon pour le tester.** Depuis la fiche dans /admin/, un lien « Télécharger pour tester » récupère
le fichier et l'ouvre en local sur ordinateur. Si un fichier brut est servi en texte, fournis une archive (artefact de
l'Action) ou un autre moyen fiable, et explique-le dans le guide.

### 7. Documentation

- GUIDE-BACK-OFFICE.md :
  - dépôt rapide (1 à 10 fichiers) ;
  - bandeau d'état ;
  - « À corriger » ;
  - télécharger un brouillon ;
  - valider une nouvelle version ;
  - crédit de l'image, ou case de risque, et images à régulariser ;
  - alerte e-mail.
- CLAUDE.md : règle « Images » révisée. L'import ne pose jamais relu.
- TRAME.md :
  - § 7 : ligne « 1e » ;
  - § 9 : rubriques de /admin/ ;
  - § 10 : crédits et case de risque ;
  - § 13 ou § 14 : bibliothèque d'images libres (à venir) ;
  - § 11 : bloc de métadonnées, import, nouvelle version.
- NOTE-DE-LIVRAISON.md du lot 1e : fait, testé, écarts, et une recette pour Sébastien. Écarts des lots précédents en
  annexe.

La recette comprend au minimum :

1. Déposer en un enregistrement 3 fichiers : la copie de test de 2,9 Mo, un fichier sans bloc de métadonnées, un
   fichier volontairement invalide.
2. Vérifier les 3 résultats, le bandeau et la rubrique « À corriger ».
3. Passer une fiche importée à « Relu » sans source : la fiche est retenue, le reste du site part en ligne.
4. Télécharger un brouillon et le tester.
5. Déposer une nouvelle version d'une annale en ligne, vérifier que l'ancienne reste visible, puis valider.
6. Images :
   - ajouter une image avec son crédit ;
   - ajouter une image sans crédit, case cochée : elle s'affiche et figure dans « Images à régulariser » ;
   - ajouter une image sans crédit ni case cochée : la fiche s'affiche avec le bandeau typographique, et l'image est
     signalée dans « À corriger ».

## Tests à ajouter ou adapter

- Fiche relue sans source, notion inconnue, annale relue à moins de 20/20 : la fiche est retenue, le site se construit,
  aucun lien cassé, toutes les erreurs sont listées.
- Les trois cas d'image (crédit complet, case cochée, ni l'un ni l'autre) : publication ou non de l'image, présence
  sur /credits/, signalement attendu. La fiche est publiée dans les trois cas.
- Erreur de code simulée : la publication s'arrête.
- Fiche en ligne devenue invalide : retirée et signalée.
- Brouillon invalide : avertissement seulement. Aucun test « publié » ne porte sur un brouillon.
- Configuration de /admin/ : champs obligatoires de la source ; champs d'image facultatifs et case de risque décochée
  par défaut ; listes fermées identiques à la construction ; rubrique « Crédits » absente ; rubrique « Dépôt rapide »
  présente.
- Crédits : /credits/ construit à partir des fiches, sans les images à régulariser ; image orpheline signalée.
- Import :
  - fichier avec bloc : fiche complète en brouillon, champs identiques au bloc ;
  - fichier sans bloc : titre, présentation et durée extraits, le reste marqué « à compléter » ;
  - fichier invalide : ignoré, signalé, les autres importés ;
  - notion inconnue : proposée, non créée ;
  - nouvelle version : l'ancienne reste publiée jusqu'à la validation ;
  - l'import ne pose jamais relu.
- Bandeau d'état : affichage des trois états à partir d'un fichier d'état et d'une réponse d'API simulés, sans aucune
  requête réelle dans les tests.
- Tous les tests existants restent verts, en particulier : aucune requête tierce hors /admin/, poids de l'accueil, un
  seul h1.

## Hors périmètre

- Tout appel à un modèle d'IA, toute clé d'API, toute conversion de Word ou de PDF.
- Toute modification de l'intérieur d'un fichier autonome. L'import lit le fichier sans le réécrire.
- Le gabarit d'exercice lui-même, prévu au lot 2.
- La bibliothèque d'images libres de droits à crédits pré-remplis : seulement notée dans TRAME.
- La reprise des 37 dépôts et le référencement (lot 1).
- Toute nouvelle dépendance non justifiée dans la note.

## Fin de session

Tests verts (npm test), note de livraison à jour, pull request ouverte. Ensuite, arrête-toi.
