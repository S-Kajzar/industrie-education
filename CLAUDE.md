# Consignes pour Claude Code — industrie.education

## Sources de vérité

1. `TRAME.md` : le cahier des charges. Il fait foi.
2. `DESIGN.md` : tout ce qui se voit. Les valeurs sont codées dans `statique/commun.css`, nulle part ailleurs.
3. `prompts/LOT-<n>.md` : le lot de la session.

Ce qui n'est pas décrit n'est pas à faire. Une contradiction entre ces documents et le code se **signale** dans
`NOTE-DE-LIVRAISON.md` ; on ne la tranche pas seul. Les décisions se prennent hors de ce dépôt, avec Sébastien.

## Méthode

- Une session = un lot = une pull request. À la fin : tests verts, `NOTE-DE-LIVRAISON.md` à jour (fait, testé,
  à faire par Sébastien, écarts), puis on s'arrête.
- Commencer par lire `TRAME.md`, `DESIGN.md` et le prompt du lot. Proposer un plan court avant d'écrire du code.
- Petites étapes vérifiables ; lancer les tests après chaque étape.

## Règles non négociables

- **Public mineur** : aucun cookie, aucune donnée personnelle, aucune requête vers un tiers. Seule exception :
  le script Umami, et seulement si `site.json` contient un identifiant. Pas de Google Fonts, pas de CDN : les
  polices et bibliothèques sont copiées dans le dépôt.
- **Préproduction non indexée** tant que `site.json` → `indexable` vaut `false`.
- **Jamais de couleur, police ou épaisseur de trait en dur** dans un gabarit : uniquement les jetons de
  `commun.css`. Jamais de texte jaune sur fond clair.
- **Contenus repris** : le corps d'un `index.html` repris n'est pas modifié (seulement enveloppé, voir TRAME § 5).
- **URL** : une fois le domaine posé (lot 1), aucune URL publiée ne change. Ajouter une redirection si besoin.
- Le dossier `_site/` est généré : ne jamais le modifier à la main ni le versionner.
- Pas de nouvelle dépendance sans la justifier dans la note de livraison.

## Langue

Interface, contenus, documentation, messages de commit et commentaires : en français. Noms de fichiers et
d'identifiants : minuscules, sans accent, avec des tirets.

## Commandes

```sh
pip install -r requirements.txt     # Jinja2
npm install                         # Playwright, @fontsource/barlow-condensed
python3 outils/construire.py        # écrit _site/
python3 -m http.server -d _site 8000
npm test                            # tous les tests
```

## Checklist avant de livrer

- [ ] Tests verts (`npm test`), y compris : aucun lien cassé, aucune requête tierce, poids de l'accueil.
- [ ] Chaque page : un seul `h1`, `lang="fr"`, focus visible, lisible à 360 px.
- [ ] Les pages s'affichent sans JavaScript.
- [ ] `NOTE-DE-LIVRAISON.md` à jour.
