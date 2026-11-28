#!/usr/bin/env python3
"""Import des fichiers HTML déposés (lot 1e, TRAME § 11) : « Dépôt rapide » du back-office, ou dépôt direct sur GitHub
dans medias/import/.

Lancé par l'Action « Publier le site », dans la même exécution, avant la construction. Pour chaque fichier HTML de
medias/import/ :
  1. contrôles de outils/annale.py (document complet, aucune ressource extérieure, liens…) ; un fichier refusé reste
     dans medias/import/ et la construction le signale (« À corriger »), sans empêcher l'import des autres ;
  2. lecture du bloc de métadonnées <script type="application/json" id="fiche-industrie-education"> (format 1,
     production/FICHE-INTEGREE.md), s'il existe ;
  3. sinon, extraction déterministe : titre (h1), présentation (premier paragraphe de l'accueil), durée et nombre de
     parties, de questions et de tracés (configuration du gabarit : __PARTS__, __QCFG__, __SKCFG__) ; filières, thème,
     notions et source restent à compléter ;
  4. création de la fiche, TOUJOURS au statut « brouillon » (l'import ne pose jamais « relu ») : annales/<id>.json,
     ou contenus/<collection>/<id>/contenu.json pour un exercice ; le fichier est rangé dans medias/depots/<id>.html
     sans être modifié ;
  5. notions : seuls les identifiants de catalogue/notions.json sont repris ; les autres vont dans
     « notions_proposees », jamais créées automatiquement.
Le contrôle 20/20 suit, en avertissement, dans la chaîne de publication (outils/verifier-annales.js).

Nouvelle version d'une fiche existante (même identifiant) : le fichier est rangé dans medias/a-relire/<id>.html et la
fiche reçoit « nouvelle_version » ; la version en ligne reste en ligne. Quand Sébastien coche « Valider la nouvelle
version » et enregistre, l'import suivant remplace l'ancien fichier par le nouveau (même chemin), supprime le fichier
de medias/a-relire/ et retire les deux champs.

Avec --commit, tout cela fait un seul commit (« Import : 3 fiches créées en brouillon »), poussé sur main. Les fiches
créées ou modifiées sont alignées sur le format du back-office (node outils/format-donnees.js --fiches).

Usage : python3 outils/importer.py [--racine DÉPÔT] [--rapport FICHIER.md] [--commit] [--date AAAA-MM-JJ]
"""

import argparse
import datetime
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import annale as controle_autonome  # noqa: E402  (outils/annale.py)

DEPOT = Path(__file__).resolve().parent.parent
DOSSIER_IMPORT = "medias/import"
DOSSIER_DEPOTS = "medias/depots"
DOSSIER_A_RELIRE = "medias/a-relire"
ID_BLOC = "fiche-industrie-education"
FORMAT_BLOC = 1
TYPES_BLOC = ("annale", "exercice")
IDENTIFIANT = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
TITRE_MAX, PRESENTATION_MAX = 70, 300
# Auteur des commits de l'Action (compte technique de GitHub, aucune donnée personnelle).
AUTEUR = ("github-actions[bot]", "41898282+github-actions[bot]@users.noreply.github.com")


def pluriel(nombre, mot, mot_pluriel=None):
    return f"{nombre} {mot if nombre <= 1 else (mot_pluriel or mot + 's')}"


def identifiant(texte):
    """« Système de levage (v2).html » → « systeme-de-levage-v2 »."""
    texte = unicodedata.normalize("NFD", texte)
    texte = "".join(c for c in texte if not unicodedata.combining(c)).lower()
    texte = texte.replace("œ", "oe").replace("æ", "ae")
    return re.sub(r"[^a-z0-9]+", "-", texte).strip("-")


def espaces(texte):
    return " ".join(str(texte).split())


class Lecture(HTMLParser):
    """Bloc de métadonnées, titre (h1 de l'accueil, sinon premier h1), premier paragraphe de l'accueil (#home) et
    texte des scripts (configuration du gabarit)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.bloc = None
        self.scripts = []
        self.h1 = []  # (id, texte)
        self.presentation = None
        self._script = None  # ("bloc" | "script", morceaux)
        self._h1 = None
        self._p = None
        self._home = 0  # profondeur dans l'élément id="home" (0 : dehors)

    def handle_starttag(self, balise, attributs):
        attributs = {nom: (valeur or "") for nom, valeur in attributs}
        if self._home:
            self._home += 1
        elif attributs.get("id") == "home":
            self._home = 1
        if balise == "script":
            est_bloc = attributs.get("id") == ID_BLOC and attributs.get("type", "").lower() == "application/json"
            self._script = ("bloc" if est_bloc else "script", [])
        elif balise == "h1":
            self._h1 = (attributs.get("id", ""), [])
        elif balise == "p" and self._home and self.presentation is None:
            self._p = []

    def handle_endtag(self, balise):
        if balise == "script" and self._script:
            nature, morceaux = self._script
            if nature == "bloc" and self.bloc is None:
                self.bloc = "".join(morceaux)
            elif nature == "script":
                self.scripts.append("".join(morceaux))
            self._script = None
        elif balise == "h1" and self._h1:
            self.h1.append((self._h1[0], espaces("".join(self._h1[1]))))
            self._h1 = None
        elif balise == "p" and self._p is not None:
            texte = espaces("".join(self._p))
            self._p = None
            if texte:
                self.presentation = texte
        if self._home:
            self._home -= 1

    def handle_data(self, texte):
        if self._script:
            self._script[1].append(texte)
        if self._h1:
            self._h1[1].append(texte)
        if self._p is not None:
            self._p.append(texte)


def configuration_gabarit(scripts, nom):
    """Valeur JSON affectée à window.<nom> dans un script du gabarit (ex. __PARTS__ = [...]) ; None sinon."""
    for texte in scripts:
        m = re.search(r"(?:window\.)?" + re.escape(nom) + r"\s*=\s*", texte)
        if m:
            try:
                return json.JSONDecoder().raw_decode(texte, m.end())[0]
            except ValueError:
                return None
    return None


class Catalogue:
    """Listes fermées du site (catalogue/) et fiches existantes du dépôt."""

    def __init__(self, racine):
        self.racine = racine
        lire = lambda f: json.loads((racine / "catalogue" / f).read_text(encoding="utf-8"))  # noqa: E731
        self.publics = [p["id"] for p in lire("publics.json")]
        self.themes = [t["id"] for t in lire("themes.json")]
        self.notions = {n["id"]: n["nom"] for n in lire("notions.json")}
        self.collections = sorted(d.name for d in (racine / "contenus").iterdir()
                                  if d.is_dir() and (d / "collection.json").is_file())

    def fiche_existante(self, ident):
        """Chemin de la fiche d'annale ou de contenu qui porte cet identifiant, ou None."""
        for chemin in (self.racine / "annales" / f"{ident}.json", self.racine / "annales" / ident / "annale.json"):
            if chemin.is_file():
                return chemin
        for collection in self.collections:
            for chemin in (self.racine / "contenus" / collection / ident / "contenu.json",
                           self.racine / "contenus" / collection / f"{ident}.json"):
                if chemin.is_file():
                    return chemin
        return None

    def fichiers_cites(self):
        """Fichiers HTML cités par les fiches (champ « fichier ») : un fichier déposé ne les écrase jamais."""
        cites = set()
        for fiche in [*(self.racine / "annales").glob("*.json"), *(self.racine / "contenus").glob("*/*/contenu.json"),
                      *(self.racine / "contenus").glob("*/*.json")]:
            try:
                valeur = json.loads(fiche.read_text(encoding="utf-8")).get("fichier")
            except (OSError, ValueError, AttributeError):
                continue
            if isinstance(valeur, str):
                cites.add(valeur.strip().lstrip("/"))
        return cites


class Importeur:
    def __init__(self, racine, date):
        self.racine = racine
        self.date = date
        self.catalogue = Catalogue(racine)
        self.creees, self.nouvelles, self.validees, self.refuses = [], [], [], []
        self.modifies = set()  # chemins relatifs touchés (commit)
        self.fiches_a_aligner = set()

    def rel(self, chemin):
        return Path(chemin).relative_to(self.racine).as_posix()

    # --- nouvelles versions validées ---

    def valider_nouvelles_versions(self):
        """Fiches dont la case « Valider la nouvelle version » est cochée : le nouveau fichier remplace l'ancien."""
        fiches = [*(self.racine / "annales").glob("*.json"), *(self.racine / "annales").glob("*/annale.json"),
                  *(self.racine / "contenus").glob("*/*/contenu.json")]
        for fiche in sorted(fiches):
            try:
                donnees = json.loads(fiche.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if not isinstance(donnees, dict) or donnees.get("valider_nouvelle_version") is not True:
                continue
            nouvelle = donnees.get("nouvelle_version") if isinstance(donnees.get("nouvelle_version"), dict) else {}
            source = str(nouvelle.get("fichier") or "").strip().lstrip("/")
            donnees.pop("valider_nouvelle_version", None)
            if not source or not (self.racine / source).is_file():
                self.validees.append({"fiche": self.rel(fiche), "message": "case cochée sans nouvelle version à valider "
                                                                         "(case décochée)"})
                donnees.pop("nouvelle_version", None)
                self.ecrire_fiche(fiche, donnees)
                continue
            actuel = str(donnees.get("fichier") or "").strip().lstrip("/")
            if not actuel:
                actuel = (self.rel(fiche.parent / "index.html") if fiche.name in ("annale.json", "contenu.json")
                          and (fiche.parent / "index.html").is_file() else f"{DOSSIER_DEPOTS}/{fiche.stem}.html")
                if not (self.racine / actuel).is_file() and fiche.name not in ("annale.json", "contenu.json"):
                    donnees["fichier"] = "/" + actuel
            (self.racine / actuel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(self.racine / source, self.racine / actuel)
            (self.racine / source).unlink()
            self.modifies |= {actuel, source}
            donnees.pop("nouvelle_version", None)
            if fiche.parent.name == "annales" or fiche.name == "annale.json":
                donnees["mis_a_jour"] = self.date
            self.ecrire_fiche(fiche, donnees)
            self.validees.append({"fiche": self.rel(fiche), "message": f"nouvelle version validée : {actuel} remplacé, "
                                                                     f"{source} supprimé"})

    # --- fichiers déposés ---

    def importer(self):
        dossier = self.racine / DOSSIER_IMPORT
        if not dossier.is_dir():
            return
        vus = set()
        for fichier in sorted(dossier.iterdir()):
            if fichier.name.startswith(".") or not fichier.is_file():
                continue
            if fichier.suffix.lower() == ".json":
                # Entrée de la rubrique « Dépôt rapide » : elle ne sert qu'à téléverser les fichiers.
                fichier.unlink()
                self.modifies.add(self.rel(fichier))
                continue
            if fichier.suffix.lower() not in (".html", ".htm"):
                self.refuses.append({"fichier": self.rel(fichier), "problemes": ["seuls les fichiers HTML se déposent ici"]})
                continue
            self.importer_fichier(fichier, vus)

    def importer_fichier(self, fichier, vus):
        ou = self.rel(fichier)
        problemes = controle_autonome.controler(fichier, ou)
        if problemes:
            self.refuses.append({"fichier": ou, "problemes": problemes})
            return
        lecture = Lecture()
        lecture.feed(fichier.read_text(encoding="utf-8"))
        lecture.close()
        notes, bloc = [], None
        if lecture.bloc is not None:
            try:
                bloc = json.loads(lecture.bloc)
            except ValueError as erreur:
                notes.append(f"bloc de métadonnées illisible ({erreur}) : extraction du fichier à la place")
            if bloc is not None and (not isinstance(bloc, dict) or bloc.get("format") != FORMAT_BLOC):
                notes.append(f"bloc de métadonnées d’un format inconnu (format {FORMAT_BLOC} attendu) : extraction du "
                             "fichier à la place")
                bloc = None
        fiche = self.depuis_bloc(bloc, fichier, notes) if bloc else self.depuis_fichier(lecture, fichier, notes)
        ident = fiche["id"]
        if ident in vus:
            self.refuses.append({"fichier": ou, "problemes": [f"même identifiant « {ident} » qu’un autre fichier de ce "
                                                              "dépôt : déposez-le seul, à la publication suivante"]})
            return
        vus.add(ident)
        existante = self.catalogue.fiche_existante(ident)
        if existante:
            self.nouvelle_version(fichier, existante, ident, notes)
            return
        type_ = fiche.pop("_type")
        if type_ == "exercice":
            collection = fiche.pop("_collection", None)
            if collection not in self.catalogue.collections:
                self.refuses.append({"fichier": ou, "problemes": [
                    "exercice sans collection connue : ajoutez « collection » au bloc de métadonnées (identifiant "
                    "d’une collection du site : " + ", ".join(self.catalogue.collections) + "), ou créez la fiche dans "
                    "Contenus → la collection → Nouveau"]})
                return
            chemin_fiche = self.racine / "contenus" / collection / ident / "contenu.json"
        else:
            fiche.pop("_collection", None)
            chemin_fiche = self.racine / "annales" / f"{ident}.json"
        cible = self.cible_depot(ident)
        fiche["fichier"] = "/" + cible
        (self.racine / cible).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(fichier), str(self.racine / cible))
        self.modifies |= {ou, cible}
        a_completer = fiche.pop("_a_completer")
        self.ecrire_fiche(chemin_fiche, fiche)
        self.creees.append({"fiche": self.rel(chemin_fiche), "titre": fiche.get("titre") or ident, "depuis": ou,
                            "fichier": cible, "bloc": bloc is not None, "a_completer": a_completer, "notes": notes,
                            "proposees": fiche.get("notions_proposees", [])})

    def cible_depot(self, ident):
        """medias/depots/<id>.html ; un fichier déjà cité par une fiche n'est jamais écrasé."""
        cites = self.catalogue.fichiers_cites()
        cible, n = f"{DOSSIER_DEPOTS}/{ident}.html", 2
        while cible in cites:
            cible, n = f"{DOSSIER_DEPOTS}/{ident}-{n}.html", n + 1
        return cible

    def nouvelle_version(self, fichier, existante, ident, notes):
        cible = f"{DOSSIER_A_RELIRE}/{ident}.html"
        remplacee = (self.racine / cible).is_file()
        (self.racine / cible).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(fichier), str(self.racine / cible))
        donnees = json.loads(existante.read_text(encoding="utf-8"))
        donnees["nouvelle_version"] = {"fichier": "/" + cible, "deposee_le": self.date}
        donnees.pop("valider_nouvelle_version", None)
        self.ecrire_fiche(existante, donnees)
        self.modifies |= {self.rel(fichier), cible}
        self.nouvelles.append({"fiche": self.rel(existante), "titre": donnees.get("titre") or ident, "fichier": cible,
                               "remplacee": remplacee, "notes": notes})

    # --- fiche à partir du bloc ou du fichier ---

    def notions(self, valeurs, proposees, notes):
        connues, autres = [], list(proposees)
        for n in valeurs if isinstance(valeurs, list) else []:
            n = str(n).strip()
            if n in self.catalogue.notions:
                connues.append(n)
            elif n and not any(p.get("id") == n for p in autres):
                autres.append({"id": n, "nom": n})
        if autres:
            notes.append("notions proposées (non créées) : " + ", ".join(p.get("nom") or p.get("id") for p in autres))
        return list(dict.fromkeys(connues)), autres

    def depuis_bloc(self, bloc, fichier, notes):
        a_completer = []
        type_ = bloc.get("type") if bloc.get("type") in TYPES_BLOC else "annale"
        if bloc.get("type") not in TYPES_BLOC:
            notes.append(f"type « {bloc.get('type')} » inconnu : annale par défaut")
        ident = str(bloc.get("id") or "").strip()
        if not IDENTIFIANT.match(ident):
            notes.append(f"identifiant du bloc invalide « {ident} » : tiré du nom du fichier")
            ident = identifiant(fichier.stem)
        fiche = {"_type": type_, "_collection": bloc.get("collection"), "id": ident}
        for champ, maximum in (("titre", TITRE_MAX), ("presentation", PRESENTATION_MAX)):
            texte = espaces(bloc.get(champ) or "")
            if texte:
                fiche[champ if (champ == "titre" or type_ == "annale") else "description"] = texte
                if len(texte) > maximum:
                    notes.append(f"{champ} de {len(texte)} caractères, {maximum} au plus")
            else:
                a_completer.append("titre" if champ == "titre" else "présentation")
        publics = [p for p in bloc.get("publics") or [] if p in self.catalogue.publics]
        if type_ == "annale":
            if publics:
                fiche["publics"] = publics
            else:
                a_completer.append("filières")
            if bloc.get("theme") in self.catalogue.themes:
                fiche["theme"] = bloc["theme"]
            else:
                a_completer.append("thème")
        inconnus = [p for p in bloc.get("publics") or [] if p not in self.catalogue.publics]
        if inconnus or (bloc.get("theme") and bloc.get("theme") not in self.catalogue.themes):
            notes.append("filière ou thème inconnus, non repris : " + ", ".join(map(str, [*inconnus, bloc.get("theme")])))
        notions, proposees = self.notions(bloc.get("notions"), [
            {"id": str(n.get("id") or "").strip(), "nom": str(n.get("nom") or "").strip()}
            for n in bloc.get("notions_proposees") or [] if isinstance(n, dict)], notes)
        if notions:
            fiche["notions"] = notions
        if proposees:
            fiche["notions_proposees"] = proposees
        duree = bloc.get("duree_min")
        if isinstance(duree, int) and not isinstance(duree, bool) and duree > 0:
            fiche["duree_min"] = duree
        if type_ == "exercice" and bloc.get("niveau") in (1, 2, 3):
            fiche["niveau"] = bloc["niveau"]
        if type_ == "exercice":
            fiche["type"] = "exercice"
        if type_ == "annale" and isinstance(bloc.get("origine"), dict):
            origine = {k: bloc["origine"][k] for k in ("diplome", "epreuve", "session") if bloc["origine"].get(k)}
            if origine:
                fiche["origine"] = origine
            fiche["afficher_origine"] = False
        if type_ == "annale":
            source = bloc.get("source") if isinstance(bloc.get("source"), dict) else {}
            source = {k: espaces(source.get(k) or "") for k in ("editeur", "url", "licence", "reference_autorisation")
                      if espaces(source.get(k) or "")}
            if source:
                fiche["source"] = source
            if controle_autonome.controler_source(source, "bloc"):
                a_completer.append("source (éditeur, adresse, licence)")
        for champ in ("requetes", "pistes_image"):
            valeurs = [espaces(x) for x in bloc.get(champ) or [] if isinstance(x, str) and espaces(x)]
            if valeurs:
                fiche[champ] = valeurs
        fiche["statut"] = "brouillon"
        if type_ == "annale":
            fiche["mis_a_jour"] = self.date
        fiche["_a_completer"] = a_completer
        return fiche

    def depuis_fichier(self, lecture, fichier, notes):
        """Sans bloc : titre, présentation, durée lus dans le fichier ; le reste est à compléter."""
        titre = next((t for i, t in lecture.h1 if i == "home-title" and t), None) or next((t for _, t in lecture.h1 if t), "")
        parties = configuration_gabarit(lecture.scripts, "__PARTS__")
        questions = configuration_gabarit(lecture.scripts, "__QCFG__")
        traces = configuration_gabarit(lecture.scripts, "__SKCFG__")
        fiche = {"_type": "annale", "_collection": None, "id": identifiant(fichier.stem)}
        a_completer = []
        if titre:
            fiche["titre"] = titre
        else:
            a_completer.append("titre")
        if lecture.presentation:
            fiche["presentation"] = lecture.presentation
            if len(lecture.presentation) > PRESENTATION_MAX:
                notes.append(f"présentation de {len(lecture.presentation)} caractères, {PRESENTATION_MAX} au plus")
        else:
            a_completer.append("présentation")
        if isinstance(parties, list) and parties and all(isinstance(p, dict) and isinstance(p.get("minutes"), int)
                                                         for p in parties):
            fiche["duree_min"] = sum(p["minutes"] for p in parties)
        else:
            a_completer.append("durée")
        structure = [pluriel(len(x), mot) for x, mot in ((parties, "partie"), (questions, "question"), (traces, "tracé"))
                     if isinstance(x, (list, dict))]
        notes.append("sans bloc de métadonnées : extrait du fichier" + (f" ({', '.join(structure)})" if structure else ""))
        a_completer += ["filières", "thème", "notions", "source (éditeur, adresse, licence)"]
        fiche["afficher_origine"] = False
        fiche["statut"] = "brouillon"
        fiche["mis_a_jour"] = self.date
        fiche["_a_completer"] = a_completer
        return fiche

    # --- écriture ---

    def ecrire_fiche(self, chemin, donnees):
        chemin.parent.mkdir(parents=True, exist_ok=True)
        chemin.write_text(json.dumps(donnees, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.modifies.add(self.rel(chemin))
        self.fiches_a_aligner.add(chemin)

    def aligner(self):
        """Format du back-office (clés dans l'ordre de admin/config.yml…), pour qu'un enregistrement ne change rien."""
        if self.fiches_a_aligner:
            subprocess.run(["node", str(DEPOT / "outils" / "format-donnees.js"), "--fiches",
                            *map(str, sorted(self.fiches_a_aligner))], check=True)

    def message(self):
        morceaux = []
        if self.creees:
            morceaux.append(pluriel(len(self.creees), "fiche créée", "fiches créées") + " en brouillon")
        if self.nouvelles:
            morceaux.append(pluriel(len(self.nouvelles), "nouvelle version", "nouvelles versions") + " à relire")
        validees = [v for v in self.validees if v["message"].startswith("nouvelle version validée")]
        if validees:
            morceaux.append(pluriel(len(validees), "nouvelle version validée", "nouvelles versions validées"))
        return "Import : " + ", ".join(morceaux) if morceaux else ("Import : dépôt rapide vidé" if self.modifies else "")

    def rapport(self):
        """Rapport Markdown, repris dans le résumé de publication."""
        if not (self.creees or self.nouvelles or self.validees or self.refuses):
            return ""
        lignes = ["## Import de cette publication", ""]
        for c in self.creees:
            lignes.append(f"- Fiche créée en brouillon : `{c['fiche']}` (« {c['titre']} »), fichier `{c['fichier']}`, "
                          + ("bloc de métadonnées lu." if c["bloc"] else "sans bloc de métadonnées."))
            if c["a_completer"]:
                lignes.append("  - À compléter dans /admin/ : " + ", ".join(c["a_completer"]) + ".")
            lignes += [f"  - {n}." for n in c["notes"]]
        for n in self.nouvelles:
            lignes.append(f"- Nouvelle version à relire pour `{n['fiche']}` (« {n['titre']} ») : `{n['fichier']}`"
                          + (" (remplace une version précédente non validée)." if n["remplacee"] else "."))
        for v in self.validees:
            lignes.append(f"- `{v['fiche']}` : {v['message']}.")
        for r in self.refuses:
            lignes.append(f"- Fichier refusé, laissé dans `{DOSSIER_IMPORT}/` : `{r['fichier']}`.")
            lignes += [f"  - {p}" for p in r["problemes"][:8]]
        return "\n".join(lignes) + "\n"


def git(racine, *arguments, verifier=True):
    return subprocess.run(["git", *arguments], cwd=racine, check=verifier, capture_output=True, text=True)


def commiter(racine, message, chemins):
    """Un seul commit pour tout l'import, poussé sur main ; en cas de course avec un autre envoi, le commit est rejoué
    sur la nouvelle tête. Échec définitif : l'import est abandonné (les fichiers restent dans medias/import/ et seront
    importés à la publication suivante)."""
    git(racine, "add", "-A", "--", *sorted(chemins))
    nom, courriel = AUTEUR
    git(racine, "-c", f"user.name={nom}", "-c", f"user.email={courriel}", "commit", "-q", "-m", message)
    for essai in range(4):
        if git(racine, "push", "origin", "HEAD:main", verifier=False).returncode == 0:
            print(f"Commit poussé sur main : « {message} ».")
            return True
        if git(racine, "pull", "--rebase", "-q", "origin", "main", verifier=False).returncode != 0:
            git(racine, "rebase", "--abort", verifier=False)
            break
    print("Attention : l’import n’a pas pu être poussé sur main ; il est abandonné et sera refait à la publication "
          "suivante.", file=sys.stderr)
    git(racine, "fetch", "-q", "origin", "main", verifier=False)
    git(racine, "reset", "-q", "--hard", "origin/main", verifier=False)
    return False


def main(arguments=None):
    analyseur = argparse.ArgumentParser(description="Importe les fichiers HTML déposés dans medias/import/.")
    analyseur.add_argument("--racine", type=Path, default=DEPOT, help="dépôt à traiter (par défaut : ce dépôt)")
    analyseur.add_argument("--rapport", type=Path, default=None, help="fichier Markdown où écrire le rapport")
    analyseur.add_argument("--commit", action="store_true", help="un commit pour tout l'import, poussé sur main")
    analyseur.add_argument("--date", default=None, help="date des fiches (AAAA-MM-JJ), par défaut aujourd'hui")
    options = analyseur.parse_args(arguments)
    racine = options.racine.resolve()
    importeur = Importeur(racine, options.date or datetime.date.today().isoformat())
    importeur.valider_nouvelles_versions()
    importeur.importer()
    importeur.aligner()
    rapport = importeur.rapport()
    print(rapport or "Import : aucun fichier déposé, aucune nouvelle version à valider.")
    if options.rapport:
        options.rapport.parent.mkdir(parents=True, exist_ok=True)
        options.rapport.write_text(rapport, encoding="utf-8")
    message = importeur.message()
    if options.commit and message and importeur.modifies:
        commiter(racine, message, importeur.modifies)
    return 0


if __name__ == "__main__":
    sys.exit(main())
