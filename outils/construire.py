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

Rien n'est publié au statut « brouillon ». Deux sortes d'erreurs (lot 1e) :
  - erreur de contenu, propre à une fiche (titre ou présentation manquants, source, filière, thème ou notion inconnus,
    identifiant en double, fichier autonome invalide, note différente de 20/20…) : toutes les erreurs de la fiche sont
    notées, avec le champ de /admin/ et la correction. Une fiche « relu » fautive est retenue (non publiée, signalée
    « retirée » si elle était en ligne) ; pour un brouillon, ce ne sont que des avertissements. Une fiche illisible
    (JSON invalide) est ignorée et signalée. Le reste du site se construit, sans lien vers les fiches retenues ;
  - erreur de structure ou de code (site.json, catalogue/, gabarit, paquet du back-office…) : la construction s'arrête
    et rien n'est publié.
Une image ne retient jamais sa fiche : crédit complet, elle est publiée et citée sur /credits/ ; crédit incomplet et
case « J'accepte le risque » cochée, elle est publiée et listée « à régulariser » ; sinon, elle n'est pas publiée (le
bandeau typographique la remplace) et elle est signalée « à corriger ».

Chaque construction écrit l'état de la publication dans _site/admin/etat.json (lu par le bandeau de /admin/) et, avec
--resume, le résumé de publication, qui commence par la rubrique « À corriger ».

Usage :
    python3 outils/construire.py                        # lit le dépôt, écrit _site/
    python3 outils/construire.py --racine D --sortie S  # autre dépôt (tests), autre dossier de sortie
    python3 outils/construire.py --resume "$GITHUB_STEP_SUMMARY"   # dans l'Action : résumé de publication
    python3 outils/construire.py --verifications F      # résultats du contrôle 20/20 (outils/verifier-annales.js)
    python3 outils/construire.py --precedent F          # état de la version en ligne (fiches « retirées »)
    python3 outils/construire.py --import F             # rapport de outils/importer.py, repris dans le résumé
"""

import argparse
import datetime
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
# Gabarits Jinja2. La variable d'environnement permet aux tests de simuler une erreur de code (gabarit cassé).
GABARITS = Path(os.environ.get("INDUSTRIE_GABARITS") or DEPOT / "gabarits")
UMAMI_SCRIPT = "https://cloud.umami.is/script.js"
# Paquet npm du back-office (npm install). La variable d'environnement permet aux tests d'en simuler l'absence.
SVELTIA = Path(os.environ.get("INDUSTRIE_SVELTIA") or DEPOT / "node_modules" / "@sveltia" / "cms")
# Modules que Sveltia charge à la demande depuis unpkg.com et que le site sert lui-même (table d'import de
# admin/index.html) : dépendances du paquet, installées avec lui ; seuls les fichiers utiles et la licence sont copiés.
#   - translittération des noms de fichiers téléversés (accents, œ, ß…) ;
#   - lecture des métadonnées EXIF d'une image téléversée (date de prise de vue) ;
#   - Immutable.js, qui enveloppe les données d'une fiche transmises au champ « Tester le fichier » (lot 1e).
MODULES_ADMIN = {
    "@sindresorhus/transliterate": ("index.js", "replacements.js", "locale-replacements.js", "license"),
    "exifr": ("dist/lite.esm.mjs", "LICENSE"),
    "immutable": ("dist/immutable.es.js", "LICENSE"),
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
# Nouvelle version d'un fichier autonome, déposée par l'import et en attente de validation (lot 1e).
CHEMIN_A_RELIRE = re.compile(r"^medias/a-relire/[^/]+\.html?$", re.IGNORECASE)
# Dossiers des images téléversées (images orphelines) et du dépôt rapide (fichiers en attente d'import).
DOSSIERS_IMAGES = ("medias/cartes", "medias/illustrations")
DOSSIER_IMPORT = "medias/import"
EXTENSIONS_IMAGES = (".jpg", ".jpeg", ".png", ".webp")
# Longueur de la présentation d'une annale ou de la description d'un contenu (description de la page).
TEXTE_MIN, PRESENTATION_MAX = 20, 300

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
    """Erreur de structure ou de code ; levée dans le contrôle d'une fiche, c'est une erreur de contenu (Controle)."""

    def __init__(self, message, correction=None):
        super().__init__(message)
        self.correction = correction


# Champs des fiches tels qu'ils s'appellent dans /admin/ (admin/config.yml), avec la correction à faire, en une phrase.
# Les signalements de la construction (résumé, bandeau de /admin/) citent ces libellés.
CORRECTION_FICHIER = ("Faites corriger le fichier dans le projet Claude « Exercices interactifs », puis déposez la "
                      "nouvelle version (rubrique « Dépôt rapide »).")
CHAMPS_ANNALE = {
    "fiche": ("Fiche entière (fichier JSON)", "Rétablissez la version précédente de la fiche sur GitHub (fichier → "
              "History), ou corrigez la syntaxe JSON à l'endroit indiqué."),
    "id": ("Identifiant (adresse de la page)", "Remettez l'identifiant d'origine, qui est le nom du fichier de la fiche "
           "(minuscules sans accent, chiffres et tirets) : il ne se change plus après la création."),
    "titre": ("Titre", "Écrivez le titre de l'annale."),
    "presentation": ("Présentation", f"Écrivez deux ou trois phrases ({TEXTE_MIN} à {PRESENTATION_MAX} caractères) : le "
                     "système étudié, les parties, la durée."),
    "fichier": ("Fichier HTML du sujet", "Téléversez le fichier HTML autonome livré par le projet Claude."),
    "publics": ("Filières", "Choisissez au moins une filière."),
    "theme": ("Thème", "Choisissez le thème dans la liste."),
    "notions": ("Notions", "Choisissez les notions dans la liste ; une notion manque ? Ajoutez-la d'abord dans la "
                "rubrique « Notions »."),
    "duree_min": ("Durée conseillée (en minutes)", "Indiquez une durée en minutes, par un nombre entier positif."),
    "afficher_origine": ("Afficher l'origine sur le site", "Cochez ou décochez la case."),
    "source": ("Source et licence du sujet", "Remplissez l'éditeur, l'adresse du document en https:// et la licence ; "
               "pour une autorisation écrite, sa référence."),
    "statut": ("Statut", "Choisissez « Brouillon » ou « Relu »."),
    "mis_a_jour": ("Mis à jour le", "Choisissez la date dans le calendrier."),
    "nouvelle_version": ("Nouvelle version à relire", CORRECTION_FICHIER),
    "requetes": ("Requêtes d'élèves", "Écrivez une requête par ligne."),
}
CHAMPS_CONTENU = {
    **{cle: CHAMPS_ANNALE[cle] for cle in ("fiche", "id", "notions", "duree_min", "statut", "nouvelle_version",
                                          "requetes")},
    "titre": ("Titre", "Écrivez le titre du contenu."),
    "type": ("Type", "Choisissez le type dans la liste."),
    "niveau": ("Niveau", "Choisissez le niveau 1, 2 ou 3, ou laissez vide pour un formulaire."),
    "description": ("Description", f"Écrivez une ou deux phrases ({TEXTE_MIN} caractères au moins) : ce que l'élève "
                    "fait, sur quel système."),
    "mots_cles": ("Mots-clés (recherche du catalogue)", "Écrivez un mot-clé par ligne."),
    "fichier": ("Fichier HTML (nouveau contenu seulement)", "Téléversez le fichier HTML autonome du contenu."),
    "theme": ("Thème (contenus/<collection>/collection.json)", "Corrigez le thème sur GitHub : un identifiant de "
              "catalogue/themes.json."),
    "publics": ("Filières (contenus/<collection>/collection.json)", "Corrigez les filières sur GitHub : des "
                "identifiants de catalogue/publics.json."),
    "mode": ("Mode (champ technique, sur GitHub)", "Corrigez le mode sur GitHub : « repris » ou « natif »."),
    "collection": ("Collection (contenus/<collection>/collection.json, sur GitHub)", "Corrigez collection.json sur "
                   "GitHub (titre, description, thème, filières), ou renommez le dossier de la collection."),
}


class Controle:
    """Erreurs de contenu d'une fiche (lot 1e), toutes notées au lieu de s'arrêter à la première : champ de /admin/,
    message, correction en une phrase."""

    def __init__(self, champs):
        self.champs = champs
        self.erreurs = []

    def noter(self, cle, message, correction=None):
        libelle, par_defaut = self.champs.get(cle, (cle, ""))
        self.erreurs.append({"champ": libelle, "message": str(message).strip(), "correction": correction or par_defaut})

    def __call__(self, cle, fonction, *arguments, sinon=None, **options):
        """Appelle fonction ; une ErreurConstruction devient une erreur notée, et sinon est renvoyé."""
        try:
            return fonction(*arguments, **options)
        except ErreurConstruction as erreur:
            self.noter(cle, erreur, erreur.correction)
            return sinon


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
    messages = []
    for notion in notions:
        if notion in notions_connues:
            continue
        # D'abord les identifiants qui contiennent la saisie (ou y sont contenus), sinon les plus ressemblants.
        proches = [n for n in notions_connues if notion in n or n in notion][:3]
        proches = proches or difflib.get_close_matches(notion, list(notions_connues), n=3, cutoff=0.75)
        messages.append(f"Notion inconnue « {notion} » dans {ou}."
                        + (f" Identifiants proches : {', '.join(proches)}." if proches else ""))
    if messages:
        raise ErreurConstruction(
            " ".join(messages) + " Corrigez l’identifiant, ou ajoutez la notion dans la rubrique « Notions » du "
            "back-office (catalogue/notions.json)."
        )
    return notions


def texte_mesure(donnees, champ, ou, minimum, maximum=None):
    """Texte obligatoire d'une longueur donnée : il sert de description de la page (moteurs de recherche, cartes)."""
    texte = texte_requis(donnees, champ, ou)
    longueur = len(" ".join(texte.split()))
    if longueur < minimum:
        raise ErreurConstruction(f"Champ « {champ} » trop court dans {ou} : {longueur} caractères, {minimum} au moins.")
    if maximum and longueur > maximum:
        raise ErreurConstruction(f"Champ « {champ} » trop long dans {ou} : {longueur} caractères, {maximum} au plus.")
    return texte


def date_facultative(donnees, champ, ou):
    valeur = texte_facultatif(donnees, champ, ou)
    if valeur and not re.match(r"^\d{4}-\d{2}-\d{2}$", valeur):
        raise ErreurConstruction(f"Champ « {champ} » invalide dans {ou} : date AAAA-MM-JJ attendue.")
    return valeur


def statut_valide(donnees, ou, defaut):
    valeur = donnees.get("statut")
    if vide(valeur):
        return defaut
    if valeur not in STATUTS:
        raise ErreurConstruction(f"Statut inconnu « {valeur} » dans {ou}. Statuts possibles : {', '.join(STATUTS)}.")
    return valeur


CHAMPS_CREDIT = ("licence", "source", "auteur", "reference_autorisation")


def image_declaree(valeur, ou, usage, champ):
    """Objet image d'une fiche (lot 1e) : fichier, alt, crédit (licence, source, auteur, reference_autorisation) et
    case risque_accepte. None quand aucune image n'est choisie.

    Une image ne retient jamais sa fiche : une valeur invalide est notée dans « probleme », et l'image n'est pas
    publiée (classe Images). usage : ce que l'image illustre (page Crédits) ; champ : où la corriger dans /admin/."""
    if vide(valeur) or (isinstance(valeur, dict) and vide(valeur.get("fichier"))):
        return None
    image = {"fichier": "", "alt": "", **{c: "" for c in CHAMPS_CREDIT}, "risque_accepte": False, "cite_par": ou,
             "usage": usage, "champ": champ, "probleme": None, "etat": None}
    if not isinstance(valeur, dict) or not isinstance(valeur.get("fichier"), str):
        image["fichier"] = str(valeur)[:80]
        image["probleme"] = "valeur invalide : un objet {fichier, alt, licence…} est attendu"
        return image
    image["fichier"] = valeur["fichier"].strip().lstrip("/")
    for cle in ("alt", *CHAMPS_CREDIT):
        texte = valeur.get(cle)
        image[cle] = texte.strip() if isinstance(texte, str) else ""
    image["risque_accepte"] = valeur.get("risque_accepte") is True
    if not CHEMIN_IMAGE.match(image["fichier"]):
        image["probleme"] = "fichier refusé : une image JPEG, PNG ou WebP de medias/cartes/ ou medias/illustrations/ est attendue"
    return image


def chemins_images(valeur):
    """Chemins d'images cités par une valeur JSON quelconque (fiche, thème, réglages) : images orphelines."""
    if isinstance(valeur, dict):
        trouves = set()
        for cle, sous_valeur in valeur.items():
            if cle == "fichier" and isinstance(sous_valeur, str) and CHEMIN_IMAGE.match(sous_valeur.strip().lstrip("/")):
                trouves.add(sous_valeur.strip().lstrip("/"))
            else:
                trouves |= chemins_images(sous_valeur)
        return trouves
    if isinstance(valeur, list):
        return set().union(*map(chemins_images, valeur)) if valeur else set()
    return set()


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
    site["illustration_accueil"] = image_declaree(site.get("illustration_accueil"), ou, "Planche de l’accueil",
                                                  "Réglages du site → Planche de l'accueil")
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
        nom = texte_requis(t, "nom", ou)
        t["court"] = t.get("court") or t["nom"]
        t["exemples"] = liste_textes(t, "exemples", ou)
        t["illustration"] = image_declaree(t.get("illustration"), ou, f"Planche du thème « {nom} »",
                                           f"Thèmes → {nom} → Planche d'illustration")
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
        titre = texte_requis(section, "titre", ou)
        sections.append({
            "id": ident,
            "titre": titre,
            "promesse": texte_requis(section, "promesse", ou),
            "illustration": image_declaree(section.get("illustration"), ou, f"Planche de la page « {titre} »",
                                           f"Accueil → Labo et Maquettes (à venir) → {titre} → Planche d'illustration"),
            "chemin": f"{ident}/",
        })
    return sections


def theme_connu(valeur, themes_par_id, ou):
    if vide(valeur):
        raise ErreurConstruction(f"Champ « theme » manquant dans {ou}.")
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


def charger_contenus(lecteur, themes, publics, reserves, notions, verifications=None):
    """Collections et contenus (TRAME § 5). Une erreur de contenu retient la fiche (ou toute la collection si
    collection.json est invalide) ; le reste se construit. Renvoie les collections publiées, les contenus publiés par
    identifiant, les fiches retenues, les brouillons (avec leurs avertissements) et les alertes."""
    themes_par_id = {t["id"]: t for t in themes}
    publics_par_id = {p["id"]: p for p in publics}
    dossier_contenus = lecteur.racine / "contenus"
    if not dossier_contenus.is_dir():
        raise ErreurConstruction("Dossier manquant : contenus/.")
    resultat = {"collections": [], "publies": {}, "retenues": [], "brouillons": [], "alertes": [],
                "images_citees": set(), "notions_proposees": [], "nouvelles_versions": []}
    vus = {}

    for dossier in sorted(d for d in dossier_contenus.iterdir() if d.is_dir() and not d.name.startswith(".")):
        nom = dossier.name
        # Une fiche par dossier (<id>/contenu.json) ou à plat (<id>.json, créée par Pages CMS ou à la main).
        fiches = []
        for element in sorted(dossier.iterdir()):
            if element.name.startswith("."):
                continue
            if element.is_dir():
                fiches.append(("dossier", element))
            elif element.suffix == ".json" and element.name != "collection.json":
                fiches.append(("plat", element))

        ou = f"contenus/{nom}/collection.json"
        c = Controle(CHAMPS_CONTENU)
        if nom in reserves:
            c.noter("collection", f"Nom de collection réservé : « {nom} » (contenus/{nom}/) : cette adresse appartient "
                                  f"déjà à une page du site. Noms réservés : {', '.join(sorted(reserves))}.",
                    "Renommez le dossier de la collection sur GitHub.")
        if not IDENTIFIANT.match(nom):
            c.noter("collection", f"Nom de collection invalide : « {nom} » (contenus/{nom}/) : minuscules sans accent, "
                                  "chiffres et tirets.", "Renommez le dossier de la collection sur GitHub.")
        donnees = c("collection", lecteur.json, dossier / "collection.json", dict) or {}
        collection = {
            "id": nom,
            "titre": c("collection", texte_requis, donnees, "titre", ou, sinon=nom),
            "description": c("collection", texte_requis, donnees, "description", ou, sinon=""),
            "theme": c("collection", theme_connu, donnees.get("theme"), themes_par_id, ou),
            "publics": c("collection", publics_connus, donnees.get("publics"), publics_par_id, ou, sinon=[]),
            "contenus": [],
        }
        if c.erreurs:
            c.noter("collection", f"Les {pluriel(len(fiches), 'contenu')} de la collection ne sont pas publiés tant "
                                  "qu’elle est invalide.")
            resultat["retenues"].append({"fiche": ou, "id": nom, "titre": collection["titre"], "rubrique": "Contenus",
                                         "chemin": f"{nom}/", "type": None, "statut": "relu", "erreurs": c.erreurs})
            for organisation, chemin in fiches:
                fiche = chemin / "contenu.json" if organisation == "dossier" else chemin
                try:
                    resultat["images_citees"] |= chemins_images(json.loads(fiche.read_text(encoding="utf-8")))
                except (OSError, ValueError):
                    pass
            continue

        contenus, connus = [], set()
        for organisation, chemin in fiches:
            lu = charger_contenu(lecteur, organisation, chemin, collection, themes_par_id, publics_par_id, notions,
                                 verifications)
            resultat["images_citees"] |= lu["images_citees"]
            signal = lu["signalement"]
            resultat["notions_proposees"] += signal.get("notions_proposees", [])
            if signal["nouvelle_version"]:
                resultat["nouvelles_versions"].append({**signal["nouvelle_version"], "fiche": signal["fiche"],
                                                       "titre": signal["titre"], "rubrique": signal["rubrique"]})
            connus.add(signal["id"])
            if signal["id"] in vus:
                signal["erreurs"].append({
                    "champ": CHAMPS_CONTENU["id"][0],
                    "message": f"Identifiant en double : « {signal['id']} » est déjà celui de {vus[signal['id']]}.",
                    "correction": "Chaque contenu doit avoir un identifiant unique sur tout le site : créez la fiche "
                                  "sous un autre identifiant.",
                })
            else:
                vus[signal["id"]] = signal["fiche"]
            if signal["statut"] == "illisible":
                resultat["retenues"].append(signal)  # fiche ignorée : statut inconnu, rien n'est publié
            elif signal["statut"] != "relu":
                resultat["brouillons"].append(signal)
            elif signal["erreurs"] or lu["contenu"] is None:
                resultat["retenues"].append(signal)
            else:
                resultat["publies"][signal["id"]] = lu["contenu"]
                contenus.append(lu["contenu"])

        collection["contenus"] = ordonner(contenus, donnees.get("ordre"), ou, resultat["alertes"], connus)
        if not collection["contenus"]:
            print(f"Attention : la collection « {nom} » ne contient aucun contenu publié.", file=sys.stderr)
        for i, contenu in enumerate(collection["contenus"]):
            contenu["precedent"] = collection["contenus"][i - 1] if i > 0 else None
            contenu["suivant"] = collection["contenus"][i + 1] if i + 1 < len(collection["contenus"]) else None
        resultat["collections"].append(collection)

    return resultat


def essayer_enveloppe(chemin, ou):
    """Un fichier autonome publié est enveloppé sans être modifié : ses balises <head> et <body> doivent le permettre."""
    envelopper(chemin.read_text(encoding="utf-8"), ou, "", "", "")


def controler_fichier(lecteur, controle, chemin, dossier_ressources, verifications, cle="fichier"):
    """Fichier autonome d'une fiche : contrôles de outils/annale.py, enveloppe possible, note de 20/20 (résultats de
    outils/verifier-annales.js, s'ils sont fournis)."""
    ou = lecteur.rel(chemin)
    problemes = controle_autonome.controler(chemin, ou, dossier_ressources)
    for probleme in problemes:
        controle.noter(cle, probleme, CORRECTION_FICHIER)
    if not problemes:
        controle(cle, essayer_enveloppe, chemin, ou)
    verification = (verifications or {}).get(ou)
    if verification and not verification.get("ok", True):
        controle.noter(cle, f"{ou} : une copie entièrement juste n’obtient pas 20/20 : "
                            + " ; ".join(verification.get("erreurs") or ["note inattendue"]),
                       "Faites corriger les questions citées dans le projet Claude « Exercices interactifs », puis "
                       "déposez la nouvelle version.")


def lire_nouvelle_version(lecteur, donnees, ou, verifications, champs):
    """Champ « nouvelle_version » (import, lot 1e) : fichier en attente de relecture dans medias/a-relire/, jamais
    publié avant sa validation. Ses problèmes sont des avertissements : la version en ligne reste en ligne."""
    valeur = donnees.get("nouvelle_version")
    if vide(valeur):
        return None
    c = Controle(champs)
    fichier = valeur.get("fichier") if isinstance(valeur, dict) else None
    fichier = fichier.strip().lstrip("/") if isinstance(fichier, str) else ""
    if not CHEMIN_A_RELIRE.match(fichier):
        c.noter("nouvelle_version", f"Nouvelle version invalide dans {ou} : un fichier .html de medias/a-relire/ est "
                                    "attendu.")
    elif not (lecteur.racine / fichier).is_file():
        c.noter("nouvelle_version", f"Nouvelle version introuvable : {fichier} (citée par {ou}).")
    else:
        controler_fichier(lecteur, c, lecteur.racine / fichier, None, verifications, cle="nouvelle_version")
    deposee = valeur.get("deposee_le") if isinstance(valeur, dict) else ""
    return {"fichier": fichier, "deposee_le": deposee if isinstance(deposee, str) else "", "avertissements": c.erreurs}


def charger_contenu(lecteur, organisation, chemin, collection, themes_par_id, publics_par_id, notions, verifications):
    """Une fiche de contenu, contrôlée en entier. Renvoie {contenu (None si non publié), signalement, images_citees}."""
    if organisation == "dossier":
        fiche = chemin / "contenu.json"
        ident_attendu = chemin.name
    else:
        fiche = chemin
        ident_attendu = chemin.stem
    ou = lecteur.rel(fiche)
    c = Controle(CHAMPS_CONTENU)
    signal = {"fiche": ou, "id": ident_attendu, "titre": ident_attendu, "rubrique": "Contenus",
              "chemin": f"{collection['id']}/{ident_attendu}/", "type": None, "statut": "relu", "erreurs": c.erreurs,
              "fichier": None, "nouvelle_version": None, "image": None}
    resultat = {"contenu": None, "signalement": signal, "images_citees": set()}
    if organisation == "dossier" and not fiche.is_file():
        signal["statut"] = "illisible"
        c.noter("fiche", f"Fichier manquant : {ou} (chaque dossier d’une collection est un contenu).",
                "Créez la fiche du contenu, ou supprimez le dossier sur GitHub.")
        return resultat
    donnees = c("fiche", lecteur.json, fiche, dict)
    if donnees is None:
        signal["statut"] = "illisible"
        return resultat
    resultat["images_citees"] = chemins_images(donnees)
    signal["notions_proposees"] = notions_proposees(donnees, ou)
    signal["statut"] = c("statut", statut_valide, donnees, ou, "relu", sinon="brouillon")

    ident = c("id", texte_requis, donnees, "id", ou, sinon=ident_attendu)
    if ident != ident_attendu:
        lieu = "son dossier" if organisation == "dossier" else "son fichier"
        c.noter("id", f"L’identifiant « {ident} » de {ou} doit être le nom de {lieu} (« {ident_attendu} »).")
    elif not IDENTIFIANT.match(ident):
        c.noter("id", f"Identifiant invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets.")
    ident = ident_attendu
    titre = c("titre", texte_requis, donnees, "titre", ou, sinon="")
    signal["titre"] = titre or ident
    type_ = c("type", type_valide, donnees, ou)
    signal["type"] = type_
    depose = c("fichier", fichier_depose, lecteur, donnees, ou, organisation == "plat")
    if organisation == "plat" or not vide(donnees.get("fichier")):
        mode = "repris"  # un fichier déposé par le back-office est toujours un fichier autonome
    else:
        mode = donnees.get("mode") or "repris"
        if mode not in MODES:
            c.noter("mode", f"Mode inconnu « {mode} » dans {ou}. Modes possibles : {', '.join(MODES)}.")
            mode = "repris"
    source_html = dossier_ressources = None
    if depose:
        source_html = depose
    elif organisation == "dossier" and vide(donnees.get("fichier")):
        source_html, dossier_ressources = chemin / "index.html", chemin
        if not source_html.is_file():
            c.noter("fichier", f"Fichier manquant : {lecteur.rel(source_html)}.")
            source_html = None
    signal["fichier"] = lecteur.rel(source_html) if source_html else None

    theme = (c("theme", theme_connu, donnees["theme"], themes_par_id, ou) if not vide(donnees.get("theme"))
             else collection["theme"])
    publics = (c("publics", publics_connus, donnees["publics"], publics_par_id, ou, sinon=[])
               if not vide(donnees.get("publics")) else collection["publics"])
    mots_cles = c("mots_cles", liste_textes, donnees, "mots_cles", ou, sinon=[])
    requetes = c("requetes", liste_textes, donnees, "requetes", ou, sinon=[])
    description = c("description", texte_mesure, donnees, "description", ou, TEXTE_MIN, sinon="")
    niveau = c("niveau", niveau_valide, donnees, ou)
    duree_min = c("duree_min", entier_positif, donnees, "duree_min", ou)
    notions_contenu = c("notions", notions_valides, donnees, ou, notions, sinon=[])
    if source_html and mode == "natif":
        if re.search(r"<\s*(html|head|body)[\s>]", source_html.read_text(encoding="utf-8"), re.IGNORECASE):
            c.noter("fichier", f"{lecteur.rel(source_html)} : un contenu natif est un fragment, sans <html>, <head> ni "
                               "<body> (le gabarit « contenu » les fournit).", "Retirez ces balises du fragment.")
    elif source_html:
        controler_fichier(lecteur, c, source_html, dossier_ressources, verifications)
    signal["nouvelle_version"] = lire_nouvelle_version(lecteur, donnees, ou, verifications, CHAMPS_CONTENU)
    signal["image"] = image_declaree(donnees.get("image"), ou, f"Carte du contenu « {titre or ident} »",
                                     "Image de la carte")
    if c.erreurs or signal["statut"] != "relu" or theme is None:
        return resultat

    contenu = {
        "id": ident,
        "titre": titre,
        "description": description,
        "type": type_,
        "type_nom": TYPES[type_],
        "niveau": niveau,
        "duree_min": duree_min,
        "mots_cles": mots_cles,
        "notions": notions_contenu,
        "image": signal["image"],
        "mode": mode,
        "statut": "relu",
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
            {"libelle": titre, "chemin": None},
        ],
    }
    # Texte lu par la recherche du catalogue (normalisé dans le navigateur : minuscules, sans accents).
    contenu["texte"] = " ".join(
        [titre, description, *mots_cles, *requetes, *(notions[n] for n in notions_contenu),
         collection["titre"], theme["nom"], theme["court"], contenu["type_nom"], *(p["nom"] for p in publics)]
    )
    resultat["contenu"] = contenu
    return resultat


def notions_proposees(donnees, ou):
    """Champ « notions_proposees » (import, lot 1e) : notions absentes de catalogue/notions.json, proposées par le
    projet Claude. Elles ne sont jamais créées automatiquement : le résumé les liste."""
    valeur = donnees.get("notions_proposees")
    if not isinstance(valeur, list):
        return []
    return [{"id": str(n.get("id") or "").strip(), "nom": str(n.get("nom") or "").strip(), "fiche": ou}
            for n in valeur if isinstance(n, dict) and (n.get("id") or n.get("nom"))]


def type_valide(donnees, ou):
    type_ = texte_requis(donnees, "type", ou)
    if type_ not in TYPES:
        raise ErreurConstruction(f"Type inconnu « {type_} » dans {ou}. Types possibles : {', '.join(TYPES)}.")
    return type_


def credit_annale(source):
    """Ligne de crédit d'une annale publiée, à partir de sa source (contrôlée par outils/annale.py)."""
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


def charger_annales(lecteur, themes, publics, reserves_annales, notions, verifications=None):
    """annales/<id>.json (back-office) ou annales/<id>/annale.json : fiches des annales (TRAME § 11), contrôlées en
    entier. Renvoie les annales publiées, les fiches retenues et les brouillons (avec leurs avertissements)."""
    themes_par_id = {t["id"]: t for t in themes}
    publics_par_id = {p["id"]: p for p in publics}
    resultat = {"publiees": [], "retenues": [], "brouillons": [], "images_citees": set(), "notions_proposees": [],
                "nouvelles_versions": []}
    dossier = lecteur.racine / "annales"
    if not dossier.is_dir():
        return resultat
    fiches = []
    for element in sorted(dossier.iterdir()):
        if element.name.startswith("."):
            continue
        if element.is_dir():
            fiches.append(("dossier", element / "annale.json", element.name, element))
        elif element.suffix == ".json":
            fiches.append(("plat", element, element.stem, None))

    vus = {}
    for organisation, fiche, ident_attendu, dossier_annale in fiches:
        ou = lecteur.rel(fiche)
        c = Controle(CHAMPS_ANNALE)
        signal = {"fiche": ou, "id": ident_attendu, "titre": ident_attendu, "rubrique": "Annales",
                  "chemin": f"annales/{ident_attendu}/", "type": TYPE_ANNALE[0], "statut": "brouillon",
                  "erreurs": c.erreurs, "fichier": None, "nouvelle_version": None, "image": None, "sans_source": False}
        donnees = c("fiche", lecteur.json, fiche, dict)
        if donnees is None:
            signal["statut"] = "illisible"
            resultat["retenues"].append(signal)
            continue
        resultat["images_citees"] |= chemins_images(donnees)
        resultat["notions_proposees"] += notions_proposees(donnees, ou)
        # Sans statut, une annale reste un brouillon : la publication demande « relu » (TRAME § 11).
        signal["statut"] = c("statut", statut_valide, donnees, ou, "brouillon", sinon="brouillon")

        ident = c("id", texte_requis, donnees, "id", ou, sinon=ident_attendu)
        if ident != ident_attendu:
            lieu = "son dossier" if organisation == "dossier" else "son fichier"
            c.noter("id", f"L’identifiant « {ident} » de {ou} doit être le nom de {lieu} (« {ident_attendu} »).")
        elif not IDENTIFIANT.match(ident):
            c.noter("id", f"Identifiant invalide « {ident} » ({ou}) : minuscules sans accent, chiffres et tirets.")
        ident = ident_attendu
        if ident in reserves_annales:
            c.noter("id", f"Identifiant d’annale réservé « {ident} » ({ou}) : /annales/{ident}/ est la page d’une "
                          "filière.", "Créez l'annale sous un autre identifiant.")
        if ident in vus:
            c.noter("id", f"Identifiant d’annale en double : « {ident} » ({vus[ident]} et {ou}).",
                    "Créez l'annale sous un autre identifiant.")
        vus.setdefault(ident, ou)

        depose = c("fichier", fichier_depose, lecteur, donnees, ou, organisation == "plat")
        source_html = dossier_ressources = None
        if depose:
            source_html = depose
        elif organisation == "dossier" and vide(donnees.get("fichier")):
            source_html, dossier_ressources = dossier_annale / "index.html", dossier_annale
            if not source_html.is_file():
                c.noter("fichier", f"Fichier manquant : {lecteur.rel(source_html)}.")
                source_html = None
        signal["fichier"] = lecteur.rel(source_html) if source_html else None

        titre = c("titre", texte_requis, donnees, "titre", ou, sinon="")
        signal["titre"] = titre or ident
        presentation = c("presentation", texte_mesure, donnees, "presentation", ou, TEXTE_MIN, PRESENTATION_MAX,
                         sinon="")
        publics_annale = c("publics", publics_connus, donnees.get("publics"), publics_par_id, ou, sinon=[])
        theme = c("theme", theme_connu, donnees.get("theme"), themes_par_id, ou)
        origine = donnees.get("origine") if isinstance(donnees.get("origine"), dict) else {}
        afficher = donnees.get("afficher_origine")
        if not vide(afficher) and not isinstance(afficher, bool):
            c.noter("afficher_origine", f"Champ « afficher_origine » invalide dans {ou} : true ou false attendu.")
        afficher = afficher is True
        mis_a_jour = c("mis_a_jour", date_facultative, donnees, "mis_a_jour", ou, sinon="")
        notions_annale = c("notions", notions_valides, donnees, ou, notions, sinon=[])
        duree_min = c("duree_min", entier_positif, donnees, "duree_min", ou)
        requetes = c("requetes", liste_textes, donnees, "requetes", ou, sinon=[])
        problemes_source = controle_autonome.controler_source(donnees.get("source"), ou)
        for probleme in problemes_source:
            c.noter("source", probleme)
        signal["sans_source"] = bool(problemes_source)
        if source_html:
            controler_fichier(lecteur, c, source_html, dossier_ressources, verifications)
        signal["nouvelle_version"] = lire_nouvelle_version(lecteur, donnees, ou, verifications, CHAMPS_ANNALE)
        if signal["nouvelle_version"]:
            resultat["nouvelles_versions"].append({**signal["nouvelle_version"], "fiche": ou,
                                                   "titre": titre or ident, "rubrique": "Annales"})
        signal["image"] = image_declaree(donnees.get("image"), ou, f"Carte de l’annale « {titre or ident} »",
                                         "Image de la carte")
        if signal["statut"] != "relu":
            resultat["brouillons"].append(signal)
            continue
        if c.erreurs or theme is None:
            resultat["retenues"].append(signal)
            continue

        session = origine.get("session")
        origine_texte = " ".join(
            str(x).strip() for x in (origine.get("diplome"), session, origine.get("epreuve")) if not vide(x)
        )
        montrer = afficher and bool(origine_texte)
        filieres = ", ".join(p["nom"] for p in publics_annale)
        annale = {
            "id": ident,
            "titre": titre,
            "presentation": presentation,
            "type": TYPE_ANNALE[0],
            "type_nom": TYPE_ANNALE[1],
            "niveau": None,
            "duree_min": duree_min,
            "notions": notions_annale,
            "image": signal["image"],
            "credit": credit_annale(donnees["source"]),
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
            [titre, presentation, *requetes, *(notions[n] for n in notions_annale), theme["nom"], theme["court"],
             TYPE_ANNALE[1], filieres, annale["origine_texte"]]
        )
        resultat["publiees"].append(annale)

    # Les plus récentes d'abord (date de mise à jour), puis par titre.
    annales = resultat["publiees"]
    annales.sort(key=lambda a: cle_tri(a["titre"]))
    annales.sort(key=lambda a: a["mis_a_jour"], reverse=True)
    for i, annale in enumerate(annales):
        annale["precedent"] = annales[i - 1] if i > 0 else None
        annale["suivant"] = annales[i + 1] if i + 1 < len(annales) else None
    return resultat


def ordre_par_defaut(contenu):
    # Cours d'abord, puis le reste par niveau (TRAME § 6) ; sans niveau en dernier.
    return (0 if contenu["type"] == "cours" else 1, contenu["niveau"] or 99, cle_tri(contenu["titre"]))


def alerte(objet, message, correction):
    """Signalement qui ne concerne pas une fiche précise (accueil, ordre d'une collection…)."""
    return {"objet": objet, "message": message, "correction": correction}


def ordonner(contenus, ordre, ou, alertes, connus=()):
    """Ordre d'une collection (« ordre » de collection.json). Les contenus non publiés (brouillons, fiches retenues)
    sont sautés ; un identifiant qui n'est aucun contenu de la collection est signalé."""
    if vide(ordre):
        return sorted(contenus, key=ordre_par_defaut)
    if not isinstance(ordre, list) or not all(isinstance(x, str) for x in ordre):
        alertes.append(alerte(ou, f"Champ « ordre » invalide dans {ou} : une liste d’identifiants est attendue ; "
                                  "l’ordre par défaut est appliqué.", "Corrigez « ordre » sur GitHub."))
        return sorted(contenus, key=ordre_par_defaut)
    par_id = {c["id"]: c for c in contenus}
    for ident in ordre:
        if ident not in par_id and ident not in connus:
            alertes.append(alerte(ou, f"« ordre » de {ou} cite « {ident} », qui n’est pas un contenu de la collection.",
                                  "Retirez cet identifiant de « ordre » sur GitHub."))
    ordre = [i for i in dict.fromkeys(ordre) if i in par_id]
    restants = sorted((c for c in contenus if c["id"] not in ordre), key=ordre_par_defaut)
    return [par_id[i] for i in ordre] + restants


def choisir_a_la_une(identifiants, contenus_par_id, alertes):
    """Contenus à la une (catalogue/a-la-une.json) : un contenu non publié (brouillon, fiche retenue, inconnu) n'est
    pas affiché et il est signalé ; la une n'empêche jamais la publication."""
    objet = "Accueil → Contenus à la une"
    choisis = []
    for ident in dict.fromkeys(identifiants):
        # Identifiant seul (« cadre-velo ») ou précédé de la collection (« statique/cadre-velo »).
        cle = ident.strip("/").split("/")[-1]
        contenu = contenus_par_id.get(cle)
        if contenu is None or (ident.count("/") and contenu["chemin"] != ident.strip("/") + "/"):
            alertes.append(alerte(objet, f"« {ident} » n’est pas un contenu publié (brouillon, fiche retenue ou "
                                         "identifiant inconnu) : il n’est pas affiché sur l’accueil.",
                                  "Retirez-le de la une, ou publiez le contenu."))
            continue
        choisis.append(contenu)
    if len(identifiants) != len(set(identifiants)):
        alertes.append(alerte(objet, "Un contenu est cité deux fois à la une : il n’est affiché qu’une fois.",
                              "Retirez le doublon."))
    if not A_LA_UNE_MIN <= len(choisis) <= A_LA_UNE_MAX:
        alertes.append(alerte(objet, f"La une affiche {pluriel(len(choisis), 'contenu')} ; il en faut de "
                                     f"{A_LA_UNE_MIN} à {A_LA_UNE_MAX}.",
                              f"Choisissez de {A_LA_UNE_MIN} à {A_LA_UNE_MAX} contenus publiés."))
    return choisis[:A_LA_UNE_MAX]


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
    """Images des pages publiées (TRAME § 10, lot 1e). Chacune est jugée sur son crédit, saisi dans la fiche, et sur
    la case « J'accepte le risque » :
      - crédit complet (licence de la liste fermée, et référence pour une autorisation écrite) : publiée, citée sur
        /credits/ ;
      - crédit absent ou incomplet, case cochée : publiée, absente de /credits/, listée « à régulariser » ;
      - sinon, ou licence hors liste, fichier introuvable ou illisible : non publiée (bandeau typographique),
        signalée « à corriger ».
    Une image ne retient jamais sa fiche. Texte alternatif vide : image décorative (alt="")."""

    def __init__(self, lecteur):
        self.lecteur = lecteur
        self.cache = lecteur.racine / ".cache" / "images"
        self.sortie = None
        self.publiees = {}
        self.evaluees = []

    def diagnostic(self, image):
        """(état, message, correction) ; état : « publiee », « a-regulariser » ou « non-publiee »."""
        fichier = image["fichier"]
        if image["probleme"]:
            return ("non-publiee", f"Image « {fichier} » : {image['probleme']}.",
                    "Choisissez de nouveau l'image dans le champ, ou retirez-la.")
        if not (self.lecteur.racine / fichier).is_file():
            return ("non-publiee", f"Image introuvable : {fichier}.",
                    "Téléversez de nouveau l'image dans le champ, ou retirez-la de la fiche.")
        licence = image["licence"]
        if licence and licence not in LICENCES:
            return ("non-publiee", f"Licence non acceptée « {licence} » pour {fichier}.",
                    "Choisissez une licence de la liste (domaine public, CC0, œuvre personnelle, autorisation écrite) "
                    "ou retirez l'image : la case de risque ne couvre pas une licence refusée.")
        manque = ("licence" if not licence else "référence de l’autorisation écrite"
                  if licence == "autorisation-ecrite" and not image["reference_autorisation"] else "")
        if not manque:
            return ("publiee", "", "")
        if image["risque_accepte"]:
            return ("a-regulariser", f"Image {fichier} publiée sans crédit complet ({manque} manquante), case "
                                     "« J’accepte le risque » cochée.",
                    "Complétez le crédit dès que possible (licence, auteur, adresse de la source), puis décochez la "
                    "case.")
        return ("non-publiee", f"Image {fichier} sans crédit complet ({manque} manquante) : non publiée, le bandeau "
                               "typographique la remplace.",
                "Cochez la case « J’accepte le risque : image publiée sans crédit » ou complétez le crédit.")

    def evaluer(self, image):
        """Image d'une page publiée : son état décide de sa publication et des signalements."""
        if image is None or image["etat"]:
            return
        image["etat"], image["message"], image["correction"] = self.diagnostic(image)
        self.evaluees.append(image)

    def publier(self, image, profil):
        """Renvoie {alt, variantes: [{chemin, largeur, hauteur}], largeur, hauteur} et copie les variantes ; None pour
        une image non publiée."""
        if image is None or image["etat"] == "non-publiee":
            return None
        cle = (image["fichier"], profil)
        if cle not in self.publiees:
            source = self.lecteur.racine / image["fichier"]
            try:
                variantes = illustrations.variantes(source, profil, self.cache)
            except illustrations.ErreurImage as erreur:
                image["etat"] = "non-publiee"
                image["message"] = f"Image {image['fichier']} : {erreur}."
                image["correction"] = "Téléversez une autre version de l'image (JPEG, PNG ou WebP lisible)."
                return None
            dossier = Path(image["fichier"]).parent.as_posix()
            sorties = []
            for v in variantes:
                cible = self.sortie / dossier / v["nom"]
                cible.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(v["fichier"], cible)
                sorties.append({"chemin": f"{dossier}/{v['nom']}", "largeur": v["largeur"], "hauteur": v["hauteur"]})
            self.publiees[cle] = sorties
        sorties = self.publiees[cle]
        return {"alt": image["alt"], "variantes": sorties, "largeur": sorties[0]["largeur"],
                "hauteur": sorties[0]["hauteur"]}

    def credits(self):
        """Entrées de la page /credits/ : images publiées avec un crédit complet, une par fichier."""
        par_fichier = {}
        for image in self.evaluees:
            if image["etat"] != "publiee":
                continue
            entree = par_fichier.setdefault(image["fichier"], {
                "fichier": image["fichier"], "auteur": image["auteur"], "source": image["source"],
                "licence": image["licence"], "licence_nom": LICENCES[image["licence"]],
                "reference_autorisation": image["reference_autorisation"], "usages": [],
            })
            if image["usage"] not in entree["usages"]:
                entree["usages"].append(image["usage"])
        return sorted(par_fichier.values(), key=lambda e: cle_tri(e["usages"][0]))


# ---------------------------------------------------------------------------
# Construction
# ---------------------------------------------------------------------------

class Constructeur:
    def __init__(self, racine, sortie, verifications=None, precedentes=None):
        self.racine = racine
        self.sortie = sortie
        self.lecteur = Lecteur(racine)
        self.pages = []
        # Résultats du contrôle 20/20 (outils/verifier-annales.js), par fichier ; pages en ligne à la version précédente.
        self.verifications = verifications or {}
        self.precedentes = set(precedentes or ())
        self.env = Environment(
            loader=FileSystemLoader(str(GABARITS)),
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
        contenus = charger_contenus(self.lecteur, self.themes, self.publics, reserves, self.notions,
                                    self.verifications)
        annales = charger_annales(self.lecteur, self.themes, self.publics, {p["id"] for p in self.publics},
                                  self.notions, self.verifications)
        self.collections, self.contenus_par_id = contenus["collections"], contenus["publies"]
        self.annales = annales["publiees"]
        self.retenues = [*contenus["retenues"], *annales["retenues"]]
        self.brouillons = [*contenus["brouillons"], *annales["brouillons"]]
        self.nouvelles_versions = [*contenus["nouvelles_versions"], *annales["nouvelles_versions"]]
        self.notions_proposees = [*contenus["notions_proposees"], *annales["notions_proposees"]]
        self.alertes = contenus["alertes"]
        self.a_la_une = choisir_a_la_une(ids_une, self.contenus_par_id, self.alertes)
        self.verifier_back_office()
        # Fiche retenue alors qu'elle était en ligne : « retirée du site ».
        for signal in self.retenues:
            signal["etait_en_ligne"] = signal["chemin"] in self.precedentes

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

        # Liens entre annales et contenus publiés par les notions (« Pour réviser »).
        for annale in self.annales:
            notions = set(annale["notions"])
            lies = [c for c in self.contenus if notions & set(c["notions"])]
            annale["contenus_lies"] = sorted(lies, key=lambda c: (c["type"] != "cours", cle_tri(c["titre"])))

        # Images des pages publiées : crédit saisi dans la fiche, ou case de risque (classe Images). Les images des
        # brouillons sont seulement diagnostiquées, en avertissement.
        self.images = Images(self.lecteur)
        for objet in [*self.contenus, *self.annales]:
            self.images.evaluer(objet["image"])
        for theme in self.themes:
            self.images.evaluer(theme["illustration"])
        for section in self.a_venir:
            self.images.evaluer(section["illustration"])
        self.images.evaluer(self.site["illustration_accueil"])
        for signal in self.brouillons:
            if signal.get("image"):
                etat, message, correction = self.images.diagnostic(signal["image"])
                if etat != "publiee":
                    signal["erreurs"].append({"champ": "Image de la carte", "message": message,
                                              "correction": correction})

        # Images téléversées que plus aucune fiche ne cite, fichiers déposés qui n'ont pas été importés.
        citees = contenus["images_citees"] | annales["images_citees"] | {
            i["fichier"] for i in [*(t["illustration"] for t in self.themes), *(s["illustration"] for s in self.a_venir),
                                   self.site["illustration_accueil"]] if i}
        self.orphelines = []
        for dossier in DOSSIERS_IMAGES:
            if (self.racine / dossier).is_dir():
                self.orphelines += [f"{dossier}/{f.name}" for f in sorted((self.racine / dossier).iterdir())
                                    if f.suffix.lower() in EXTENSIONS_IMAGES and f"{dossier}/{f.name}" not in citees]
        self.non_importes = []
        if (self.racine / DOSSIER_IMPORT).is_dir():
            for fichier in sorted((self.racine / DOSSIER_IMPORT).iterdir()):
                if fichier.name.startswith(".") or fichier.suffix.lower() == ".json":
                    continue
                ou = self.lecteur.rel(fichier)
                problemes = (controle_autonome.controler(fichier, ou) if fichier.suffix.lower() in (".html", ".htm")
                             else [f"{ou} : seuls les fichiers HTML se déposent ici."])
                self.non_importes.append({"fichier": ou, "problemes": problemes})

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
        # Dépôt GitHub (backend.repo de admin/config.yml) : le bandeau d'état interroge son API publique.
        depot = re.search(r"^\s+repo:\s*([\w.-]+/[\w.-]+)\s*$", self.admin_config.read_text(encoding="utf-8"), re.M)
        self.depot_github = depot.group(1) if depot else ""
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
                                                          modules=self.modules_admin, depot=self.depot_github)
        (cible / "index.html").write_text(page, encoding="utf-8")
        # Bandeau d'état et champ « Télécharger pour tester » (admin/admin.js), avec les jetons de couleur et de police
        # de statique/commun.css (leurs valeurs ne sont écrites que là).
        shutil.copy2(DEPOT / "admin" / "admin.js", cible / "admin.js")
        css = (DEPOT / "statique" / "commun.css").read_text(encoding="utf-8")
        jetons = re.search(r":root\s*\{[^}]*\}", css)
        (cible / "admin.css").write_text(
            "/* Jetons copiés de statique/commun.css par outils/construire.py. */\n" + (jetons.group(0) if jetons else "")
            + "\n\n" + (DEPOT / "admin" / "admin.css").read_text(encoding="utf-8"), encoding="utf-8")
        # État de la publication, lu par le bandeau.
        (cible / "etat.json").write_text(json.dumps(self.etat(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

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
        credits = self.images.credits()
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

    # --- état de la publication (lot 1e) ---

    def etat(self):
        """État de la publication, écrit dans _site/admin/etat.json : lu par le bandeau de /admin/, par le résumé de
        publication et par la construction suivante (--precedent). Aucune donnée personnelle : des chemins de
        fichiers, des titres et des messages, déjà lisibles dans le dépôt public."""
        if getattr(self, "_etat", None):
            return self._etat

        def fiche(signal):
            return {"fiche": signal["fiche"], "titre": signal["titre"], "rubrique": signal["rubrique"],
                    "statut": signal["statut"], "etait_en_ligne": signal.get("etait_en_ligne", False),
                    "erreurs": signal["erreurs"]}

        def image(i):
            return {"fichier": i["fichier"], "usage": i["usage"], "fiche": i["cite_par"], "champ": i["champ"],
                    "message": i["message"], "correction": i["correction"]}

        evaluees = self.images.evaluees
        a_corriger = {
            "fiches_retenues": [fiche(s) for s in self.retenues],
            "brouillons": [fiche(s) for s in self.brouillons if s["erreurs"]],
            "nouvelles_versions": [{k: v for k, v in n.items()} for n in self.nouvelles_versions
                                   if n["avertissements"]],
            "images_non_publiees": [image(i) for i in evaluees if i["etat"] == "non-publiee"],
            "images_orphelines": [{
                "fichier": f, "message": f"{f} : téléversée mais citée par aucune fiche.",
                "correction": "Supprimez-la (Ressources → Images de cartes ou Planches), ou choisissez-la dans une "
                              "fiche."} for f in self.orphelines],
            "fichiers_non_importes": [{
                "fichier": n["fichier"], "problemes": n["problemes"],
                "message": (f"{n['fichier']} : refusé à l’import." if n["problemes"] else
                            f"{n['fichier']} : en attente d’import (la prochaine publication le traitera)."),
                "correction": (CORRECTION_FICHIER + " Supprimez ensuite ce fichier (Ressources → Dépôt rapide)."
                               if n["problemes"] else "")} for n in self.non_importes],
            "notions_proposees": [{
                **n, "correction": "Si elle convient, ajoutez-la dans la rubrique « Notions », puis choisissez-la "
                                   "dans la fiche."} for n in self.notions_proposees],
            "autres": self.alertes,
        }
        publiees = sorted([*(c["chemin"] for c in self.contenus), *(a["chemin"] for a in self.annales)])
        self._etat = {
            "format": 1,
            "construit_le": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "publiees": publiees,
            "comptes": {
                "publiees": len(publiees),
                "fiches_retenues": len(a_corriger["fiches_retenues"]),
                "a_corriger": sum(len(v) for v in a_corriger.values()),
                "images_a_regulariser": sum(1 for i in evaluees if i["etat"] == "a-regulariser"),
                "brouillons": len(self.brouillons),
                "nouvelles_versions": len(self.nouvelles_versions),
            },
            "a_corriger": a_corriger,
            "images_a_regulariser": [image(i) for i in evaluees if i["etat"] == "a-regulariser"],
            "nouvelles_versions": self.nouvelles_versions,
        }
        return self._etat

    def resume(self, rapport_import=""):
        """Résumé de publication (Markdown, récapitulatif de l'Action) : « À corriger » d'abord, puis les images à
        régulariser, le rapport d'import et le tableau de bord éditorial."""
        etat = self.etat()
        a = etat["a_corriger"]

        def erreurs(liste, retrait="  "):
            return [f"{retrait}- *{e['champ']}* : {e['message']} → {e['correction']}" for e in liste]

        lignes = ["## À corriger", ""]
        if a["fiches_retenues"]:
            lignes += ["### Fiches retenues (non publiées)", ""]
            for f in a["fiches_retenues"]:
                retiree = " **Retirée du site** : elle était en ligne." if f["etait_en_ligne"] else ""
                lignes += [f"- **{f['rubrique']} : « {f['titre']} »** (`{f['fiche']}`).{retiree}", *erreurs(f["erreurs"])]
            lignes.append("")
        if a["brouillons"]:
            lignes += ["### Brouillons : avertissements (rien n’est publié)", ""]
            for f in a["brouillons"]:
                lignes += [f"- **{f['rubrique']} : « {f['titre']} »** (`{f['fiche']}`)", *erreurs(f["erreurs"])]
            lignes.append("")
        if a["nouvelles_versions"]:
            lignes += ["### Nouvelles versions à relire : avertissements", ""]
            for n in a["nouvelles_versions"]:
                lignes += [f"- **« {n['titre']} »** (`{n['fichier']}`)", *erreurs(n["avertissements"])]
            lignes.append("")
        if a["images_non_publiees"]:
            lignes += ["### Images non publiées (le bandeau typographique les remplace)", ""]
            lignes += [f"- `{i['fichier']}` ({i['usage']}, `{i['fiche']}`, champ « {i['champ']} ») : {i['message']} → "
                       f"{i['correction']}" for i in a["images_non_publiees"]]
            lignes.append("")
        if a["images_orphelines"]:
            lignes += ["### Images orphelines", ""]
            lignes += [f"- {i['message']} → {i['correction']}" for i in a["images_orphelines"]]
            lignes.append("")
        if a["fichiers_non_importes"]:
            lignes += ["### Fichiers déposés non importés", ""]
            for n in a["fichiers_non_importes"]:
                lignes.append(f"- {n['message']}" + (f" → {n['correction']}" if n["correction"] else ""))
                lignes += [f"  - {p}" for p in n["problemes"][:8]]
            lignes.append("")
        if a["notions_proposees"]:
            lignes += ["### Notions proposées (jamais créées automatiquement)", ""]
            lignes += [f"- « {n['nom']} » (`{n['id']}`), proposée par `{n['fiche']}` → {n['correction']}"
                       for n in a["notions_proposees"]]
            lignes.append("")
        if a["autres"]:
            lignes += ["### Autres", ""]
            lignes += [f"- *{x['objet']}* : {x['message']} → {x['correction']}" for x in a["autres"]]
            lignes.append("")
        if len(lignes) == 2:
            lignes += ["Rien à corriger.", ""]
        lignes += ["## Images à régulariser", ""]
        lignes += ([f"- `{i['fichier']}` ({i['usage']}, `{i['fiche']}`) : {i['message']} → {i['correction']}"
                    for i in etat["images_a_regulariser"]] or ["Aucune."])
        lignes.append("")
        if etat["nouvelles_versions"]:
            lignes += ["## Nouvelles versions à relire", ""]
            lignes += [f"- « {n['titre']} » (`{n['fiche']}`) : `{n['fichier']}`, déposée le {n['deposee_le'] or '?'}. "
                       "Téléchargez-la depuis la fiche, testez-la, puis cochez « Valider la nouvelle version »."
                       for n in etat["nouvelles_versions"]]
            lignes.append("")
        if rapport_import.strip():
            lignes += [rapport_import.strip(), ""]
        return "\n".join(lignes) + "\n" + self.tableau_de_bord()

    def tableau_de_bord(self):
        """Tableau de bord éditorial (Markdown) : des comptes, aucun secret."""
        types = [*TYPES.items(), TYPE_ANNALE]
        publies = {k: 0 for k, _ in types}
        brouillons = {k: 0 for k, _ in types}
        for c in [*self.contenus, *self.annales]:
            publies[c["type"]] += 1
        sans_type = 0
        for b in self.brouillons:
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
        sans_image = sum(1 for c in cartes if not c.get("image_publiee"))
        sans_source = sum(1 for b in self.brouillons if b["type"] == TYPE_ANNALE[0] and b.get("sans_source"))
        poids = self.poids_accueil()
        manquantes = self.site["mentions_manquantes"]
        comptes = self.etat()["comptes"]
        lignes += [
            "",
            f"- Fiches retenues : **{comptes['fiches_retenues']}** (voir « À corriger »)",
            f"- Images à régulariser : **{comptes['images_a_regulariser']}**",
            f"- Annales sans source : **{sans_source}** (en brouillon ; une annale publiée a toujours sa source)",
            f"- Cartes sans image : **{sans_image}** sur {len(cartes)} (bandeau typographique à la place)",
            "- Planche de l’accueil : " + ("**présente**" if self.site.get("planche_accueil") else "**absente**"),
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
        brouillons = [b["fiche"] for b in self.brouillons]
        if brouillons:
            lignes.append(f"Brouillons non publiés ({len(brouillons)}) : " + ", ".join(brouillons) + ".")
        if self.retenues:
            lignes.append(f"Fiches retenues, non publiées ({len(self.retenues)}) : "
                          + ", ".join(r["fiche"] for r in self.retenues) + " (voir « À corriger » dans le résumé).")
            for r in self.retenues:
                lignes += [f"  {r['fiche']} — {e['champ']} : {e['message']}" for e in r["erreurs"]]
        comptes = self.etat()["comptes"]
        if comptes["a_corriger"] > len(self.retenues):
            lignes.append(f"À corriger : {comptes['a_corriger']} signalements en tout (résumé, bandeau de /admin/).")
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
                           help="fichier Markdown où ajouter le résumé de publication ($GITHUB_STEP_SUMMARY)")
    analyseur.add_argument("--verifications", type=Path, default=None,
                           help="résultats du contrôle 20/20 des annales (outils/verifier-annales.js)")
    analyseur.add_argument("--precedent", type=Path, default=None,
                           help="etat.json de la version en ligne : une fiche retenue qui y figure est « retirée »")
    analyseur.add_argument("--import", dest="rapport_import", type=Path, default=None,
                           help="rapport Markdown de outils/importer.py, repris dans le résumé")
    options = analyseur.parse_args(arguments)
    racine = options.racine.resolve()
    sortie = (options.sortie or racine / "_site").resolve()

    def resumer(texte):
        if options.resume:
            with options.resume.open("a", encoding="utf-8") as fichier:
                fichier.write(texte + "\n")

    def lire(chemin, quoi):
        """Fichier facultatif d'une étape précédente : absent ou illisible, il est ignoré (jamais bloquant)."""
        if not chemin:
            return None
        try:
            texte = chemin.read_text(encoding="utf-8")
            return json.loads(texte) if chemin.suffix == ".json" else texte
        except (OSError, ValueError) as erreur:
            print(f"Attention : {quoi} ignoré ({chemin} : {erreur}).", file=sys.stderr)
            return None

    verifications = lire(options.verifications, "résultat du contrôle 20/20") or {}
    precedent = lire(options.precedent, "état de la version en ligne") or {}
    rapport_import = lire(options.rapport_import, "rapport d’import") or ""
    constructeur = Constructeur(racine, sortie, verifications=verifications.get("resultats") or {},
                                precedentes=precedent.get("publiees") if isinstance(precedent, dict) else None)
    try:
        print(constructeur.construire())
    except ErreurConstruction as erreur:
        print(f"Construction arrêtée : {erreur}", file=sys.stderr)
        resumer("## À corriger\n\n**Publication arrêtée.** Rien n’a été mis en ligne ; le site précédent reste en "
                "place. C’est une erreur de structure ou de code, à transmettre telle quelle dans une session Claude "
                f"Code.\n\n```\nConstruction arrêtée : {erreur}\n```\n")
        return 1
    except Exception as erreur:  # erreur de code (gabarit, programme) : rien n'est publié
        import traceback
        traceback.print_exc()
        resumer("## À corriger\n\n**Publication arrêtée.** Rien n’a été mis en ligne ; le site précédent reste en "
                "place. C’est une erreur de code, à transmettre telle quelle dans une session Claude Code.\n\n```\n"
                f"{type(erreur).__name__} : {erreur}\n```\n")
        return 1
    resumer(constructeur.resume(rapport_import))
    return 0


if __name__ == "__main__":
    sys.exit(main())
