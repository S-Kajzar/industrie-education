# Note de livraison — lot 0 : socle du site

Branche `claude/gifted-mccarthy-1rs5w8`. `npm test` : **240 tests, tous verts** (environ 40 s, sans réseau).

## Fait

1. **Structure du dépôt** conforme à TRAME § 4 : `site.json`, `catalogue/`, `contenus/`, `annales/` (vide,
   lot 2), `gabarits/`, `statique/`, `outils/construire.py`, `tests/`, `.github/workflows/publier.yml`.
   `requirements.txt` (Jinja2 3.1.6), `package.json` + `package-lock.json` (`@playwright/test` 1.63.0,
   `@fontsource/barlow-condensed` 5.3.0), `.gitignore` (`_site/`, `node_modules/`…). `outils/reprendre.py` n'est
   pas créé (lot 1).
2. **`site.json`** : nom, `base` = `/industrie-education/`, `indexable: false`, `umami` vide, éditeur et contact
   vides, les 6 titres d'accueil (coupures de ligne de la maquette M1), plus deux champs signalés plus bas
   (`origine`, `hebergeur`).
3. **`statique/`**, publié sous `/_/` :
   - `commun.css` complété : classes de la charte reprises (cartouche, consignes, parties, barre de question,
     données, tableau), accueil, catalogue, listes, collection, contenu natif, pages de service, enveloppe, calque
     Projeter, mobile, projection, impression. Aucun jeton modifié (voir l'écart n° 1 sur la portée des règles).
   - `polices/` : Barlow Condensed 600, 700, 800 (sous-ensemble latin, woff2) et `OFL.txt`.
   - `commun.js` : titre évolutif, filtres du catalogue avec état dans l'adresse, mode projection (interrupteur et
     touche P). Sans cookie, sans stockage, sans requête.
   - `projeter.js` : calque plein écran, QR code (64 % de la hauteur de l'écran), adresse, « Copier le lien »,
     Échap, focus piégé et rendu au bouton, reste de la page inerte. La bibliothèque QR (`lib/qrcode.js`,
     qrcode-generator 2.0.4, MIT, licence à côté) n'est chargée qu'à la première ouverture.
4. **Gabarits Jinja2** : `base`, `accueil`, `catalogue`, `liste`, `collection`, `contenu`, `annales`, `service`
   (+ `_composants.html`, `_enveloppe.html` et les textes de `service/`). Accueil et catalogue suivent les maquettes
   « Accueil retenue — M1 × charte atelier » et « Catalogue — M1 × charte atelier » du canvas.
5. **`outils/construire.py`** : toutes les pages de TRAME § 3 sauf `annale` (34 pages), `statique/` copié sous
   `_/`, enveloppe des contenus repris (TRAME § 5), `sitemap.xml`, `robots.txt`. La construction se fait dans
   `_site.en-cours/` et ne remplace `_site/` qu'en cas de succès. Arrêt avec message clair sur : nom de collection
   réservé, type, thème ou public inconnu, identifiant en double ou différent du nom de dossier, contenu de
   `a-la-une.json` introuvable, contenu repris sans `<head>`/`<body>` explicites.
6. **Contenus** :
   - 3 collections de démonstration (`demo-leviers` en mécanique, `demo-rendement` en énergie, `demo-binaire` en
     numérique), 8 contenus natifs courts à la charte atelier, marqués « Démonstration » (titre de collection,
     description, encadré en tête de page).
   - 1 contenu réel repris : `cadre-velo.html` de `S-Kajzar/STATIQUE` (commit `accf56b`, 8 octobre 2026), copié
     octet pour octet dans `contenus/statique/cadre-velo/index.html`. Ses images sont intégrées au fichier : il n'a
     aucune autre ressource. Il fonctionne enveloppé : corrections (20/20), impression, plein écran du tracé.
7. **Pages de service** : Enseignants (utiliser en classe, Projeter, Pronote), Partenaires (version sans
   partenaire : principes, « Devenir partenaire » avec le contact de `site.json`), À propos, Mentions légales
   (champs de `site.json`, mention « À renseigner » quand ils sont vides), 404 (recherche + Accueil, Catalogue,
   Annales).
8. **`.github/workflows/publier.yml`** : sur envoi vers `main`, installe, construit, teste (`npm test`) puis publie
   `_site/` (`actions/upload-pages-artifact` + `actions/deploy-pages`). Si les tests échouent, rien n'est publié.
9. **Documentation** : `README.md` (rôle du dépôt, commandes, ajouter un contenu en 3 étapes) et cette note.

## Testé

| Exigence du lot | Test |
|---|---|
| Chaque page de TRAME § 3 existe, un seul `h1`, `lang="fr"`, titre, description, focus visible | `tests/pages.spec.js` |
| Chaque page s'affiche sans JavaScript ; adresse inconnue → 404 avec recherche et 3 liens | `tests/pages.spec.js` |
| Aucun lien interne cassé (href, src, action, ancres, polices de `commun.css`) | `tests/liens.spec.js` |
| Aucune requête vers un autre hôte (chaque page, calque Projeter, catalogue filtré, contenu en entraînement) ; pas d'Umami | `tests/requetes.spec.js` |
| `noindex` partout et `robots.txt` fermé ; `sitemap.xml` complet | `tests/indexation.spec.js` |
| Accueil < 300 Ko au premier affichage (mesuré : **106 ko**, sans compression) ; aucune page > 1 Mo | `tests/poids.spec.js` |
| Titre évolutif : 16 dates simulées couvrant les 6 moments et leurs limites ; titre par défaut sans JavaScript ; aucun saut à 360 et 1280 px | `tests/titre.spec.js` |
| Catalogue : thème, type, filière, niveau, recherche sans accents, état dans l'adresse, « Effacer les filtres », aucun résultat, recherche de l'accueil, repli « Filtres » sur téléphone ; sans JavaScript, toutes les cartes | `tests/catalogue.spec.js` |
| 360 px : pas de défilement horizontal (toutes les pages, catalogue filtré, calque Projeter) | `tests/mobile.spec.js` |
| Contenu repris : fichier publié = original + ajouts de l'enveloppe ; aucun style du contenu modifié (élément par élément) ; 20/20 ; impression identique à l'original (même nombre de pages) ; plein écran ; mode projection | `tests/repris.spec.js` |
| Calque Projeter : QR ≥ 60 % de la hauteur, QR = adresse de la page, focus piégé, copie, Échap | `tests/projeter.spec.js` |
| Gabarit contenu natif : fil d'Ariane, précédent/suivant, Signaler, projection, corrections sans JavaScript | `tests/contenu.spec.js` |
| La construction s'arrête sur un nom réservé (dépôt factice) et sur les autres erreurs ; Umami et indexation suivent `site.json` | `tests/construction.spec.js` |

Contrôles à la main : captures à 1440 et 360 px comparées aux maquettes M1 ; vérification que le garde-fou « aucun
style écrasé » échoue bien quand on introduit une fuite volontaire dans `commun.css`.

## À faire par Sébastien

1. **Activer GitHub Pages en mode « GitHub Actions »** : Settings → Pages → Build and deployment → Source :
   « GitHub Actions ». Pages paraît déjà activé sur le dépôt : vérifier que la source n'est pas restée sur
   « Deploy from a branch ». Puis fusionner la pull request : la première publication part de `main`.
2. **Renseigner `site.json`** : `editeur.nom`, `editeur.adresse`, `editeur.directeur_publication`, `contact`
   (sert aussi à « Signaler une erreur » et « Devenir partenaire »). Vérifier `hebergeur`, prérempli avec GitHub.
   Plus tard : `umami` (identifiant du site), puis `indexable: true` à la bascule.
3. **Relire les textes** des pages Enseignants (en particulier la rubrique Pronote, restée volontairement générale),
   Partenaires, À propos et Mentions légales.
4. **Trancher les écarts n° 2, 3 et 5** ci-dessous.
5. **Retirer les contenus de démonstration** (`contenus/demo-*`) avant la bascule, et les remplacer dans
   `catalogue/a-la-une.json`.

## Écarts avec TRAME et DESIGN, points à trancher

1. **Lien vers `commun.css` dans un contenu repris** (TRAME § 5 : « après les styles du contenu sans les
   écraser »).
   - Un simple `<link>` placé après les styles du contenu écrasait ceux-ci : fond, boutons, couleurs de liens, et
     même l'impression (9 pages au lieu de 12).
   - Deux mesures ont été prises :
     - le lien est inséré sous la forme `<style>@import url("…/_/commun.css") layer(site);</style>` : en cas de
       conflit, le contenu gagne toujours ;
     - chaque règle de `commun.css` qui vise un élément HTML ou une classe susceptible d'exister dans un contenu est
       limitée aux pages du site (`body.vitrine`, `body.atelier`) et aux pièces de l'enveloppe par un préfixe
       `:where(…)`.
   - Ce préfixe a une spécificité nulle : le rendu des pages du site est inchangé (comparé au pixel près).
   - Un test compare désormais, pour chaque contenu repris, les styles calculés de chaque élément avec ceux du
     fichier d'origine : au lot 1, une fuite sera détectée automatiquement.
   - Conséquences :
     - l'enveloppe prend la typographie du contenu (police de titre de la charte, sans Barlow ; graisse des
       boutons) ;
     - un navigateur antérieur à 2022 affiche le bandeau sans mise en forme, mais le contenu reste intact.
   - Autres retouches de règles existantes (jetons inchangés) :
     - `!important` sur le fond et la taille de texte du mode projection, pour qu'il agisse aussi sur un contenu
       repris ;
     - `.visuellement-cache` rendu robuste (`!important`), car une légende masquée débordait de 82 px ;
     - le sélecteur du titre d'accueil est étendu à ses variantes.
2. **Liens d'origine du contenu repris** : `cadre-velo.html` contient trois liens `index.html`, qui mènent désormais
   à la page elle-même au lieu de l'accueil de STATIQUE, et un lien `cours-statique-analytique.html`, cassé tant
   que le cours 3 n'est pas repris. Le corps ne pouvant pas être modifié (TRAME § 5) alors qu'aucun lien interne ne
   doit être cassé (TRAME § 8), ce lien figure comme exception connue dans `tests/liens-connus.json`. **À trancher
   pour le lot 1** : réécrire ces liens à la reprise, ajouter des redirections, ou accepter des exceptions.
3. **Titre d'accueil évolutif** : la hauteur réservée est celle du plus long des six titres, pour qu'aucun moment
   ne fasse sauter la page (DESIGN § 7). Les titres de deux lignes, dont celui par défaut, laissent donc un espace
   vide sous eux (bien visible sur téléphone). La maquette réservait seulement 1,8 em, avec un saut d'une ligne
   pour les titres plus longs. **À choisir** : pas de saut (actuel) ou espace minimal.
4. **Deux `h1` dans `cadre-velo.html`** : un sur l'écran de choix du mode, un sur le sujet. Un seul est affiché à la
   fois. Pour les contenus repris, le test compte les `h1` affichés ; pour les autres pages, les `h1` présents.
5. **Champs ajoutés** :
   - dans `site.json` : `origine` (adresse du site, nécessaire aux URL absolues du sitemap) et `hebergeur`
     (mentions légales) ; `editeur` est un objet (nom, adresse, directeur de la publication) ;
   - dans `themes.json` : `court`, pour les noms courts des bandeaux de cartes de la maquette (« Mécanique » pour
     « Mécanique et conception ») ;
   - `niveau` et `duree_min` sont facultatifs (un formulaire n'a pas de niveau, comme dans la maquette).

   **À valider.**
6. **Défaut d'origine de `cadre-velo.html`** : à 360 px, en mode entraînement, le cartouche déborde de 4 px (grille
   `1fr` et champ « Nom et prénom »). Le défaut existe déjà dans STATIQUE et ne peut être corrigé qu'à la source.
   Le test vérifie que l'enveloppe n'ajoute rien. À l'ouverture, la page ne déborde pas.
7. **`robots.txt` en préproduction** : publié sous `/industrie-education/robots.txt`, il n'est pas lu par les
   moteurs, qui ne lisent que la racine du domaine `s-kajzar.github.io`. Ce qui protège la préproduction, c'est la
   balise `noindex` présente sur chaque page, contenus repris compris. Le fichier prendra effet avec le domaine.
8. **Catalogue** :
   - le bloc « Filière » est en lignes comme les autres filtres (DESIGN § 5), au lieu des pastilles de la maquette ;
   - le filtre « Niveau » (TRAME § 6), absent de la maquette, est ajouté sur le même modèle ;
   - Bac Pro MSPC et BTS MS sont `actif: false`, donc affichés « bientôt » comme dans la maquette ; leurs pages
     (`/bac-pro-mspc/`, `/bts-ms/`, `/annales/…/`) existent avec un message « en préparation ».
9. **Accueil** :
   - l'accroche de la maquette est conservée (« … corrigés automatiquement ») ; elle sera exacte après la reprise,
     les contenus de démonstration se corrigeant par dépliage ;
   - le moment affiché à gauche du titre (« Mercredi · 14 h ») vient aussi de la maquette.
10. **Mode projection** : il n'est pas mémorisé d'une page à l'autre (aucun stockage dans le navigateur). La touche
    P n'agit que sur les pages de contenu, où se trouve l'interrupteur. Les traits de 3 px ne s'appliquent qu'aux
    pages du site : un contenu repris garde ses traits.
11. **« Signaler une erreur »** : sans contact dans `site.json`, le lien mène à la rubrique « Signaler une erreur »
    d'À propos. Avec un contact, il ouvre un courriel prérempli (titre et adresse de la page). Le formulaire est
    prévu au lot 3.
12. **Identifiants et page 404** :
    - les identifiants de contenus sont uniques sur tout le site ; `a-la-une.json` accepte `cadre-velo` ou
      `statique/cadre-velo`, et de 3 à 6 entrées (TRAME § 6) ;
    - la 404 utilise des liens absolus (base de `site.json`), car GitHub Pages la sert à n'importe quelle adresse.

Dépendances : uniquement celles demandées par le lot (Jinja2, `@playwright/test`, `@fontsource/barlow-condensed`).
La bibliothèque QR est copiée dans `statique/lib/` (licence MIT jointe), sans dépendance npm. Les réponses du test
20/20 (`tests/reponses-cadre-velo.js`) sont reprises des tests de STATIQUE.
