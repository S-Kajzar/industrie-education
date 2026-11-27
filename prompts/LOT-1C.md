# Lot 1c — Corrections du lot 1b, source des annales, mesure d'audience, Labo et Maquettes « à venir »

À coller dans une session Claude Code ouverte sur le dépôt `S-Kajzar/industrie-education`.

Tu travailles sur le dépôt `industrie-education`, après le lot 1b (PR n° 3, en ligne en préproduction).

Commence par lire en entier, car ces documents font foi :

- `CLAUDE.md` ;
- `TRAME.md`, surtout § 3, 7, 9, 10, 11, 13 et 14 ;
- `DESIGN.md` ;
- `NOTE-DE-LIVRAISON.md` du lot 1b, surtout ses écarts.

Copie ensuite ce prompt dans `prompts/LOT-1C.md` (il fera partie de la pull request).

**Objectif du lot** : une préproduction montrable à des collègues. Concrètement :

- aucun défaut visible sur les pages clés ;
- chaque annale affiche sa source et sa licence ;
- Sébastien peut suivre l'audience sans quitter ses outils.

Propose-moi d'abord un plan court (étapes, fichiers créés ou modifiés). Réalise-le ensuite étape par étape, tests à
l'appui. Ne touche jamais à l'intérieur d'un fichier autonome (contenu repris ou annale).

## Constats sur la préproduction (26/11)

1. La page d'une annale répète le titre et la présentation : une fois dans la fiche du site, une fois sur l'accueil
   du fichier, juste en dessous.
2. L'accueil affiche « BTS MS · Bientôt » alors qu'une annale BTS MS est publiée.
3. Les notions s'affichent sans accents (« cinematique graphique »), car le filtre `notion` se contente de retirer
   les tirets.
4. Deux thèmes affichent « 0 contenu » sur l'accueil (Analyse des systèmes, Habitat et construction).
5. `medias/` est vide : aucune image de carte, aucune planche. La chaîne d'images n'a jamais tourné sur un vrai
   fichier.
6. L'annale est au statut `relu`, mais ce statut n'a pas été posé par Sébastien, et le 20/20 n'a pas été vérifié.
7. Les mentions légales sont incomplètes : les champs `editeur` de `site.json` sont vides.

La console de la page d'annale signale aussi des erreurs ou avertissements. Identifie-les. S'ils viennent de
l'enveloppe, corrige-les. S'ils viennent du fichier autonome, liste-les dans la note de livraison sans modifier le
fichier.

## À livrer

### 1. Fiche d'annale compacte (constat 1)

- La fiche au-dessus du fichier ne reprend plus ni le titre ni la présentation : le fichier les porte déjà, en texte
  indexable, juste en dessous. Le `<title>` et la meta description du site restent inchangés.
- La fiche devient un bandeau d'informations : surtitre (« Annale corrigée et interactive · filières »), durée,
  filières, thème, notions, « Pour réviser », puis la ligne de crédit (§ 8).
- Supprime le bouton « Commencer » s'il n'apporte plus rien une fois la fiche compacte. Sinon, garde-le.
- Critères testables :
  - à 360 px de large, la fiche fait au plus 300 px de haut ;
  - à 1280 × 800, le titre de l'annale est visible au premier écran sans défiler.
- Mets à jour la description du composant dans `DESIGN.md`.

### 2. Filières cohérentes (constat 2)

- Passe `bts-ms` à `actif: true` dans `catalogue/publics.json`.
- Ajoute un test : toute filière visée par un contenu ou une annale publiés est active. Le test échoue sinon, avec un
  message qui nomme la filière et le contenu concernés.

### 3. Notions avec libellés (constat 3)

Crée `catalogue/notions.json` : une liste d'objets `{"id", "nom"}`. Contenu de départ :

| id | nom |
|---|---|
| statique | Statique |
| dynamique | Dynamique |
| cinematique-graphique | Cinématique graphique |
| roulements | Roulements |
| liaisons | Liaisons mécaniques |
| pfs | Principe fondamental de la statique |
| solide-deux-forces | Solide soumis à deux forces |

Les pages affichent le nom. Un identifiant inconnu arrête la construction, avec un message clair qui propose les
identifiants proches.

Back-office :

- une rubrique « Notions » pour ajouter ou renommer une notion ;
- dans les fiches de contenu et d'annale, le choix des notions se fait dans cette liste, si Pages CMS sait lire des
  options dans un fichier (vérifie dans sa documentation) ;
- sinon, garde la saisie libre, contrôlée par la construction, et signale-le dans la note.

### 4. Thèmes vides (constat 4)

Un thème sans contenu ni annale publiés est traité comme une filière inactive :

- sur l'accueil, il affiche « Bientôt » à la place de « 0 contenu » et n'est pas cliquable ;
- sa page n'est pas générée et ne figure pas dans le sitemap ;
- aucun lien ne pointe vers elle. Le test des liens le vérifie.

Le traitement est automatique : il disparaît dès qu'un contenu est publié dans le thème.

### 5. Images (constat 5)

Tu n'ajoutes aucune image toi-même : les images sont fournies par Sébastien, sous licence contrôlée.

À faire :

- vérifie que le bandeau typographique de repli et l'accueil sans planche ont l'air finis, et non « en attente » ;
- dans `GUIDE-BACK-OFFICE.md`, ajoute une fiche « Ta première image en 5 minutes » : où trouver une image du domaine
  public, quelle licence choisir, où la téléverser, comment vérifier le résultat en préproduction.

### 6. Statut « relu » et vérification automatique des annales (constat 6)

- Ajoute dans `CLAUDE.md`, section « Relecture humaine » : « Claude ne pose jamais le statut `relu`. Seul Sébastien
  le pose, depuis le back-office. »
- Ne change pas le statut de l'annale existante : Sébastien le confirmera lui-même.
- Ajoute un test automatique « annale parfaite » pour chaque annale déposée, quel que soit son statut :
  - lire la configuration des questions embarquée dans le fichier, sans le modifier ;
  - saisir pour chaque question la réponse attendue (valeur et unité, référence, ensemble, oui/non, premier motif de
    mots-clés) ;
  - pour chaque tracé, cocher tous les critères de la grille ;
  - vérifier que la note globale vaut 20/20 en mode entraînement et en mode examen, et qu'aucune erreur JavaScript
    n'apparaît.
- Un échec bloque la publication. Si une partie ne peut pas être automatisée de façon générique (un type de
  correction, par exemple), dis précisément laquelle dans la note.

### 7. Mentions légales (constat 7)

- La construction refuse `indexable: true` tant que l'éditeur (nom), le directeur de publication ou le contact sont
  vides. Le message d'erreur dit quel champ remplir dans « Réglages du site ».
- En préproduction, la page affiche « À compléter avant l'ouverture » pour chaque champ vide, au lieu d'un texte
  vide.
- Ajoute une section « Sources et licences » qui renvoie vers `/credits/`.

### 8. Source et licence des annales (nouveau, TRAME § 11)

Les sujets d'éduscol STI sont sous licence CC BY-NC-SA 2.0 FR : attribution obligatoire, usage non commercial,
partage dans les mêmes conditions. Les annales du bac publiées sur eduscol.education.gouv.fr sont sous Licence
Ouverte etalab 2.0.

Ajoute à `annale.json` un champ `source` :

```json
"source": {
  "editeur": "éduscol STI",
  "url": "https://…",
  "licence": "cc-by-nc-sa-2.0-fr",
  "reference_autorisation": ""
}
```

`licence` prend une valeur parmi une liste fermée : `cc-by-nc-sa-2.0-fr`, `etalab-2.0`, `autorisation-ecrite` (avec
`reference_autorisation` obligatoire), `oeuvre-personnelle`.

- Le champ est obligatoire pour publier, c'est-à-dire au statut `relu` ; il est facultatif en brouillon. Ajoute-le au
  formulaire « Annales » du back-office et à `outils/annale.py`.
- Une ligne de crédit est toujours affichée dans la fiche, quel que soit `afficher_origine`. Le lien porte sur le nom
  de l'éditeur. Textes :
  - CC BY-NC-SA : « D'après un sujet publié par éduscol STI, licence CC BY-NC-SA 2.0 FR. Adaptation interactive :
    industrie.education, sous la même licence. »
  - etalab : « D'après un document publié par éduscol, Licence Ouverte 2.0. Adaptation : industrie.education. »
  - autorisation écrite : « Reproduit avec l'autorisation de <éditeur>. »
  - œuvre personnelle : « Sujet original : industrie.education. »
- `/credits/` gagne une section « Annales » : titre, éditeur et lien source, licence.
- Pré-remplis l'annale existante, valeurs à confirmer par Sébastien (signale-le dans la note) :
  - `origine` : diplôme « BTS Maintenance industrielle », épreuve « E4 », session 2013 ;
  - `source` : éditeur « éduscol STI », licence `cc-by-nc-sa-2.0-fr`, URL
    `https://sti.eduscol.education.fr/sites/eduscol.education.fr.sti/files/concours-examens/5111/5111-dossier-questionnaire-epreuve-e4-bts-mi-2013-metropole.docx` ;
  - ne change pas `afficher_origine`.
- Mets à jour TRAME § 11 (champ `source`, ligne de crédit indépendante de `afficher_origine`).
- Ajoute à TRAME § 13 ce point en attente : « Autorisation écrite de la DGESCO pour présenter des annales sous licence
  NC sur un site qui affichera des partenaires. D'ici là, aucun encart partenaire sur une page qui porte un contenu
  sous licence NC. »

### 9. Mesure d'audience

Umami est déjà branché : le script est ajouté quand `site.json` → `umami` est renseigné, et le back-office a ce champ
dans « Réglages ». À compléter :

- **Adresse du script réglable.** Le compte Umami Cloud est créé dans une région de données (UE prévue), et l'adresse
  du script peut en dépendre. Ajoute `umami_script` dans `site.json` et dans « Réglages ».
  - Valeur par défaut : `https://cloud.umami.is/script.js`.
  - Contrôle : une adresse https complète.
  - Le test « aucune requête tierce » autorise ce seul hôte, et seulement quand `umami` est renseigné. Teste les deux
    cas.
- **Événements**, cinq au plus, sans aucune donnée personnelle :
  - noms : `annale-entrainement`, `annale-examen`, `annale-copie-corrigee`, `annale-impression`, `projeter` ;
  - seule propriété : l'identifiant de l'annale ou de la page ;
  - envoi via `umami.track()` dans `commun.js`, seulement si `window.umami` existe ;
  - sans JavaScript, rien ne change.
- Pour les annales, n'ajoute rien dans le fichier : écoute les clics par délégation depuis l'enveloppe, sur les
  boutons dont les libellés sont fixés par le gabarit du projet Claude (« Commencer l'entraînement », « Composer en
  mode examen », « J'ai fini, je fais corriger ma copie », « Imprimer ma copie »).
- **Recherche et filtres** : n'ajoute pas d'événement. Les paramètres d'adresse suffisent ; vérifie qu'Umami les
  conserve.
- Mets à jour les mentions légales (comptage anonyme de quelques actions) et la page « À propos ».
- Dans `GUIDE-BACK-OFFICE.md`, ajoute une section « Mesure d'audience » :
  - créer le compte Umami Cloud gratuit en choisissant la région UE (choix définitif) ;
  - déclarer le site, copier l'identifiant et l'adresse du script dans « Réglages » ;
  - les 6 chiffres à regarder une fois par mois : visiteurs, pages les plus vues, sources d'arrivée, annales
    commencées, copies corrigées, projections ;
  - les limites du plan gratuit : nombre d'événements par mois, 6 mois d'historique.

### 10. Résumé de publication

À chaque construction dans l'Action, écris un résumé lisible dans le récapitulatif du job (`$GITHUB_STEP_SUMMARY`) :

- publiés et brouillons, par type ;
- annales sans source ;
- cartes sans image ;
- planche d'accueil présente ou non ;
- poids de l'accueil ;
- mentions légales complètes ou non ;
- indexable.

C'est le tableau de bord éditorial de Sébastien. Il ne contient que des comptes, aucun secret. Indique dans le guide
où le trouver.

### 11. Labo et Maquettes « à venir » (reste du lot 1b, écart 7)

- Crée les pages `/labo/` et `/maquettes/` (TRAME § 3) avec le composant « Bloc Bientôt » de `DESIGN.md`. Elles ne
  donnent aucune date et ne contiennent aucun formulaire.
- Textes de départ, modifiables dans le back-office (rubrique « Accueil ») :
  - Labo : « Des travaux pratiques guidés sur des systèmes réels : mesurer, régler, diagnostiquer. »
  - Maquettes : « Des maquettes numériques à manipuler : démonter, animer, mesurer. »
- Sur l'accueil, ajoute un bloc sobre « Bientôt » qui renvoie vers ces deux pages, après « Annales ». Respecte le
  poids de l'accueil et la grille M1.
- Ne les ajoute pas à la navigation principale.

### 12. Back-office plus lisible

- Range les rubriques par fréquence d'usage : Annales, Contenus, Images et crédits, Accueil, Notions, Thèmes,
  Réglages.
- Donne à chacune une ligne d'aide en français.
- En tête de `GUIDE-BACK-OFFICE.md`, ajoute l'accès :
  - aller sur app.pagescms.org et se connecter avec GitHub ;
  - installer l'application GitHub de Pages CMS sur le compte, en limitant l'accès au dépôt `industrie-education` ;
  - ouvrir le dépôt et mettre l'adresse en favori ;
  - après chaque enregistrement, compter environ 2 minutes avant que la préproduction soit à jour, et savoir où voir
    le résultat.

### 13. Documentation

- `CLAUDE.md` : la règle « Images » prend la liste fermée des licences de `medias/CREDITS.json` (domaine public, CC0,
  œuvre personnelle, autorisation écrite avec référence). Ajoute aussi la règle du statut `relu` (§ 6).
- `TRAME.md` :
  - § 7 : lot 1b « livré (PR n° 3) », nouvelle ligne « 1c » ;
  - § 9 : nouveaux champs du back-office ;
  - § 11 et § 13 : voir § 8 de ce prompt.
- `DESIGN.md` : fiche d'annale compacte, ligne de crédit, bloc « Bientôt » de l'accueil.
- `NOTE-DE-LIVRAISON.md` : remplacée par celle du lot 1c, qui garde en annexe les écarts du lot 1b encore ouverts.

## Tests à ajouter ou adapter

Tous verts avant la pull request :

- hauteur de la fiche d'annale à 360 px et position du titre à 1280 × 800 ;
- filière visée et active ;
- identifiant de notion inconnu qui arrête la construction ; libellés accentués affichés ;
- thème vide non lié, absent du sitemap ;
- annale parfaite à 20/20, dans les deux modes, sans erreur JavaScript ;
- `indexable: true` refusé si les mentions sont incomplètes ;
- source obligatoire au statut `relu` ; ligne de crédit présente sur chaque annale publiée ; section « Annales » de
  `/credits/` ;
- requêtes tierces : aucune sans Umami ; seulement l'hôte de `umami_script` avec Umami ;
- événements envoyés seulement quand `window.umami` existe (simulé) ;
- pages `/labo/` et `/maquettes/` : un seul `h1`, lisibles à 360 px, accessibles sans JavaScript ;
- poids de l'accueil, liens internes, un seul `h1` sur toutes les pages.

## Hors périmètre

- La reprise des 37 dépôts, le socle de référencement et la bascule du domaine (lot 1).
- Toute modification de l'intérieur d'un fichier autonome.
- Tout autre outil de mesure.
- Les encarts partenaires.
- Les articles « Méthodes » (lot 4).
- Les écarts du lot 0 et du lot 1b que Sébastien tranchera avant la livraison finale (TRAME § 13).

Toute nouvelle dépendance se justifie dans la note de livraison.

## Fin de session

`npm test` est vert, la note de livraison est à jour (fait, testé, à faire par Sébastien, écarts), et la pull
request est ouverte. Ensuite, arrête-toi.
