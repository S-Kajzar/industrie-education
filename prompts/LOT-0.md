# Lot 0 — Socle du site

À coller dans une session Claude Code ouverte sur le dépôt `S-Kajzar/industrie-education`.

---

Tu travailles sur le dépôt `industrie-education`. Lis d'abord `CLAUDE.md`, `TRAME.md` et `DESIGN.md` en entier :
ils font foi. Ce lot pose le socle du site, sans reprendre les 37 anciens dépôts (c'est le lot 1).

Propose-moi d'abord un plan court (étapes et fichiers créés), puis réalise-le étape par étape, tests à l'appui.

## À livrer

1. **Structure du dépôt** conforme à TRAME § 4, avec `requirements.txt` (Jinja2), `package.json` (Playwright,
   `@fontsource/barlow-condensed`), `.gitignore` (`_site/`, `node_modules/`).

2. **`site.json`** : nom, `base` = `/industrie-education/`, `indexable: false`, `umami` (vide), éditeur et
   contact (vides), `titres_accueil` (les 6 titres de DESIGN.md § 7).

3. **`statique/`** : `commun.css` (déjà fourni, à compléter si un composant manque, sans changer les jetons),
   `polices/` (Barlow Condensed 600, 700, 800 en woff2, copiées depuis `@fontsource/barlow-condensed`),
   `commun.js` (titre évolutif de l'accueil, filtres du catalogue avec état dans l'adresse, mode projection),
   `projeter.js` (calque plein écran avec QR code d'au moins 60 % de la hauteur, adresse, « Copier le lien »,
   Échap, focus piégé ; bibliothèque QR copiée dans le dépôt, licence MIT).

4. **Gabarits Jinja2** (TRAME § 6) : `base`, `accueil`, `catalogue`, `liste`, `collection`, `contenu`, `annales`,
   `service`. Fidèles aux maquettes du canvas (accueil et catalogue) et à DESIGN.md.

5. **`outils/construire.py`** : lit `site.json`, `catalogue/`, `contenus/` et écrit `_site/` :
   - toutes les pages de TRAME § 3 (sauf `annale`, lot 2) ;
   - copie de `statique/` vers `_site/_/` ;
   - enveloppe des contenus `repris` (TRAME § 5) ;
   - `sitemap.xml` et `robots.txt` (fermé et `noindex` partout quand `indexable` vaut `false`) ;
   - arrêt avec un message clair si : nom de collection réservé, type ou public inconnu, identifiant en double,
     contenu de `a-la-une.json` introuvable.

6. **Contenus de démonstration** :
   - 3 collections factices (une en mécanique, une en énergie, une en numérique), 2 à 3 contenus chacune, avec un
     `index.html` court à la charte atelier, clairement marqués « Démonstration » ;
   - **1 contenu réel repris** : `cadre-velo.html` du dépôt public `S-Kajzar/STATIQUE` (cloner, copier le fichier
     et ses ressources), dans `contenus/statique/cadre-velo/`, `mode: "repris"`. Vérifier qu'il fonctionne
     enveloppé (corrections, impression, plein écran) sans modification de son corps.

7. **Pages de service** : Enseignants (utiliser en classe, Projeter, Pronote), Partenaires (version sans
   partenaire : principes — encarts toujours signalés, aucun ciblage, aucune donnée personnelle — et « Devenir
   partenaire » avec l'adresse de contact de `site.json`), À propos, Mentions légales (champs de `site.json`),
   404 (recherche + 3 liens).

8. **`.github/workflows/publier.yml`** : à chaque envoi sur `main`, installe, construit, lance les tests, puis
   publie `_site/` sur GitHub Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`). Les tests doivent
   passer pour publier.

9. **Tests** (`npm test`, sans réseau) :
   - chaque page de TRAME § 3 existe, a un seul `h1`, `lang="fr"`, un titre et une description ;
   - aucun lien interne cassé ;
   - aucune requête vers un autre hôte (Umami vide) ;
   - `noindex` et `robots.txt` fermé quand `indexable` vaut `false` ;
   - accueil < 300 Ko au premier affichage ;
   - titre évolutif : avec une date simulée, le bon titre pour chacun des 6 moments ; sans JavaScript, le titre par
     défaut ;
   - catalogue : filtre par thème, par type, recherche sans accents, état dans l'adresse, « Effacer les filtres »,
     message si aucun résultat ; sans JavaScript, toutes les cartes affichées ;
   - à 360 px de large : pas de défilement horizontal sur l'accueil, le catalogue et le contenu repris ;
   - la construction s'arrête sur un nom de collection réservé (dépôt factice).

10. **Documentation** : `README.md` (à quoi sert le dépôt, commandes, ajouter un contenu en 3 étapes) et
    `NOTE-DE-LIVRAISON.md`.

## Hors de ce lot

Reprise des 37 dépôts, pages relais, domaine, annales interactives, comptes, encarts partenaires.

## À la fin

Tests verts, pull request, note de livraison avec : ce qui est fait, ce qui est testé, ce que Sébastien doit faire
(activer GitHub Pages en mode « GitHub Actions » dans les réglages du dépôt, renseigner `site.json`), et les écarts
avec TRAME ou DESIGN. Puis arrête-toi.
