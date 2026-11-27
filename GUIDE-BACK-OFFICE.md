# Guide du back-office

Ce guide explique, pas à pas, comment gérer le site depuis un navigateur, sur ordinateur ou sur téléphone, sans
toucher au code : déposer d'un coup des annales ou des exercices du projet Claude, les tester et les publier, ajouter
une image avec son crédit, gérer les notions et les réglages, suivre la publication et l'audience.

Le back-office est servi par le site lui-même, à l'adresse
**<https://s-kajzar.github.io/industrie-education/admin/>** (logiciel libre Sveltia CMS, en français). Il modifie
directement les fichiers du dépôt GitHub `S-Kajzar/industrie-education` : chaque enregistrement crée un *commit* sur
la branche `main`, puis GitHub importe les fichiers déposés, contrôle les annales, reconstruit le site, lance les
tests et publie la nouvelle version. Une erreur dans une fiche ne retient que cette fiche : tout le reste est publié,
et le bandeau en haut du back-office dit quoi corriger. Il n'y a ni serveur ni base de données à entretenir.

---

## Accès

### Créer le jeton d'accès (une fois, puis à chaque renouvellement)

Le back-office se connecte à GitHub avec un **jeton d'accès personnel**, limité à ce seul dépôt.

1. Sur GitHub, cliquez sur votre photo de profil (en haut à droite) → **Settings** → tout en bas à gauche,
   **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Remplissez :
   - **Token name** : `Back-office industrie.education` ;
   - **Expiration** : 90 jours (notez la date d'expiration dans votre agenda) ;
   - **Resource owner** : `S-Kajzar` ;
   - **Repository access** : **Only select repositories**, puis `industrie-education`, et lui seul ;
   - **Permissions** → **Repository permissions** → **Contents** : **Read and write** (la permission *Metadata* en
     lecture s'ajoute d'elle-même). Ne donnez aucune autre permission.
3. **Generate token**. Le jeton (`github_pat_…`) n'est affiché qu'une fois : copiez-le aussitôt dans votre
   **gestionnaire de mots de passe**.

### Se connecter

1. Ouvrez <https://s-kajzar.github.io/industrie-education/admin/> et **mettez-la en favori**.
2. **Se connecter avec un jeton d'accès** → collez le jeton → **Se connecter**.
3. Le navigateur garde la connexion jusqu'à ce que vous choisissiez **Se déconnecter** (menu du compte, en haut à
   droite).

**Sur téléphone ou tablette** : connecté sur l'ordinateur, ouvrez le menu du compte (en haut à droite) et choisissez
**Se connecter sur mobile** : un code QR s'affiche ; scannez-le avec le téléphone, qui se connecte avec les mêmes
réglages. Ce code QR donne l'accès au dépôt : ne le montrez à personne et n'en faites pas de capture. À défaut,
ouvrez l'adresse sur le téléphone et collez le jeton depuis votre gestionnaire de mots de passe.

### Renouveler ou révoquer le jeton

- **Renouveler** (GitHub prévient par courriel avant l'expiration) : *Fine-grained tokens* → le jeton →
  **Regenerate token** ; enregistrez le nouveau jeton dans le gestionnaire de mots de passe ; dans le back-office,
  **Se déconnecter**, puis reconnectez-vous avec le nouveau jeton.
- **Révoquer** (téléphone perdu, doute sur une fuite) : *Fine-grained tokens* → le jeton → **Delete**. Il ne sert
  plus à rien, immédiatement. Créez-en un autre.

### Après chaque enregistrement

Comptez **environ 3 minutes** avant que la préproduction soit à jour. Le **bandeau d'état**, en haut du
back-office, le dit sans aller sur GitHub (partie 8) :

- **Publication en cours** : GitHub importe, contrôle, construit et teste ;
- **En ligne depuis 14:41** : la dernière publication a réussi ;
- **Échec : voir le détail** : une erreur de code a arrêté la publication (partie 9).

Il indique aussi le nombre de **fiches retenues** et d'**images à régulariser** : un clic ouvre la liste, avec la
correction de chaque point. Depuis une fiche publiée, le bouton **Afficher sur le site en ligne** ouvre sa page.

---

## Les rubriques

Dans le menu de gauche (sur téléphone, le menu ☰), de la plus utilisée à la moins utilisée :

| Rubrique | Pour… |
|---|---|
| Dépôt rapide | déposer d'un coup 1 à 10 fichiers HTML du projet Claude : les fiches se créent seules, en brouillon |
| Annales | compléter, relire et publier une annale ; valider une nouvelle version |
| Contenus | toutes les collections en arborescence : ouvrez une collection, puis un contenu ; ou créez un exercice autonome dans une collection |
| Accueil | contenus à la une ; textes de Labo et Maquettes |
| Notions | ajouter une notion ou changer son libellé |
| Thèmes | nom, exemples et planche des cinq thèmes |
| Réglages du site | mentions légales, mesure d'audience, ouverture aux moteurs, titres et planche de l'accueil |

Il n'y a plus de rubrique « Images et crédits » : le crédit d'une image se saisit avec l'image, dans la fiche qui
l'utilise (partie 2). Chaque rubrique rappelle en tête ce qu'elle contient, et chaque champ délicat a une aide en
dessous. L'icône **Ressources** (en haut) montre les dossiers de médias : images de cartes, planches, fichiers HTML
déposés, fichiers du dépôt rapide en attente.

---

## 1. Déposer des fichiers du projet Claude (Dépôt rapide)

Vous avez un ou plusieurs fichiers HTML autonomes livrés par le projet Claude « Exercices interactifs » (un seul
fichier `.html` chacun, images intégrées, **5 Mo au plus**). Chaque fichier contient un bloc de métadonnées
invisible (`production/FICHE-INTEGREE.md`) qui remplit sa fiche.

1. **Dépôt rapide** → **Nouveau**.
2. **Parcourir** : choisissez de **1 à 10 fichiers** d'un coup. Rien d'autre à saisir.
3. **Enregistrer**.

Environ 3 minutes plus tard, chaque fichier a sa fiche, **en brouillon**, dans **Annales** (ou dans **Contenus**,
dans sa collection, pour un exercice). Le fichier est rangé dans `medias/depots/`, sans être modifié. Le bandeau
signale ce qui reste à compléter :

- fichier **avec bloc** : la fiche est complète ; restent l'image de la carte et votre relecture ;
- fichier **sans bloc** : le titre, la présentation et la durée sont lus dans le fichier ; filières, thème, notions
  et source sont **à compléter** ;
- **notions proposées** : une notion absente de la liste n'est jamais créée seule ; si elle convient, ajoutez-la dans
  **Notions**, choisissez-la dans la fiche, puis retirez-la de « Notions proposées » ;
- fichier **refusé** (ressource extérieure, document incomplet…) : il reste dans **Ressources → Dépôt rapide :
  fichiers en attente**, avec la raison dans « À corriger ». Faites corriger le fichier dans le projet Claude,
  supprimez l'ancien, déposez le nouveau. Les autres fichiers du même dépôt sont importés normalement.

L'import ne passe **jamais** une fiche en « Relu » : c'est votre décision, et la vôtre seulement.

**Sans le back-office** : sur GitHub, ouvrez le dossier `medias/import/` → **Add file** → **Upload files** →
déposez les fichiers → **Commit changes**. L'import est le même.

### Tester un brouillon : « Télécharger pour tester »

Un brouillon n'est jamais publié : on le teste en local.

1. Ouvrez la fiche (**Annales** → la fiche).
2. Champ **Tester le fichier** → **Télécharger pour tester** : le fichier est enregistré sur votre ordinateur
   (dossier Téléchargements), sous le nom `<identifiant>.html`.
3. Ouvrez-le (double-clic) : il s'affiche dans le navigateur, comme pour un élève, et fonctionne sans connexion.
   Faites-le en mode entraînement, avec la fiche de relecture du projet Claude à côté.

Le fichier n'est jamais ouvert dans l'onglet du back-office : un fichier ouvert là aurait accès à votre jeton.
Sur téléphone, le téléchargement fonctionne aussi, mais l'ouverture d'un fichier HTML téléchargé dépend du téléphone :
préférez l'ordinateur pour tester.

### Compléter et publier

1. Complétez la fiche : **Filières**, **Thème**, **Notions**, **Source et licence du sujet** (obligatoire dès la
   création : éditeur, adresse `https://` du document d'origine, licence ; pour une autorisation écrite, sa
   référence), et, si vous le souhaitez, l'**image de la carte** avec son crédit (partie 2).
2. Quand toutes les réponses sont vérifiées, passez le **Statut** à **Relu** et enregistrez.
3. Avant chaque publication, GitHub vérifie que chaque annale donne **20/20 quand toutes les réponses sont justes**,
   en entraînement et en examen. Une annale relue qui échoue est **retenue** (non publiée) et signalée, avec les
   questions en cause ; le reste du site est publié. Pour un brouillon, c'est un simple avertissement.

**Saisie à la main** (sans le dépôt rapide) : **Annales** → **Nouveau**, remplissez la fiche et téléversez le fichier
dans **Fichier HTML du sujet**. Pour un exercice : **Contenus** → la collection → **Créer une entrée**.

### Remplacer le fichier d'une annale : valider une nouvelle version

1. Déposez la nouvelle version dans **Dépôt rapide**, avec **le même identifiant** (le même `id` dans son bloc, ou
   le même nom de fichier sans bloc).
2. Elle ne remplace rien tout de suite : la fiche affiche **Nouvelle version à relire** (champ « Tester le
   fichier »), et la version en ligne **reste en ligne**. Le bandeau la compte aussi.
3. **Télécharger la nouvelle version pour tester**, testez-la.
4. Cochez **Valider la nouvelle version**, puis **Enregistrer**. À la publication suivante, la nouvelle version
   remplace l'ancienne, à la même adresse, et l'ancienne est supprimée.

---

## 2. Ta première image en 5 minutes

Images acceptées : **domaine public**, **CC0**, **œuvre personnelle** (vos photos et dessins) ou **autorisation
écrite** du propriétaire. **Jamais d'image générée par IA**, ni d'image de banque d'images, ni de copie Gallica. Le
back-office ne propose d'ailleurs aucune banque d'images.

**Minute 1 — trouver.** Sur <https://commons.wikimedia.org>, cherchez par exemple « Encyclopédie Diderot planche
forge », « patent drawing gear » ou le nom d'une machine (les « pistes d'illustration » de la fiche donnent des
idées). Autres sources sûres : les dessins de brevets américains anciens et <https://www.si.edu/openaccess>
(Smithsonian, filtre **CC0**). Sur la page du fichier, lisez la section **Licence** :

| Ce que dit la page | Licence à choisir |
|---|---|
| *Public domain*, *PD-old*, *PD-US*, *PD-Art* | Domaine public |
| *CC0*, *Creative Commons Zero* | CC0 |
| Votre propre photo ou dessin | Œuvre personnelle |
| Accord écrit du propriétaire (constructeur…) | Autorisation écrite, avec sa référence |
| *CC BY*, *CC BY-SA*, « tous droits réservés », rien d'indiqué | **Refusée** : cherchez une autre image |

**Minute 2 — télécharger.** Une taille moyenne (1 200 à 2 000 px de large), en JPEG ou PNG. Notez l'adresse de la
page d'origine et l'auteur.

**Minute 3 — téléverser.** Ouvrez la fiche du contenu ou de l'annale ; **Image de la carte** → **Ajouter** :
téléversez l'image (rangée dans `medias/cartes/`, nom nettoyé). Le **texte alternatif** est facultatif : une phrase
qui décrit l'image pour qui ne la voit pas ; laissé vide, l'image est traitée comme décorative, ce qui convient à une
image posée à côté de son titre.

**Minute 4 — créditer, au même endroit.** **Licence de l'image**, **Source** (adresse de la page d'origine),
**Auteur**, et pour une autorisation écrite sa **Référence**. **Enregistrer**.

**Minute 5 — vérifier.** Le bandeau passe à « En ligne depuis… » (environ 3 minutes) ; la carte affiche l'image,
recadrée au format 16/9 et allégée, et la page **Crédits** la cite.

**Pas encore de crédit ?** Cochez **J'accepte le risque : image publiée sans crédit**. L'image est publiée, absente
de la page Crédits, et listée **Images à régulariser** dans le bandeau jusqu'à ce que vous complétiez le crédit (puis
décochez la case). La case ne couvre que l'absence de crédit : elle ne rend jamais acceptable une image générée par IA
ou sous une licence refusée.

**Ni crédit, ni case cochée** : l'image n'est **pas publiée** (la carte garde son bandeau typographique), la fiche
l'est, et l'image figure dans **À corriger** : « cocher la case ou compléter le crédit ». Une image ne bloque jamais
la publication de sa fiche.

L'image d'origine reste dans le dépôt telle quelle : les versions allégées sont fabriquées à la publication. Pour
revenir au bandeau, retirez l'image de la fiche. Une image téléversée que plus aucune fiche ne cite est signalée
« image orpheline » : supprimez-la dans **Ressources**, ou réutilisez-la.

---

## 3. Ajouter une planche d'illustration

Planches techniques anciennes du domaine public ou sous CC0 (Encyclopédie, brevets anciens, musées en accès ouvert).

- **Accueil** : **Réglages du site** → **Planche de l'accueil, derrière le titre**.
- **Thème** : **Thèmes** → le thème → **Planche d'illustration**.
- **Labo, Maquettes** : **Accueil** → **Labo et Maquettes (à venir)** → **Planche d'illustration**.

Téléversez la planche (rangée dans `medias/illustrations/`) et remplissez son crédit au même endroit, comme pour une
image de carte (partie 2) ; un texte alternatif vide convient à une planche décorative. À la publication, elle passe
en niveaux de gris sur fond blanc.

---

## 4. Notions

Les notions relient les annales aux cours et exercices (« Pour réviser »). Rubrique **Notions** :

- **ajouter** : **Nouveau**, un identifiant (minuscules sans accent et tirets, ex. `cinematique-graphique`) et son
  libellé avec ses accents (« Cinématique graphique ») ;
- **renommer** : changez seulement le **libellé** ; l'identifiant d'une notion déjà utilisée ne se change pas.

Dans les fiches, les notions se **choisissent dans la liste** : la nouvelle notion y apparaît dès qu'elle est
enregistrée. Les **notions proposées** par le projet Claude attendent votre décision dans chaque fiche importée.

---

## 5. Accueil, Labo et Maquettes, thèmes

- **Contenus à la une** (rubrique **Accueil**) : de 3 à 6 identifiants de contenus publiés, dans l'ordre d'affichage.
  Un contenu qui n'est pas publié (brouillon, retenu) est sauté et signalé.
- **Labo et Maquettes (à venir)** : le titre et la promesse (une phrase, sans date) des pages `/labo/` et
  `/maquettes/` et du bloc « Bientôt » de l'accueil.
- **Thèmes** : nom, nom court, exemples, planche. Un thème sans contenu publié s'affiche « Bientôt » ; il retrouve
  sa page dès qu'un contenu ou une annale de ce thème passe en **Relu**.

---

## 6. Réglages du site

- **Éditeur** et **Adresse de contact** : les mentions légales. Tant qu'ils sont vides, la page affiche « À
  compléter avant l'ouverture ».
- **Ouvert aux moteurs de recherche** : à cocher seulement à la bascule sur le domaine `industrie.education`. La
  publication le refuse tant que le nom de l'éditeur, le directeur de la publication ou l'adresse de contact
  manquent.
- **Titre d'accueil selon le moment** : un retour à la ligne dans le champ est un retour à la ligne à l'écran.
- **Planche de l'accueil** : voir la partie 3.
- **Mesure d'audience** : voir la partie 7.

---

## 7. Mesure d'audience (Umami)

Umami compte les visites **sans cookie** ni donnée personnelle. En plus des pages vues, le site compte cinq
actions, avec le seul identifiant de la page : annale commencée en entraînement (`annale-entrainement`) ou en examen
(`annale-examen`), copie corrigée (`annale-copie-corrigee`), copie imprimée (`annale-impression`), page projetée
(`projeter`). Les recherches du catalogue se lisent dans les adresses des pages vues (`/catalogue/?q=statique`).

**Mise en place, une seule fois :**

1. Créez un compte gratuit sur <https://cloud.umami.is>. **Choisissez la région de données Europe (UE)** : ce choix
   est définitif.
2. Ajoutez le site (*Add website*) : nom `industrie.education`, domaine `s-kajzar.github.io` (à changer pour
   `industrie.education` à la bascule).
3. Ouvrez le code de suivi du site (*Tracking code*) : `<script defer src="…" data-website-id="…">`.
4. Dans le back-office, **Réglages du site** : **Identifiant Umami** = la valeur de `data-website-id` ; **Adresse
   du script Umami** = la valeur de `src` (par défaut `https://cloud.umami.is/script.js`). Enregistrez.

**Les 6 chiffres à regarder une fois par mois** :

| Chiffre | Où dans Umami |
|---|---|
| Visiteurs | tableau de bord du site, *Visitors* |
| Pages les plus vues | *Pages* |
| Sources d'arrivée | *Referrers* |
| Annales commencées | *Events* : `annale-entrainement` + `annale-examen` (détail par annale : propriété `page`) |
| Copies corrigées | *Events* : `annale-copie-corrigee` |
| Projections en classe | *Events* : `projeter` |

**Limites du plan gratuit** (à vérifier sur la page des tarifs d'Umami) : un nombre limité d'événements par mois
(100 000 à ce jour, pages vues comprises) et **6 mois d'historique**.

---

## 8. Bandeau d'état, « À corriger » et alerte e-mail

**Le bandeau**, en haut du back-office, s'actualise à l'ouverture, quand vous revenez sur l'onglet, une vingtaine de
secondes après un enregistrement, et sur le bouton **Actualiser** (jamais en continu : GitHub limite ces
interrogations à 60 par heure). Il interroge GitHub sans votre jeton.

| Le bandeau dit | Ce que cela veut dire |
|---|---|
| **Publication en cours** | GitHub travaille ; lien « voir l'avancement » |
| **En ligne depuis hh:mm** | La dernière publication a réussi ; c'est l'heure de la version en ligne |
| **Échec : voir le détail** | Une erreur de code a arrêté la publication ; le site en ligne n'a pas changé (partie 9) |
| (état de GitHub indisponible) | GitHub ne répond pas pour le moment ; l'heure affichée reste juste |
| **N fiches retenues** | Fiches « Relu » non publiées à cause d'une erreur de contenu ; le reste du site est en ligne |
| **N images à régulariser** | Images publiées sans crédit, case de risque cochée |
| **N nouvelles versions à relire** | Fichiers déposés pour remplacer une fiche, en attente de validation |

Un clic sur un nombre ouvre la liste **À corriger** : pour chaque point, la fiche, le **nom du champ** à corriger
dans le back-office et la correction en une phrase ; « ouvrir la fiche » mène à une annale. Elle regroupe :

- les **fiches retenues** (marquées « Retirée du site » si elles étaient en ligne avant) ;
- les **avertissements des brouillons** (champs à compléter, 20/20 non atteint…) : rien n'est publié, rien n'est
  bloqué ;
- les **images non publiées** faute de crédit, les **images orphelines** ;
- les **fichiers déposés non importés**, les **notions proposées**, et le reste (« à la une »…).

Le même résumé est écrit par GitHub à chaque publication : onglet **Actions** → dernière exécution de **Publier le
site** → **Summary**. Il commence par **À corriger**, puis **Images à régulariser**, le rapport d'import et le
tableau de bord éditorial (publiés, brouillons, poids de l'accueil, mentions légales, indexation).

**Être prévenu par e-mail d'un échec** (une fois) : sur GitHub, photo de profil → **Settings** → **Notifications** →
rubrique **Actions** → cochez **Email** et **Only notify for failed workflows**. Vous recevez alors un courriel à
chaque publication arrêtée, et seulement dans ce cas.

---

## 9. En cas de problème

### Une fiche est retenue

C'est une **erreur de contenu** : la fiche n'est pas publiée (ou elle est retirée si elle était en ligne), et tout le
reste du site l'est. Ouvrez le bandeau → **À corriger** : corrigez le champ cité, enregistrez ; la fiche revient en
ligne à la publication suivante.

| Message | Ce qu'il faut faire |
|---|---|
| « champ « source » manquant », « licence de la source non acceptée », « autorisation écrite sans référence » | Remplir **Source et licence du sujet** |
| « Notion inconnue … » | Ajouter la notion dans **Notions** (le message propose les identifiants proches) |
| « Champ « presentation » trop court » (ou « description ») | Écrire 20 caractères au moins |
| « … ligne N : ressource extérieure interdite … », « lien vers une page absente du site », « ancre … sans identifiant » | Le fichier HTML est à corriger dans le projet Claude, puis à déposer comme nouvelle version |
| « une copie entièrement juste n'obtient pas 20/20 » | Faire corriger les questions citées dans le projet Claude |
| « Identifiant en double … », « L'identifiant … doit être le nom de son fichier » | Remettre l'identifiant d'origine, ou créer la fiche sous un autre identifiant |
| « JSON invalide dans … » | Fiche abîmée par une modification sur GitHub : rétablir la version précédente (« Annuler une modification ») |

### La publication échoue (« Échec : voir le détail »)

C'est une **erreur de code** (gabarit, réglages du site, test de page) : rien n'est publié, le site en ligne ne
change pas. Le **Summary** de l'exécution affiche « Publication arrêtée » ; sinon, l'étape en rouge (tests) donne le
détail. Une seule erreur de contenu ne peut pas en être la cause. Exception : **« « indexable » ne peut pas valoir
true … »** : remplissez les mentions légales citées, dans **Réglages du site**. Pour tout le reste, transmettez le
message tel quel dans une session Claude Code.

### Annuler une modification

Chaque enregistrement est un commit, au message en français (« Annale : mise à jour de … »).

1. Pour retrouver l'ancienne valeur : dans la fiche, panneau **Historique** (icône d'horloge, à droite), ou sur
   GitHub, onglet **Code** → **Commits** ; ouvrez le commit : les lignes en rouge sont les anciennes valeurs.
2. Le plus simple : **ressaisissez l'ancienne valeur dans la fiche** et enregistrez.
3. Pour rétablir tout un fichier : sur GitHub, ouvrez le fichier → **History** → l'ancienne version → **View file**
   → copiez son contenu ; revenez au fichier actuel → crayon (**Edit**) → collez → **Commit changes** sur `main`.

### Le back-office ne fonctionne pas : passer par GitHub

Tout ce que fait le back-office se fait aussi sur le site de GitHub, dépôt `S-Kajzar/industrie-education` :

- **déposer des fichiers HTML** du projet Claude : dossier `medias/import/` → **Add file** → **Upload files** →
  **Commit changes** ; l'import crée les fiches en brouillon, comme le dépôt rapide (le site refuse un fichier HTML
  de plus de 5 Mo) ;
- **déposer une image** : dossier `medias/cartes/` ou `medias/illustrations/` → **Add file** → **Upload files**, puis
  citez-la dans la fiche, avec son crédit ;
- **créer ou modifier une fiche** : dossier `annales/` (une fiche `identifiant.json` par annale, sur le modèle de
  l'existante), `contenus/`, `catalogue/` (notions, thèmes, à la une, à venir), `site.json` (réglages) → crayon
  (**Edit**) ou **Add file** → **Create new file** → **Commit changes** ;
- la publication suit le même circuit (Actions, environ 3 minutes).

### Jeton expiré ou refusé

Message « Le jeton fourni n'est pas valide » ou rubriques qui ne se chargent plus : le jeton a expiré, a été révoqué
ou n'a pas la permission *Contents* en lecture et écriture sur ce dépôt. Créez-en un nouveau (partie « Accès »),
puis **Se déconnecter** et reconnectez-vous.

Si GitHub lui-même a une panne (rare), consultez <https://www.githubstatus.com> et réessayez plus tard.

---

## 10. Sécurité

- **Le jeton est un mot de passe** : il donne l'écriture sur le dépôt. Rangez-le dans un gestionnaire de mots de
  passe, ne l'envoyez jamais par courriel ni par messagerie, ne le collez nulle part ailleurs que dans le
  back-office.
- **Appareils personnels seulement** : jamais sur un poste de la salle de classe ou partagé. Après un usage
  exceptionnel sur un autre appareil : **Se déconnecter**, puis renouvelez le jeton.
- **Durée limitée** (90 jours) et **un seul dépôt**, avec la seule permission *Contents* : en cas de doute,
  révoquez-le, cela ne casse rien.

---

## 11. Rappel : le dépôt est public

Une annale, un contenu ou un fichier au statut **Brouillon** est **invisible sur le site**, mais il reste **lisible
sur GitHub** par n'importe qui. N'y déposez rien de confidentiel : pas de sujet sous embargo, pas de copie d'élève,
aucune donnée personnelle.
