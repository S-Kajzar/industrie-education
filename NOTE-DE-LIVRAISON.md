# Note de livraison — lot 1e : publication fiable et dépôt en un geste

Branche `claude/gifted-mccarthy-1rs5w8`, repartie de `main` (`2d3949b`, après le lot 1d et ses correctifs, PR n° 6
et n° 7). Prompt : `prompts/LOT-1E.md`. `npm test` : **343 tests, tous verts** (environ 2 minutes, contrôle 20/20 compris, sans réseau).

**Aucune nouvelle dépendance** dans `package.json` ni `requirements.txt`. Un module déjà installé avec
`@sveltia/cms` est désormais servi par le site : **Immutable.js** 5.2.1 (MIT). Sveltia le charge depuis unpkg.com
dès qu'un champ personnalisé s'affiche (« Tester le fichier ») ; comme la translittération et exifr au lot 1d, la
table d'import le sert depuis `/admin/modules/`, avec sa licence.

## Point de départ

Le 27/11, `main` était encore bloqué par la fiche d'essai `test-abc` : relue, avec une présentation de 13 caractères,
elle faisait échouer un test de page (« description de plus de 20 caractères ») et tout le site restait figé. Avec ce
lot, la même fiche est **retenue** : elle n'est pas publiée, elle est listée « À corriger » avec le champ et la
correction, et tout le reste part en ligne. L'image d'essai `medias/cartes/toyota-rav4-trail-2023-1.jpg`, que plus
aucune fiche ne cite, est signalée « image orpheline ».

## Fait

1. **Une fiche retenue plutôt qu'un site bloqué (option A)**, `outils/construire.py` :
   - chaque fiche est contrôlée **en entier** : toutes ses erreurs sont notées, chacune avec le **nom du champ dans
     /admin/** et la **correction en une phrase** (classe `Controle`, tables `CHAMPS_ANNALE` et `CHAMPS_CONTENU`) ;
   - une fiche « relu » fautive est **retenue** : pas de page, absente du sitemap, de l'accueil, des listes, de « Pour
     réviser », de la une et du catalogue, aucun lien vers elle ; une collection dont `collection.json` est invalide
     est retenue avec ses contenus ;
   - une fiche **déjà en ligne** qui devient invalide est retirée et signalée « Retirée du site » : la construction
     compare avec l'état de la version en ligne (`--precedent`, que l'Action télécharge) ;
   - une **erreur de structure ou de code** arrête toujours la construction : `site.json`, `catalogue/`, gabarit,
     programme (le résumé dit alors « Publication arrêtée », à transmettre à une session Claude Code) ;
   - classement complet ci-dessous (« Erreurs de contenu, erreurs de code »).
2. **Contrôles dès la saisie (option B)**, `admin/config.yml` :
   - source d'une annale **obligatoire dès la création** : éditeur, adresse `https://…` (motif), licence ;
   - titre d'annale de 70 caractères au plus, présentation de 20 à 300, description de contenu de 20 au moins : motifs
     avec un message en français qui dit quoi faire ;
   - image : texte alternatif et crédit facultatifs, case de risque.
3. **Crédit saisi avec l'image (option B et décisions du 27/11)** :
   - chaque champ image (cartes des contenus et annales, planches de l'accueil, des thèmes, de Labo et Maquettes) est
     un objet `fichier`, `alt`, `licence`, `source`, `auteur`, `reference_autorisation`, `risque_accepte` ;
   - trois cas à la construction (classe `Images`), conformes au tableau du prompt ; une licence hors liste n'est
     jamais publiée, même case cochée ; une image introuvable ou illisible n'est pas publiée ; **une image ne retient
     jamais sa fiche** ;
   - `/credits/` est produit à partir des fiches (une entrée par fichier, avec ses usages), sans les images à
     régulariser ;
   - **`medias/CREDITS.json` supprimé** (voir « Choix ») ; rubrique « Images et crédits » retirée de /admin/ ;
   - **image orpheline** (téléversée, citée par aucune fiche, brouillons compris) signalée, sans rien bloquer.
4. **Un brouillon ne bloque jamais (option C)** : un brouillon passe les mêmes contrôles qu'une fiche publiée, mais ce
   ne sont que des **avertissements** ; une fiche **illisible** (JSON invalide) est ignorée et signalée, quel que
   soit son statut. Le contrôle 20/20 d'un brouillon est un avertissement. Aucun test ne traite plus un brouillon
   comme s'il était publié.
5. **Échec visible tout de suite (option E)** :
   - **bandeau d'état** en haut de /admin/ (`admin/admin.js`, `admin/admin.css`) : « Publication en cours », « En
     ligne depuis hh:mm » ou « Échec : voir le détail » ; nombre de fiches retenues, d'images à régulariser, de
     nouvelles versions à relire et des autres points, chacun relié à sa liste avec les corrections ; bouton
     « Actualiser » ;
   - sources : `_site/admin/etat.json`, écrit par la construction, et l'**API publique de GitHub, sans jeton** (la
     dernière exécution de « Publier le site » sur `main`, hors exécutions annulées par la file d'attente) ;
     interrogée au chargement, au retour sur l'onglet, 20 secondes après un enregistrement (événement `postSave` de
     Sveltia) et sur « Actualiser », au plus une fois toutes les 20 secondes, jamais en continu ;
   - **résumé de publication** (`--resume`) : il commence par « À corriger » (fiches retenues, avertissements des
     brouillons et des nouvelles versions, images non publiées, images orphelines, fichiers non importés, notions
     proposées, autres), puis « Images à régulariser », le rapport d'import et le tableau de bord éditorial ;
   - guide : alerte e-mail d'échec de GitHub.
6. **Dépôt en un geste** :
   - rubrique **Dépôt rapide** : 1 à 10 fichiers HTML en un enregistrement, sans rien saisir (voir « Choix ») ;
   - **`outils/importer.py`**, lancé par l'Action avant la construction : contrôles de `outils/annale.py`, bloc de
     métadonnées ou extraction déterministe, fiche **toujours en brouillon**, fichier rangé dans
     `medias/depots/<id>.html` sans être modifié, notions inconnues dans `notions_proposees`, un seul commit
     (« Import : 3 fiches créées en brouillon »), un fichier en échec n'empêche pas les autres ; les fiches créées sont
     alignées sur le format du back-office (`node outils/format-donnees.js --fiches`) ;
   - **nouvelle version** d'une fiche existante (même identifiant) : rangée dans `medias/a-relire/<id>.html`, champ
     caché `nouvelle_version` ; la version en ligne reste en ligne ; la case « Valider la nouvelle version » cochée et
     enregistrée, l'import suivant remplace l'ancien fichier (même chemin) et supprime le nouveau de `a-relire/` ;
   - **« Télécharger pour tester »** dans chaque fiche (voir « Choix ») ;
   - format du bloc documenté dans **`production/FICHE-INTEGREE.md`** (référence du projet Claude) et TRAME § 11.
7. **Workflow** `.github/workflows/publier.yml` : permission `contents: write` (et rien d'autre) pour le commit de
   l'import ; file d'attente `concurrency` (une publication à la fois, aucune interrompue) ; chaque exécution travaille
   sur la **dernière version de `main`** ; étapes : import, état de la version en ligne, chaîne (20/20 puis
   construction), tests, mise en ligne. La double construction de l'ancien workflow (écart n° 15 du lot 1c) disparaît.
8. **`outils/annale.py`** : un fichier déposé seul ne doit contenir **aucun lien vers une page absente** (adresse
   relative ou chemin absolu) et **chaque ancre** `#…` doit viser un identifiant du fichier. Sans ce contrôle, un lien
   cassé dans une annale faisait échouer le test des liens et bloquait tout le site.
9. **Tests indépendants du contenu réel** : le test de l'annale de référence porte sur un site d'essai construit avec
   une fiche, un catalogue et un contenu lié **figés** ; un choix fait dans /admin/ (`afficher_origine`, filières,
   libellé d'une notion) ne peut plus faire échouer un test. Une filière inactive visée par une page publiée est
   signalée par la construction (autrefois un test bloquant). `outils/annale.py` est testé sur des fiches d'essai.
10. **Documentation** : `CLAUDE.md` (règle « Images », import, commandes, checklist), `TRAME.md` (§ 2, 4, 5, 7, 9,
    10, 11, 13), `README.md`, `GUIDE-BACK-OFFICE.md` (dépôt rapide, test d'un brouillon, nouvelle version, crédit et
    case de risque, bandeau, « À corriger », alerte e-mail), `prompts/LOT-1E.md`.

## L'enchaînement de la publication

Le plus simple trouvé, sans construction candidate :

1. **Import** (`outils/importer.py --commit`) : fiches créées en brouillon, nouvelles versions rangées ou validées,
   un commit poussé sur `main`. Un commit fait avec le jeton de l'Action ne relance pas l'Action : l'import est
   construit et publié **dans la même exécution**.
2. **État en ligne** : l'Action télécharge `admin/etat.json` de la préproduction (pour repérer une fiche « retirée »).
3. **Contrôle 20/20** (`outils/verifier-annales.js`, code commun avec le test : `outils/annale-parfaite.js`) : chaque
   fichier d'annale du dépôt est ouvert **tel quel** dans Chromium, une copie entièrement juste est remplie dans les
   deux modes. Résultat dans `.cache/verifications.json`. Ce contrôle n'échoue jamais pour une annale ; seule une
   panne du navigateur l'arrête.
4. **Construction** (`outils/construire.py --verifications …`) : une annale **relue** sous 20/20 est retenue ; un
   brouillon ou une nouvelle version reçoit un avertissement. Les étapes 3 et 4 forment `outils/chaine.js`, que
   `npm test` lance aussi.
5. **Tests** : le test « annale parfaite » vérifie les annales **publiées**, sur leur page enveloppée. S'il échoue,
   c'est l'enveloppe du site qui casse une annale : erreur de code.

Une construction seule (`python3 outils/construire.py`) n'a pas le résultat du 20/20 : elle publie l'annale relue,
et c'est la chaîne qui l'exclut (testé).

## Erreurs de contenu, erreurs de code

| Contrôle | Catégorie | Effet |
|---|---|---|
| Fiche illisible (JSON invalide, fichier `contenu.json` manquant) | contenu | ignorée, signalée (quel que soit le statut) |
| Identifiant invalide, différent du nom du fichier, réservé, en double | contenu | fiche retenue (la seconde, pour un doublon) |
| Titre manquant ; présentation (annale) ou description (contenu) manquante, de moins de 20 caractères ; présentation de plus de 300 | contenu | fiche retenue |
| Type, niveau, durée, filière, thème, notion inconnus ou invalides ; statut inconnu (traité comme brouillon) | contenu | fiche retenue |
| Source d'annale absente ou invalide (éditeur, adresse, licence, référence d'autorisation) | contenu | fiche retenue |
| Fichier autonome : introuvable, plus de 5 Mo, pas en UTF-8, document incomplet, ressource extérieure, `<base>`, lien vers une page absente, ancre sans cible, enveloppe impossible ; contenu natif avec `<html>` | contenu | fiche retenue |
| Annale relue sous 20/20 | contenu | fiche retenue |
| `collection.json` invalide, nom de collection réservé ou invalide | contenu | collection retenue avec ses contenus |
| Image sans crédit complet ni case, licence hors liste, image introuvable ou illisible | image | image non publiée, fiche publiée |
| Image sans crédit, case cochée | image | image publiée, « à régulariser » |
| Contenu « à la une » non publié, « ordre » d'une collection qui cite un inconnu, filière inactive visée | alerte | signalé, sans effet sur la publication |
| Fichier déposé refusé à l'import, notion proposée, image orpheline | alerte | signalé |
| `site.json` (base, origine, titres d'accueil, Umami, `indexable` sans mentions légales), `catalogue/` (thèmes, publics, notions, à venir, à la une illisible) | structure | construction arrêtée |
| Gabarit, programme, paquet du back-office absent | code | construction arrêtée |
| Test de page, de lien, de requêtes, de poids, d'enveloppe | code | publication arrêtée |

## Règles que Sveltia ne sait pas exiger, contrôlées par la construction

- La **référence d'autorisation** quand la licence est « autorisation écrite » (source d'une annale, crédit d'une
  image) : Sveltia n'a pas de règle conditionnelle.
- Le **crédit complet ou la case cochée** d'une image (même raison).
- Une **notion inconnue** (fiche importée ou modifiée sur GitHub ; dans /admin/, les notions se choisissent dans la
  liste).
- L'**identifiant unique sur tout le site** et égal au nom du fichier de la fiche.
- Une licence d'image ou de source **hors liste** (fichier modifié sur GitHub).
- Le **fichier autonome** (ressources extérieures, liens, ancres, structure) et le **20/20**.
- L'existence d'une **image** ou d'un **fichier HTML** cité, d'un contenu **à la une**.
- Le **titre de 70 caractères au plus** n'est exigé que dans /admin/ (motif), pas par la construction.

## Choix faits pendant le lot

- **`medias/CREDITS.json` supprimé**, plutôt que produit par la construction : il était vide (`[]`), la migration
  n'avait donc rien à reporter dans les fiches ; un fichier produit et non versionné n'aurait servi à personne, la
  page `/credits/`, le résumé et `etat.json` portant déjà l'information.
- **Dépôt rapide = une collection d'entrées** (`medias/import/`, une entrée par dépôt, champ fichier
  `multiple: true`, 1 à 10) : c'est le seul moyen de Sveltia qui téléverse plusieurs fichiers **en un seul
  enregistrement**, depuis le formulaire habituel, sur téléphone aussi. Chaque dépôt crée une **nouvelle** entrée :
  deux dépôts successifs ne se marchent pas dessus ; l'import supprime l'entrée. Sveltia envoie un fichier lourd dans
  un commit à part (lot 1d) : l'import traite les fichiers présents dans `medias/import/`, quelle que soit l'entrée.
- **Nouvelle version rangée à part**, dans `medias/a-relire/<id>.html` : jamais lue par la construction, donc jamais
  publiée ; à la validation, son contenu remplace l'ancien fichier **au même chemin** (l'adresse ne change pas).
- **« Télécharger pour tester »** : un champ personnalisé (`widget: telecharger`) affiche le lien dans la fiche. Le
  fichier est récupéré par l'API publique de GitHub (`/contents/…`, `Accept: application/vnd.github.raw`, sans jeton)
  et **enregistré sur l'ordinateur** sous `<id>.html`, en HTML. Il n'est jamais ouvert dans l'onglet de /admin/ : il
  y aurait accès au jeton de Sveltia. Ni archive ni artefact d'Action nécessaires.
- **Case « Valider la nouvelle version »** rendue par ce même champ, seulement quand une nouvelle version attend :
  une case ordinaire de Sveltia écrivait `"valider_nouvelle_version": false` dans chaque fiche à chaque
  enregistrement (essai). Décochée, rien n'est écrit.
- **Fichier d'état public** : `/admin/etat.json` (hors site public, `noindex`, interdit dans `robots.txt`) contient
  des chemins, des titres et des messages, tous déjà lisibles dans le dépôt public ; aucune donnée personnelle.

## Testé

| Exigence | Test |
|---|---|
| Fiche relue sans source, notion inconnue (avec les identifiants proches), annale relue sous 20/20, identifiant en double ou différent du dossier, type ou public inconnu, collection invalide, document sans `<body>`, description trop courte, JSON illisible : fiche retenue, site construit, ni page, ni sitemap, ni lien ; toutes les erreurs listées avec champ et correction | `tests/construction.spec.js`, `tests/coherence.spec.js`, `tests/annale-parfaite.spec.js` |
| Aucun lien cassé, sur le site réel (fiche `test-abc` retenue) | `tests/liens.spec.js` (suite complète) |
| Trois cas d'image (crédit complet, case cochée, ni l'un ni l'autre), licence hors liste, autorisation sans référence, image introuvable, alt vide = décorative : publication ou non de l'image, `/credits/`, signalement ; fiche publiée dans tous les cas | `tests/images-annales.spec.js` |
| `/credits/` construit à partir des fiches, sans les images à régulariser ; image orpheline signalée | `tests/images-annales.spec.js` |
| Erreur de code simulée (gabarit cassé) : construction arrêtée, rien n'est publié, « Publication arrêtée » dans le résumé | `tests/construction.spec.js` |
| Fiche en ligne devenue invalide : retirée et signalée comme telle | `tests/construction.spec.js` |
| Brouillon invalide : avertissement seulement ; brouillon sous 20/20 : avertissement | `tests/coherence.spec.js`, `tests/annale-parfaite.spec.js` |
| Résumé : « À corriger » en tête, puis images à régulariser, tableau de bord ; fiche illisible signalée sans arrêter | `tests/coherence.spec.js` |
| Configuration de /admin/ : source obligatoire ; champs d'image facultatifs, case de risque décochée par défaut, même libellé et même aide partout ; listes fermées identiques à la construction ; rubrique « Crédits » absente ; « Dépôt rapide » présente ; champs techniques cachés | `tests/admin.spec.js` |
| /admin/ en mode dépôt local : chaque fiche s'ouvre (dont « Dépôt rapide »), un enregistrement ne change que le champ modifié, dépôt d'une annale sur téléphone avec la source obligatoire ; seul hôte extérieur jsDelivr, plus l'API de GitHub pour le bandeau, sans jeton | `tests/admin.spec.js` |
| Bandeau : trois états à partir d'un fichier d'état et d'une réponse d'API simulés, API indisponible, comptes reliés aux listes avec corrections, une seule requête au chargement, aucun en-tête `Authorization`, interface de Sveltia sous le bandeau | `tests/bandeau.spec.js` |
| « Télécharger pour tester » (fichier et nouvelle version) ; case de validation : décochée, rien n'est écrit ; cochée, `true` | `tests/bandeau.spec.js` |
| Import : avec bloc (fiche identique au bloc), sans bloc (titre, présentation, durée extraits de la vraie annale ; reste à compléter), fichier invalide (laissé, signalé, les autres importés), notion inconnue (proposée, non créée), exercice dans sa collection, sans collection (refusé), jamais « relu », nouvelle version (l'ancienne reste publiée jusqu'à la validation, puis remplacée), un seul commit poussé (`--commit`, dépôt Git d'essai) | `tests/import.spec.js` |
| Fichiers de données au format du back-office, fiches importées comprises | `tests/admin.spec.js`, `tests/import.spec.js` |
| Tous les tests des lots précédents, dont aucune requête tierce hors /admin/, poids de l'accueil, un seul `h1` | suite complète |

**Non testé ici** (pas d'accès à GitHub depuis les tests) : un vrai enregistrement par /admin/, un vrai dépôt rapide
suivi de l'import et du commit par l'Action, la permission d'écriture de l'Action, l'API réelle de GitHub (le
bandeau et le téléchargement sont testés avec des réponses simulées), l'alerte e-mail. C'est la recette.

## Recette à faire par Sébastien

Sur <https://s-kajzar.github.io/industrie-education/admin/>, une fois la pull request fusionnée et publiée (la
première publication retient `test-abc`, voir plus haut) :

1. **Dépôt de 3 fichiers en un enregistrement** : **Dépôt rapide** → **Nouveau** → choisir ensemble la copie de test
   de 2,9 Mo, un fichier sans bloc de métadonnées (par exemple une annale déjà produite) et un fichier volontairement
   invalide (une copie dans laquelle on ajoute `<script src="https://exemple.com/x.js"></script>` dans le `<head>`)
   → **Enregistrer**.
2. **Vérifier les 3 résultats** (environ 3 minutes) : deux fiches en brouillon dans **Annales** ; le fichier invalide
   dans **Ressources → Dépôt rapide : fichiers en attente** ; le bandeau (« Publication en cours », puis « En ligne
   depuis… ») et **À corriger** (fichier refusé avec sa raison, champs à compléter des brouillons). Sur GitHub, un
   seul commit « Import : 2 fiches créées en brouillon ». Supprimer ensuite le fichier invalide.
3. **Fiche retenue** : /admin/ refuse désormais d'enregistrer une annale sans source ; pour l'essai, passer par
   GitHub : ouvrir `annales/<id>.json` de la fiche importée **sans bloc** (elle n'a pas de source) → crayon
   (**Edit**) → remplacer `"brouillon"` par `"relu"` → **Commit changes**. La fiche est **retenue** (non publiée,
   listée dans le bandeau avec « Source et licence du sujet »), et le reste du site part en ligne.
4. **Télécharger un brouillon et le tester** : dans la fiche, **Tester le fichier** → **Télécharger pour tester** ;
   ouvrir le fichier téléchargé, le parcourir en entraînement.
5. **Nouvelle version** : déposer dans **Dépôt rapide** une nouvelle version de l'annale en ligne (même identifiant) ;
   vérifier que l'ancienne reste visible sur le site et que la fiche affiche « Nouvelle version à relire » ; la
   télécharger, puis cocher **Valider la nouvelle version** et enregistrer ; vérifier la page après publication.
6. **Images** :
   - ajouter une image avec son crédit : publiée, citée sur la page Crédits ;
   - ajouter une image sans crédit, case cochée : elle s'affiche et figure dans « Images à régulariser » ;
   - ajouter une image sans crédit ni case cochée : la fiche s'affiche avec le bandeau typographique, l'image est
     signalée dans « À corriger ».
7. **Alerte e-mail** : l'activer (guide, partie 8).
8. **Ménage** : supprimer la fiche `test-abc`, ses fichiers (`medias/depots/test-taille-3mo.html`) et l'image
   orpheline `medias/cartes/toyota-rav4-trail-2023-1.jpg`, ainsi que les fiches d'essai de la recette.

Pendant la recette, noter dans l'onglet Réseau les hôtes contactés : par rapport au lot 1d, seul `api.github.com`
s'ajoute pour le bandeau et le téléchargement, **sans en-tête `Authorization`**.

## À faire par Sébastien

1. **Recette** ci-dessus.
2. **Transmettre `production/FICHE-INTEGREE.md` au projet Claude « Exercices interactifs »**, pour qu'il ajoute le
   bloc de métadonnées à chaque fichier produit.
3. Si l'import échoue avec « l'import n'a pas pu être poussé sur main » : vérifier que l'Action peut écrire
   (*Settings* → *Actions* → *General* → *Workflow permissions* : le workflow demande lui-même `contents: write`, mais
   une règle de l'organisation ou une protection de `main` peut l'en empêcher).
4. **Trancher** les écarts ci-dessous et ceux des annexes.

## Écarts avec TRAME, DESIGN, CLAUDE.md et le prompt

1. **Champ `collection` ajouté au bloc de métadonnées** (exercices) : le format 1 ne dit pas où ranger un exercice ;
   sans collection connue, le fichier est refusé et signalé. **À valider.**
2. **Présentation (annale) ou description (contenu) : 20 caractères au moins**, présentation de 300 au plus :
   devenues des règles de contenu (fiche retenue), car le test de page « description de plus de 20 caractères »
   bloquait toute la publication. Le titre de 70 caractères au plus n'est exigé que dans /admin/. **À valider.**
3. **Crédit complet** = licence de la liste fermée, plus la référence pour une autorisation écrite ; la source et
   l'auteur sont affichés s'ils sont donnés, mais non exigés (comme l'ancien `CREDITS.json`). Le crédit perd le titre
   de l'œuvre, la date, l'usage et la case « décorative » de l'ancien registre (le texte alternatif vide la
   remplace) ; `/credits/` affiche les usages à la place du titre. **À valider.**
4. **Licence hors liste** : l'image n'est pas publiée, même case cochée (la case ne couvre que l'absence de crédit).
5. **Statut inconnu** (fichier modifié sur GitHub) : la fiche est traitée comme un brouillon et signalée.
6. **Liste des annales** : pas de mention « nouvelle version à relire » dans le résumé de la liste (Sveltia refuse un
   résumé qui cite un champ caché) ; la fiche, le bandeau et le résumé de publication la signalent.
7. **Bandeau** : fixé en haut de /admin/, il décale l'interface de Sveltia par une règle CSS sur une classe interne
   (`.sui.app-shell`). À revérifier à chaque mise à jour de Sveltia (le test « l'interface de Sveltia commence sous le
   bandeau » le surveille).
8. **Requêtes vers l'API de GitHub** : bandeau et téléchargement partagent la limite de 60 requêtes par heure et par
   adresse IP, sans jeton. Usage normal : quelques requêtes par heure.
9. **Exécutions en file d'attente** : GitHub ne garde qu'une exécution en attente ; les intermédiaires sont annulées
   (« cancelled »), sans perte, puisque chaque exécution construit la dernière version de `main`. Le bandeau les saute.
10. **Première publication du lot 1e** : la version en ligne n'a pas encore d'`etat.json` ; aucune fiche ne peut donc
    être marquée « retirée » cette fois-là.
11. **Annale de référence** : ses tests portent désormais sur une copie figée de sa fiche ; le fichier HTML reste celui
    du dépôt. Une nouvelle version validée qui changerait le gabarit (documents, tracés, impression) pourrait faire
    échouer ces tests : ce serait alors à traiter comme une évolution du gabarit (lot 2).
12. **Tests de page encore bloquants** : un contenu imprévu qui casserait une page malgré les contrôles (par exemple
    une fiche d'annale trop haute à 360 px avec un très grand nombre de notions) arrête la publication comme une
    erreur de code. Les cas connus (description, liens, ressources extérieures, 20/20, crédits) sont désormais des
    erreurs de contenu.
13. **Requêtes d'élèves** (`requetes`) : stockées dans les fiches et ajoutées au texte de recherche du catalogue ;
    `pistes_image` est seulement affiché dans /admin/.

---

# Annexe A : écarts du lot 1d encore ouverts

Ceux du lot 1d (NOTE de la PR n° 6), toujours ouverts. Le n° 15 de l'annexe B (double construction dans l'Action) est résolu par le lot 1e.

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

# Annexe B : écarts du lot 1c encore ouverts

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

# Annexe C : écarts du lot 1b encore ouverts

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

# Annexe D : écarts du lot 0 encore ouverts (TRAME § 13)

- **n° 2 Liens d'origine des contenus repris** : `cadre-velo.html` cite `cours-statique-analytique.html`, cassé
  tant que le cours n'est pas repris (exception de `tests/liens-connus.json`). **À trancher pour le lot 1.**
- **n° 3 Hauteur du titre d'accueil** : hauteur du plus long des six titres, sans saut. **À choisir.**
- **n° 5 Champs ajoutés au lot 0** : `origine`, `hebergeur`, `editeur` en objet (désormais facultatif),
  `court`, `niveau` et `duree_min` facultatifs. **À valider.**
