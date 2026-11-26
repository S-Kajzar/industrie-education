# Annales

Une fiche par annale (TRAME § 11), créée et modifiée dans le back-office (rubrique « Annales ») :

- `annales/<id>.json` : la fiche (titre, présentation, filières, thème, notions, durée, origine, statut…) ;
- le fichier HTML autonome correspondant est téléversé dans `medias/depots/` (champ « fichier »), jamais modifié.

La construction accepte aussi un dossier par annale : `annales/<id>/annale.json` et `annales/<id>/index.html`.
Seules les annales au statut `relu` sont publiées, à l'adresse `/annales/<id>/`.
