#!/usr/bin/env python3
"""Construction du site industrie.education.

Lit site.json, catalogue/, contenus/, annales/ et medias/ et écrit le site statique dans _site/ : les pages de
TRAME § 3, statique/ copié sous _/, les fichiers autonomes (contenus repris, annales) enveloppés sans être modifiés
(TRAME § 5 et § 11), les variantes WebP des images (TRAME § 10), sitemap.xml et robots.txt.

Le back-office (lot 1d) est Sveltia CMS, servi par le site à l'adresse /admin/ : la construction y copie le script
du paquet npm @sveltia/cms (dist/sveltia-cms.js et dist/chunks/, sans les fichiers .map), sa traduction française et
admin/config.yml, et génère admin/index.html. /admin/ est hors du site public : noindex, absent du sitemap, interdit
dans robots.txt, jamais lié.

Un thème sans contenu ni annale publiés est traité comme une filière inactive : « Bientôt » sur l'accueil, pas de
page, aucun lien vers lui. Avec --resume FICHIER, un tableau de bord éditorial (comptes seulement) est ajouté à
FICHIER, au format Markdown : c'est le récapitulatif de l'Action GitHub ($GITHUB_STEP_SUMMARY).

Organisation des fiches (les deux sont acceptées, les adresses publiques sont les mêmes) :
  - un dossier par entrée : contenus/<collection>/<id>/contenu.json (+ index.html et ressources),
    annales/<id>/annale.json (+ index.html) ;
  - une fiche à plat, créée par le back-office : contenus/<collection>/<id>.json, annales/<id>.json, avec le fichier
    HTML autonome déposé dans medias/depots/ (champ « fichier »).

Rien n'est publié au statut « brouillon ». La construction s'arrête avec un message clair au premier problème :
nom réservé, type, thème, public, niveau ou notion inconnus, identifiant en double, image sans crédit ou
introuvable, licence hors liste, texte alternatif manquant, fichier autonome qui charge une ressource extérieure,
annale publiée sans source, indexation demandée alors que les mentions légales sont incomplètes, etc.

Usage :
    python3 outils/construire.py                        # lit le dépôt, écrit _site/
    python3 outils/construire.py --racine D --sortie S  # autre dépôt (tests), autre dossier de sortie
    python3 outils/construire.py --resume "$GITHUB_STEP_SUMMARY"   # dans l'Action : tableau de bord éditorial
"""

import argparse
import difflib
import json
import os
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import annale as controle_autonome  # noqa: E402  (outils/annale.py)
import illustrations  # noqa: E402  (outils/illustrations.py)

DEPOT = Path(__file__).resolve().parent.parent
UMAMI_SCRIPT = "https://cloud.umami.is/script.js"
# Paquet npm du back-office (npm install). La variable d'environnement permet aux tests d'en simuler l'absence.
SVELTIA = Path(os.environ.get("INDUSTRIE_SVELTIA") or DEPOT / "node_modules" / "@sveltia" / "cms")
# Modules que Sveltia charge à la demande depuis unpkg.com et que le site sert lui-même (table d'import de
# admin/index.html) : dépendances du paquet, installées avec lui ; seuls les fichiers utiles et la licence sont copiés.
#   - translittération des noms de fichiers téléversés (accents, œ, ß…) ;
#   - lecture des métadonnées EXIF d'une image téléversée (date de prise de vue).
MODULES_ADMIN = {
    "@sindresorhus/transliterate": ("index.js", "replacements.js", "locale-replacements.js", "license"),
    "exifr": ("dist/lite.esm.mjs", "LICENSE"),
}

# TRAME § 3 : adresses prises par les pages du site. Les identifiants des thèmes et des publics s'y ajoutent.
NOMS_RESERVES = (
    "catalogue", "annales", "labo", "maquettes", "methodes", "si", "sti2d", "bac-pro-mspc", "bts-ms", "mecanique",
    "energie", "numerique", "systemes", "habitat", "enseignants", "partenaires", "a-propos", "mentions-legales",
    "credits", "medias", "_", "admin", "classe", "compte",
)

# TRAME § 5 : types de contenu, avec leur libellé (maquette du catalogue). Les annales ont leur propre type de carte.
TYPES = {
    "cours": "Cours",
    "exercice": "Exercice",
    "activite": "Activité",
    "etude": "Étude de cas",
    "qcm": "QCM",
    "formulaire": "Formulaire",
}
TYPE_ANNALE = ("annale", "Annale")
NIVEAUX = (1, 2, 3)
MODES = ("repris", "natif")
STATUTS = ("brouillon", "relu")
# TRAME § 10 : licences acceptées pour une image (liste fermée).
LICENCES = {
    "domaine-public": "Domaine public",
    "cc0": "CC0 (dédiée au domaine public)",
    "oeuvre-personnelle": "Œuvre personnelle",
    "autorisation-ecrite": "Autorisation écrite",
}
# Mentions légales exigées avant l'ouverture aux moteurs (indexable: true) : champ de site.json, libellé du
# back-office (rubrique « Réglages du site »).
MENTIONS_OBLIGATOIRES = (
    (("editeur", "nom"), "Nom de l'éditeur"),
    (("editeur", "directeur_publication"), "Directeur de la publication"),
    (("contact",), "Adresse de contact"),
)
# Pages « à venir » (TRAME § 3 et § 6) : identifiant dans catalogue/a-venir.json = adresse de la page.
A_VENIR = ("labo", "maquettes")
# DESIGN.md § 7 : les six moments du titre d'accueil ; « cours » est le titre par défaut.
MOMENTS = ("cours", "matin", "midi", "soir", "nuit", "week-end")
A_LA_UNE_MIN, A_LA_UNE_MAX = 3, 6
ANNALES_ACCUEIL = 3

IDENTIFIANT = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CHEMIN_IMAGE = re.compile(r"^medias/(cartes|illustrations)/[^/]+\.(jpe?g|png|webp)$", re.IGNORECASE)
CHEMIN_DEPOT = re.compile(r"^medias/depots/[^/]+\.html?$", re.IGNORECASE)

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
    ("credits/", "credits", "Crédits",
     "Source et licence de chaque image et de chaque annale publiées sur industrie.education."),
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


def vide(valeur):
    """Vide au sens du back-office : absent, null, chaîne vide, liste ou objet vides."""
    return valeur is None or (isinstance(valeur, str) and not valeur.strip()) or valeur == [] or valeur == {}


def compte_cartes(contenus, annales):
    """« 4 contenus », « 1 annale », « 4 contenus, 1 annale »."""
    morceaux = []
    if contenus or not annales:
        morceaux.append(pluriel(contenus, "contenu"))
    if annales:
        morceaux.append(pluriel(annales, "annale"))
    return ", ".join(morceaux)


class Lecteur:
    """Lit les fichiers JSON du dépôt en donnant des messages d'erreur lisibles."""

    def __init__(self, racine):
        self.racine = racine

    def rel(self, chemin):
        try:
            return Path(chemin).relative_to(self.racine).as_posix()
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
            if isinstance(attendu, tuple):
                nature = "un objet { … } ou une liste [ … ]"
            raise ErreurConstruction(f"{self.rel(chemin)} doit contenir {nature}.")
        return donnees


def texte_requis(donnees, champ, ou):
    valeur = donnees.get(champ)
    if not isinstance(valeur, str) or not valeur.strip():
        raise ErreurConstruction(f"Champ « {champ} » manquant ou vide dans {ou}.")
    return valeur.strip()


def texte_facultatif(donnees, champ, ou):
    valeur = donnees.get(champ)
    if vide(valeur):
        return ""
    if not isinstance(valeur, (str, int)) or isinstance(valeur, bool):
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : un texte est attendu.")
    return str(valeur).strip()


def entier(valeur):
    """Entier ou texte de chiffres (le back-office enregistre les listes fermées en texte) ; None sinon."""
    if isinstance(valeur, bool):
        return None
    if isinstance(valeur, int):
        return valeur
    if isinstance(valeur, float) and valeur.is_integer():
        return int(valeur)
    if isinstance(valeur, str) and valeur.strip().isdigit():
        return int(valeur.strip())
    return None


def entier_positif(donnees, champ, ou):
    valeur = donnees.get(champ)
    if vide(valeur):
        return None
    nombre = entier(valeur)
    if nombre is None or nombre < 1:
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : un nombre entier positif est attendu.")
    return nombre


def niveau_valide(donnees, ou):
    valeur = donnees.get("niveau")
    if vide(valeur):
        return None
    nombre = entier(valeur)
    if nombre not in NIVEAUX:
        raise ErreurConstruction(
            f"Niveau inconnu « {valeur} » dans {ou}. Niveaux possibles : {', '.join(map(str, NIVEAUX))}."
        )
    return nombre


def liste_textes(donnees, champ, ou):
    valeur = donnees.get(champ)
    if vide(valeur):
        return []
    if not isinstance(valeur, list) or not all(isinstance(x, str) for x in valeur):
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : une liste de textes est attendue.")
    return [x.strip() for x in valeur if x.strip()]


def notions_valides(donnees, ou, notions_connues):
    """Identifiants de notions de la fiche, tous déclarés dans catalogue/notions.json."""
    notions = liste_textes(donnees, "notions", ou)
    for notion in notions:
        if notion in notions_connues:
            continue
        # D'abord les identifiants qui contiennent la saisie (ou y sont contenus), sinon les plus ressemblants.
        proches = [n for n in notions_connues if notion in n or n in notion][:3]
        proches = proches or difflib.get_close_matches(notion, list(notions_connues), n=3, cutoff=0.75)
        raise ErreurConstruction(
            f"Notion inconnue « {notion} » dans {ou}. "
            + (f"Identifiants proches : {', '.join(proches)}. " if proches else "")
            + "Corrigez l’identifiant, ou ajoutez la notion dans la rubrique « Notions » du back-office "
            "(catalogue/notions.json)."
        )
    return notions


def statut_valide(donnees, ou, defaut):
    valeur = donnees.get("statut")
    if vide(valeur):
        return defaut
    if valeur not in STATUTS:
        raise ErreurConstruction(f"Statut inconnu « {valeur} » dans {ou}. Statuts possibles : {', '.join(STATUTS)}.")
    return valeur


def image_declaree(valeur, ou, champ="image"):
    """Objet {fichier, alt} du back-office ; None quand aucune image n'est choisie."""
    if vide(valeur) or (isinstance(valeur, dict) and vide(valeur.get("fichier"))):
        return None
    if not isinstance(valeur, dict) or not isinstance(valeur.get("fichier"), str):
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : {{\"fichier\": …, \"alt\": …}} attendu.")
    fichier = valeur["fichier"].strip().lstrip("/")
    if not CHEMIN_IMAGE.match(fichier):
        raise ErreurConstruction(
            f"Image « {fichier} » refusée dans {ou} : elle doit être une image JPEG, PNG ou WebP de medias/cartes/ "
            "ou de medias/illustrations/."
        )
    alt = valeur.get("alt")
    return {"fichier": fichier, "alt": alt.strip() if isinstance(alt, str) else "", "cite_par": ou}


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
    umami = site.get("umami") or ""
    if not isinstance(umami, str) or (umami.strip() and not re.match(r"^[0-9a-fA-F-]{8,}$", umami.strip())):
        raise ErreurConstruction("site.json : « umami » doit être vide ou contenir l’identifiant du site Umami.")
    site["umami"] = umami.strip()
    # Adresse du script : elle dépend de la région choisie à la création du compte Umami Cloud.
    script = site.get("umami_script") or UMAMI_SCRIPT
    if not isinstance(script, str) or not re.match(r"^https://[a-z0-9.-]+\.[a-z]{2,}(:\d+)?/\S*$", script.strip(), re.I):
        raise ErreurConstruction(
            "site.json : « umami_script » doit être l’adresse complète du script Umami, en https:// "
            f"(par défaut : {UMAMI_SCRIPT})."
        )
    site["umami_script"] = script.strip()
    for champ in ("editeur", "hebergeur"):
        # Le back-office n'écrit pas un champ facultatif vide : un éditeur entièrement vide peut être absent.
        site[champ] = {} if site.get(champ) is None else site[champ]
        if not isinstance(site[champ], dict):
            raise ErreurConstruction(f"site.json : « {champ} » doit être un objet.")
    for champ in ("nom", "adresse", "directeur_publication"):
        site["editeur"][champ] = site["editeur"].get(champ) or ""
    for champ in ("nom", "adresse"):
        site["hebergeur"][champ] = site["hebergeur"].get(champ) or ""
    if not isinstance(site.get("contact") or "", str):
        raise ErreurConstruction("site.json : « contact » doit être une adresse électronique ou vide.")
    site["contact"] = (site.get("contact") or "").strip()
    # Mentions légales : à compléter avant l'ouverture aux moteurs de recherche.
    site["mentions_manquantes"] = [
        libelle for chemin, libelle in MENTIONS_OBLIGATOIRES
        if not str((site[chemin[0]].get(chemin[1]) if len(chemin) > 1 else site[chemin[0]]) or "").strip()
    ]
    if site["indexable"] and site["mentions_manquantes"]:
        raise ErreurConstruction(
            "site.json : « indexable » ne peut pas valoir true tant que les mentions légales sont incomplètes. "
            "Remplissez dans la rubrique « Réglages du site » du back-office : "
            + ", ".join(f"« {m} »" for m in site["mentions_manquantes"]) + "."
        )
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
    site["titres_accueil"] = {m: titres[m].replace("\r\n", "\n") for m in MOMENTS}
    site["illustration_accueil"] = image_declaree(site.get("illustration_accueil"), ou, "illustration_accueil")
    return site


def charger_catalogue(lecteur):
    dossier = lecteur.racine / "catalogue"
    themes = lecteur.json(dossier / "themes.json", list)
    publics = lecteur.json(dossier / "publics.json", list)
    a_la_une = lecteur.json(dossier / "a-la-une.json", (dict, list))
    lecteur.json(dossier / "partenaires.json", list)  # vide en V1 : seulement vérifié

    vus = set()
    for i, t in enumerate(themes, 1):
        ou = f"catalogue/themes.json (thème n° {i})"
        if not isinstance(t, dict):
            raise ErreurConstruction(f"{ou} : un objet est attendu.")
        ident = texte_requis(t, "id", ou)
        texte_requis(t, "nom", ou)
        t["court"] = t.get("court") or t["nom"]
        t["exemples"] = liste_textes(t, "exemples", ou)
        t["illustration"] = image_declaree(t.get("illustration"), ou, "illustration")
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

    # Le back-office enregistre {"contenus": [...]} ; l'ancienne forme (liste seule) reste acceptée.
    if isinstance(a_la_une, dict):
        a_la_une = a_la_une.get("contenus") or []
    if not isinstance(a_la_une, list) or not all(isinstance(x, str) for x in a_la_une):
        raise ErreurConstruction("catalogue/a-la-une.json : « contenus » doit être une liste d’identifiants de contenus.")
    return themes, publics, [x.strip() for x in a_la_une if x.strip()]


def charger_notions(lecteur):
    """catalogue/notions.json : [{id, nom}], le nom est celui affiché sur les pages (TRAME § 5)."""
    notions = lecteur.json(lecteur.racine / "catalogue" / "notions.json", list)
    resultat = {}
    for i, n in enumerate(notions, 1):
        ou = f"catalogue/notions.json (notion n° {i})"
        if not isinstance(n, dict):
            raise ErreurConstruction(f"{ou} : un objet {{\"id\", \"nom\"}} est attendu.")
        ident = texte_requis(n, "id", ou)
        if not IDENTIFIANT.match(ident):
            raise ErreurConstruction(
                f"Identifiant de notion invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets."
            )
        if ident in resultat:
            raise ErreurConstruction(f"Notion déclarée deux fois dans catalogue/notions.json : « {ident} ».")
        resultat[ident] = texte_requis(n, "nom", ou)
    return resultat


def charger_a_venir(lecteur):
    """catalogue/a-venir.json : Labo et Maquettes « à venir » (titre, promesse, planche facultative)."""
    donnees = lecteur.json(lecteur.racine / "catalogue" / "a-venir.json", dict)
    sections = []
    for ident in A_VENIR:
        ou = f"catalogue/a-venir.json ({ident})"
        section = donnees.get(ident)
        if not isinstance(section, dict):
            raise ErreurConstruction(f"{ou} : un objet {{\"titre\", \"promesse\"}} est attendu.")
        sections.append({
            "id": ident,
            "titre": texte_requis(section, "titre", ou),
            "promesse": texte_requis(section, "promesse", ou),
            "illustration": image_declaree(section.get("illustration"), ou, "illustration"),
            "chemin": f"{ident}/",
        })
    return sections


def charger_credits(lecteur):
    """medias/CREDITS.json : une entrée par image, licence dans la liste fermée (TRAME § 10)."""
    chemin = lecteur.racine / "medias" / "CREDITS.json"
    if not chemin.is_file():
        return {}
    entrees = lecteur.json(chemin, (list, dict))
    if isinstance(entrees, dict):
        entrees = entrees.get("images") or []
    credits = {}
    for i, entree in enumerate(entrees, 1):
        ou = f"medias/CREDITS.json (image n° {i})"
        if not isinstance(entree, dict):
            raise ErreurConstruction(f"{ou} : un objet est attendu.")
        fichier = texte_requis(entree, "fichier", ou).lstrip("/")
        ou = f"medias/CREDITS.json ({fichier})"
        if not CHEMIN_IMAGE.match(fichier):
            raise ErreurConstruction(
                f"{ou} : « fichier » doit être une image de medias/cartes/ ou de medias/illustrations/ "
                "(ex. « medias/cartes/levage-linge.jpg »)."
            )
        if fichier in credits:
            raise ErreurConstruction(f"Image déclarée deux fois dans medias/CREDITS.json : « {fichier} ».")
        licence = entree.get("licence")
        if licence not in LICENCES:
            raise ErreurConstruction(
                f"Licence non acceptée « {licence or ''} » pour {fichier} dans medias/CREDITS.json. Licences "
                f"possibles : {', '.join(LICENCES)} (jamais d’image générée par IA ni de banque d’images)."
            )
        reference = texte_facultatif(entree, "reference_autorisation", ou)
        if licence == "autorisation-ecrite" and not reference:
            raise ErreurConstruction(
                f"Autorisation écrite sans référence pour {fichier} dans medias/CREDITS.json : renseignez "
                "« reference_autorisation » (qui a autorisé, quand, par quel écrit)."
            )
        credits[fichier] = {
            "fichier": fichier,
            "titre": texte_requis(entree, "titre", ou),
            "auteur": texte_facultatif(entree, "auteur", ou),
            "date": texte_facultatif(entree, "date", ou),
            "source": texte_facultatif(entree, "source", ou),
            "licence": licence,
            "licence_nom": LICENCES[licence],
            "reference_autorisation": reference,
            "usage": texte_facultatif(entree, "usage", ou),
            "decorative": entree.get("decorative") is True,
        }
    return credits


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


def fichier_depose(lecteur, donnees, ou, obligatoire):
    """Champ « fichier » : chemin d'un fichier HTML autonome déposé dans medias/depots/."""
    valeur = donnees.get("fichier")
    if vide(valeur):
        if obligatoire:
            raise ErreurConstruction(
                f"Champ « fichier » manquant dans {ou} : téléversez le fichier HTML autonome (medias/depots/)."
            )
        return None
    if not isinstance(valeur, str) or not CHEMIN_DEPOT.match(valeur.strip().lstrip("/")):
        raise ErreurConstruction(f"Champ « fichier » invalide dans {ou} : un fichier .html de medias/depots/ est attendu.")
    chemin = lecteur.racine / valeur.strip().lstrip("/")
    if not chemin.is_file():
        raise ErreurConstruction(f"Fichier introuvable : {lecteur.rel(chemin)} (cité par {ou}).")
    return chemin


def charger_contenus(lecteur, themes, publics, reserves, notions):
    themes_par_id = {t["id"]: t for t in themes}
    publics_par_id = {p["id"]: p for p in publics}
    dossier_contenus = lecteur.racine / "contenus"
    if not dossier_contenus.is_dir():
        raise ErreurConstruction("Dossier manquant : contenus/.")

    collections, contenus_par_id, brouillons = [], {}, []

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

        # Une fiche par dossier (<id>/contenu.json) ou à plat (<id>.json, créée par le back-office).
        fiches = []
        for element in sorted(dossier.iterdir()):
            if element.name.startswith("."):
                continue
            if element.is_dir():
                fiches.append(("dossier", element))
            elif element.suffix == ".json" and element.name != "collection.json":
                fiches.append(("plat", element))

        contenus = []
        for organisation, chemin in fiches:
            contenu = charger_contenu(lecteur, organisation, chemin, collection, themes_par_id, publics_par_id,
                                      notions)
            deja = contenus_par_id.get(contenu["id"]) or next((b for b in brouillons if b["id"] == contenu["id"]), None)
            if deja:
                raise ErreurConstruction(
                    f"Identifiant en double : « {contenu['id']} » ({deja['source']} et {contenu['source']}). "
                    "Chaque contenu doit avoir un identifiant unique sur tout le site."
                )
            if contenu["statut"] == "brouillon":
                brouillons.append(contenu)
                continue
            contenus_par_id[contenu["id"]] = contenu
            contenus.append(contenu)

        collection["contenus"] = ordonner(contenus, donnees.get("ordre"), ou, {b["id"] for b in brouillons})
        if not collection["contenus"]:
            print(f"Attention : la collection « {nom} » ne contient aucun contenu publié.", file=sys.stderr)
        for i, contenu in enumerate(collection["contenus"]):
            contenu["precedent"] = collection["contenus"][i - 1] if i > 0 else None
            contenu["suivant"] = collection["contenus"][i + 1] if i + 1 < len(collection["contenus"]) else None
        collections.append(collection)

    return collections, contenus_par_id, brouillons


def charger_contenu(lecteur, organisation, chemin, collection, themes_par_id, publics_par_id, notions):
    if organisation == "dossier":
        fiche = chemin / "contenu.json"
        ident_attendu = chemin.name
        if not fiche.is_file():
            raise ErreurConstruction(
                f"Fichier manquant : {lecteur.rel(fiche)} (chaque dossier d’une collection est un contenu)."
            )
    else:
        fiche = chemin
        ident_attendu = chemin.stem
    ou = lecteur.rel(fiche)
    donnees = lecteur.json(fiche, dict)

    ident = texte_requis(donnees, "id", ou)
    if ident != ident_attendu:
        lieu = "son dossier" if organisation == "dossier" else "son fichier"
        raise ErreurConstruction(f"L’identifiant « {ident} » de {ou} doit être le nom de {lieu} (« {ident_attendu} »).")
    if not IDENTIFIANT.match(ident):
        raise ErreurConstruction(f"Identifiant invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets.")
    statut = statut_valide(donnees, ou, defaut="relu")
    if statut == "brouillon":
        # Un brouillon n'est pas contrôlé ; son type sert seulement au résumé de publication.
        return {"id": ident, "statut": statut, "source": ou,
                "type": donnees.get("type") if donnees.get("type") in TYPES else None}

    type_ = texte_requis(donnees, "type", ou)
    if type_ not in TYPES:
        raise ErreurConstruction(f"Type inconnu « {type_} » dans {ou}. Types possibles : {', '.join(TYPES)}.")
    depose = fichier_depose(lecteur, donnees, ou, obligatoire=(organisation == "plat"))
    if organisation == "plat" or depose:
        mode = "repris"  # un fichier déposé par le back-office est toujours un fichier autonome
    else:
        mode = donnees.get("mode") or "repris"
        if mode not in MODES:
            raise ErreurConstruction(f"Mode inconnu « {mode} » dans {ou}. Modes possibles : {', '.join(MODES)}.")
    if depose:
        source_html, dossier_ressources = depose, None
    else:
        source_html, dossier_ressources = chemin / "index.html", chemin
        if not source_html.is_file():
            raise ErreurConstruction(f"Fichier manquant : {lecteur.rel(source_html)}.")

    theme = theme_connu(donnees["theme"], themes_par_id, ou) if not vide(donnees.get("theme")) else collection["theme"]
    publics = (publics_connus(donnees["publics"], publics_par_id, ou) if not vide(donnees.get("publics"))
               else collection["publics"])
    mots_cles = liste_textes(donnees, "mots_cles", ou)

    contenu = {
        "id": ident,
        "titre": texte_requis(donnees, "titre", ou),
        "description": texte_requis(donnees, "description", ou),
        "type": type_,
        "type_nom": TYPES[type_],
        "niveau": niveau_valide(donnees, ou),
        "duree_min": entier_positif(donnees, "duree_min", ou),
        "mots_cles": mots_cles,
        "notions": notions_valides(donnees, ou, notions),
        "image": image_declaree(donnees.get("image"), ou),
        "mode": mode,
        "statut": statut,
        "theme": theme,
        "publics": publics,
        "collection": collection,
        "chemin": f"{collection['id']}/{ident}/",
        "html": source_html,
        "ressources": dossier_ressources if organisation == "dossier" else None,
        "dossier_ressources": dossier_ressources,
        "source": ou,
        "bandeau": collection["titre"],
        "sous_titre": collection["titre"],
        "precedent": None,
        "suivant": None,
        "retour": {"sens": "Toute la collection", "libelle": collection["titre"], "chemin": f"{collection['id']}/"},
        "fil": [
            {"libelle": theme["court"], "chemin": f"{theme['id']}/"},
            {"libelle": collection["titre"], "chemin": f"{collection['id']}/"},
            {"libelle": texte_requis(donnees, "titre", ou), "chemin": None},
        ],
    }
    # Texte lu par la recherche du catalogue (normalisé dans le navigateur : minuscules, sans accents).
    contenu["texte"] = " ".join(
        [contenu["titre"], contenu["description"], *mots_cles, *(notions[n] for n in contenu["notions"]),
         collection["titre"], theme["nom"], theme["court"], contenu["type_nom"], *(p["nom"] for p in publics)]
    )
    return contenu


def credit_annale(donnees, ou):
    """Champ « source » d'une annale publiée : obligatoire (outils/annale.py) ; ligne de crédit de la fiche."""
    source = donnees.get("source")
    problemes = controle_autonome.controler_source(source, ou)
    if problemes:
        raise ErreurConstruction("annale sans source valide :\n  " + "\n  ".join(problemes))
    licence = controle_autonome.LICENCES_ANNALE[source["licence"]]
    editeur = str(source.get("editeur") or "").strip()
    avant, _, apres = licence["credit"].partition("{editeur}")
    return {
        "editeur": editeur,
        "url": str(source.get("url") or "").strip(),
        "licence": source["licence"],
        "licence_nom": licence["nom"],
        "reference_autorisation": str(source.get("reference_autorisation") or "").strip(),
        # Ligne de crédit : « avant », puis le nom de l'éditeur (lien vers la source) s'il figure dans le modèle.
        "avant": avant,
        "avec_editeur": "{editeur}" in licence["credit"],
        "apres": apres,
    }


def charger_annales(lecteur, themes, publics, reserves_annales, notions):
    """annales/<id>.json (back-office) ou annales/<id>/annale.json : fiches des annales (TRAME § 11)."""
    themes_par_id = {t["id"]: t for t in themes}
    publics_par_id = {p["id"]: p for p in publics}
    dossier = lecteur.racine / "annales"
    if not dossier.is_dir():
        return [], []
    fiches = []
    for element in sorted(dossier.iterdir()):
        if element.name.startswith("."):
            continue
        if element.is_dir():
            fiches.append(("dossier", element / "annale.json", element.name, element))
        elif element.suffix == ".json":
            fiches.append(("plat", element, element.stem, None))

    annales, brouillons, vus = [], [], {}
    for organisation, fiche, ident_attendu, dossier_annale in fiches:
        ou = lecteur.rel(fiche)
        donnees = lecteur.json(fiche, dict)
        ident = texte_requis(donnees, "id", ou)
        if ident != ident_attendu:
            lieu = "son dossier" if organisation == "dossier" else "son fichier"
            raise ErreurConstruction(f"L’identifiant « {ident} » de {ou} doit être le nom de {lieu} (« {ident_attendu} »).")
        if not IDENTIFIANT.match(ident):
            raise ErreurConstruction(f"Identifiant invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets.")
        if ident in reserves_annales:
            raise ErreurConstruction(
                f"Identifiant d’annale réservé « {ident} » ({ou}) : /annales/{ident}/ est la page d’une filière."
            )
        if ident in vus:
            raise ErreurConstruction(f"Identifiant d’annale en double : « {ident} » ({vus[ident]} et {ou}).")
        vus[ident] = ou
        # Sans statut, une annale reste un brouillon : la publication demande « relu » (TRAME § 11).
        statut = statut_valide(donnees, ou, defaut="brouillon")
        if statut != "relu":
            # Source facultative en brouillon ; le résumé de publication compte les annales qui n'en ont pas.
            brouillons.append({"id": ident, "source": ou, "type": TYPE_ANNALE[0],
                               "sans_source": bool(controle_autonome.controler_source(donnees.get("source"), ou))})
            continue

        depose = fichier_depose(lecteur, donnees, ou, obligatoire=(organisation == "plat"))
        if depose:
            source_html, dossier_ressources = depose, None
        else:
            source_html, dossier_ressources = dossier_annale / "index.html", dossier_annale
            if not source_html.is_file():
                raise ErreurConstruction(f"Fichier manquant : {lecteur.rel(source_html)}.")

        publics_annale = publics_connus(donnees.get("publics"), publics_par_id, ou)
        theme = theme_connu(donnees.get("theme"), themes_par_id, ou)
        origine = donnees.get("origine") if isinstance(donnees.get("origine"), dict) else {}
        afficher = donnees.get("afficher_origine")
        if not vide(afficher) and not isinstance(afficher, bool):
            raise ErreurConstruction(f"Champ « afficher_origine » invalide dans {ou} : true ou false attendu.")
        afficher = afficher is True
        session = origine.get("session")
        origine_texte = " ".join(
            str(x).strip() for x in (origine.get("diplome"), session, origine.get("epreuve")) if not vide(x)
        )
        montrer = afficher and bool(origine_texte)
        titre = texte_requis(donnees, "titre", ou)
        filieres = ", ".join(p["nom"] for p in publics_annale)
        mis_a_jour = texte_facultatif(donnees, "mis_a_jour", ou)
        if mis_a_jour and not re.match(r"^\d{4}-\d{2}-\d{2}$", mis_a_jour):
            raise ErreurConstruction(f"Champ « mis_a_jour » invalide dans {ou} : date AAAA-MM-JJ attendue.")
        notions_annale = notions_valides(donnees, ou, notions)
        annale = {
            "id": ident,
            "titre": titre,
            "presentation": texte_requis(donnees, "presentation", ou),
            "type": TYPE_ANNALE[0],
            "type_nom": TYPE_ANNALE[1],
            "niveau": None,
            "duree_min": entier_positif(donnees, "duree_min", ou),
            "notions": notions_annale,
            "image": image_declaree(donnees.get("image"), ou),
            "credit": credit_annale(donnees, ou),
            "theme": theme,
            "publics": publics_annale,
            "filieres": filieres,
            "origine_texte": origine_texte if montrer else "",
            "mis_a_jour": mis_a_jour,
            "chemin": f"annales/{ident}/",
            "html": source_html,
            "dossier_ressources": dossier_ressources,
            "source": ou,
            "bandeau": "Annales",
            "sous_titre": filieres + (f" · {origine_texte}" if montrer else ""),
            "precedent": None,
            "suivant": None,
            "retour": {"sens": "Toutes les annales", "libelle": "Annales", "chemin": "annales/"},
            "fil": [
                {"libelle": "Annales", "chemin": "annales/"},
                {"libelle": publics_annale[0]["nom"], "chemin": f"annales/{publics_annale[0]['id']}/"},
                {"libelle": titre, "chemin": None},
            ],
        }
        # Recherche du catalogue : l'origine n'y figure que si elle est affichée.
        annale["texte"] = " ".join(
            [titre, annale["presentation"], *(notions[n] for n in notions_annale), theme["nom"], theme["court"],
             TYPE_ANNALE[1], filieres, annale["origine_texte"]]
        )
        annales.append(annale)

    # Les plus récentes d'abord (date de mise à jour), puis par titre.
    annales.sort(key=lambda a: cle_tri(a["titre"]))
    annales.sort(key=lambda a: a["mis_a_jour"], reverse=True)
    for i, annale in enumerate(annales):
        annale["precedent"] = annales[i - 1] if i > 0 else None
        annale["suivant"] = annales[i + 1] if i + 1 < len(annales) else None
    return annales, brouillons


def ordre_par_defaut(contenu):
    # Cours d'abord, puis le reste par niveau (TRAME § 6) ; sans niveau en dernier.
    return (0 if contenu["type"] == "cours" else 1, contenu["niveau"] or 99, cle_tri(contenu["titre"]))


def ordonner(contenus, ordre, ou, brouillons=()):
    if vide(ordre):
        return sorted(contenus, key=ordre_par_defaut)
    if not isinstance(ordre, list) or not all(isinstance(x, str) for x in ordre):
        raise ErreurConstruction(f"Champ « ordre » invalide dans {ou} : une liste d’identifiants est attendue.")
    par_id = {c["id"]: c for c in contenus}
    for ident in ordre:
        if ident not in par_id and ident not in brouillons:
            raise ErreurConstruction(f"« ordre » de {ou} cite « {ident} », qui n’est pas un contenu de la collection.")
    if len(set(ordre)) != len(ordre):
        raise ErreurConstruction(f"Identifiant en double dans « ordre » de {ou}.")
    ordre = [i for i in ordre if i in par_id]
    restants = sorted((c for c in contenus if c["id"] not in ordre), key=ordre_par_defaut)
    return [par_id[i] for i in ordre] + restants


def choisir_a_la_une(identifiants, contenus_par_id, brouillons):
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
        if contenu is None and any(b["id"] == cle for b in brouillons):
            raise ErreurConstruction(
                f"Contenu de catalogue/a-la-une.json au statut brouillon : « {ident} ». Passez-le en « relu » ou "
                "retirez-le de la une."
            )
        if contenu is None or (ident.count("/") and contenu["chemin"] != ident.strip("/") + "/"):
            raise ErreurConstruction(f"Contenu de catalogue/a-la-une.json introuvable : « {ident} ».")
        choisis.append(contenu)
    return choisis


# ---------------------------------------------------------------------------
# Enveloppe des fichiers autonomes (TRAME § 5 et § 11)
# ---------------------------------------------------------------------------

class Reperes(HTMLParser):
    """Repère les vraies balises <head>, <meta charset>, </head>, <body> et </body> (le texte des scripts et des
    styles est ignoré)."""

    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.debuts_lignes = [0] + [i + 1 for i, ch in enumerate(source) if ch == "\n"]
        self.debuts_head = []
        self.meta_charset = None
        self.fins_head = []
        self.debuts_body = []
        self.fins_body = []
        self.bases = 0

    def position(self):
        ligne, colonne = self.getpos()
        return self.debuts_lignes[ligne - 1] + colonne

    def fin_balise(self):
        return self.position() + len(self.get_starttag_text())

    def handle_starttag(self, balise, attributs):
        if balise == "head":
            self.debuts_head.append(self.fin_balise())
        elif balise == "meta" and self.meta_charset is None and not self.fins_head:
            noms = {nom.lower(): (valeur or "").lower() for nom, valeur in attributs}
            if "charset" in noms or noms.get("http-equiv") == "content-type":
                self.meta_charset = self.fin_balise()
        elif balise == "body":
            self.debuts_body.append(self.fin_balise())
        elif balise == "base":
            self.bases += 1

    def handle_startendtag(self, balise, attributs):
        self.handle_starttag(balise, attributs)

    def handle_endtag(self, balise):
        if balise == "head":
            self.fins_head.append(self.position())
        elif balise == "body":
            self.fins_body.append(self.position())


def envelopper(source, ou, tete, haut, bas, debut_tete=""):
    """Insère debut_tete juste après <meta charset> (ou <head>), tete avant </head>, haut après <body…> et bas avant
    </body> ; le reste du fichier est inchangé."""
    reperes = Reperes(source)
    reperes.feed(source)
    reperes.close()
    if (len(reperes.fins_head) != 1 or len(reperes.debuts_body) != 1 or len(reperes.fins_body) != 1
            or len(reperes.debuts_head) != 1):
        raise ErreurConstruction(
            f"{ou} : un fichier autonome doit avoir des balises <head>, </head>, <body> et </body> explicites et "
            "uniques, pour être enveloppé sans modifier son corps."
        )
    if reperes.bases:
        raise ErreurConstruction(f"{ou} : la balise <base> d’un fichier autonome n’est pas prise en charge.")
    debut_head = reperes.meta_charset or reperes.debuts_head[0]
    fin_head, debut_body, fin_body = reperes.fins_head[0], reperes.debuts_body[0], reperes.fins_body[0]
    if not debut_head <= fin_head < debut_body <= fin_body:
        raise ErreurConstruction(f"{ou} : balises <head> et <body> dans un ordre inattendu.")
    return (source[:debut_head] + debut_tete + source[debut_head:fin_head] + tete + source[fin_head:debut_body]
            + haut + source[debut_body:fin_body] + bas + source[fin_body:])


# ---------------------------------------------------------------------------
# Images (TRAME § 10)
# ---------------------------------------------------------------------------

class Images:
    """Vérifie chaque image citée (fichier présent, crédit, licence, texte alternatif) et publie ses variantes."""

    def __init__(self, lecteur, credits):
        self.lecteur = lecteur
        self.credits = credits
        self.cache = lecteur.racine / ".cache" / "images"
        self.sortie = None
        self.publiees = {}

    def verifier(self, image):
        if image is None:
            return
        fichier, ou = image["fichier"], image["cite_par"]
        if not (self.lecteur.racine / fichier).is_file():
            raise ErreurConstruction(f"Image introuvable : {fichier} (citée par {ou}). Téléversez-la ou corrigez la fiche.")
        credit = self.credits.get(fichier)
        if credit is None:
            raise ErreurConstruction(
                f"Image sans crédit : {fichier} (citée par {ou}) n’est pas déclarée dans medias/CREDITS.json. "
                "Ajoutez-la dans la rubrique « Crédits » du back-office, avec sa licence."
            )
        if not image["alt"] and not credit["decorative"]:
            raise ErreurConstruction(
                f"Texte alternatif manquant pour {fichier} (citée par {ou}) : décrivez l’image en une phrase, ou "
                "déclarez-la décorative dans medias/CREDITS.json."
            )

    def publier(self, image, profil):
        """Renvoie {alt, variantes: [{chemin, largeur, hauteur}], largeur, hauteur} et copie les variantes."""
        if image is None:
            return None
        cle = (image["fichier"], profil)
        if cle not in self.publiees:
            source = self.lecteur.racine / image["fichier"]
            try:
                variantes = illustrations.variantes(source, profil, self.cache)
            except illustrations.ErreurImage as erreur:
                raise ErreurConstruction(f"Image {image['fichier']} (citée par {image['cite_par']}) : {erreur}.") from None
            dossier = Path(image["fichier"]).parent.as_posix()
            sorties = []
            for v in variantes:
                cible = self.sortie / dossier / v["nom"]
                cible.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(v["fichier"], cible)
                sorties.append({"chemin": f"{dossier}/{v['nom']}", "largeur": v["largeur"], "hauteur": v["hauteur"]})
            self.publiees[cle] = sorties
        sorties = self.publiees[cle]
        alt = "" if self.credits[image["fichier"]]["decorative"] else image["alt"]
        return {"alt": alt, "variantes": sorties, "largeur": sorties[0]["largeur"], "hauteur": sorties[0]["hauteur"]}


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
        self.env.filters["notion"] = lambda ident: self.notions[ident]
        self.env.filters["compte_cartes"] = compte_cartes

    # --- données ---

    def charger(self):
        self.site = charger_site(self.lecteur)
        self.themes, self.publics, ids_une = charger_catalogue(self.lecteur)
        self.notions = charger_notions(self.lecteur)
        self.a_venir = charger_a_venir(self.lecteur)
        reserves = set(NOMS_RESERVES) | {t["id"] for t in self.themes} | {p["id"] for p in self.publics}
        self.collections, self.contenus_par_id, self.brouillons = charger_contenus(
            self.lecteur, self.themes, self.publics, reserves, self.notions)
        self.annales, brouillons_annales = charger_annales(
            self.lecteur, self.themes, self.publics, {p["id"] for p in self.publics}, self.notions)
        self.brouillons_annales = brouillons_annales
        self.a_la_une = choisir_a_la_une(ids_une, self.contenus_par_id, self.brouillons)
        self.verifier_back_office()

        rang_theme = {t["id"]: i for i, t in enumerate(self.themes)}
        self.collections.sort(key=lambda c: (rang_theme[c["theme"]["id"]], cle_tri(c["titre"])))
        # Ordre du catalogue : thème, collection, puis ordre de la collection ; les annales ensuite.
        self.contenus = [c for col in self.collections for c in col["contenus"]]
        self.contenus.sort(key=lambda c: rang_theme[c["theme"]["id"]])  # tri stable
        # Un thème sans contenu ni annale publiés est traité comme une filière inactive : pas de page, pas de lien.
        for t in self.themes:
            t["nb"] = sum(1 for c in self.contenus if c["theme"] is t)
            t["nb_annales"] = sum(1 for a in self.annales if a["theme"] is t)
            t["actif"] = bool(t["nb"] or t["nb_annales"])
        for p in self.publics:
            p["nb"] = sum(1 for c in self.contenus if p in c["publics"])
            p["nb_annales"] = sum(1 for a in self.annales if p in a["publics"])

        # Liens entre annales et contenus par les notions (« Pour réviser »).
        for annale in self.annales:
            notions = set(annale["notions"])
            lies = [c for c in self.contenus if notions & set(c["notions"])]
            annale["contenus_lies"] = sorted(lies, key=lambda c: (c["type"] != "cours", cle_tri(c["titre"])))

        # Images : chaque image citée doit exister, avoir un crédit et un texte alternatif.
        self.credits = charger_credits(self.lecteur)
        self.images = Images(self.lecteur, self.credits)
        for objet in [*self.contenus, *self.annales]:
            self.images.verifier(objet["image"])
        for theme in self.themes:
            self.images.verifier(theme["illustration"])
        for section in self.a_venir:
            self.images.verifier(section["illustration"])
        self.images.verifier(self.site["illustration_accueil"])

        # Fichiers autonomes publiés : contrôlés avant tout (TRAME § 11).
        problemes = []
        for objet in [*(c for c in self.contenus if c["mode"] == "repris"), *self.annales]:
            problemes += controle_autonome.controler(
                objet["html"], self.lecteur.rel(objet["html"]), objet["dossier_ressources"])
        if problemes:
            raise ErreurConstruction(
                "fichier autonome refusé :\n  " + "\n  ".join(problemes[:12])
                + ("\n  …" if len(problemes) > 12 else "")
            )

    def verifier_back_office(self):
        """Le back-office /admin/ demande le paquet npm @sveltia/cms et admin/config.yml."""
        self.admin_config = self.racine / "admin" / "config.yml"
        if not self.admin_config.is_file():
            self.admin_config = DEPOT / "admin" / "config.yml"  # dépôts factices des tests
        if not self.admin_config.is_file():
            raise ErreurConstruction("Fichier manquant : admin/config.yml (configuration du back-office).")
        manifeste = SVELTIA / "package.json"
        if not (SVELTIA / "dist" / "sveltia-cms.js").is_file() or not manifeste.is_file():
            raise ErreurConstruction(
                "le back-office ne peut pas être construit : le paquet npm @sveltia/cms est introuvable "
                f"({SVELTIA}). Lancez « npm ci » (ou « npm install ») à la racine du dépôt, puis recommencez."
            )
        self.sveltia_version = json.loads(manifeste.read_text(encoding="utf-8"))["version"]
        # Modules servis par le site (MODULES_ADMIN) : l'adresse unpkg attendue porte la version écrite dans le script.
        script = (SVELTIA / "dist" / "sveltia-cms.js").read_text(encoding="utf-8")
        racine_modules = SVELTIA.parent.parent if SVELTIA.parent.name.startswith("@") else SVELTIA.parent
        self.modules_admin = []
        for paquet, fichiers in MODULES_ADMIN.items():
            attendu = re.search(f'(?:"{re.escape(paquet)}"|\\b{re.escape(paquet)}):`' + r"\^?([0-9][0-9.]*)`", script)
            dossier = racine_modules / paquet
            if attendu and all((dossier / f).is_file() for f in fichiers):
                self.modules_admin.append({
                    "dossier": dossier, "fichiers": fichiers, "nom": paquet.split("/")[-1],
                    "adresse": f"https://unpkg.com/{paquet}@{attendu.group(1)}/",
                })

    def ecrire_admin(self):
        """/admin/ : script et morceaux de Sveltia CMS (sans .map), traduction française, configuration, page."""
        cible = self.sortie / "admin"
        (cible / "locales").mkdir(parents=True)
        dist = SVELTIA / "dist"
        shutil.copy2(dist / "sveltia-cms.js", cible / "sveltia-cms.js")
        shutil.copytree(dist / "chunks", cible / "chunks", ignore=shutil.ignore_patterns("*.map"))
        shutil.copy2(SVELTIA / "locales" / "fr.json", cible / "locales" / "fr.json")
        # Licence MIT de Sveltia CMS, à joindre à toute copie du logiciel.
        shutil.copy2(SVELTIA / "LICENSE.txt", cible / "LICENSE.txt")
        shutil.copy2(self.admin_config, cible / "config.yml")
        for module in self.modules_admin:
            for fichier in module["fichiers"]:
                destination = cible / "modules" / module["nom"] / fichier
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(module["dossier"] / fichier, destination)
        page = self.env.get_template("admin.html").render(site=self.site, version=self.sveltia_version,
                                                          modules=self.modules_admin)
        (cible / "index.html").write_text(page, encoding="utf-8")

    def preparer_images(self):
        self.images.sortie = self.sortie
        for objet in [*self.contenus, *self.annales]:
            objet["image_publiee"] = self.images.publier(objet["image"], "carte")
        for theme in self.themes:
            theme["planche"] = self.images.publier(theme["illustration"], "theme")
            theme["vignette"] = self.images.publier(theme["illustration"], "vignette")
        for section in self.a_venir:
            section["planche"] = self.images.publier(section["illustration"], "theme")
            section["vignette"] = self.images.publier(section["illustration"], "vignette")
        self.site["planche_accueil"] = self.images.publier(self.site["illustration_accueil"], "accueil")

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
            umami_script=self.site["umami_script"],
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
            self.preparer_images()
            self.page_accueil()
            self.page_catalogue()
            for theme in self.themes:
                if theme["actif"]:
                    self.page_theme(theme)
            for public in self.publics:
                self.page_public(public)
            for collection in self.collections:
                self.page_collection(collection)
                for contenu in collection["contenus"]:
                    self.page_contenu(contenu)
            self.pages_annales()
            for annale in self.annales:
                self.page_annale(annale)
            for section in self.a_venir:
                self.page_a_venir(section)
            self.pages_service()
            self.ecrire_admin()  # hors du sitemap : self.pages n'en garde pas trace
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
            annales=self.annales[:ANNALES_ACCUEIL], nb_annales=len(self.annales),
            planche=self.site["planche_accueil"], a_venir=self.a_venir,
        )

    def page_catalogue(self):
        cartes = [*self.contenus, *self.annales]

        def compte(test):
            return sum(1 for c in cartes if test(c))

        niveaux = sorted({c["niveau"] for c in cartes if c["niveau"]})
        types = [*TYPES.items(), TYPE_ANNALE] if self.annales else list(TYPES.items())
        options = {
            # Un thème sans carte publiée est affiché « bientôt », comme une filière inactive.
            "themes": [{"valeur": t["id"], "libelle": t["nom"], "nb": compte(lambda c, t=t: c["theme"] is t),
                        "inactif": not t["actif"]} for t in self.themes],
            "types": [{"valeur": k, "libelle": v, "nb": compte(lambda c, k=k: c["type"] == k), "inactif": False}
                      for k, v in types],
            # Une filière encore « bientôt » devient choisissable dès qu'elle a une carte (une annale, par exemple).
            "publics": [{"valeur": p["id"], "libelle": p["nom"], "nb": compte(lambda c, p=p: p in c["publics"]),
                         "inactif": not p["actif"] and not compte(lambda c, p=p: p in c["publics"])}
                        for p in self.publics],
            "niveaux": [{"valeur": str(n), "libelle": f"Niveau {n}", "nb": compte(lambda c, n=n: c["niveau"] == n),
                         "inactif": False} for n in niveaux],
        }
        self.rendre(
            "catalogue.html", "catalogue/", "Catalogue",
            "Tous les contenus de sciences industrielles : cours, exercices, activités, études de cas, QCM, "
            "formulaires et annales, à filtrer par thème, type, filière et niveau.",
            rubrique="catalogue", contenus=cartes, options=options, avec_annales=bool(self.annales),
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
            h1=theme["nom"], lignes=[f"{exemples} · {compte_cartes(theme['nb'], theme['nb_annales'])}"],
            groupes=self.groupes(lambda c: c["theme"] is theme),
            annales=[a for a in self.annales if a["theme"] is theme], lien_annales="annales/",
            message_vide="Contenus en préparation pour ce thème.", planche=theme["planche"],
        )

    def page_public(self, public):
        if public["actif"]:
            ligne = compte_cartes(public["nb"], public["nb_annales"])
        else:
            ligne = "Bientôt : les contenus de cette filière sont en préparation."
        self.rendre(
            "liste.html", f"{public['id']}/", public["nom"],
            f"Cours, exercices et études de cas de sciences industrielles pour {public['nom']}.",
            h1=public["nom"], lignes=[ligne],
            groupes=self.groupes(lambda c: public in c["publics"]),
            annales=[a for a in self.annales if public in a["publics"]], lien_annales=f"annales/{public['id']}/",
            message_vide="Contenus en préparation pour cette filière.", planche=None,
        )

    def page_collection(self, collection):
        self.rendre(
            "collection.html", f"{collection['id']}/", collection["titre"], collection["description"],
            collection=collection,
        )

    def page_contenu(self, contenu):
        source = contenu["html"].read_text(encoding="utf-8")
        chemin = contenu["chemin"]
        if contenu["mode"] == "natif":
            if re.search(r"<\s*(html|head|body)[\s>]", source, re.IGNORECASE):
                raise ErreurConstruction(
                    f"{self.lecteur.rel(contenu['html'])} : un contenu natif est un fragment, sans <html>, "
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
                source, self.lecteur.rel(contenu["html"]),
                str(module.tete(racine, self.site, self.site["umami_script"])),
                str(module.haut(contenu, racine, self.site)),
                str(module.bas(contenu, racine, self.site, self.url_absolue(chemin))),
            )
            self.ecrire(chemin, page)
            self.pages.append(chemin)
        if contenu["ressources"]:
            self.copier_ressources(contenu)

    def copier_ressources(self, contenu):
        cible = self.sortie / contenu["chemin"]
        for element in sorted(contenu["ressources"].iterdir()):
            if element.name in ("contenu.json", "index.html") or element.name.startswith("."):
                continue
            if element.is_dir():
                shutil.copytree(element, cible / element.name)
            else:
                shutil.copy2(element, cible / element.name)

    def titre_annale(self, annale):
        """Modèle de TRAME § 12.1 ; l'origine n'y figure que si elle est affichée."""
        titre = f"{annale['titre']} : sujet corrigé interactif ({annale['filieres']})"
        if annale["origine_texte"]:
            titre += f" — {annale['origine_texte']}"
        return f"{titre} — {self.site['nom']}"

    def page_annale(self, annale):
        """Le fichier autonome, enveloppé ; la fiche indexable est placée au-dessus de lui, dans l'enveloppe."""
        source = annale["html"].read_text(encoding="utf-8")
        chemin = annale["chemin"]
        module = self.env.get_template("_enveloppe.html").module
        racine = self.prefixe(chemin)
        page = envelopper(
            source, self.lecteur.rel(annale["html"]),
            str(module.tete(racine, self.site, self.site["umami_script"])),
            str(module.haut(annale, racine, self.site, avec_fiche=True)),
            str(module.bas(annale, racine, self.site, self.url_absolue(chemin))),
            debut_tete=str(module.debut_tete(self.titre_annale(annale), annale["presentation"])),
        )
        self.ecrire(chemin, page)
        self.pages.append(chemin)
        if annale["dossier_ressources"]:
            cible = self.sortie / chemin
            for element in sorted(annale["dossier_ressources"].iterdir()):
                if element.name in ("annale.json", "index.html") or element.name.startswith("."):
                    continue
                (shutil.copytree if element.is_dir() else shutil.copy2)(element, cible / element.name)

    def pages_annales(self):
        lignes = ["Sujets d’examen corrigés et interactifs, par filière."]
        self.rendre(
            "annales.html", "annales/", "Annales",
            "Annales de sciences industrielles, corrigées et interactives, classées par filière.",
            rubrique="annales", h1="Annales", lignes=lignes,
            filiere=None, publics=self.publics, annales=self.annales,
        )
        for public in self.publics:
            annales = [a for a in self.annales if public in a["publics"]]
            self.rendre(
                "annales.html", f"annales/{public['id']}/", f"Annales {public['nom']}",
                f"Annales {public['nom']} de sciences industrielles, corrigées et interactives."
                if annales else f"Annales {public['nom']} de sciences industrielles : premières annales en préparation.",
                h1=f"Annales {public['nom']}", lignes=[pluriel(len(annales), "sujet") if annales else
                                                       "Premières annales en préparation."],
                filiere=public, publics=self.publics, annales=annales,
            )

    def page_a_venir(self, section):
        """/labo/ et /maquettes/ tant qu'ils sont « à venir » : promesse, sans date ni formulaire (TRAME § 6)."""
        self.rendre(
            "vitrine-section.html", section["chemin"], section["titre"], section["promesse"],
            registre="vitrine", avec_bande=False, section=section,
        )

    def pages_service(self):
        credits = sorted(self.credits.values(), key=lambda c: cle_tri(c["titre"]))
        annales = sorted(self.annales, key=lambda a: cle_tri(a["titre"]))
        for chemin, page, titre, description in SERVICE:
            self.rendre(
                "service.html", chemin, titre, description, registre="vitrine", avec_bande=False,
                rubrique="enseignants" if page == "enseignants" else "",
                h1=titre, sous_titre="", page=page, credits=credits, annales=annales,
            )
        self.rendre(
            "service.html", "404.html", "Page introuvable", "Cette page n’existe pas ou a changé d’adresse.",
            registre="vitrine", avec_bande=False, h1="Page introuvable", sous_titre="", page="404", credits=credits,
            annales=annales,
        )

    def ecrire_sitemap_robots(self):
        lignes = ['<?xml version="1.0" encoding="UTF-8"?>',
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for chemin in self.pages:
            lignes.append(f"  <url><loc>{echapper_xml(self.url_absolue(chemin))}</loc></url>")
        lignes.append("</urlset>")
        (self.sortie / "sitemap.xml").write_text("\n".join(lignes) + "\n", encoding="utf-8")
        admin = f"{self.site['base']}admin/"
        if self.site["indexable"]:
            robots = (f"User-agent: *\nAllow: /\n# Back-office, hors du site public.\nDisallow: {admin}\n\n"
                      f"Sitemap: {self.url_absolue('sitemap.xml')}\n")
        else:
            robots = ("# Préproduction : indexation interdite (site.json, « indexable » : false).\nUser-agent: *\n"
                      f"Disallow: /\n# Back-office, hors du site public.\nDisallow: {admin}\n")
        (self.sortie / "robots.txt").write_text(robots, encoding="utf-8")

    def tableau_de_bord(self):
        """Résumé de publication (Markdown) pour le récapitulatif de l'Action : des comptes, aucun secret."""
        types = [*TYPES.items(), TYPE_ANNALE]
        publies = {k: 0 for k, _ in types}
        brouillons = {k: 0 for k, _ in types}
        for c in [*self.contenus, *self.annales]:
            publies[c["type"]] += 1
        sans_type = 0
        for b in [*self.brouillons, *self.brouillons_annales]:
            if b.get("type") in brouillons:
                brouillons[b["type"]] += 1
            else:
                sans_type += 1
        lignes = ["## Tableau de bord éditorial", "", "| Type | Publiés | Brouillons |", "|---|---:|---:|"]
        for cle, libelle in types:
            if publies[cle] or brouillons[cle]:
                lignes.append(f"| {libelle} | {publies[cle]} | {brouillons[cle]} |")
        if sans_type:
            lignes.append(f"| Type non renseigné | 0 | {sans_type} |")
        lignes.append(f"| **Total** | **{sum(publies.values())}** | **{sum(brouillons.values()) + sans_type}** |")
        cartes = [*self.contenus, *self.annales]
        sans_image = sum(1 for c in cartes if not c["image"])
        sans_source = sum(1 for b in self.brouillons_annales if b.get("sans_source"))
        poids = self.poids_accueil()
        manquantes = self.site["mentions_manquantes"]
        lignes += [
            "",
            f"- Annales sans source : **{sans_source}** (en brouillon ; une annale publiée a toujours sa source)",
            f"- Cartes sans image : **{sans_image}** sur {len(cartes)} (bandeau typographique à la place)",
            "- Planche de l’accueil : " + ("**présente**" if self.site["illustration_accueil"] else "**absente**"),
            f"- Poids de l’accueil : **{poids / 1000:.0f} ko** au premier affichage (estimation : page, styles, "
            "scripts, polices et planches ; limite 300 ko)",
            "- Mentions légales : " + ("**complètes**" if not manquantes else
                                       "**incomplètes** (Réglages du site : " + ", ".join(manquantes) + ")"),
            "- Ouvert aux moteurs de recherche (indexable) : " + ("**oui**" if self.site["indexable"] else
                                                                  "**non** (préproduction)"),
            "- Mesure d’audience : " + ("**Umami**" if self.site["umami"] else "**aucune**"),
            "",
        ]
        return "\n".join(lignes)

    def poids_accueil(self):
        """Octets chargés au premier affichage de l'accueil : la page, ses styles et scripts, les polices de
        commun.css et la plus grande variante de chaque planche non différée (estimation haute)."""
        sortie = self.sortie
        page = (sortie / "index.html").read_text(encoding="utf-8")
        fichiers = {sortie / "index.html"}
        for adresse in re.findall(r'(?:href|src)="\./(_/[^"]+\.(?:css|js))"', page):
            fichiers.add(sortie / adresse)
        css = (sortie / "_" / "commun.css").read_text(encoding="utf-8")
        fichiers |= {sortie / "_" / m for m in re.findall(r'url\("?([^")]+\.woff2)"?\)', css)}
        for balise in re.findall(r"<img\b[^>]*>", page):
            if 'loading="lazy"' in balise:
                continue
            variantes = re.findall(r"\./(medias/[^\s,\"]+) \d+w", balise)
            if variantes:
                fichiers.add(sortie / variantes[-1])
        return sum(f.stat().st_size for f in fichiers if f.is_file())

    def bilan(self):
        repris = sum(1 for c in self.contenus if c["mode"] == "repris")
        lignes = [
            f"Site construit dans {self.lecteur.rel(self.sortie)}/ : {len(self.pages) + 1} pages, "
            f"{pluriel(len(self.collections), 'collection')}, {pluriel(len(self.contenus), 'contenu')} "
            f"(dont {repris} autonome{'s' if repris > 1 else ''}), {pluriel(len(self.annales), 'annale')}, "
            f"{pluriel(len(self.images.publiees), 'image')} traitée{'s' if len(self.images.publiees) > 1 else ''}.",
            "Indexation : " + ("autorisée." if self.site["indexable"] else "interdite (noindex, robots.txt fermé)."),
            "Mesure d’audience : " + ("Umami." if self.site["umami"] else "aucune (site.json, « umami » vide)."),
        ]
        brouillons = [b["source"] for b in [*self.brouillons, *self.brouillons_annales]]
        if brouillons:
            lignes.append(f"Brouillons non publiés ({len(brouillons)}) : " + ", ".join(brouillons) + ".")
        a_renseigner = [f"editeur.{k}" for k, v in self.site["editeur"].items() if not v]
        if not self.site["contact"]:
            a_renseigner.append("contact")
        if a_renseigner:
            lignes.append("À renseigner dans site.json : " + ", ".join(a_renseigner) + ".")
        vides = [t["nom"] for t in self.themes if not t["actif"]]
        if vides:
            lignes.append(f"Thèmes sans contenu publié (« Bientôt », sans page) : {', '.join(vides)}.")
        return "\n".join(lignes)


def main(arguments=None):
    analyseur = argparse.ArgumentParser(description="Construit le site industrie.education dans _site/.")
    analyseur.add_argument("--racine", type=Path, default=DEPOT,
                           help="dossier du dépôt à lire (par défaut : ce dépôt)")
    analyseur.add_argument("--sortie", type=Path, default=None,
                           help="dossier à écrire (par défaut : <racine>/_site)")
    analyseur.add_argument("--resume", type=Path, default=None,
                           help="fichier Markdown où ajouter le tableau de bord éditorial ($GITHUB_STEP_SUMMARY)")
    options = analyseur.parse_args(arguments)
    racine = options.racine.resolve()
    sortie = (options.sortie or racine / "_site").resolve()

    def resumer(texte):
        if options.resume:
            with options.resume.open("a", encoding="utf-8") as fichier:
                fichier.write(texte + "\n")

    constructeur = Constructeur(racine, sortie)
    try:
        print(constructeur.construire())
    except ErreurConstruction as erreur:
        print(f"Construction arrêtée : {erreur}", file=sys.stderr)
        resumer("## Tableau de bord éditorial\n\n**Publication arrêtée.** Rien n’a été mis en ligne ; le site "
                f"précédent reste en place.\n\n```\nConstruction arrêtée : {erreur}\n```\n")
        return 1
    resumer(constructeur.tableau_de_bord())
    return 0


if __name__ == "__main__":
    sys.exit(main())
