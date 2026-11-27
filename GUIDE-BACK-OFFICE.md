# Guide du back-office

Ce guide explique, pas à pas, comment gérer le site depuis un navigateur, sur ordinateur ou sur téléphone, sans
toucher au code : déposer une annale ou un nouvel exercice, ajouter une image de carte ou une planche, gérer les
notions et les réglages, suivre l'audience.

Le back-office est servi par le site lui-même, à l'adresse
**<https://s-kajzar.github.io/industrie-education/admin/>** (logiciel libre Sveltia CMS, en français). Il modifie
directement les fichiers du dépôt GitHub `S-Kajzar/industrie-education` : chaque enregistrement crée un *commit* sur
la branche `main`, puis GitHub reconstruit le site, lance les tests et, s'ils passent, publie la nouvelle version.
Il n'y a ni serveur ni base de données à entretenir.

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

Comptez **environ 2 minutes** avant que la préproduction soit à jour.

- Le résultat se voit sur <https://s-kajzar.github.io/industrie-education/> ; depuis une fiche publiée, le bouton
  **Afficher sur le site en ligne** ouvre directement sa page.
- L'avancement se suit sur GitHub, onglet **Actions** : la dernière exécution de **Publier le site** tourne (rond
  jaune), a réussi (coche verte) ou a échoué (croix rouge, voir la partie 9).

---

## Les rubriques

Dans le menu de gauche (sur téléphone, le menu ☰), de la plus utilisée à la moins utilisée :

| Rubrique | Pour… |
|---|---|
| Annales | déposer une annale du projet Claude, la décrire, déclarer sa source, la publier |
| Contenus | toutes les collections en arborescence : ouvrez une collection, puis un contenu ; ou créez un exercice autonome dans une collection |
| Images et crédits | déclarer chaque image (auteur, source, licence) |
| Accueil | contenus à la une ; textes de Labo et Maquettes |
| Notions | ajouter une notion ou changer son libellé |
| Thèmes | nom, exemples et planche des cinq thèmes |
| Réglages du site | mentions légales, mesure d'audience, ouverture aux moteurs, titres et planche de l'accueil |

Chaque rubrique rappelle en tête ce qu'elle contient, et chaque champ délicat a une aide en dessous. L'icône
**Ressources** (en haut) montre les dossiers de médias : images de cartes, planches, fichiers HTML déposés.

---

## 1. Déposer une annale produite par le projet Claude

Vous avez le fichier HTML autonome livré par le projet Claude « Exercices interactifs » (un seul fichier `.html`,
images intégrées, **5 Mo au plus**), sa fiche JSON et son crédit.

1. **Annales** → **Nouveau** (ou le bouton **+**).
2. Remplissez la fiche à partir de la fiche JSON livrée ; tout tient dans un seul formulaire, sur téléphone aussi :
   - **Identifiant** : il devient l'adresse de la page, `/annales/` suivi de l'identifiant. Minuscules sans accent,
     chiffres et tirets, nom **neutre**. Ne le changez plus une fois l'annale publiée.
   - **Titre** et **Présentation** : titre de la page, carte et description lue par les moteurs de recherche.
   - **Fichier HTML du sujet** : **Parcourir**, puis choisissez le fichier. Il est rangé dans `medias/depots/`, son
     nom est nettoyé (minuscules, sans accent) et il est publié tel quel. Au-delà de 5 Mo, le back-office le refuse
     (« Fichier volumineux »).
   - **Image de la carte** (facultative) : voir la partie 2.
   - **Filières**, **Thème**, **Notions** (choisies dans la liste ; une notion manque ? ajoutez-la d'abord dans
     **Notions**), **Durée conseillée**.
   - **Origine du sujet** : pour votre classement ; rien n'est affiché tant que **Afficher l'origine sur le site**
     n'est pas coché.
   - **Source et licence du sujet** (obligatoire pour publier) : éditeur (`éduscol STI`, ou `éduscol` pour une
     annale du bac), adresse exacte du document d'origine en `https://`, licence (*CC BY-NC-SA 2.0 FR* ou *Licence
     Ouverte 2.0* ; *Autorisation écrite* avec sa référence ; *Œuvre personnelle*). La fiche affiche toujours la
     ligne de crédit qui en découle.
   - **Statut** : **Brouillon** par défaut. Le passage à **Relu** est votre décision, et la vôtre seulement : Claude
     ne pose jamais ce statut.
   - **Mis à jour le** : la date du jour (les trois annales les plus récentes sont sur l'accueil).
3. **Enregistrer**. Même en brouillon, chaque publication vérifie que l'annale donne **20/20 quand toutes les
   réponses sont justes**, en entraînement et en examen ; sinon, la publication s'arrête (partie 9).
4. **Relisez** le sujet en mode entraînement, la fiche de relecture du projet Claude à côté.
5. Quand toutes les réponses sont vérifiées, passez le statut à **Relu** et enregistrez : environ 2 minutes plus
   tard, l'annale est sur sa page, dans l'index des annales, le catalogue, l'accueil et la page Crédits.

**Remplacer le fichier d'une annale** : ouvrez la fiche, **Remplacer** sous le fichier, choisissez la nouvelle
version, enregistrez.

**Nouvel exercice (hors annale)** : **Contenus** → ouvrez la collection voulue (par exemple *statique*) →
**Créer une entrée**. Remplissez la fiche (type, niveau, description…), téléversez le fichier dans **Fichier HTML
(nouveau contenu seulement)**, choisissez le statut, enregistrez. Le contenu est rangé dans la collection et publié
à l'adresse de la collection suivie de son identifiant. Sans fichier HTML, la publication s'arrête.

---

## 2. Ta première image en 5 minutes

Images acceptées : **domaine public**, **CC0**, **œuvre personnelle** (vos photos et dessins) ou **autorisation
écrite** du propriétaire. **Jamais d'image générée par IA**, ni d'image de banque d'images, ni de copie Gallica. Le
back-office ne propose d'ailleurs aucune banque d'images.

**Minute 1 — trouver.** Sur <https://commons.wikimedia.org>, cherchez par exemple « Encyclopédie Diderot planche
forge », « patent drawing gear » ou le nom d'une machine. Autres sources sûres : les dessins de brevets américains
anciens et <https://www.si.edu/openaccess> (Smithsonian, filtre **CC0**). Sur la page du fichier, lisez la section
**Licence** :

| Ce que dit la page | Licence à choisir |
|---|---|
| *Public domain*, *PD-old*, *PD-US*, *PD-Art* | Domaine public |
| *CC0*, *Creative Commons Zero* | CC0 |
| Votre propre photo ou dessin | Œuvre personnelle |
| Accord écrit du propriétaire (constructeur…) | Autorisation écrite, avec sa référence |
| *CC BY*, *CC BY-SA*, « tous droits réservés », rien d'indiqué | **Refusée** : cherchez une autre image |

**Minute 2 — télécharger.** Une taille moyenne (1 200 à 2 000 px de large), en JPEG ou PNG. Notez l'adresse de la
page d'origine, l'auteur et la date.

**Minute 3 — téléverser.** Ouvrez la fiche du contenu ou de l'annale ; dans **Image de la carte**, téléversez
l'image (rangée dans `medias/cartes/`, nom nettoyé) et écrivez le **texte alternatif** : une phrase qui la décrit
pour qui ne la voit pas. **Enregistrer**, et notez le chemin affiché (ex. : `/medias/cartes/cadre-velo.jpg`).

**Minute 4 — déclarer.** **Images et crédits** → **Nouveau** : le **chemin**, le **titre**, l'**auteur**, la
**date**, la **source** (adresse de la page d'origine) et la **licence**. **Enregistrer**.

**Minute 5 — vérifier.** Attendez la coche verte dans l'onglet **Actions** (environ 2 minutes), puis ouvrez le
catalogue de la préproduction : la carte affiche l'image, recadrée au format 16/9 et allégée ; la page **Crédits** la
liste. Une croix rouge ? Voir la partie 9 : le plus souvent, l'image n'est pas encore déclarée.

L'image d'origine reste dans le dépôt telle quelle : les versions allégées sont fabriquées à la publication. Pour
revenir au bandeau, retirez l'image de la fiche.

---

## 3. Ajouter une planche d'illustration

Planches techniques anciennes du domaine public ou sous CC0 (Encyclopédie, brevets anciens, musées en accès ouvert).

- **Accueil** : **Réglages du site** → **Planche de l'accueil, derrière le titre**.
- **Thème** : **Thèmes** → le thème → **Planche d'illustration**.
- **Labo, Maquettes** : **Accueil** → **Labo et Maquettes (à venir)** → **Planche d'illustration**.

Téléversez la planche (rangée dans `medias/illustrations/`), écrivez un texte alternatif, enregistrez, puis
déclarez-la dans **Images et crédits**. Une planche purement décorative peut garder un texte alternatif vide :
cochez alors **Image décorative** dans son crédit. À la publication, elle passe en niveaux de gris sur fond blanc.

---

## 4. Notions

Les notions relient les annales aux cours et exercices (« Pour réviser »). Rubrique **Notions** :

- **ajouter** : **Nouveau**, un identifiant (minuscules sans accent et tirets, ex. `cinematique-graphique`) et son
  libellé avec ses accents (« Cinématique graphique ») ;
- **renommer** : changez seulement le **libellé** ; l'identifiant d'une notion déjà utilisée ne se change pas.

Dans les fiches, les notions se **choisissent dans la liste** : la nouvelle notion y apparaît dès qu'elle est
enregistrée.

---

## 5. Accueil, Labo et Maquettes, thèmes

- **Contenus à la une** (rubrique **Accueil**) : de 3 à 6 identifiants de contenus publiés, dans l'ordre d'affichage.
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

## 8. Tableau de bord éditorial

À chaque publication, GitHub écrit un tableau de bord : onglet **Actions** → dernière exécution de **Publier le
site** → page **Summary**, section **Tableau de bord éditorial**. Il donne les contenus et annales publiés et en
brouillon, les annales sans source, les cartes sans image, la planche d'accueil, le poids de l'accueil, l'état des
mentions légales et de l'indexation. Il ne contient que des comptes. Si la publication s'est arrêtée, le message
d'erreur y figure aussi.

---

## 9. En cas de problème

### La publication échoue

Le site en ligne ne change pas tant que la publication n'a pas réussi. Sur GitHub, onglet **Actions**, ouvrez
l'exécution marquée d'une croix rouge : le **Summary** affiche « Publication arrêtée » et un message qui commence par
**« Construction arrêtée : »**.

| Message | Ce qu'il faut faire |
|---|---|
| « Image sans crédit : … » | Déclarer l'image dans **Images et crédits** |
| « Licence non acceptée … » | Choisir une licence de la liste, ou retirer l'image |
| « Autorisation écrite sans référence … » | Renseigner la référence de l'autorisation |
| « Texte alternatif manquant … » | Écrire le texte alternatif, ou déclarer l'image décorative |
| « Image introuvable : … » | Téléverser l'image, ou corriger le chemin |
| « annale sans source valide … » | Remplir **Source et licence du sujet** |
| « Notion inconnue … » | Ajouter la notion dans **Notions** (le message propose les identifiants proches) |
| « « indexable » ne peut pas valoir true … » | Remplir les mentions légales citées, dans **Réglages du site** |
| « … ligne N : ressource extérieure interdite … » | Le fichier HTML charge quelque chose depuis Internet : le faire corriger dans le projet Claude |
| « Fichier manquant : … index.html » | Un nouveau contenu sans fichier HTML : téléversez-le dans la fiche |
| « Identifiant en double … » | Choisir un autre identifiant |

Si l'échec vient des tests et cite **annale parfaite**, une réponse attendue de l'annale n'obtient pas ses points :
faites corriger le fichier dans le projet Claude en lui donnant la question citée. Pour tout autre test en échec,
transmettez le message tel quel dans une session Claude Code.

### Annuler une modification

Chaque enregistrement est un commit, au message en français (« Annales : mise à jour de … »).

1. Pour retrouver l'ancienne valeur : dans la fiche, panneau **Historique** (icône d'horloge, à droite), ou sur
   GitHub, onglet **Code** → **Commits** ; ouvrez le commit : les lignes en rouge sont les anciennes valeurs.
2. Le plus simple : **ressaisissez l'ancienne valeur dans la fiche** et enregistrez.
3. Pour rétablir tout un fichier : sur GitHub, ouvrez le fichier → **History** → l'ancienne version → **View file**
   → copiez son contenu ; revenez au fichier actuel → crayon (**Edit**) → collez → **Commit changes** sur `main`.

### Le back-office ne fonctionne pas : passer par GitHub

Tout ce que fait le back-office se fait aussi sur le site de GitHub, dépôt `S-Kajzar/industrie-education` :

- **déposer un fichier** (fichier HTML d'annale, image) : ouvrez le dossier (`medias/depots/`, `medias/cartes/`,
  `medias/illustrations/`) → **Add file** → **Upload files** (25 Mo au plus par fichier par cette voie ; le site
  refuse de toute façon un fichier HTML de plus de 5 Mo) → **Commit changes** ;
- **créer ou modifier une fiche** : dossier `annales/` (une fiche `identifiant.json` par annale, sur le modèle de
  l'existante), `contenus/`, `catalogue/` (notions, thèmes, à la une, à venir), `site.json` (réglages),
  `medias/CREDITS.json` (crédits) → crayon (**Edit**) ou **Add file** → **Create new file** → **Commit changes** ;
- la publication suit le même circuit (Actions, environ 2 minutes).

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
