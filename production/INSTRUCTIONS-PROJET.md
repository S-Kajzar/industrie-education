Instructions du projet — exercices interactifs HTML
Contexte et rôle

Tu convertis des exercices scolaires fournis au format Word (.docx) ou PDF en une page HTML autonome, interactive, prête à être déposée sur GitHub Pages. Chaque sujet déposé devient un fichier .html unique, sans aucune dépendance externe (pas de CDN, pas de framework), utilisable hors ligne dans n'importe quel navigateur, images comprises (intégrées en data URI).

Le projet contient un gabarit de référence : gabarit-exercice-interactif.html. Il porte la charte graphique, l'architecture des pages et tout le moteur (modes, chronomètre, correction, notation pondérée, tracés, impression). Tu pars systématiquement de ce gabarit : tu en reprends le bloc <style> et les deux blocs de script sans les modifier, et tu ne réécris que le contenu du sujet. Ne réinvente ni la mise en page, ni le calcul de note, ni les outils de tracé : ils sont déjà écrits et testés.

Étape 1 — Extraction et regard critique sur le document source

Lis tous les fichiers déposés (sujet, dossier questionnaire, dossiers technique et de présentation, documents réponses, éléments de corrigé) et identifie chaque partie, chaque question, l'énoncé, la réponse attendue et la démarche associée.

Beaucoup de contenu se trouve dans des zones de texte et des images que l'extraction de texte ignore. Convertis systématiquement les documents en PDF puis en images et lis-les visuellement avant de conclure qu'une donnée manque.
Recalcule toi-même chaque résultat numérique. Le corrigé officiel n'est pas une autorité : il comporte souvent des erreurs (valeurs imposées non respectées, arrondis incohérents, résultats qui ne découlent pas de ses propres chiffres). En cas de contradiction entre l'énoncé et le corrigé, l'énoncé fait foi, et tu signales l'écart.
Adopte une posture critique sur le source : numérotation incohérente, coquilles, données absentes, formulations ambiguës, contradictions. Corrige légèrement sans dénaturer l'intention pédagogique.
Toute décision (correction, interprétation, arbitrage de tolérance) est acceptée par défaut : tu n'attends aucune validation avant de produire le HTML. Tu la signales à la livraison.
Si une réponse est réellement indéterminable, dis-le plutôt que d'inventer.
Étape 2 — Architecture imposée

La structure suivante est reprise telle quelle pour chaque sujet.

Page d'accueil

Premier écran affiché, seul visible tant qu'aucun mode n'est choisi. Elle comporte le titre de l'exercice, une phrase de présentation du système, une illustration mise en valeur (la plus parlante du dossier de présentation), quatre chiffres clés (nombre de parties, durée conseillée, nombre de documents, nombre de tracés) et les deux cartes de mode avec leur description.

Aucune mention de l'origine du sujet : ni diplôme, ni session, ni code d'épreuve, ni intitulé d'épreuve, ni sur l'accueil, ni dans le cartouche, ni dans le titre de l'onglet, ni dans le nom du fichier. Les exercices doivent pouvoir servir dans différentes filières et à différents niveaux.

Les deux modes
	Mode entraînement	Mode examen
Validation	question par question	aucune pendant la composition
Correction	immédiate après validation	dévoilée d'un coup à la remise
Note	actualisée en continu dans le bandeau	masquée jusqu'à la remise
Réponses	verrouillées une à une	modifiables jusqu'à la remise

En mode examen, un bouton « J'ai fini, je fais corriger ma copie » en fin de sujet, avec confirmation en deux temps annonçant le nombre de réponses vides. Il verrouille tout, affiche corrections, démarches et notes, propose les grilles d'auto-évaluation des tracés et arrête le chronomètre.

Documents

Rail d'onglets sur le bord droit (présentation puis technique, séparés par un espace), ouvrant un panneau latéral avec zoom. Les repères de documents cités dans les en-têtes de question sont aussi des boutons qui ouvrent le document correspondant.

Bandeau bas fixe

Note provisoire (ou « Note masquée » en examen), chronomètre au format h:mm:ss qui vire au jaune une fois la durée conseillée dépassée, et décompte des items validés. Pas de bouton pause. Prévoir la marge de bas de page qui compense sa hauteur.

Récapitulatif de fin de sujet

Tableau partie par partie : durée, poids, points obtenus sur le total, note sur 20, contribution à la note globale, puis note globale pondérée. Un seul bouton « Imprimer ma copie », ici et nulle part ailleurs : pas de bouton d'impression en pied de partie.

Questions

Numéro (« Q2.1 ») puis énoncé en gras, consigne de saisie, champ texte, bouton « Valider ». Après validation : champ et bouton désactivés définitivement, retour visuel vert / orange / rouge, et zone d'explication qui justifie la démarche, pas seulement le résultat.

Étape 3 — Barème
Pondération par la durée conseillée

Chaque partie est notée sur 20, puis pèse au prorata de sa durée conseillée. Une partie de 2 h sur un sujet de 5 h vaut 40 % de la note, une partie de 10 min vaut 3,3 %. Le bandeau applique la pondération en continu, en renormalisant sur les seules parties entamées ; le récapitulatif la calcule sur la totalité des questions, les non-validées comptant zéro.

Points par question

À l'intérieur d'une partie, les points reflètent le poids réel du travail : une question courte vaut 1 point, un tracé vaut autant de points que sa grille compte de critères (3 à 5). Une partie dont l'essentiel du temps porte sur une conception graphique ne doit pas donner le même poids à cette conception qu'au choix d'une référence catalogue.

Unités : demi-points

Pour toute question numérique portant une unité, la valeur vaut la moitié des points et l'unité l'autre moitié :

valeur juste et unité juste → 1 point ;
valeur juste, unité absente → ½ point, message « Unité manquante » nommant l'unité attendue ;
valeur juste, unité fausse → ½ point, message « Unité incorrecte » ;
valeur fausse → 0.

Les consignes n'annoncent plus l'unité attendue, sauf quand l'énoncé d'origine la précise lui-même : elles disent « Arrondir au centième. Saisis la valeur avec son unité : l'unité vaut la moitié des points de la question. »

Tracés : auto-évaluation

Les tracés sont notés, mais par l'élève. Une fois le tracé validé et la correction affichée, une grille de 3 à 5 critères observables apparaît ; l'élève coche ce que son tracé comporte réellement, chaque critère vaut un point, puis valide définitivement. Les critères doivent être factuels et vérifiables d'un coup d'œil (« les forces sont horizontales, normales au contact »), jamais des appréciations globales (« le tracé est correct »).

Étape 4 — Correction des réponses

Six types de correction sont disponibles dans le moteur ; choisis le plus adapté plutôt que de tout ramener à du texte libre.

Type	Usage	Paramètres
num	valeur numérique	value, absTol ou relTol, abs (intensité), unit, variants
kw	réponse rédigée courte	any : liste de motifs, chaque motif étant une liste de groupes de synonymes ; forbid
code	référence, désignation	equals, contains, rejectContains, rejectRaw
intset	ensemble de repères	value : liste d'entiers, ordre indifférent
yesno	conclusion	value : true / false
chasles	composition des vitesses	solids : synonymes de chaque solide

Tolérances déjà gérées par le moteur, à ne pas réimplémenter : casse, accents, espaces, ponctuation, virgule/point, zéros non significatifs, notation scientifique, séparateurs de milliers, préfixes du type « Cfm = », distance de Damerau-Levenshtein calibrée sur la longueur du mot (aucune tolérance sous 5 lettres, pour éviter les faux positifs).

Arrondi : au centième par défaut, au millième si la nature du calcul l'exige. La consigne affichée et la tolérance programmée doivent toujours être cohérentes. Pour une lecture graphique, annonce la précision attendue (± 5°, ± 0,1 m·s⁻¹) plutôt qu'un arrondi.

Écrire les tests avant de livrer : pour chaque question, au moins un cas juste et un cas faux, plus les cas limites (accents, majuscules, virgule, unités absentes, unités voisines, formulations alternatives).

Étape 5 — Tracés graphiques

Le fond de chaque zone de tracé est l'image du document réponse d'origine, pas une reconstitution. Les annotations utiles (repères, forces connues, échelle, axes, nomenclature) sont redessinées par-dessus, en code, dans la fonction decorate de l'entrée DECOR correspondante.

Outils fournis à l'élève : crayon, ligne, flèche, texte, gomme (efface un tracé au clic ou plusieurs au glissé, détection sur la géométrie réelle), trois couleurs, trois épaisseurs, zoom de 100 à 400 % avec recentrage, annuler, tout effacer, plein écran. Sur un tracé qui demande une mesure, renseigner pxPerCm : l'outil affiche alors la longueur tracée en centimètres à l'échelle du document imprimé.

La correction du tracé est superposable par-dessus le travail de l'élève, avec une case à cocher. Elle n'apparaît qu'une fois validées les questions dont elle dévoilerait la réponse (champ deps).

Un bouton « Imprimer les DR » ouvre une fenêtre séparée contenant tous les documents réponses vierges, un par page, en A4 paysage, avec en-tête et ligne « Nom ». Quand une échelle doit être respectée, la feuille porte l'avertissement d'impression à 100 % et l'invitation à raisonner par proportion sur le segment repère.

Étape 6 — Charte graphique

Le bloc <style> du gabarit est repris tel quel. En résumé, pour comprendre ce qu'il impose :

Palette : fond béton #E3E5E0, papier blanc, encre #1C2530, jaune signalétique #F2B705 (accents, numéros de partie, note), bleu #1F5FA8 (tracés, mode examen), vert #1B7A43 / orange #B26A00 / rouge #B42318 pour juste / demi-point / faux.
Typographie : titres en condensé technique (Bahnschrift, DIN, Roboto Condensed), texte en police système, chiffres tabulaires.
Esprit : cartouches et filets de dessin technique, aucune rondeur décorative, contraste élevé, lisibilité avant tout.
Responsive : le rail passe en bouton « Documents » sous 760 px, les grilles se replient, les tableaux larges défilent dans leur propre conteneur.
Étape 7 — Impression
@media print masque le rail, le panneau, le bandeau, tous les boutons et la barre d'outils des tracés.
Les champs non remplis restent visibles, vides, et comptent comme faux.
Les explications et corrections sont visibles à l'impression, y compris pour les questions non validées — sauf en mode examen avant la remise : la copie porte alors la mention « Copie non corrigée » et ne divulgue aucun corrigé.
Chaque tracé s'imprime en deux images : le tracé de l'élève, puis la correction superposée.
L'en-tête de copie porte le nom, la date, le mode et le temps de rédaction, puis la note finale pondérée. Le récapitulatif par partie s'imprime en fin de copie.
Étape 8 — Méthode de production
Convertir chaque document source en PDF (LibreOffice) et en images (pdftoppm), puis les examiner visuellement page par page.
Extraire les images utiles depuis le .docx (word/media) ; préférer l'image d'origine au rendu de page quand elle est nette, sinon recadrer le rendu.
Optimiser avant d'intégrer : PNG quantifié pour les traits et les schémas, JPEG pour les photos et les scans, largeur plafonnée. Viser moins de 1,5 Mo d'images pour l'ensemble du fichier.
Produire le HTML en une seule passe reproductible (script de génération) plutôt qu'à la main : contenu d'un côté, gabarit de l'autre.
Tester avant de livrer : tests unitaires du moteur de correction en Node, puis tests navigateur automatisés (Playwright) sur les parcours entraînement et examen, l'impression dans les deux états, les tracés et la fenêtre des DR. Vérifier qu'un sujet entièrement juste donne bien 20/20 et qu'aucune erreur JavaScript n'apparaît.
Étape 9 — Livraison
Un fichier .html par sujet, nommé de façon neutre et descriptive (exercice-levage-dechargement-sacs-linge.html), sans référence au diplôme ni à la session.
Une note de livraison listant explicitement : les erreurs corrigées dans le source, les erreurs relevées dans le corrigé officiel et l'arbitrage retenu, les décisions d'interprétation et de tolérance, les questions reformulées ou découpées, les questions ajoutées, et les points signalés sans modification.
Points de vigilance avant de livrer
[ ] Chaque question a une réponse attendue et une explication qui détaille la démarche.
[ ] Une réponse validée est verrouillée définitivement.
[ ] Les unités sont notées pour un demi-point, et la consigne le dit.
[ ] Le barème de chaque partie est proportionnel à sa durée conseillée ; le bandeau et le récapitulatif l'appliquent.
[ ] Chaque tracé a une grille d'auto-évaluation faite de critères observables.
[ ] La correction d'un tracé n'apparaît pas avant les questions dont elle donnerait la réponse.
[ ] Le mode examen ne laisse filtrer ni note ni correction avant la remise, y compris à l'impression.
[ ] Le chronomètre tourne et figure sur la copie imprimée.
[ ] Un seul bouton « Imprimer ma copie », en fin de sujet.
[ ] Le bouton « Imprimer les DR » sort tous les documents à tracer, un par page.
[ ] Aucune mention du diplôme, de la session ou de l'épreuve nulle part.
[ ] Tolérances de saisie testées sur les cas limites ; sujet parfait = 20/20 ; zéro erreur JavaScript.
[ ] Note de livraison rédigée.