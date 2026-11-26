#!/usr/bin/env python3
"""Construction du site industrie.education.

Lit site.json, catalogue/ et contenus/ (annales/ au lot 2) et écrit le site statique dans _site/ :
toutes les pages de TRAME § 3 (sauf « annale », lot 2), statique/ copié sous _/, contenus repris enveloppés
(TRAME § 5), sitemap.xml et robots.txt.

La construction s'arrête avec un message clair au premier problème de données : nom de collection réservé,
type, thème ou public inconnu, identifiant en double, contenu de a-la-une.json introuvable, etc.

Usage :
    python3 outils/construire.py                      # lit le dépôt, écrit _site/
    python3 outils/construire.py --racine D --sortie S  # autre dépôt (tests), autre dossier de sortie
"""

import argparse
import json
import re
import shutil
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from xml.sax.saxutils import escape as echapper_xml

try:
    from jinja2 import Environment, FileSystemLoader, StrictUndefined, select_autoescape
except ImportError:  # pragma: no cover
    sys.exit("Jinja2 est introuvable : lancez « pip install -r requirements.txt ».")


DEPOT = Path(__file__).resolve().parent.parent
UMAMI_SCRIPT = "https://cloud.umami.is/script.js"

# TRAME § 3 : adresses prises par les pages du site. Les identifiants des thèmes et des publics s'y ajoutent.
NOMS_RESERVES = (
    "catalogue", "annales", "si", "sti2d", "bac-pro-mspc", "bts-ms", "mecanique", "energie", "numerique",
    "systemes", "habitat", "enseignants", "partenaires", "a-propos", "mentions-legales", "_",
)

# TRAME § 5 : types de contenu, avec leur libellé (maquette du catalogue).
TYPES = {
    "cours": "Cours",
    "exercice": "Exercice",
    "activite": "Activité",
    "etude": "Étude de cas",
    "qcm": "QCM",
    "formulaire": "Formulaire",
}
MODES = ("repris", "natif")
# DESIGN.md § 7 : les six moments du titre d'accueil ; « cours » est le titre par défaut.
MOMENTS = ("cours", "matin", "midi", "soir", "nuit", "week-end")
A_LA_UNE_MIN, A_LA_UNE_MAX = 3, 6

IDENTIFIANT = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# Pages de service : (adresse, gabarit de texte, titre, description).
SERVICE = (
    ("enseignants/", "enseignants", "Enseignants",
     "Utiliser industrie.education en classe : projeter une page avec son QR code, la partager dans Pronote, "
     "l’imprimer."),
    ("partenaires/", "partenaires", "Partenaires",
     "Les principes d’un partenariat avec industrie.education : encarts toujours signalés, aucun ciblage, "
     "aucune donnée personnelle."),
    ("a-propos/", "a-propos", "À propos",
     "industrie.education : cours, exercices et annales de sciences industrielles, gratuits, sans compte, "
     "sans cookie."),
    ("mentions-legales/", "mentions-legales", "Mentions légales",
     "Mentions légales d’industrie.education : éditeur, hébergeur, données personnelles et crédits."),
)


class ErreurConstruction(Exception):
    """Problème de données : la construction s'arrête avec ce message."""


# ---------------------------------------------------------------------------
# Outils
# ---------------------------------------------------------------------------

def cle_tri(texte):
    """Clé de tri insensible aux accents et à la casse."""
    decompose = unicodedata.normalize("NFD", texte)
    return "".join(ch for ch in decompose if not unicodedata.combining(ch)).casefold()


def pluriel(nombre, mot, mot_pluriel=None):
    """« 1 contenu », « 3 contenus »."""
    return f"{nombre} {mot if nombre <= 1 else (mot_pluriel or mot + 's')}"


def duree(minutes):
    """70 → « 1 h 10 », 15 → « 15 min » (espaces insécables)."""
    heures, reste = divmod(int(minutes), 60)
    if not heures:
        return f"{reste} min"
    if not reste:
        return f"{heures} h"
    return f"{heures} h {reste:02d}"


class Lecteur:
    """Lit les fichiers JSON du dépôt en donnant des messages d'erreur lisibles."""

    def __init__(self, racine):
        self.racine = racine

    def rel(self, chemin):
        try:
            return chemin.relative_to(self.racine).as_posix()
        except ValueError:
            return str(chemin)

    def json(self, chemin, attendu):
        if not chemin.is_file():
            raise ErreurConstruction(f"Fichier manquant : {self.rel(chemin)}.")
        try:
            donnees = json.loads(chemin.read_text(encoding="utf-8"))
        except json.JSONDecodeError as erreur:
            raise ErreurConstruction(
                f"JSON invalide dans {self.rel(chemin)}, ligne {erreur.lineno}, colonne {erreur.colno} : {erreur.msg}."
            ) from None
        if not isinstance(donnees, attendu):
            nature = "un objet { … }" if attendu is dict else "une liste [ … ]"
            raise ErreurConstruction(f"{self.rel(chemin)} doit contenir {nature}.")
        return donnees


def texte_requis(donnees, champ, ou):
    valeur = donnees.get(champ)
    if not isinstance(valeur, str) or not valeur.strip():
        raise ErreurConstruction(f"Champ « {champ} » manquant ou vide dans {ou}.")
    return valeur.strip()


def entier_positif(donnees, champ, ou):
    valeur = donnees.get(champ)
    if valeur is None:
        return None
    if isinstance(valeur, bool) or not isinstance(valeur, int) or valeur < 1:
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : un nombre entier positif est attendu.")
    return valeur


# ---------------------------------------------------------------------------
# Lecture et vérification des données
# ---------------------------------------------------------------------------

def charger_site(lecteur):
    site = lecteur.json(lecteur.racine / "site.json", dict)
    ou = "site.json"
    texte_requis(site, "nom", ou)
    base = texte_requis(site, "base", ou)
    if not (base.startswith("/") and base.endswith("/")):
        raise ErreurConstruction("site.json : « base » doit commencer et finir par « / » (ex. « /industrie-education/ »).")
    origine = texte_requis(site, "origine", ou)
    if not re.match(r"^https?://[^/]+$", origine):
        raise ErreurConstruction("site.json : « origine » doit être de la forme « https://hote », sans « / » final.")
    if not isinstance(site.get("indexable"), bool):
        raise ErreurConstruction("site.json : « indexable » doit valoir true ou false.")
    umami = site.get("umami", "")
    if not isinstance(umami, str) or (umami and not re.match(r"^[0-9a-fA-F-]{8,}$", umami)):
        raise ErreurConstruction("site.json : « umami » doit être vide ou contenir l’identifiant du site Umami.")
    site["umami"] = umami.strip()
    for champ in ("editeur", "hebergeur"):
        if not isinstance(site.get(champ), dict):
            raise ErreurConstruction(f"site.json : « {champ} » doit être un objet.")
    for champ in ("nom", "adresse", "directeur_publication"):
        site["editeur"].setdefault(champ, "")
    for champ in ("nom", "adresse"):
        site["hebergeur"].setdefault(champ, "")
    if not isinstance(site.get("contact", ""), str):
        raise ErreurConstruction("site.json : « contact » doit être une adresse électronique ou vide.")
    site["contact"] = site.get("contact", "").strip()
    titres = site.get("titres_accueil")
    if not isinstance(titres, dict):
        raise ErreurConstruction("site.json : « titres_accueil » doit être un objet (un titre par moment).")
    manquants = [m for m in MOMENTS if not isinstance(titres.get(m), str) or not titres[m].strip()]
    inconnus = [m for m in titres if m not in MOMENTS]
    if manquants or inconnus:
        raise ErreurConstruction(
            "site.json : « titres_accueil » doit donner un titre pour chacun des six moments : "
            + ", ".join(MOMENTS) + "."
            + (f" Manquants : {', '.join(manquants)}." if manquants else "")
            + (f" Inconnus : {', '.join(inconnus)}." if inconnus else "")
        )
    site["titres_accueil"] = {m: titres[m] for m in MOMENTS}
    return site


def charger_catalogue(lecteur):
    dossier = lecteur.racine / "catalogue"
    themes = lecteur.json(dossier / "themes.json", list)
    publics = lecteur.json(dossier / "publics.json", list)
    a_la_une = lecteur.json(dossier / "a-la-une.json", list)
    lecteur.json(dossier / "partenaires.json", list)  # vide en V1 : seulement vérifié

    vus = set()
    for i, t in enumerate(themes, 1):
        ou = f"catalogue/themes.json (thème n° {i})"
        if not isinstance(t, dict):
            raise ErreurConstruction(f"{ou} : un objet est attendu.")
        ident = texte_requis(t, "id", ou)
        texte_requis(t, "nom", ou)
        t.setdefault("court", t["nom"])
        exemples = t.get("exemples", [])
        if not isinstance(exemples, list) or not all(isinstance(e, str) for e in exemples):
            raise ErreurConstruction(f"{ou} : « exemples » doit être une liste de textes.")
        if ident in vus:
            raise ErreurConstruction(f"Identifiant en double dans catalogue/themes.json : « {ident} ».")
        vus.add(ident)

    for i, p in enumerate(publics, 1):
        ou = f"catalogue/publics.json (public n° {i})"
        if not isinstance(p, dict):
            raise ErreurConstruction(f"{ou} : un objet est attendu.")
        ident = texte_requis(p, "id", ou)
        texte_requis(p, "nom", ou)
        if not isinstance(p.get("actif"), bool):
            raise ErreurConstruction(f"{ou} : « actif » doit valoir true ou false.")
        if ident in vus:
            raise ErreurConstruction(f"Identifiant en double dans catalogue/ : « {ident} » (thème ou public).")
        vus.add(ident)

    if not all(isinstance(x, str) for x in a_la_une):
        raise ErreurConstruction("catalogue/a-la-une.json doit être une liste d’identifiants de contenus.")
    return themes, publics, a_la_une


def charger_contenus(lecteur, themes, publics, reserves):
    themes_par_id = {t["id"]: t for t in themes}
    publics_par_id = {p["id"]: p for p in publics}
    dossier_contenus = lecteur.racine / "contenus"
    if not dossier_contenus.is_dir():
        raise ErreurConstruction("Dossier manquant : contenus/.")

    collections = []
    contenus_par_id = {}

    for dossier in sorted(d for d in dossier_contenus.iterdir() if d.is_dir() and not d.name.startswith(".")):
        nom = dossier.name
        if nom in reserves:
            raise ErreurConstruction(
                f"Nom de collection réservé : « {nom} » (contenus/{nom}/). Cette adresse appartient déjà à une page "
                f"du site. Renommez le dossier. Noms réservés : {', '.join(sorted(reserves))}."
            )
        if not IDENTIFIANT.match(nom):
            raise ErreurConstruction(
                f"Nom de collection invalide : « {nom} » (contenus/{nom}/). Minuscules sans accent, chiffres et tirets."
            )
        ou = f"contenus/{nom}/collection.json"
        donnees = lecteur.json(dossier / "collection.json", dict)
        collection = {
            "id": nom,
            "titre": texte_requis(donnees, "titre", ou),
            "description": texte_requis(donnees, "description", ou),
            "theme": theme_connu(donnees.get("theme"), themes_par_id, ou),
            "publics": publics_connus(donnees.get("publics"), publics_par_id, ou),
            "contenus": [],
        }

        contenus = []
        for sous in sorted(d for d in dossier.iterdir() if d.is_dir() and not d.name.startswith(".")):
            contenu = charger_contenu(lecteur, sous, collection, themes_par_id, publics_par_id)
            deja = contenus_par_id.get(contenu["id"])
            if deja:
                raise ErreurConstruction(
                    f"Identifiant en double : « {contenu['id']} » ({deja['source_dossier']}/ et "
                    f"{contenu['source_dossier']}/). Chaque contenu doit avoir un identifiant unique sur tout le site."
                )
            contenus_par_id[contenu["id"]] = contenu
            contenus.append(contenu)

        collection["contenus"] = ordonner(contenus, donnees.get("ordre"), ou)
        if not collection["contenus"]:
            print(f"Attention : la collection « {nom} » ne contient aucun contenu.", file=sys.stderr)
        for i, contenu in enumerate(collection["contenus"]):
            contenu["precedent"] = collection["contenus"][i - 1] if i > 0 else None
            contenu["suivant"] = collection["contenus"][i + 1] if i + 1 < len(collection["contenus"]) else None
        collections.append(collection)

    return collections, contenus_par_id


def theme_connu(valeur, themes_par_id, ou):
    if valeur not in themes_par_id:
        raise ErreurConstruction(
            f"Thème inconnu « {valeur} » dans {ou}. Thèmes possibles : {', '.join(themes_par_id)}."
        )
    return themes_par_id[valeur]


def publics_connus(valeurs, publics_par_id, ou):
    if not isinstance(valeurs, list) or not valeurs:
        raise ErreurConstruction(f"Champ « publics » manquant dans {ou} : une liste d’au moins un public est attendue.")
    resultat = []
    for valeur in valeurs:
        if valeur not in publics_par_id:
            raise ErreurConstruction(
                f"Public inconnu « {valeur} » dans {ou}. Publics possibles : {', '.join(publics_par_id)}."
            )
        if publics_par_id[valeur] not in resultat:
            resultat.append(publics_par_id[valeur])
    return resultat


def charger_contenu(lecteur, dossier, collection, themes_par_id, publics_par_id):
    rel = lecteur.rel(dossier)
    ou = f"{rel}/contenu.json"
    if not (dossier / "contenu.json").is_file():
        raise ErreurConstruction(f"Fichier manquant : {ou} (chaque dossier d’une collection est un contenu).")
    donnees = lecteur.json(dossier / "contenu.json", dict)

    ident = texte_requis(donnees, "id", ou)
    if ident != dossier.name:
        raise ErreurConstruction(
            f"L’identifiant « {ident} » de {ou} doit être le nom de son dossier (« {dossier.name} »)."
        )
    if not IDENTIFIANT.match(ident):
        raise ErreurConstruction(f"Identifiant invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets.")
    type_ = texte_requis(donnees, "type", ou)
    if type_ not in TYPES:
        raise ErreurConstruction(f"Type inconnu « {type_} » dans {ou}. Types possibles : {', '.join(TYPES)}.")
    mode = texte_requis(donnees, "mode", ou)
    if mode not in MODES:
        raise ErreurConstruction(f"Mode inconnu « {mode} » dans {ou}. Modes possibles : {', '.join(MODES)}.")
    mots_cles = donnees.get("mots_cles", [])
    if not isinstance(mots_cles, list) or not all(isinstance(m, str) for m in mots_cles):
        raise ErreurConstruction(f"Champ « mots_cles » invalide dans {ou} : une liste de textes est attendue.")
    if not (dossier / "index.html").is_file():
        raise ErreurConstruction(f"Fichier manquant : {rel}/index.html.")

    theme = theme_connu(donnees["theme"], themes_par_id, ou) if "theme" in donnees else collection["theme"]
    publics = publics_connus(donnees["publics"], publics_par_id, ou) if "publics" in donnees else collection["publics"]

    contenu = {
        "id": ident,
        "titre": texte_requis(donnees, "titre", ou),
        "description": texte_requis(donnees, "description", ou),
        "type": type_,
        "type_nom": TYPES[type_],
        "niveau": entier_positif(donnees, "niveau", ou),
        "duree_min": entier_positif(donnees, "duree_min", ou),
        "mots_cles": mots_cles,
        "mode": mode,
        "source": donnees.get("source", ""),
        "theme": theme,
        "publics": publics,
        "collection": collection,
        "chemin": f"{collection['id']}/{ident}/",
        "dossier": dossier,
        "source_dossier": rel,
        "precedent": None,
        "suivant": None,
    }
    # Texte lu par la recherche du catalogue (normalisé dans le navigateur : minuscules, sans accents).
    contenu["texte"] = " ".join(
        [contenu["titre"], contenu["description"], *mots_cles, collection["titre"], theme["nom"], theme["court"],
         contenu["type_nom"], *(p["nom"] for p in publics)]
    )
    return contenu


def ordre_par_defaut(contenu):
    # Cours d'abord, puis le reste par niveau (TRAME § 6) ; sans niveau en dernier.
    return (0 if contenu["type"] == "cours" else 1, contenu["niveau"] or 99, cle_tri(contenu["titre"]))


def ordonner(contenus, ordre, ou):
    if ordre is None:
        return sorted(contenus, key=ordre_par_defaut)
    if not isinstance(ordre, list) or not all(isinstance(x, str) for x in ordre):
        raise ErreurConstruction(f"Champ « ordre » invalide dans {ou} : une liste d’identifiants est attendue.")
    par_id = {c["id"]: c for c in contenus}
    for ident in ordre:
        if ident not in par_id:
            raise ErreurConstruction(f"« ordre » de {ou} cite « {ident} », qui n’est pas un contenu de la collection.")
    if len(set(ordre)) != len(ordre):
        raise ErreurConstruction(f"Identifiant en double dans « ordre » de {ou}.")
    restants = sorted((c for c in contenus if c["id"] not in ordre), key=ordre_par_defaut)
    return [par_id[i] for i in ordre] + restants


def choisir_a_la_une(identifiants, contenus_par_id):
    if len(set(identifiants)) != len(identifiants):
        raise ErreurConstruction("Identifiant en double dans catalogue/a-la-une.json.")
    if not A_LA_UNE_MIN <= len(identifiants) <= A_LA_UNE_MAX:
        raise ErreurConstruction(
            f"catalogue/a-la-une.json doit citer de {A_LA_UNE_MIN} à {A_LA_UNE_MAX} contenus "
            f"(il en cite {len(identifiants)})."
        )
    choisis = []
    for ident in identifiants:
        # Identifiant seul (« cadre-velo ») ou précédé de la collection (« statique/cadre-velo »).
        cle = ident.strip("/").split("/")[-1]
        contenu = contenus_par_id.get(cle)
        if contenu is None or (ident.count("/") and contenu["chemin"] != ident.strip("/") + "/"):
            raise ErreurConstruction(f"Contenu de catalogue/a-la-une.json introuvable : « {ident} ».")
        choisis.append(contenu)
    return choisis


# ---------------------------------------------------------------------------
# Enveloppe des contenus repris (TRAME § 5)
# ---------------------------------------------------------------------------

class Reperes(HTMLParser):
    """Repère les vraies balises <head>, <body> et </body> (le texte des scripts et des styles est ignoré)."""

    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.debuts_lignes = [0] + [i + 1 for i, ch in enumerate(source) if ch == "\n"]
        self.fins_head = []
        self.debuts_body = []
        self.fins_body = []
        self.bases = 0

    def position(self):
        ligne, colonne = self.getpos()
        return self.debuts_lignes[ligne - 1] + colonne

    def handle_starttag(self, balise, attributs):
        if balise == "body":
            self.debuts_body.append(self.position() + len(self.get_starttag_text()))
        elif balise == "base":
            self.bases += 1

    def handle_endtag(self, balise):
        if balise == "head":
            self.fins_head.append(self.position())
        elif balise == "body":
            self.fins_body.append(self.position())


def envelopper(source, ou, tete, haut, bas):
    """Insère tete avant </head>, haut après <body…> et bas avant </body> ; le reste du fichier est inchangé."""
    reperes = Reperes(source)
    reperes.feed(source)
    reperes.close()
    if len(reperes.fins_head) != 1 or len(reperes.debuts_body) != 1 or len(reperes.fins_body) != 1:
        raise ErreurConstruction(
            f"{ou} : un contenu repris doit avoir une balise </head>, une balise <body> et une balise </body>, "
            "explicites et uniques, pour être enveloppé sans modifier son corps."
        )
    if reperes.bases:
        raise ErreurConstruction(f"{ou} : la balise <base> d’un contenu repris n’est pas prise en charge.")
    fin_head, debut_body, fin_body = reperes.fins_head[0], reperes.debuts_body[0], reperes.fins_body[0]
    if not fin_head < debut_body <= fin_body:
        raise ErreurConstruction(f"{ou} : balises <head> et <body> dans un ordre inattendu.")
    return (source[:fin_head] + tete + source[fin_head:debut_body] + haut
            + source[debut_body:fin_body] + bas + source[fin_body:])


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------

class Constructeur:
    def __init__(self, racine, sortie):
        self.racine = racine
        self.sortie = sortie
        self.lecteur = Lecteur(racine)
        self.pages = []
        self.env = Environment(
            loader=FileSystemLoader(str(DEPOT / "gabarits")),
            autoescape=select_autoescape(["html"]),
            undefined=StrictUndefined,
            keep_trailing_newline=True,
        )
        self.env.filters["pluriel"] = pluriel
        self.env.filters["duree"] = duree

    # --- données ---

    def charger(self):
        self.site = charger_site(self.lecteur)
        self.themes, self.publics, ids_une = charger_catalogue(self.lecteur)
        reserves = set(NOMS_RESERVES) | {t["id"] for t in self.themes} | {p["id"] for p in self.publics}
        self.collections, self.contenus_par_id = charger_contenus(self.lecteur, self.themes, self.publics, reserves)
        self.a_la_une = choisir_a_la_une(ids_une, self.contenus_par_id)

        rang_theme = {t["id"]: i for i, t in enumerate(self.themes)}
        self.collections.sort(key=lambda c: (rang_theme[c["theme"]["id"]], cle_tri(c["titre"])))
        # Ordre du catalogue : thème, collection, puis ordre de la collection.
        self.contenus = [c for col in self.collections for c in col["contenus"]]
        self.contenus.sort(key=lambda c: rang_theme[c["theme"]["id"]])  # tri stable
        for t in self.themes:
            t["nb"] = sum(1 for c in self.contenus if c["theme"] is t)
        for p in self.publics:
            p["nb"] = sum(1 for c in self.contenus if p in c["publics"])

    # --- écriture ---

    def preparer_sortie(self):
        """Prépare un dossier de travail voisin de la sortie : la sortie n'est remplacée qu'en fin de construction
        réussie, si bien qu'une construction arrêtée ne laisse jamais un site à moitié écrit."""
        sortie = self.sortie
        if sortie == self.racine or sortie in self.racine.parents:
            raise ErreurConstruction(f"Dossier de sortie refusé : {sortie}.")
        if sortie.exists():
            if not sortie.is_dir():
                raise ErreurConstruction(f"La sortie {sortie} existe et n’est pas un dossier.")
            if any(sortie.iterdir()) and not (sortie / "sitemap.xml").is_file():
                raise ErreurConstruction(
                    f"Le dossier {sortie} n’est pas vide et ne ressemble pas à un site construit : supprimez-le à la main."
                )
        self.travail = sortie.with_name(sortie.name + ".en-cours")
        if self.travail.exists():
            shutil.rmtree(self.travail)
        self.travail.mkdir(parents=True)
        self.sortie = self.travail
        self.sortie_finale = sortie

    def publier_sortie(self):
        if self.sortie_finale.exists():
            shutil.rmtree(self.sortie_finale)
        self.travail.rename(self.sortie_finale)
        self.sortie = self.sortie_finale

    def prefixe(self, chemin):
        """Chemin relatif vers la racine du site ; absolu pour 404.html, servie à n'importe quelle adresse."""
        if chemin == "404.html":
            return self.site["base"]
        profondeur = chemin.count("/")
        return "../" * profondeur if profondeur else "./"

    def url_absolue(self, chemin):
        return self.site["origine"] + self.site["base"] + chemin

    def ecrire(self, chemin, texte):
        cible = self.sortie / (chemin if chemin.endswith(".html") else chemin + "index.html")
        cible.parent.mkdir(parents=True, exist_ok=True)
        cible.write_text(texte, encoding="utf-8")

    def rendre(self, gabarit, chemin, titre, description, registre="atelier", **contexte):
        page = self.env.get_template(gabarit).render(
            site=self.site,
            racine=self.prefixe(chemin),
            chemin=chemin,
            url_absolue=self.url_absolue(chemin),
            umami_script=UMAMI_SCRIPT,
            titre_document=titre if chemin == "" else f"{titre} — {self.site['nom']}",
            description=description,
            registre=registre,
            avec_bande=contexte.pop("avec_bande", registre == "atelier"),
            rubrique=contexte.pop("rubrique", ""),
            **contexte,
        )
        self.ecrire(chemin, page)
        if chemin != "404.html":
            self.pages.append(chemin)

    # --- pages ---

    def construire(self):
        self.charger()
        self.preparer_sortie()
        try:
            # gabarits/ vient toujours de ce dépôt ; statique/ aussi quand le dépôt lu n'en a pas (dépôts de test).
            statique = self.racine / "statique" if (self.racine / "statique").is_dir() else DEPOT / "statique"
            shutil.copytree(statique, self.sortie / "_")
            self.page_accueil()
            self.page_catalogue()
            for theme in self.themes:
                self.page_theme(theme)
            for public in self.publics:
                self.page_public(public)
            for collection in self.collections:
                self.page_collection(collection)
                for contenu in collection["contenus"]:
                    self.page_contenu(contenu)
            self.pages_annales()
            self.pages_service()
            self.ecrire_sitemap_robots()
        except BaseException:
            shutil.rmtree(self.travail, ignore_errors=True)
            raise
        self.publier_sortie()
        return self.bilan()

    def page_accueil(self):
        self.rendre(
            "accueil.html", "",
            f"{self.site['nom']} — cours et exercices de sciences industrielles",
            "Cours, exercices interactifs, études de cas et annales en sciences industrielles : SI, STI2D, "
            "Bac Pro MSPC, BTS MS. Gratuit, sans compte, sans cookie.",
            registre="vitrine", avec_bande=False,
            titres=self.site["titres_accueil"], nb_contenus=len(self.contenus),
            themes=self.themes, publics=self.publics, a_la_une=self.a_la_une,
        )

    def page_catalogue(self):
        def compte(test):
            return sum(1 for c in self.contenus if test(c))

        niveaux = sorted({c["niveau"] for c in self.contenus if c["niveau"]})
        options = {
            "themes": [{"valeur": t["id"], "libelle": t["nom"], "nb": t["nb"], "inactif": False} for t in self.themes],
            "types": [{"valeur": k, "libelle": v, "nb": compte(lambda c, k=k: c["type"] == k), "inactif": False}
                      for k, v in TYPES.items()],
            "publics": [{"valeur": p["id"], "libelle": p["nom"], "nb": p["nb"], "inactif": not p["actif"]}
                        for p in self.publics],
            "niveaux": [{"valeur": str(n), "libelle": f"Niveau {n}", "nb": compte(lambda c, n=n: c["niveau"] == n),
                         "inactif": False} for n in niveaux],
        }
        self.rendre(
            "catalogue.html", "catalogue/", "Catalogue",
            "Tous les contenus de sciences industrielles : cours, exercices, activités, études de cas, QCM et "
            "formulaires, à filtrer par thème, type, filière et niveau.",
            rubrique="catalogue", contenus=self.contenus, options=options,
        )

    def groupes(self, test):
        groupes = []
        for collection in self.collections:
            contenus = [c for c in collection["contenus"] if test(c)]
            if contenus:
                groupes.append({"collection": collection, "contenus": contenus})
        return groupes

    def page_theme(self, theme):
        exemples = ", ".join(theme["exemples"])
        self.rendre(
            "liste.html", f"{theme['id']}/", theme["nom"],
            f"{theme['nom']} : {exemples}. Cours et exercices de sciences industrielles.",
            h1=theme["nom"], lignes=[f"{exemples} · {pluriel(theme['nb'], 'contenu')}"],
            groupes=self.groupes(lambda c: c["theme"] is theme),
            message_vide="Contenus en préparation pour ce thème.",
        )

    def page_public(self, public):
        if public["actif"]:
            ligne = pluriel(public["nb"], "contenu")
            vide = "Contenus en préparation pour cette filière."
        else:
            ligne = "Bientôt : les contenus de cette filière sont en préparation."
            vide = "Contenus en préparation pour cette filière."
        self.rendre(
            "liste.html", f"{public['id']}/", public["nom"],
            f"Cours, exercices et études de cas de sciences industrielles pour {public['nom']}.",
            h1=public["nom"], lignes=[ligne],
            groupes=self.groupes(lambda c: public in c["publics"]),
            message_vide=vide,
        )

    def page_collection(self, collection):
        self.rendre(
            "collection.html", f"{collection['id']}/", collection["titre"], collection["description"],
            collection=collection,
        )

    def page_contenu(self, contenu):
        source = (contenu["dossier"] / "index.html").read_text(encoding="utf-8")
        chemin = contenu["chemin"]
        if contenu["mode"] == "natif":
            if re.search(r"<\s*(html|head|body)[\s>]", source, re.IGNORECASE):
                raise ErreurConstruction(
                    f"{contenu['source_dossier']}/index.html : un contenu natif est un fragment, sans <html>, "
                    "<head> ni <body> (le gabarit « contenu » les fournit)."
                )
            self.rendre(
                "contenu.html", chemin, f"{contenu['titre']} — {contenu['collection']['titre']}",
                contenu["description"], c=contenu, corps=source,
            )
        else:
            module = self.env.get_template("_enveloppe.html").module
            racine = self.prefixe(chemin)
            page = envelopper(
                source, f"{contenu['source_dossier']}/index.html",
                str(module.tete(racine, self.site, UMAMI_SCRIPT)),
                str(module.haut(contenu, racine, self.site)),
                str(module.bas(contenu, racine, self.site, self.url_absolue(chemin))),
            )
            self.ecrire(chemin, page)
            self.pages.append(chemin)
        self.copier_ressources(contenu)

    def copier_ressources(self, contenu):
        cible = self.sortie / contenu["chemin"]
        for element in sorted(contenu["dossier"].iterdir()):
            if element.name in ("contenu.json", "index.html") or element.name.startswith("."):
                continue
            if element.is_dir():
                shutil.copytree(element, cible / element.name)
            else:
                shutil.copy2(element, cible / element.name)

    def pages_annales(self):
        self.rendre(
            "annales.html", "annales/", "Annales",
            "Annales d’examen en sciences industrielles, classées par filière, épreuve et session.",
            rubrique="annales", h1="Annales", lignes=["Sujets d’examen par filière, épreuve et session."],
            filiere=None, publics=self.publics,
        )
        for public in self.publics:
            self.rendre(
                "annales.html", f"annales/{public['id']}/", f"Annales {public['nom']}",
                f"Annales d’examen {public['nom']} en sciences industrielles : premières annales en préparation.",
                h1=f"Annales {public['nom']}", lignes=["Sujets d’examen par épreuve et session."],
                filiere=public, publics=self.publics,
            )

    def pages_service(self):
        for chemin, page, titre, description in SERVICE:
            self.rendre(
                "service.html", chemin, titre, description, registre="vitrine", avec_bande=False,
                rubrique="enseignants" if page == "enseignants" else "",
                h1=titre, sous_titre="", page=page,
            )
        self.rendre(
            "service.html", "404.html", "Page introuvable", "Cette page n’existe pas ou a changé d’adresse.",
            registre="vitrine", avec_bande=False, h1="Page introuvable", sous_titre="", page="404",
        )

    def ecrire_sitemap_robots(self):
        lignes = ['<?xml version="1.0" encoding="UTF-8"?>',
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for chemin in self.pages:
            lignes.append(f"  <url><loc>{echapper_xml(self.url_absolue(chemin))}</loc></url>")
        lignes.append("</urlset>")
        (self.sortie / "sitemap.xml").write_text("\n".join(lignes) + "\n", encoding="utf-8")
        if self.site["indexable"]:
            robots = f"User-agent: *\nAllow: /\n\nSitemap: {self.url_absolue('sitemap.xml')}\n"
        else:
            robots = "# Préproduction : indexation interdite (site.json, « indexable » : false).\nUser-agent: *\nDisallow: /\n"
        (self.sortie / "robots.txt").write_text(robots, encoding="utf-8")

    def bilan(self):
        repris = sum(1 for c in self.contenus if c["mode"] == "repris")
        lignes = [
            f"Site construit dans {self.lecteur.rel(self.sortie)}/ : {len(self.pages) + 1} pages, "
            f"{pluriel(len(self.collections), 'collection')}, {pluriel(len(self.contenus), 'contenu')} "
            f"(dont {repris} repris).",
            "Indexation : " + ("autorisée." if self.site["indexable"] else "interdite (noindex, robots.txt fermé)."),
            "Mesure d’audience : " + ("Umami." if self.site["umami"] else "aucune (site.json, « umami » vide)."),
        ]
        a_renseigner = [f"editeur.{k}" for k, v in self.site["editeur"].items() if not v]
        if not self.site["contact"]:
            a_renseigner.append("contact")
        if a_renseigner:
            lignes.append("À renseigner dans site.json : " + ", ".join(a_renseigner) + ".")
        return "\n".join(lignes)


def main(arguments=None):
    analyseur = argparse.ArgumentParser(description="Construit le site industrie.education dans _site/.")
    analyseur.add_argument("--racine", type=Path, default=DEPOT,
                           help="dossier du dépôt à lire (par défaut : ce dépôt)")
    analyseur.add_argument("--sortie", type=Path, default=None,
                           help="dossier à écrire (par défaut : <racine>/_site)")
    options = analyseur.parse_args(arguments)
    racine = options.racine.resolve()
    sortie = (options.sortie or racine / "_site").resolve()
    try:
        print(Constructeur(racine, sortie).construire())
    except ErreurConstruction as erreur:
        print(f"Construction arrêtée : {erreur}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
