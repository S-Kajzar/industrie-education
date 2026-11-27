# Guide du back-office

Ce guide explique, pas à pas, comment gérer le site depuis un navigateur, sans toucher au code : déposer une
annale ou un nouvel exercice, ajouter une image de carte ou une planche, gérer les notions, suivre l'audience.

Le back-office est **Pages CMS**, un outil libre qui modifie directement les fichiers du dépôt GitHub
`S-Kajzar/industrie-education`. Chaque enregistrement crée un *commit* sur la branche `main` ; GitHub reconstruit
alors le site, lance les tests et, s'ils passent, publie la nouvelle version.

L'interface de Pages CMS est en anglais : les boutons cités ci-dessous (*Save*, *Upload*…) sont ceux de la version
2.1. Les rubriques et toutes les aides de saisie sont en français : elles viennent du fichier `.pages.yml` du dépôt.

---

## Accès

**Une seule fois :**

1. Allez sur <https://app.pagescms.org> et connectez-vous avec votre compte GitHub (*Sign in with GitHub*).
2. Pages CMS propose d'installer son application GitHub. Dans l'écran de GitHub qui s'ouvre :
   - choisissez votre compte `S-Kajzar` ;
   - cochez **Only select repositories** et sélectionnez **industrie-education**, et lui seul ;
   - validez (*Install*).
3. De retour dans Pages CMS, ouvrez le dépôt `industrie-education`, branche `main`, puis **mettez l'adresse de la
   page en favori** : c'est l'entrée de votre back-office.

Pour retirer plus tard l'accès : sur GitHub, *Settings* → *Applications* → *Installed GitHub Apps* → Pages CMS.

> Ne protégez pas la branche `main` par une règle « pull request obligatoire » : Pages CMS ne pourrait plus
> enregistrer.

**À chaque enregistrement :** comptez **environ 2 minutes** avant que la préproduction soit à jour.

- Le résultat se voit sur <https://s-kajzar.github.io/industrie-education/> (rechargez la page).
- L'avancement se suit sur GitHub, dépôt `industrie-education`, onglet **Actions** : la dernière exécution de
  **Publier le site** tourne (rond jaune), a réussi (coche verte) ou a échoué (croix rouge, voir la partie 9).
- Le **tableau de bord éditorial** de chaque publication est dans cette même exécution (partie 8).

**Les rubriques**, dans le menu de gauche, sont rangées de la plus utilisée à la moins utilisée :

| Rubrique | Pour… |
|---|---|
| Annales | déposer une annale du projet Claude, la décrire, déclarer sa source, la publier |
| Contenus | modifier une fiche de cours ou d'exercice, ou déposer un nouvel exercice autonome |
| Images et crédits | déclarer chaque image (auteur, source, licence) |
| Accueil | contenus à la une, titres et planche de l'accueil, textes de Labo et Maquettes |
| Notions | ajouter une notion ou changer son libellé |
| Thèmes | nom, exemples et planche des cinq thèmes |
| Réglages du site | mentions légales, mesure d'audience, ouverture aux moteurs de recherche |

Viennent ensuite les dossiers de médias (**Images de cartes, Planches d'illustration, Fichiers HTML déposés**).

---

## 1. Déposer une annale produite par le projet Claude

Vous avez le fichier HTML autonome livré par le projet Claude « Exercices interactifs » (un seul fichier `.html`,
images intégrées, **3 Mo au plus**), sa fiche JSON et son crédit.

1. **Rubrique Annales** → bouton d'ajout d'une entrée.
2. Remplissez la fiche à partir de la fiche JSON livrée :
   - **Identifiant** : il devient l'adresse de la page, `/annales/<identifiant>/`. Minuscules sans accent,
     chiffres et tirets, nom **neutre**, sans diplôme ni session. Ne le changez plus une fois l'annale publiée.
   - **Titre** et **Présentation** : ils servent au titre de la page, à la carte et à la description lue par les
     moteurs de recherche. Sur la page, c'est le titre et le chapeau du fichier qui s'affichent, juste sous la fiche.
   - **Fichier HTML du sujet** : téléversez le fichier livré. Il est rangé dans `medias/depots/` et publié tel quel.
   - **Image de la carte** (facultative) : voir la partie 2. Sans image, la carte garde son bandeau.
   - **Filières**, **Thème**, **Notions** (identifiants de la rubrique Notions, un par ligne), **Durée conseillée**.
   - **Origine du sujet** (diplôme, épreuve, session) : pour votre classement. Rien n'est affiché tant que
     **Afficher l'origine sur le site** n'est pas coché.
   - **Source et licence du sujet** (obligatoire pour publier), d'après le « crédit pour la fiche » livré :
     - **Éditeur** : `éduscol STI` pour un sujet de sti.eduscol.education.fr, `éduscol` pour une annale du bac ;
     - **Adresse du document d'origine** : l'adresse exacte du fichier source, en `https://` ;
     - **Licence** : *CC BY-NC-SA 2.0 FR* (éduscol STI) ou *Licence Ouverte 2.0* (annales du bac) ; *Autorisation
       écrite* avec sa référence ; *Œuvre personnelle* pour un sujet que vous avez écrit.

     La fiche affiche alors toujours une ligne de crédit, par exemple : « D'après un sujet publié par éduscol STI,
     licence CC BY-NC-SA 2.0 FR. Adaptation interactive : industrie.education, sous la même licence. »
   - **Statut** : laissez **Brouillon**. Le passage à **Relu** est votre décision, et la vôtre seulement : Claude
     ne pose jamais ce statut.
   - **Mis à jour le** : la date du jour. Les trois annales les plus récentes s'affichent sur l'accueil.
3. Enregistrez (*Save*). Même en brouillon, chaque publication vérifie automatiquement que l'annale donne **20/20
   quand toutes les réponses sont justes**, en entraînement et en examen : si ce test échoue, la publication
   s'arrête (partie 9).
4. **Relisez** le sujet en mode entraînement, la fiche de relecture du projet Claude à côté.
5. Quand toutes les réponses sont vérifiées, passez le statut à **Relu** et enregistrez. Environ 2 minutes plus
   tard, l'annale est sur sa page, dans l'index des annales et de sa filière, dans le catalogue, sur l'accueil et
   sur la page Crédits.

**Remplacer le fichier d'une annale** (nouvelle version) : ouvrez la fiche, téléversez le nouveau fichier dans
**Fichier HTML du sujet**, enregistrez.

**Nouvel exercice (hors annale).** Même principe dans la rubrique **Contenus** : ouvrez la collection voulue,
ajoutez une entrée, remplissez la fiche, téléversez le fichier dans **Fichier HTML (nouveau contenu seulement)**,
choisissez le statut, enregistrez. Le contenu est publié à l'adresse `/<collection>/<identifiant>/`.

---

## 2. Ta première image en 5 minutes

Images acceptées : **domaine public**, **CC0**, **œuvre personnelle** (vos photos et dessins) ou **autorisation
écrite** du propriétaire. **Jamais d'image générée par IA**, ni d'image de banque d'images, ni de copie Gallica.

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

**Minute 2 — télécharger.** Prenez une taille moyenne (1 200 à 2 000 px de large), en JPEG ou PNG. Notez l'adresse
de la page d'origine, l'auteur et la date.

**Minute 3 — téléverser.** Ouvrez la fiche du contenu (**Contenus**, puis la collection) ou de l'annale
(**Annales**). Dans **Image de la carte**, téléversez l'image (elle est rangée dans `medias/cartes/`) et écrivez le
**texte alternatif** : une phrase qui la décrit pour qui ne la voit pas (« Cadre de VTT et ses liaisons »).
Enregistrez, et notez le chemin affiché (ex. : `medias/cartes/cadre-velo.jpg`).

**Minute 4 — déclarer.** Rubrique **Images et crédits** → ajoutez une entrée : le **chemin**, le **titre**,
l'**auteur**, la **date**, la **source** (adresse de la page d'origine) et la **licence**. Enregistrez.

**Minute 5 — vérifier.** Attendez la coche verte dans l'onglet **Actions** (environ 2 minutes), puis ouvrez le
catalogue de la préproduction : la carte affiche l'image, recadrée au format 16/9 et allégée ; la page **Crédits**
(lien en pied de page) la liste. Une croix rouge ? Voir la partie 9 : le plus souvent, l'image n'est pas encore
déclarée, ou sa licence n'est pas dans la liste.

Pour changer d'image : téléversez-en une autre dans la fiche et déclarez-la. Pour revenir au bandeau, videz le
champ **Image**.

---

## 3. Ajouter une planche d'illustration (accueil, thèmes, Labo et Maquettes)

Les planches sont des gravures techniques anciennes du domaine public ou sous CC0 (Encyclopédie, brevets anciens,
collections en accès ouvert).

- **Accueil** : rubrique **Accueil** → **Titres et planche de l'accueil** → **Planche de l'accueil, derrière le
  titre**. Elle s'affiche en filigrane dans la moitié droite du titre (en bandeau au-dessus du titre sur téléphone).
- **Thème** : rubrique **Thèmes** → le thème → **Planche d'illustration**. Elle s'affiche à droite du titre de la
  page du thème, et en vignette dans l'index des thèmes de l'accueil.
- **Labo, Maquettes** : rubrique **Accueil** → **Labo et Maquettes (à venir)** → **Planche d'illustration**. Elle
  s'affiche en vignette dans le bloc « Bientôt » de l'accueil et en tête de la page.

Téléversez le fichier (rangé dans `medias/illustrations/`), écrivez un texte alternatif, enregistrez, puis
déclarez la planche dans **Images et crédits**. Une planche purement décorative peut garder un texte alternatif
vide : cochez alors **Image décorative** dans son entrée. À la publication, la planche passe en niveaux de gris,
contraste renforcé, papier ramené au blanc pur, et elle est allégée.

---

## 4. Notions

Les notions relient les annales aux cours et exercices (« Pour réviser »). Rubrique **Notions** :

- **ajouter** une notion : un identifiant (minuscules sans accent et tirets, ex. `cinematique-graphique`) et son
  libellé affiché, avec ses accents (« Cinématique graphique ») ;
- **renommer** une notion : changez seulement son **libellé** ; l'identifiant d'une notion déjà utilisée ne se
  change pas.

Dans les fiches, on écrit l'identifiant, un par ligne (Pages CMS ne sait pas proposer une liste tirée d'un autre
fichier). Un identifiant inconnu arrête la publication, et le message propose les identifiants proches.

---

## 5. Textes de Labo et Maquettes

Rubrique **Accueil** → **Labo et Maquettes (à venir)** : le titre et la promesse (une phrase, sans date) de chaque
section. Ils s'affichent dans le bloc « Bientôt » de l'accueil et sur les pages `/labo/` et `/maquettes/`.

---

## 6. Thèmes « Bientôt »

Un thème sans contenu ni annale publiés s'affiche **« Bientôt »** sur l'accueil, sans lien, et sa page n'est pas
publiée. Rien à faire : dès qu'un contenu ou une annale de ce thème passe en **Relu**, le thème retrouve sa page.

---

## 7. Mesure d'audience (Umami)

Umami compte les visites **sans cookie** ni donnée personnelle. En plus des pages vues, le site compte cinq
actions, avec le seul identifiant de la page : annale commencée en entraînement (`annale-entrainement`) ou en
examen (`annale-examen`), copie corrigée (`annale-copie-corrigee`), copie imprimée (`annale-impression`), page
projetée (`projeter`). Les recherches et les filtres du catalogue se lisent dans les adresses des pages vues
(`/catalogue/?q=statique`).

**Mise en place, une seule fois :**

1. Créez un compte gratuit sur <https://cloud.umami.is>. **Choisissez la région de données Europe (UE)** : ce choix
   est définitif.
2. Dans Umami, ajoutez le site (*Add website*) : nom `industrie.education`, domaine `s-kajzar.github.io` (à changer
   pour `industrie.education` à la bascule).
3. Ouvrez le code de suivi du site (*Tracking code*) : `<script defer src="…" data-website-id="…">`.
4. Dans le back-office, rubrique **Réglages du site** :
   - **Identifiant Umami** : la valeur de `data-website-id` ;
   - **Adresse du script Umami** : la valeur de `src` (elle dépend de la région ; par défaut
     `https://cloud.umami.is/script.js`).

   Enregistrez. Les mentions légales et la page À propos se mettent à jour seules.

**Les 6 chiffres à regarder une fois par mois** (période : le mois écoulé) :

| Chiffre | Où dans Umami |
|---|---|
| Visiteurs | tableau de bord du site, *Visitors* |
| Pages les plus vues | *Pages* |
| Sources d'arrivée | *Referrers* (moteurs de recherche, Pronote, sites académiques…) |
| Annales commencées | *Events* : `annale-entrainement` + `annale-examen` (détail par annale : propriété `page`) |
| Copies corrigées | *Events* : `annale-copie-corrigee` |
| Projections en classe | *Events* : `projeter` |

**Limites du plan gratuit** (à vérifier sur la page des tarifs d'Umami, elles peuvent changer) : un nombre limité
d'événements par mois (100 000 à ce jour, pages vues et actions comprises) et **6 mois d'historique**. Notez vos 6
chiffres chaque mois si vous voulez garder une trace plus longue.

---

## 8. Tableau de bord éditorial

À chaque publication, GitHub écrit un tableau de bord : sur GitHub, onglet **Actions** → la dernière exécution de
**Publier le site** → page **Summary** (récapitulatif), section **Tableau de bord éditorial**. Il donne :

- le nombre de contenus et d'annales publiés et en brouillon, par type ;
- les annales sans source (en brouillon) ;
- les cartes sans image ;
- la présence de la planche d'accueil ;
- le poids de l'accueil ;
- l'état des mentions légales ;
- l'ouverture aux moteurs de recherche.

Il ne contient que des comptes. Si la publication s'est arrêtée, le message d'erreur y figure aussi.

---

## 9. Si la publication échoue

Le site en ligne ne change pas tant que la publication n'a pas réussi : la version précédente reste en place.

1. Sur GitHub, onglet **Actions**, ouvrez la dernière exécution de **Publier le site** marquée d'une croix rouge.
2. Le **récapitulatif** (*Summary*) affiche « Publication arrêtée » et le message. Sinon, cliquez sur l'étape en
   rouge.
3. Le message commence par **« Construction arrêtée : »** et dit, en français, quel fichier pose problème et
   pourquoi.

| Message | Ce qu'il faut faire |
|---|---|
| « Image sans crédit : … » | Déclarer l'image dans **Images et crédits** |
| « Licence non acceptée … » | Choisir une licence de la liste, ou retirer l'image |
| « Autorisation écrite sans référence … » | Renseigner la référence de l'autorisation |
| « Texte alternatif manquant … » | Écrire le texte alternatif dans la fiche, ou déclarer l'image décorative |
| « Image introuvable : … » | Téléverser l'image, ou corriger le chemin dans la fiche |
| « annale sans source valide … » | Remplir **Source et licence du sujet** dans la fiche de l'annale |
| « Notion inconnue … » | Corriger l'identifiant (le message propose les proches) ou ajouter la notion dans **Notions** |
| « « indexable » ne peut pas valoir true … » | Remplir les mentions légales citées dans **Réglages du site** |
| « … ligne N : ressource extérieure interdite … » | Le fichier HTML charge quelque chose depuis Internet : le faire corriger dans le projet Claude |
| « fichier trop lourd » | Alléger les images dans le projet Claude |
| « Identifiant en double … » | Choisir un autre identifiant |

Si l'échec vient des tests (« failed » dans la liste) et cite **annale parfaite**, une réponse attendue de l'annale
n'obtient pas tous ses points, ou la note n'atteint pas 20/20 : faites corriger le fichier dans le projet Claude en
lui donnant la question citée. Pour tout autre test en échec, transmettez le message tel quel dans une session
Claude Code.

---

## 10. Rappel : le dépôt est public

Une annale, un contenu ou un fichier au statut **Brouillon** est **invisible sur le site**, mais il reste **lisible
sur GitHub** par n'importe qui. N'y déposez rien de confidentiel : pas de sujet sous embargo, pas de copie d'élève,
aucune donnée personnelle.

---

**Limite connue.** Le fichier HTML est envoyé en une seule requête par l'application hébergée de Pages CMS, d'où la
limite de 3 Mo. Si un fichier refuse de se téléverser, déposez-le directement sur GitHub dans le dossier
`medias/depots/` (*Add file* → *Upload files*), puis choisissez-le dans la fiche.
