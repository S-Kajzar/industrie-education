# Note de livraison — lot 1c : préproduction montrable

Branche `claude/gifted-mccarthy-1rs5w8`, repartie de `main` après la fusion du lot 1b (PR n° 3). Prompt :
`prompts/LOT-1C.md`. `npm test` : **311 tests, tous verts** (environ 1 min 10, sans réseau). Aucune nouvelle
dépendance.

## Fait

1. **Fiche d'annale compacte** (constat 1).
   - Plus de titre ni de présentation dans la fiche : ce sont ceux du fichier, juste en dessous. Le `<title>` et la
     meta description du site sont inchangés.
   - La fiche est un bandeau : surtitre « Annale corrigée et interactive · filières », durée, filières, thème,
     notions, « Pour réviser », ligne de crédit.
   - **Bouton « Commencer » supprimé** : la fiche ne fait plus que 131 px de haut à 1280 px, et le titre du sujet
     arrive au premier écran ; le bouton ne servait plus à rien.
   - Mesures (test) : 283 px de haut à 360 px (limite 300) ; à 1280 × 800, le bas du titre du sujet est à 336 px.
   - `DESIGN.md` § 5 : composants « Fiche d'annale » et « Ligne de crédit ».
2. **Filières cohérentes** (constat 2).
   - `bts-ms` est actif. L'accueil affiche « BTS MS · 1 annale ».
   - Les pages de filière et de thème listent aussi leurs annales (groupe « Annales »), sinon `/bts-ms/` aurait
     affiché « 0 contenu ».
   - Un test échoue si une filière visée par un contenu ou une annale publiés est inactive, en nommant la filière
     et le contenu.
3. **Notions avec libellés** (constat 3).
   - `catalogue/notions.json` (7 notions de départ) ; les pages affichent les libellés accentués.
   - Un identifiant inconnu arrête la construction et propose les proches (« cinematique » → « Identifiants
     proches : cinematique-graphique »).
   - Back-office : rubrique « Notions ». **Pages CMS ne sait pas lire des options dans un fichier** : les listes
     `select` sont écrites dans `.pages.yml` et les références ne visent que des rubriques de type collection.
     Vérifié dans le code de Pages CMS 2.1.8 (pagescms.org n'est pas joignable depuis la session). La saisie reste
     libre, contrôlée par la construction (écart n° 12).
4. **Thèmes vides** (constat 4). Traitement automatique : un thème sans contenu ni annale publiés est inactif.
   - Accueil : « Bientôt » à la place du nombre, ligne non cliquable. Catalogue : filtre « bientôt », désactivé.
   - Pas de page, absent du sitemap, aucun lien vers lui (le lien de thème des collections et de la fiche
     d'annale devient du texte).
   - Le traitement disparaît dès qu'un contenu y est publié (testé sur un dépôt factice).
5. **Images** (constat 5). Aucune image ajoutée.
   - Le bandeau typographique, sans image, ressemblait à un emplacement vide (grand aplat sombre). Il reçoit une
     trame de papier millimétré (jetons `--encre` et `--encre-2`), qui en fait un visuel fini (écart n° 2).
   - L'accueil sans planche, vérifié par captures à 1280 et 360 px, a l'air fini : rien à changer.
   - `GUIDE-BACK-OFFICE.md`, partie 2 : « Ta première image en 5 minutes ».
6. **Statut « relu » et annale parfaite** (constat 6).
   - Règle ajoutée dans `CLAUDE.md`. Le statut de l'annale existante n'est pas modifié.
   - Nouveau test `tests/annale-parfaite.spec.js`, pour chaque annale déposée, quel que soit son statut :
     - il lit `window.__QCFG__` et `window.__SKCFG__` sans modifier le fichier ;
     - il génère la réponse attendue de chaque question pour les six types de correcteurs trouvés : `num` (valeur et
       unité), `kw` (premier motif), `code` (référence), `intset` (ensemble), `yesno`, `chasles` (relation de
       composition construite avec les solides déclarés) ;
     - chaque réponse est d'abord vérifiée auprès du correcteur du fichier, puis saisie comme par un élève ;
     - il coche tous les critères de chaque tracé ;
     - il exige 20,0/20 en entraînement et en examen, sans erreur JavaScript.
   - Annale existante : **20/20 dans les deux modes**. Un échec bloque la publication (`npm test`).
   - **Ce que le test ne peut pas vérifier** :
     - la justesse du tracé lui-même, auto-évalué par l'élève : le test vérifie la grille et la note, pas le dessin ;
     - la conformité des réponses attendues au corrigé officiel : le test vérifie que chaque réponse attendue est
       acceptée et compte ses points.

     Il dépend aussi des conventions du gabarit du projet Claude (`__QCFG__`, `__SKCFG__`, `.q`, `.fast-q`,
     `.sketch`, `#exam-submit`, `#recap .final-note`). Si une version du gabarit les change, le test échoue avec
     un message explicite ; un nouveau type de correcteur échoue en donnant son nom.
7. **Mentions légales** (constat 7).
   - La construction refuse `indexable: true` tant que le nom de l'éditeur, le directeur de la publication ou
     l'adresse de contact sont vides. Le message cite les champs à remplir dans « Réglages du site ».
   - En préproduction, chaque champ vide affiche « À compléter avant l'ouverture ».
   - Nouvelle section « Sources et licences », qui renvoie vers `/credits/`.
8. **Source et licence des annales** (TRAME § 11).
   - Nouveau champ `source` (éditeur, adresse, licence de la liste fermée, référence d'autorisation), obligatoire au
     statut `relu` et facultatif en brouillon. Il est contrôlé par la construction et par
     `python3 outils/annale.py annales/<id>.json`.
   - Ligne de crédit toujours affichée dans la fiche, avec un lien sur le nom de l'éditeur, quel que soit
     `afficher_origine`.
   - Section « Annales » de `/credits/` (titre, éditeur, lien source, licence, ligne de crédit).
   - Annale existante pré-remplie (à confirmer, voir « À faire ») : origine « BTS Maintenance industrielle », « E4 »,
     2013 ; source éduscol STI, `cc-by-nc-sa-2.0-fr`, adresse donnée par le prompt. `afficher_origine` reste
     `false`.
   - TRAME § 11 et § 13 mis à jour (point DGESCO ajouté).
9. **Mesure d'audience**.
   - `umami_script` dans `site.json` et dans « Réglages du site » : une adresse en https complète, par défaut
     `https://cloud.umami.is/script.js`.
   - Cinq événements envoyés par `commun.js` via `umami.track()`, seulement si `window.umami` existe :
     `annale-entrainement`, `annale-examen`, `annale-copie-corrigee`, `annale-impression`, `projeter`. Seule
     propriété : `page` (identifiant de l'annale ou de la page).
   - Les annales ne sont pas touchées : les clics sont écoutés depuis l'enveloppe, par délégation, sur les libellés
     fixés par le gabarit.
   - **Recherche et filtres** : aucun événement. Le code d'Umami (dépôt `umami-software/umami`) confirme qu'il
     conserve les paramètres d'adresse (sauf `data-exclude-search`). Il compte aussi une page vue à chaque
     `history.replaceState`, et le catalogue réécrivait l'adresse à chaque frappe : une recherche de 8 lettres
     aurait compté 8 pages vues. L'adresse est maintenant écrite après 800 ms de pause dans la frappe, et tout de
     suite avant de suivre un lien, de projeter ou de quitter la page (écart n° 6).
   - Mentions légales et À propos décrivent le comptage anonyme. `GUIDE-BACK-OFFICE.md`, partie 7 : compte UE,
     réglages, les 6 chiffres du mois, limites du plan gratuit.
10. **Résumé de publication**.
    - `python3 outils/construire.py --resume "$GITHUB_STEP_SUMMARY"`, nouvelle étape de l'Action avant les tests.
    - Il donne :
      - les publiés et brouillons par type ;
      - les annales sans source et les cartes sans image ;
      - la présence de la planche d'accueil et le poids de l'accueil ;
      - l'état des mentions légales et de l'indexation, et la mesure d'audience.
    - Une construction arrêtée y écrit son message. Où le lire : guide, partie 8.
11. **Labo et Maquettes « à venir »**.
    - Pages `/labo/` et `/maquettes/` (gabarit `vitrine-section`) : bloc « Bientôt » avec la promesse, sans date ni
      formulaire, hors navigation principale, dans le sitemap.
    - Textes dans `catalogue/a-venir.json`, modifiables dans la rubrique « Accueil » ; planche facultative.
    - Sur l'accueil, bloc « Bientôt » sobre après « Annales », sur la grille M1. Poids de l'accueil : 120,2 ko
      mesurés (112,7 ko au lot 1b).
12. **Back-office plus lisible**.
    - Rubriques dans l'ordre Annales, Contenus, Images et crédits, Accueil, Notions, Thèmes, Réglages du site,
      chacune avec une ligne d'aide.
    - Nouveaux champs : source des annales, Labo et Maquettes, rubrique Notions, adresse du script Umami. Le tout
      est toujours validé par le schéma de Pages CMS (test).
    - `GUIDE-BACK-OFFICE.md` commence par l'accès (connexion, application limitée au dépôt, favori, environ
      2 minutes, où voir le résultat).
13. **Documentation** : `CLAUDE.md` (images : liste fermée des licences ; statut `relu`), `TRAME.md` (§ 2, 3, 4, 6,
    7, 9, 11, 13), `DESIGN.md` (fiche compacte, ligne de crédit, bloc « Bientôt », bandeau tramé, thème « Bientôt »),
    `GUIDE-BACK-OFFICE.md` (réécrit), `README.md`.
14. **Console de la page d'annale**. Relevé avec Chromium complet, par son protocole de débogage (journal,
    interventions, signalements « Issues ») ; Chromium sans interface ne remonte rien.
    - **De l'enveloppe** : « Failed to load resource : 404 (favicon.ico) ». Aucune page du site ne déclarait
      d'icône, et le navigateur demandait `/favicon.ico`. **Corrigé** : `<link rel="icon" href="data:,">` sur toutes
      les pages (aucune requête), test à l'appui.
    - **Du fichier autonome** : 14 signalements « A form field element should have an id or name attribute »
      (champs de saisie sans `id` ni `name`), identiques sur le fichier d'origine. **Non corrigé** : le fichier
      n'est pas modifié ; à faire corriger dans le gabarit du projet Claude.
    - Aucune erreur JavaScript, aucun autre avertissement. Firefox et Safari n'ont pas pu être vérifiés : seul
      Chromium est disponible dans la session.

## Testé

| Exigence du lot | Test |
|---|---|
| Fiche d'annale : ni titre ni présentation répétés, informations, « Pour réviser », crédit, pas de « Commencer », un seul `h1` ; ≤ 300 px à 360 px ; titre du sujet au premier écran à 1280 × 800 | `tests/annale.spec.js` |
| Annale parfaite : 20/20 en entraînement et en examen, sans erreur JavaScript, pour chaque annale déposée | `tests/annale-parfaite.spec.js` |
| Filière visée par un contenu ou une annale publiés : active | `tests/coherence.spec.js` |
| Notions : libellés accentués affichés ; identifiant inconnu refusé avec les proches ; fichier des notions valide | `tests/coherence.spec.js` |
| Thèmes vides : pas de page, absents du sitemap, aucun lien, « Bientôt » sans lien sur l'accueil, filtre désactivé ; retour automatique avec un contenu publié | `tests/coherence.spec.js`, `tests/liens.spec.js`, `tests/pages.spec.js` |
| `indexable: true` refusé si l'un des trois champs manque (message par champ) ; accepté quand ils sont remplis ; « À compléter avant l'ouverture » ; section « Sources et licences » | `tests/coherence.spec.js`, `tests/construction.spec.js` |
| Source obligatoire au statut `relu` (absente, licence hors liste, autorisation sans référence), facultative en brouillon ; ligne de crédit des quatre licences, avec et sans `afficher_origine` ; ligne présente sur chaque annale publiée ; section « Annales » de `/credits/` ; `annale.py` sur les fiches | `tests/coherence.spec.js`, `tests/images-annales.spec.js` |
| Requêtes tierces : aucune sans Umami (chaque page) ; avec Umami (site factice, script simulé), seul l'hôte de `umami_script` ; adresse du script contrôlée | `tests/requetes.spec.js`, `tests/construction.spec.js` |
| Événements : les quatre boutons d'annale et Projeter, une fois chacun, avec `page` seul ; rien sans `window.umami` ; aucun événement pour la recherche et les filtres ; adresse réécrite une seule fois après la frappe ; adresse à jour avant Projeter | `tests/mesure.spec.js` |
| Labo et Maquettes : un seul `h1`, 360 px, sans JavaScript, sans date ni formulaire, hors navigation ; bloc de l'accueil après « Annales » | `tests/coherence.spec.js`, `tests/pages.spec.js`, `tests/mobile.spec.js` |
| Icône vide sur chaque page (pas de 404 `favicon.ico`) | `tests/coherence.spec.js` |
| Résumé de publication : comptes attendus ; message en cas d'arrêt | `tests/coherence.spec.js` |
| Back-office : ordre des rubriques et aide de chacune ; licences de la source = `annale.py` ; Labo et Maquettes ; notions ; adresse Umami ; schéma Pages CMS | `tests/back-office.spec.js` |
| Poids de l'accueil, liens internes, un seul `h1`, tous les tests des lots 0 et 1b | suite complète |

## À faire par Sébastien

1. **Confirmer l'annale existante** (rubrique Annales) :
   - les valeurs pré-remplies : origine « BTS Maintenance industrielle », « E4 », 2013 ; source éduscol STI, licence
     CC BY-NC-SA 2.0 FR, adresse du dossier questionnaire ;
   - son statut `relu`, posé au lot 1b sans votre relecture : faites le sujet en entraînement, puis confirmez, ou
     repassez-le en « Brouillon » ;
   - décider la valeur par défaut de `afficher_origine` (TRAME § 13).
2. **Mentions légales** (Réglages du site) : nom de l'éditeur, directeur de la publication, adresse de contact
   (l'adresse postale est facultative pour la construction).
3. **Umami** : créer le compte en région UE et renseigner l'identifiant et l'adresse du script (guide, partie 7).
   Vérifier ensuite, dans l'onglet Réseau du navigateur, quels hôtes sont contactés (écart n° 13).
4. **Premières images et planches**, avec leurs licences (guide, parties 2 et 3).
5. **Projet Claude « Exercices interactifs »** :
   - donner un `id` ou un `name` aux champs de saisie du gabarit (14 avertissements de console) ;
   - régénérer à l'occasion le fichier de la première annale avec la ligne de crédit que demande désormais le
     prompt (la fiche du site l'affiche déjà).
6. **Demander à la DGESCO** l'autorisation écrite prévue en TRAME § 13 avant tout encart partenaire.
7. **Trancher** les écarts n° 1, 2, 9 et 11 ci-dessous, et ceux des annexes.

## Écarts avec TRAME, DESIGN, CLAUDE.md et le prompt

1. **Annales sur les pages de filière et de thème** : le prompt ne le demande pas. Sans cela, `/bts-ms/`
   (filière désormais active) affichait « 0 contenu » alors qu'une annale existe. L'accueil compte de même
   « 1 annale », ou « 4 contenus, 1 annale ». **À valider.**
2. **Bandeau des cartes tramé** (quadrillage de 16 px) : nouveau traitement visuel, ajouté à DESIGN § 5. Il utilise
   `color-mix()` : un navigateur antérieur à 2023 affiche le fond encre uni. **À valider.**
3. **Bouton « Commencer » supprimé** (voir « Fait », point 1).
4. **`annale-copie-corrigee`** est compté au clic sur « J'ai fini, je fais corriger ma copie ». Le gabarit demande
   ensuite une confirmation, qui n'est pas comptée : un élève qui renonce à cette étape est compté quand même.
5. **Propriété des événements** : nommée `page`.
6. **Recherche du catalogue** : l'adresse n'est plus réécrite à chaque frappe, mais après 800 ms de pause (voir
   « Fait », point 9). Les filtres réécrivent toujours l'adresse tout de suite.
7. **Poids de l'accueil dans le résumé** : estimation statique, plus haute que la mesure du test (141 ko contre
   120 ko), car elle compte les trois graisses de police et `projeter.js`. La mesure exacte reste le test
   `tests/poids.spec.js`.
8. **Règles ajoutées à la source** :
   - l'éditeur est obligatoire, sauf pour une œuvre personnelle ;
   - l'adresse est obligatoire pour les deux licences ouvertes, l'attribution l'exigeant.
9. **`catalogue/a-venir.json`** : TRAME § 9 prévoyait une liste d'annonces (titre, type, description, échéance
   indicative). Le prompt demande deux textes sans date : le fichier est donc un objet `{labo, maquettes}` (titre,
   promesse, planche), dans la rubrique « Accueil ». TRAME § 4, 6 et 9 sont mis à jour. La liste d'annonces sur
   les pages de section n'est pas faite. **À valider.**
10. **Mentions légales en production** : un champ facultatif resté vide (adresse de l'éditeur) n'est pas affiché ;
    le prompt n'exige que les trois autres.
11. **Titre de la page Crédits** : « Crédits des images » devient « Crédits », puisqu'elle couvre aussi les
    annales. **À valider.**
12. **Notions en saisie libre** dans les fiches, faute de liste tirée d'un fichier dans Pages CMS (voir « Fait »,
    point 3).
13. **Hôte d'envoi d'Umami Cloud** : `cloud.umami.is` n'est pas joignable depuis la session. Le code d'Umami
    permet au service hébergé d'envoyer les mesures vers un hôte différent de celui du script. Le test simule
    l'envoi vers l'hôte du script ; si le vrai script en contacte un second, il faudra l'ajouter au test et à la
    page de confidentialité.
14. **Limites du plan gratuit d'Umami** (100 000 événements par mois, 6 mois d'historique) : données de mémoire,
    signalées comme « à vérifier » dans le guide.
15. **Le tableau de bord construit le site une fois de plus** dans l'Action (environ 2 s, images en cache) : il est
    calculé avant les tests, pour que le message d'une construction arrêtée y figure.
16. **CLAUDE.md, règle « Public mineur »** : « seulement si `site.json` contient un identifiant » reste vrai ;
    l'adresse du script vient maintenant de `site.json` → `umami_script`.

---

# Annexe A : écarts du lot 1b encore ouverts

Résolus par le lot 1c :

- n° 1, licences d'images (CLAUDE.md aligné sur TRAME) ;
- n° 7, pages Labo et Maquettes, bloc « Bientôt », rubrique « à venir » (les articles restent au lot 4) ;
- n° 8, notions sans accents.

Restent :

- **n° 2 `catalogue/a-la-une.json`** passe de `[…]` à `{"contenus": […]}` (limite de Pages CMS ; l'ancien format
  reste accepté). **À valider.**
- **n° 3 Bandeau des cartes en 16/9** au lieu de 16/7 (DESIGN § 5 : image 16/9 de même hauteur que le bandeau ;
  toutes les cartes sont un peu plus hautes). **À trancher.**
- **n° 4 Champs ajoutés** : `decorative` (CREDITS.json), `illustration_accueil` (site.json), `illustration` des
  thèmes, `statut` et `fichier` des contenus ; au lot 1c, `umami_script` (site.json) et `source` (annales, prévu par
  le prompt). **À valider.**
- **n° 5 Type « Annale »** dans le filtre Type du catalogue ; une filière inactive devient choisissable dès qu'elle a
  une carte.
- **n° 6 Deux `<title>`** sur une page d'annale : celui du site, en tête de `<head>`, fait foi ; celui du fichier
  reste en place (corps non modifié).
- **n° 9 « Pour réviser »** : aucun cours ne partage encore une notion avec l'annale ; seul lien, l'exercice
  `cadre-velo`.
- **n° 10 Données structurées** : lot 1.
- **n° 11 Niveaux** : liste fermée 1 à 3.
- **n° 12 Format de l'origine** : « diplôme session épreuve » (TRAME § 12.1).
- **n° 13 Couche CSS** : la fiche d'annale est une pièce de l'enveloppe (préfixes `:where(…)` de `commun.css`).

Limites de Pages CMS constatées au lot 1b (code de Pages CMS 2.1.8, commit `6f4e860`) :

- **Taille de téléversement** : le fichier part en une seule requête, encodé en base64 ; au-delà de 3 Mo environ,
  le dépôt peut échouer (repli : téléverser sur GitHub, guide).
- **Une sous-rubrique par collection** : chaque nouvelle collection doit recevoir la sienne dans `.pages.yml` ; un
  test le rappelle.
- **Fichiers dont la racine est une liste** : réécrits en entier, sans fusion.
- **Valeurs par défaut** : elles s'appliquent aussi aux fiches existantes, d'où l'absence de statut par défaut sur
  les contenus.
- **Listes fermées** : enregistrées en texte.
- **Références** : vers des collections seulement.
- **Interface** : en anglais.
- **Branche `main`** : elle ne doit pas exiger de pull request.

# Annexe B : écarts du lot 0 encore ouverts (TRAME § 13)

- **n° 2 Liens d'origine des contenus repris** : `cadre-velo.html` contient un lien vers
  `cours-statique-analytique.html`, cassé tant que le cours n'est pas repris (exception de
  `tests/liens-connus.json`). **À trancher pour le lot 1** : réécrire ces liens à la reprise, ajouter des
  redirections, ou accepter des exceptions.
- **n° 3 Hauteur du titre d'accueil** : la hauteur réservée est celle du plus long des six titres, pour éviter
  tout saut ; les titres de deux lignes laissent un espace vide sous eux. **À choisir** : pas de saut (actuel) ou
  espace minimal.
- **n° 5 Champs ajoutés au lot 0** : `origine` et `hebergeur` dans `site.json`, `editeur` en objet, `court` dans les
  thèmes, `niveau` et `duree_min` facultatifs. **À valider.**
