# Annales éduscol → annales interactives industrie.education

Prompt pour le projet Claude « Exercices interactifs ». Ce projet garde ses instructions et son gabarit tels quels.

## Mode d'emploi

1. **Une seule fois** : coller le bloc A à la fin des instructions du projet.
2. **Sélection** (une conversation pour 8 à 10 sujets) : coller le bloc B en remplissant les crochets. Claude propose et classe les sujets, puis s'arrête. Tu choisis et tu télécharges les fichiers.
3. **Adaptation** (une conversation par annale) : déposer les fichiers (le .docx de préférence au .pdf), coller le bloc C.
4. **Relecture et dépôt** : suivre le bloc D. L'annale arrive en `brouillon`, avec sa fiche déjà remplie, et passe en `relu` seulement après ta vérification.

Pour dépenser les tokens utilement : lance une sélection longue (10 candidats), puis enchaîne les adaptations, une par conversation. Ce qui limite le rythme, c'est ta relecture, pas Claude.

---

## Bloc A : compléments permanents aux instructions du projet

```text
COMPLÉMENTS INDUSTRIE.EDUCATION
Ils s'ajoutent aux instructions ci-dessus. En cas de conflit, ces compléments priment.

SOURCES AUTORISÉES
- sti.eduscol.education.fr (sujets d'examen et de concours) : licence CC BY-NC-SA 2.0 FR.
- eduscol.education.gouv.fr (annales du baccalauréat général et technologique) : Licence Ouverte etalab 2.0.
- Toute autre source est exclue, sauf si je fournis une autorisation écrite. Sont notamment exclus : la base nationale des sujets de l'enseignement professionnel (bnseep, Réseau Canopé), les sites académiques, les éditeurs et les sites de corrigés privés.
- Les contenus de tiers inclus dans un sujet (documentation constructeur, photos créditées, logos) ne sont pas couverts par ces licences.

CONTENUS DE TIERS
- Logos et marques d'entreprise : supprimés.
- Nom de l'entreprise ou du site réel : neutralisé (« une blanchisserie industrielle »), sauf s'il est nécessaire à une question.
- Photos de personnes : supprimées.
- Extraits de documentation constructeur : conservés seulement s'ils servent à répondre à une question, et réduits à l'extrait utile. Liste-les dans la note de livraison, section « Contenus de tiers ».

CRÉDIT ET LICENCE
- Le texte affiché reste neutre : aucun diplôme, aucune session, aucun code ni intitulé d'épreuve. Seule la fiche intégrée, invisible, porte l'origine.
- Il porte une seule ligne de crédit, en petit, en bas de la page d'accueil, avec les styles existants du gabarit :
  - source sti.eduscol : « Adaptation interactive d'un sujet publié sur éduscol STI (ministère de l'Éducation nationale), licence CC BY-NC-SA 2.0 FR. Adaptation : industrie.education, sous la même licence. »
  - source eduscol, annales du bac : « D'après un document publié sur éduscol (ministère de l'Éducation nationale), Licence Ouverte etalab 2.0. Adaptation : industrie.education. »
- Le crédit complet (diplôme, épreuve, session, URL) va dans la fiche intégrée, invisible à l’affichage, jamais dans le texte affiché.

CONTRAINTES DU SITE
- Fichier HTML de 3 Mo au plus, car c'est la limite d'envoi du back-office. S'il dépasse, réduis les images (largeur, quantification) ; ne découpe jamais le sujet.
- Aucune ressource externe, aucune requête réseau, aucune police web.
- Nom du fichier : <identifiant>.html, sans préfixe « exercice- ». L'identifiant compte 3 à 6 mots, en minuscules, sans accents, avec des tirets, et décrit le système. Il devient l'adresse /annales/<identifiant>/ et ne changera plus.
- Livre aussi le script de génération et le fichier de contenu : une correction après relecture ne doit pas obliger à tout refaire.

FICHE INTÉGRÉE AU FICHIER (remplissage automatique de la fiche du site)
Place dans le <head> du HTML, juste avant </head>, un bloc invisible au format exact ci-dessous. Le site le lit au dépôt et crée la fiche tout seul, en brouillon. Le bloc ne change rien à l'affichage et respecte la neutralité : rien de visible n'indique le diplôme ou la session.
<script type="application/json" id="fiche-industrie-education">
{
  "format": 1,
  "type": "annale",
  "id": "<identifiant>",
  "titre": "",
  "presentation": "",
  "publics": [],
  "theme": "",
  "notions": [],
  "notions_proposees": [],
  "duree_min": 0,
  "niveau": null,
  "origine": { "diplome": "", "epreuve": "", "session": null },
  "source": { "editeur": "", "url": "", "licence": "", "reference_autorisation": "" },
  "requetes": [],
  "pistes_image": []
}
</script>
- type : "annale" pour un sujet d'examen, "exercice" pour un exercice ordinaire (alors niveau = 1, 2 ou 3, et origine reste vide).
- publics : un ou plusieurs parmi si, sti2d, bac-pro-mspc, bts-ms, la filière d'origine en premier.
- theme : un seul parmi mecanique, energie, numerique, systemes, habitat.
- notions : 3 à 6 identifiants pris dans cette liste : statique, dynamique, cinematique-graphique, roulements, liaisons, pfs, solide-deux-forces. Une notion utile qui n'y figure pas va dans notions_proposees sous la forme {"id": "...", "nom": "..."} ; n'invente jamais d'identifiant dans notions.
- titre : 70 caractères au plus ; il nomme le système, sans le diplôme. presentation : 300 caractères au plus (contexte industriel, ce qu'on y travaille, volume).
- session : un nombre (2023), ou null.
- source : editeur (« éduscol STI » ou « éduscol »), url exacte du fichier source, licence parmi cc-by-nc-sa-2.0-fr, etalab-2.0, autorisation-ecrite, oeuvre-personnelle ; reference_autorisation seulement pour une autorisation écrite.
- requetes : 3 à 5 requêtes qu'un élève taperait pour trouver ce sujet (« sujet corrigé BTS MS statique »).
- pistes_image : 2 ou 3 pistes d'illustration du domaine public ou sous CC0 (mots-clés Wikimedia Commons, brevets anciens, Smithsonian Open Access). Jamais d'image générée.
- Le bloc doit être du JSON valide (vérifie-le dans le script de génération) ; aucun statut : le site met toujours la fiche en brouillon.

LIVRABLES EN PLUS DU HTML ET DE LA NOTE DE LIVRAISON
1. « Fiche de relecture » : les 5 à 15 points que je dois vérifier moi-même, du plus risqué au moins risqué. Pour chacun, donne la question concernée et ce qu'il faut regarder. Points visés : écarts avec le corrigé officiel, réponses sans corrigé officiel, tolérances choisies, questions reformulées, ajoutées ou supprimées, contenus de tiers conservés.
2. « Tests » : un sujet entièrement juste donne 20/20 (montre la sortie du test), aucune erreur JavaScript, bloc de fiche valide, taille du fichier en Mo.
```

---

## Bloc B : phase 1, sélection

```text
PHASE 1 — SÉLECTION. Ne produis aucun HTML dans cette conversation.

PARAMÈTRES
- Filière visée : [BTS MS | Bac Pro MSPC | STI2D | SI]
- Thème ou notions souhaités (facultatif) : [...]
- Sujets déjà adaptés ou écartés, à exclure : [ex. BTS MI 2013, E4, levage et déchargement des sacs de linge]
- Nombre de propositions : [10]

MÉTHODE
1. Cherche sur les deux sources autorisées : sti.eduscol.education.fr, et les annales du bac sur eduscol.education.gouv.fr.
   - Les pages de liste de sti.eduscol refusent souvent la lecture automatique. Passe par la recherche web (ex. « site:sti.eduscol.education.fr BTS maintenance des systèmes sujet corrigé ») et par les pages « sti.eduscol.education.fr/print/<numéro> ».
   - Ne donne que des URL que tu as réellement vues dans un résultat. Si tu ne peux pas ouvrir un document, dis-le.
2. Élimine les candidats qui viennent d'une source non autorisée, les sujets incomplets (dossier technique ou documents réponses manquants), les sujets déjà faits et les épreuves orales ou pratiques.
3. Note chaque candidat sur 12 (0, 1 ou 2 par critère) :
   a. Utilité pour l'élève : épreuve écrite du référentiel en vigueur (2) ; ancien référentiel, notions toujours au programme (1) ; hors programme actuel (0).
   b. Corrigé officiel : complet (2), partiel (1), absent (0).
   c. Autocorrection : questions convertibles en valeur, référence, ensemble, oui/non ou mots-clés ≥ 70 % (2) ; de 40 à 70 % (1) ; moins de 40 % (0).
   d. Coût de production : .docx disponible, 2 tracés au plus, 25 pages au plus (2) ; une condition manque (1) ; deux ou plus manquent (0).
   e. Attrait du système : réel, actuel, parlant pour un élève de 16 à 20 ans (2) ; abstrait ou daté (0).
   f. Contenus de tiers : peu (2) ; quelques extraits constructeur (1) ; lourds, comme des photos de marque ou des catalogues entiers (0).

RESTITUTION
- Un tableau classé avec : rang, système (titre neutre proposé), diplôme · épreuve · session, durée, questions estimées, tracés, corrigé (oui / partiel / non), format, licence, score sur 12, risque principal.
- Ta recommandation (un sujet) en 3 lignes : pourquoi lui, et ce qui sera difficile.
- Pour le sujet recommandé et pour le n° 2 : la liste exacte des fichiers à télécharger (sujet, dossier technique, dossier de présentation, documents réponses, corrigé), avec leur URL, en préférant le .docx au .pdf.
- Un journal de sélection de 10 lignes au plus, à conserver : candidats gardés pour plus tard, avec leur score et leur URL.

Ensuite, arrête-toi et attends mon choix.
```

---

## Bloc C : phase 2, adaptation

```text
PHASE 2 — ADAPTATION
- Fichiers déposés : [sujet, dossier technique, dossier de présentation, documents réponses, corrigé]
- Source : [URL des fichiers] — Licence : [CC BY-NC-SA 2.0 FR | etalab 2.0]
- Diplôme · épreuve · session, pour la fiche uniquement : [...]
- Parties à garder : [toutes | ex. partie sciences de l'ingénieur seule | partie commune + partie spécifique ITEC]
- Filières visées sur le site : [...]
- Identifiant proposé : [ex. pont-roulant-atelier]. Garde-le, sauf s'il est trompeur.

Applique les instructions du projet et les compléments industrie.education, sans me demander de validation.

Avant de commencer, estime si une seule conversation suffit. Si ce n'est pas le cas, dis-le et propose un découpage (par exemple parties 1 et 2, puis 3 à 5). À la fin de la première conversation, livre alors le script de génération et le fichier de contenu, pour que la suivante reprenne exactement au même point.

ORDRE DE LIVRAISON
1. <identifiant>.html, avec la fiche intégrée
2. La note de livraison, avec la section « Contenus de tiers »
3. La fiche de relecture
4. Les tests
5. Le script de génération et le fichier de contenu
```

---

## Bloc D : après la livraison (pour toi)

1. **Relire** : fais le sujet en mode entraînement, avec la fiche de relecture à côté. C'est l'étape longue, et elle ne se délègue pas.
2. **Corriger** : dans la même conversation, liste tes corrections. Claude régénère à partir du script.
3. **Déposer** : dans `/admin/`, rubrique « Dépôt rapide », envoie le HTML (jusqu'à 10 à la fois). La fiche se crée seule en brouillon, à partir du bloc intégré. Vérifie-la dans la rubrique Annales.
4. **Publier** : passe le statut à `relu` seulement quand toutes les réponses sont vérifiées.
5. **Archiver** : garde la note de livraison et le journal de sélection.
