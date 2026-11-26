# Guide du back-office

Ce guide explique, pas à pas, comment gérer le site depuis un navigateur, sans toucher au code : déposer une
annale ou un nouvel exercice, ajouter une image de carte ou une planche, et déclarer les images.

Le back-office est **Pages CMS**, un outil libre qui modifie directement les fichiers du dépôt GitHub
`S-Kajzar/industrie-education`. Chaque fois que vous enregistrez, il crée un *commit* sur la branche `main`. GitHub
reconstruit alors le site, lance les tests et, s'ils passent, publie la nouvelle version : **comptez environ
5 minutes** entre l'enregistrement et la mise en ligne.

L'interface de Pages CMS est en anglais : les boutons cités ci-dessous (*Save*, *Upload*…) sont ceux de la version
2.1. Les noms des rubriques (Annales, Contenus, Accueil, Thèmes, Crédits, Réglages du site) et toutes les aides de
saisie sont en français : elles viennent du fichier `.pages.yml` du dépôt.

---

## 1. Installer Pages CMS sur ce seul dépôt et s'y connecter

À faire une seule fois.

1. Ouvrez <https://app.pagescms.org> et connectez-vous avec votre compte GitHub (*Sign in with GitHub*).
2. Pages CMS vous propose d'installer son application GitHub. Dans l'écran de GitHub qui s'ouvre :
   - choisissez votre compte `S-Kajzar` ;
   - cochez **Only select repositories** (seulement certains dépôts), puis sélectionnez **industrie-education**
     et lui seul ;
   - validez (*Install*).
3. De retour dans Pages CMS, ouvrez le dépôt `industrie-education`, branche `main`. Le menu de gauche affiche les
   rubriques **Annales, Contenus, Accueil, Thèmes, Crédits, Réglages du site**, puis les dossiers de médias
   (**Images de cartes, Planches d'illustration, Fichiers HTML déposés**).

Pour retirer plus tard l'accès : sur GitHub, *Settings* → *Applications* → *Installed GitHub Apps* → Pages CMS.

> Ne protégez pas la branche `main` par une règle « pull request obligatoire » : Pages CMS ne pourrait plus
> enregistrer.

---

## 2. Déposer une annale produite par le projet Claude

Vous avez un fichier HTML autonome livré par le projet Claude « Exercices interactifs » (un seul fichier `.html`,
images intégrées, 5 Mo au plus), que vous avez déjà testé en l'ouvrant dans votre navigateur.

1. **Rubrique Annales** → bouton d'ajout d'une entrée.
2. Remplissez la fiche :
   - **Identifiant** : il devient l'adresse de la page, `/annales/<identifiant>/`. Minuscules sans accent,
     chiffres et tirets, nom **neutre**, sans diplôme ni session (ex. : `levage-dechargement-sacs-linge`). Ne le
     changez plus une fois l'annale publiée.
   - **Titre** et **Présentation** : reprenez le titre et le chapeau du sujet (ils s'affichent dans la fiche
     au-dessus du sujet et servent de description pour les moteurs de recherche).
   - **Fichier HTML du sujet** : cliquez pour téléverser le fichier livré par le projet Claude. Il est rangé dans
     `medias/depots/` et publié tel quel, sans aucune modification.
   - **Image de la carte** (facultative) : voir la partie 3. Sans image, la carte garde son bandeau.
   - **Filières**, **Thème**, **Notions** (identifiants comme `statique`, `roulements` : ils relient l'annale aux
     cours et exercices des mêmes notions), **Durée conseillée** en minutes.
   - **Origine du sujet** (diplôme, épreuve, session) : pour votre classement. **Rien n'est affiché sur le site**
     tant que la case **Afficher l'origine sur le site** n'est pas cochée. Cochée, l'origine apparaît dans la
     fiche, le titre de la page et l'index des annales. Le fichier HTML, lui, reste toujours neutre.
   - **Statut** : laissez **Brouillon** tant que vous n'avez pas tout vérifié ; passez à **Relu** pour publier.
     Ne mettez « Relu » qu'après avoir vérifié les réponses attendues.
   - **Mis à jour le** : la date du jour. Les trois annales les plus récentes s'affichent sur l'accueil.
3. Enregistrez (*Save*). Avec le statut **Relu**, l'annale apparaît environ 5 minutes plus tard :
   - sur sa page `/annales/<identifiant>/` (fiche, puis le sujet) ;
   - dans l'index `/annales/` et la page de sa filière ;
   - dans le catalogue et le bloc Annales de l'accueil.

**Nouvel exercice (hors annale).** Même principe dans la rubrique **Contenus** : ouvrez la collection voulue (par
exemple *Statique*), ajoutez une entrée, remplissez la fiche (type, niveau, description…), téléversez le fichier
dans **Fichier HTML (nouveau contenu seulement)**, choisissez le statut, enregistrez. Le contenu est publié à
l'adresse `/<collection>/<identifiant>/`.

**Remplacer le fichier d'une annale** (nouvelle version livrée par le projet Claude) : ouvrez la fiche, téléversez
le nouveau fichier dans le champ **Fichier HTML du sujet**, enregistrez.

---

## 3. Ajouter ou changer l'image d'une carte, avec sa licence

Images acceptées : **domaine public**, **CC0**, **œuvre personnelle** (vos photos et dessins) ou **autorisation
écrite** du propriétaire. **Jamais d'image générée par IA**, ni d'image de banque sous licence, ni de copie
Gallica.

1. **Ouvrez la fiche** du contenu (rubrique **Contenus**, puis la collection) ou de l'annale (rubrique
   **Annales**).
2. Dans **Image de la carte** :
   - **Image** : téléversez le fichier (JPEG, PNG ou WebP). Il est rangé dans `medias/cartes/` et son nom est
     nettoyé (minuscules, sans accent).
   - **Texte alternatif** : une phrase qui décrit l'image pour qui ne la voit pas (ex. : « Cadre de VTT et ses
     liaisons »).
3. **Enregistrez** (*Save*). Notez le chemin de l'image, affiché dans la fiche (ex. :
   `medias/cartes/cadre-velo.jpg`).
4. **Déclarez l'image** dans la rubrique **Crédits** : ajoutez une entrée avec le **chemin** de l'image, son
   **titre**, son **auteur**, sa **date**, sa **source** (adresse de la page d'origine) et sa **licence**. Pour une
   autorisation écrite, renseignez aussi la **référence de l'autorisation** (qui, quand, par quel écrit).
   Enregistrez.

Si l'image n'est pas déclarée dans les Crédits, ou sous une licence hors liste, la publication s'arrête (voir la
partie 5) : faites les étapes 2 et 4 à la suite.

À la publication, l'image est recadrée au format de la carte (16/9, au centre) et allégée (40 Ko au plus). Pour
changer d'image, téléversez-en une autre dans la fiche et ajoutez son entrée dans les Crédits. Pour revenir au
bandeau, videz le champ **Image**.

---

## 4. Ajouter une planche d'illustration (accueil, thèmes)

Les planches sont des gravures techniques anciennes du domaine public ou sous CC0 : planches de l'Encyclopédie
(Wikimedia Commons), dessins de brevets américains anciens, collections en accès ouvert (Smithsonian…).

- **Planche de l'accueil** : rubrique **Accueil** → **Titres et planche de l'accueil** → **Planche de l'accueil,
  derrière le titre**. Elle s'affiche en filigrane dans la moitié droite du titre (en bandeau au-dessus du titre
  sur téléphone).
- **Planche d'un thème** : rubrique **Thèmes** → le thème voulu → **Planche d'illustration**. Elle s'affiche à droite
  du titre de la page du thème, et en vignette dans l'index des thèmes de l'accueil.

Téléversez le fichier (rangé dans `medias/illustrations/`), écrivez un texte alternatif, enregistrez, puis
déclarez la planche dans les **Crédits** comme pour une image de carte. Une planche purement décorative peut
garder un texte alternatif vide : cochez alors **Image décorative** dans son entrée des Crédits.

À la publication, la planche passe en niveaux de gris, contraste renforcé, papier ramené au blanc pur, et elle est
allégée (150 Ko au plus pour l'accueil, 60 Ko pour un thème).

---

## 5. Si la publication échoue

Le site en ligne ne change pas tant que la publication n'a pas réussi : rien n'est cassé, la version précédente
reste en place.

1. Sur GitHub, ouvrez le dépôt `S-Kajzar/industrie-education`, onglet **Actions**.
2. Cliquez sur la dernière exécution de **Publier le site** marquée d'une croix rouge, puis sur l'étape
   **Construire et tester** et enfin **Construire le site et lancer les tests**.
3. Le message commence par **« Construction arrêtée : »** et dit, en français, quel fichier pose problème et
   pourquoi.

| Message | Ce qu'il faut faire |
|---|---|
| « Image sans crédit : … » | Déclarer l'image dans la rubrique **Crédits** |
| « Licence non acceptée … » | Choisir une licence de la liste, ou retirer l'image |
| « Autorisation écrite sans référence … » | Renseigner la référence de l'autorisation dans les Crédits |
| « Texte alternatif manquant … » | Écrire le texte alternatif dans la fiche, ou déclarer l'image décorative |
| « Image introuvable : … » | Téléverser l'image, ou corriger le chemin dans la fiche |
| « … ligne N : ressource extérieure interdite … » | Le fichier HTML charge quelque chose depuis Internet : le faire corriger dans le projet Claude |
| « fichier trop lourd » | Le fichier dépasse 5 Mo : alléger les images dans le projet Claude |
| « Identifiant en double … » | Choisir un autre identifiant |

Si le message concerne les tests plutôt que la construction (« failed » dans la liste des tests), transmettez-le
tel quel dans une session Claude Code.

---

## 6. Rappel : le dépôt est public

Une annale, un contenu ou un fichier au statut **Brouillon** est **invisible sur le site**, mais il reste **lisible
sur GitHub** par n'importe qui, comme tout le dépôt. N'y déposez rien de confidentiel : pas de sujet sous embargo,
pas de copie d'élève, aucune donnée personnelle.

---

**Limite connue.** Le fichier HTML est envoyé en une seule requête par l'application hébergée de Pages CMS. Si un
fichier lourd (au-delà de 3 Mo environ) refuse de se téléverser, déposez-le directement sur GitHub dans le dossier
`medias/depots/` (*Add file* → *Upload files*), puis choisissez-le dans la fiche.
