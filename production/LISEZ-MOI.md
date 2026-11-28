# production/ — Sources de la chaîne de production des exercices et annales

Ce dossier est la **source unique** de ce que le projet Claude « Exercices interactifs » utilise pour produire
les fichiers HTML autonomes (annales et exercices). Il n'est pas publié sur le site.

| Fichier | Rôle | Où il sert |
|---|---|---|
| `INSTRUCTIONS-PROJET.md` | Instructions du projet Claude « Exercices interactifs » (extraction, architecture imposée, notation, tracés, livraison) | Champ « Instructions » du projet Claude |
| `gabarit-exercice-interactif.html` | Gabarit HTML autonome : modes entraînement et examen, chronomètre, notation pondérée, tracés, impression | Connaissances du projet Claude |
| `PROMPT-ANNALES-EDUSCOL.md` | Prompt en 4 blocs : compléments permanents (bloc A, dont la fiche intégrée), sélection d'un sujet éduscol (B), adaptation (C), relecture et dépôt (D) | Bloc A ajouté aux instructions du projet ; blocs B et C collés dans les conversations |

Versions versées le 28/11/2026, identiques à celles du projet Claude à cette date (confirmé par Sébastien).

## Règles

- **On modifie ici, puis on recharge dans le projet Claude.** Toute évolution du gabarit ou des instructions passe
  par une pull request de ce dépôt (tests à l'appui), jamais directement dans le projet Claude : sinon les deux
  versions divergent.
- Après la fusion d'une modification : dans le projet Claude, remplacer le fichier correspondant (connaissances)
  ou recoller le texte (instructions).
- Le gabarit évolue au **lot 2** : réponses et corrections illisibles à l'inspection avant validation, `id` des
  champs, fiche intégrée, envoi des résultats, puis amélioration des tracés.
- Le format de la fiche intégrée (`<script type="application/json" id="fiche-industrie-education">`) est décrit
  par `production/FICHE-INTEGREE.md`, ajouté au lot 1e.
- Ce dossier ne contient aucune donnée d'élève, aucun sujet source (PDF, Word) et aucune clé.
