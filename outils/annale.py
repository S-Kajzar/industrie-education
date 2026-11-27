#!/usr/bin/env python3
"""Contrôle d'un fichier HTML autonome avant publication (TRAME § 11).

Un fichier autonome (annale ou contenu produit par le projet Claude « Exercices interactifs », ou contenu repris d'un
ancien dépôt) est publié tel quel, seulement enveloppé. Avant cela, on vérifie :
  - taille au plus 5 Mo, encodage UTF-8 ;
  - document HTML complet : <html>, <head>…</head>, <body>…</body> explicites ;
  - aucune ressource extérieure : rien n'est chargé depuis un autre site (src, href hors liens <a>, srcset, url(),
    @import, fetch et autres adresses http(s):// ou // dans les scripts), pas de <base>, pas de redirection ;
  - ressources relatives : interdites pour un fichier déposé seul (medias/depots/) ; présentes sur le disque pour un
    fichier rangé dans son dossier avec ses ressources ;
  - liens d'un fichier déposé seul (lot 1e) : aucun lien vers une autre page par une adresse relative ou un chemin
    absolu (il n'existerait pas sur le site), et chaque ancre (#…) vise un identifiant présent dans le fichier.
    Sans ce contrôle, un lien cassé ferait échouer le test des liens et bloquerait toute la publication.

Chaque problème est signalé avec le fichier et la ligne.

Pour une fiche d'annale (annales/<id>.json), on contrôle aussi le champ « source » (éditeur, adresse, licence de la
liste fermée, référence d'une autorisation écrite), puis le fichier HTML qu'elle cite. Comme pour la construction, la
source est obligatoire au statut « relu » (publication) ; en brouillon, son absence n'est qu'un rappel.

Usage : python3 outils/annale.py FICHIER.html|FICHE.json [… autres fichiers]
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

TAILLE_MAX = 5 * 1024 * 1024

# Licences d'une annale (champ « source » de annale.json), liste fermée, avec la ligne de crédit affichée dans la
# fiche du site ; {editeur} devient un lien vers la source.
LICENCES_ANNALE = {
    "cc-by-nc-sa-2.0-fr": {
        "nom": "CC BY-NC-SA 2.0 FR",
        "credit": "D’après un sujet publié par {editeur}, licence CC BY-NC-SA 2.0 FR. Adaptation interactive : "
                  "industrie.education, sous la même licence.",
    },
    "etalab-2.0": {
        "nom": "Licence Ouverte 2.0 (Etalab)",
        "credit": "D’après un document publié par {editeur}, Licence Ouverte 2.0. Adaptation : industrie.education.",
    },
    "autorisation-ecrite": {
        "nom": "Autorisation écrite",
        "credit": "Reproduit avec l’autorisation de {editeur}.",
    },
    "oeuvre-personnelle": {
        "nom": "Œuvre personnelle",
        "credit": "Sujet original : industrie.education.",
    },
}
# Licences ouvertes : l'attribution demande l'éditeur et l'adresse du document d'origine.
LICENCES_AVEC_ADRESSE = ("cc-by-nc-sa-2.0-fr", "etalab-2.0")
URL_SOURCE = re.compile(r"^https://[^\s/]+\.[^\s/]+(/\S*)?$")


def controler_source(source, ou):
    """Champ « source » d'une fiche d'annale : liste des problèmes, vide si la source permet de publier."""
    if not isinstance(source, dict) or not any(str(v or "").strip() for v in source.values()):
        return [f"{ou} : champ « source » manquant : renseignez l'éditeur, l'adresse et la licence du sujet "
                "(rubrique Annales du back-office), obligatoires pour publier."]
    problemes = []
    licence = source.get("licence")
    editeur = str(source.get("editeur") or "").strip()
    adresse = str(source.get("url") or "").strip()
    reference = str(source.get("reference_autorisation") or "").strip()
    if licence not in LICENCES_ANNALE:
        problemes.append(f"{ou} : licence de la source non acceptée « {licence or ''} ». Licences possibles : "
                         f"{', '.join(LICENCES_ANNALE)}.")
    if licence != "oeuvre-personnelle" and not editeur:
        problemes.append(f"{ou} : éditeur de la source manquant (ex. « éduscol STI »).")
    if licence in LICENCES_AVEC_ADRESSE and not adresse:
        problemes.append(f"{ou} : adresse (url) de la source manquante : l'attribution exige un lien vers le document "
                         "d'origine.")
    if adresse and not URL_SOURCE.match(adresse):
        problemes.append(f"{ou} : adresse de la source invalide « {adresse[:90]} » : une adresse complète en https:// "
                         "est attendue.")
    if licence == "autorisation-ecrite" and not reference:
        problemes.append(f"{ou} : autorisation écrite sans référence : renseignez « reference_autorisation » (qui a "
                         "autorisé, quand, par quel écrit).")
    return problemes

# Attributs qui chargent une ressource (sauf sur <a> et <area>, où href est un lien de navigation).
ATTRIBUTS_RESSOURCE = {
    "src", "href", "srcset", "imagesrcset", "poster", "data", "action", "formaction", "background", "xlink:href",
    "codebase", "manifest", "icon", "lowsrc", "dynsrc", "longdesc", "archive", "classid", "profile",
}
BALISES_NAVIGATION = {"a", "area"}
# Adresses d'espaces de noms XML : ce ne sont pas des requêtes (createElementNS, xmlns…).
ESPACES_DE_NOMS = (
    "http://www.w3.org/2000/svg", "http://www.w3.org/1999/xlink", "http://www.w3.org/1999/xhtml",
    "http://www.w3.org/1998/Math/MathML", "http://www.w3.org/XML/1998/namespace", "http://www.w3.org/2000/xmlns/",
)
URL_CSS = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(['"])([^'"]+)\3""", re.IGNORECASE)
URL_SCRIPT = re.compile(r"""(['"`])\s*((?:https?:|wss?:)?//[^'"`\s]*)""", re.IGNORECASE)
TYPES_SCRIPT_DONNEES = {"application/json", "application/ld+json", "text/plain", "text/template", "text/x-template"}


def est_exterieure(adresse):
    """Vraie pour une adresse qui vise un autre site : http(s)://, //hôte, ws(s)://, ftp://…"""
    adresse = adresse.strip()
    if not adresse or adresse.startswith(("data:", "blob:", "#", "mailto:", "tel:", "javascript:", "about:")):
        return False
    if adresse.startswith(ESPACES_DE_NOMS):
        return False
    morceaux = urlsplit(adresse)
    return bool(morceaux.scheme and morceaux.scheme not in ("data", "blob")) or adresse.startswith("//")


def est_relative(adresse):
    adresse = adresse.strip()
    if not adresse or adresse.startswith(("#", "data:", "blob:", "mailto:", "tel:", "javascript:", "about:")):
        return False
    return not urlsplit(adresse).scheme and not adresse.startswith("/")


def est_chemin_absolu(adresse):
    """« /page/ » : chemin depuis la racine du site (et non « //hôte », qui vise un autre site)."""
    adresse = adresse.strip()
    return adresse.startswith("/") and not adresse.startswith("//")


def adresses_srcset(valeur):
    return [morceau.strip().split()[0] for morceau in valeur.split(",") if morceau.strip()]


class Analyse(HTMLParser):
    def __init__(self, signaler, dossier_ressources):
        super().__init__(convert_charrefs=False)
        self.signaler = signaler
        self.dossier = dossier_ressources
        self.ouvertures = {"html": 0, "head": 0, "body": 0}
        self.fermetures = {"head": 0, "body": 0}
        self.dans = None  # « style » ou « script » pendant leur contenu
        self.ligne_bloc = 1
        self.ancres = []  # (ligne, identifiant visé par un lien #…), fichier déposé seul

    def verifier_adresse(self, adresse, quoi, ligne, relative_permise=True):
        if est_exterieure(adresse):
            self.signaler(ligne, f"ressource extérieure interdite ({quoi}) : {adresse[:90]}")
        elif self.dossier is None and est_chemin_absolu(adresse):
            self.signaler(ligne, f"ressource à chemin absolu ({quoi}) : {adresse[:90]} — un fichier déposé seul doit "
                                 "tout contenir (images intégrées)")
        elif relative_permise and est_relative(adresse):
            if self.dossier is None:
                self.signaler(ligne, f"ressource relative ({quoi}) : {adresse[:90]} — un fichier déposé seul doit "
                                     "tout contenir (images intégrées)")
            else:
                chemin = unquote(urlsplit(adresse).path)
                if chemin and not (self.dossier / chemin).exists():
                    self.signaler(ligne, f"ressource introuvable ({quoi}) : {adresse[:90]}")

    def verifier_lien(self, adresse, ligne):
        """Lien de navigation d'un fichier déposé seul : une ancre vers un identifiant du fichier, ou un autre site."""
        if self.dossier is not None or not adresse:
            return
        if adresse.startswith("#"):
            if len(adresse) > 1:
                self.ancres.append((ligne, unquote(adresse[1:])))
        elif est_relative(adresse) or est_chemin_absolu(adresse):
            if urlsplit(adresse).path:
                self.signaler(ligne, f"lien vers une page absente du site : {adresse[:90]} — un fichier déposé seul ne "
                                     "renvoie qu'à ses propres ancres (#…) ou à un autre site")

    def verifier_css(self, texte, ligne_depart):
        for m in URL_CSS.finditer(texte):
            adresse = m.group(2) or m.group(4) or ""
            ligne = ligne_depart + texte.count("\n", 0, m.start())
            self.verifier_adresse(adresse, "url() ou @import dans les styles", ligne)

    def handle_starttag(self, balise, attributs):
        ligne = self.getpos()[0]
        if balise in self.ouvertures:
            self.ouvertures[balise] += 1
        if balise == "base":
            self.signaler(ligne, "balise <base> interdite : elle changerait l'adresse de toutes les ressources")
        attributs = {nom.lower(): (valeur or "") for nom, valeur in attributs}
        if balise == "meta" and attributs.get("http-equiv", "").lower() == "refresh":
            cible = re.sub(r"^\s*\d+\s*;?\s*(url\s*=\s*)?", "", attributs.get("content", ""), flags=re.I)
            if cible and est_exterieure(cible.strip("'\" ")):
                self.signaler(ligne, f"redirection vers un autre site interdite : {cible[:90]}")
        for nom, valeur in attributs.items():
            if nom == "style":
                self.verifier_css(valeur, ligne)
            elif nom == "ping":
                for adresse in valeur.split():
                    if est_exterieure(adresse):
                        self.signaler(ligne, f"ressource extérieure interdite (ping) : {adresse[:90]}")
            elif nom in ATTRIBUTS_RESSOURCE:
                if balise in BALISES_NAVIGATION and nom == "href":
                    self.verifier_lien(valeur.strip(), ligne)
                    continue  # lien de navigation : il ne charge rien
                adresses = adresses_srcset(valeur) if nom in ("srcset", "imagesrcset") else [valeur]
                for adresse in adresses:
                    self.verifier_adresse(adresse, f"<{balise} {nom}>", ligne)
        if balise in ("style", "script"):
            type_script = attributs.get("type", "").lower()
            self.dans = None if (balise == "script" and type_script in TYPES_SCRIPT_DONNEES) else balise
            self.ligne_bloc = ligne

    def handle_endtag(self, balise):
        if balise in self.fermetures:
            self.fermetures[balise] += 1
        if balise in ("style", "script"):
            self.dans = None

    def handle_data(self, texte):
        if self.dans == "style":
            self.verifier_css(texte, self.getpos()[0])
        elif self.dans == "script":
            depart = self.getpos()[0]
            for m in URL_SCRIPT.finditer(texte):
                adresse = m.group(2)
                if adresse.startswith(ESPACES_DE_NOMS) or not est_exterieure(adresse):
                    continue
                ligne = depart + texte.count("\n", 0, m.start())
                self.signaler(ligne, f"adresse extérieure dans un script (fetch, chargement…) : {adresse[:90]}")


def controler(chemin, nom=None, dossier_ressources=None, taille_max=TAILLE_MAX):
    """Renvoie la liste des problèmes (« fichier, ligne N : … »), vide si le fichier peut être publié.

    dossier_ressources : dossier où chercher les ressources relatives, ou None pour un fichier déposé seul.
    """
    chemin = Path(chemin)
    nom = nom or str(chemin)
    problemes = []

    def signaler(ligne, message):
        problemes.append(f"{nom}, ligne {ligne} : {message}." if ligne else f"{nom} : {message}.")

    if not chemin.is_file():
        signaler(None, "fichier introuvable")
        return problemes
    octets = chemin.read_bytes()
    if len(octets) > taille_max:
        signaler(None, f"fichier trop lourd ({len(octets) / 1024 / 1024:.1f} Mo pour {taille_max / 1024 / 1024:.0f} Mo au plus)")
    try:
        texte = octets.decode("utf-8")
    except UnicodeDecodeError as erreur:
        signaler(octets.count(b"\n", 0, erreur.start) + 1, "encodage invalide : le fichier doit être enregistré en UTF-8")
        return problemes

    analyse = Analyse(signaler, dossier_ressources)
    analyse.feed(texte)
    analyse.close()
    # Ancres : identifiants (id ou name) écrits dans le fichier, comme les lit le test des liens.
    identifiants = set(re.findall(r"""\s(?:id|name)=["']([^"']+)["']""", texte))
    for ligne, ancre in analyse.ancres:
        if ancre not in identifiants:
            signaler(ligne, f"ancre #{ancre[:60]} sans identifiant correspondant dans le fichier")
    for balise in ("html", "head", "body"):
        if analyse.ouvertures[balise] != 1:
            signaler(None, f"document incomplet : une seule balise <{balise}> attendue "
                           f"({analyse.ouvertures[balise]} trouvée{'s' if analyse.ouvertures[balise] > 1 else ''})")
    for balise in ("head", "body"):
        if analyse.fermetures[balise] != 1:
            signaler(None, f"document incomplet : une seule balise </{balise}> attendue")
    return problemes


def controler_fiche(chemin, rappels=None):
    """Fiche d'annale (JSON) : source (obligatoire au statut « relu »), puis le fichier HTML cité par « fichier ».

    rappels : liste où ajouter ce qui manque à un brouillon pour être publié, sans que ce soit une erreur."""
    chemin = Path(chemin)
    try:
        fiche = json.loads(chemin.read_text(encoding="utf-8"))
    except (OSError, ValueError) as erreur:
        return [f"{chemin} : fiche illisible ({erreur})."]
    if not isinstance(fiche, dict):
        return [f"{chemin} : un objet JSON est attendu."]
    problemes = controler_source(fiche.get("source"), str(chemin))
    if problemes and fiche.get("statut") != "relu":
        # Brouillon (statut absent ou « brouillon ») : la source n'est exigée qu'à la publication.
        if rappels is not None:
            rappels += [f"{p} (brouillon : à régler avant de passer en « relu »)" for p in problemes]
        problemes = []
    fichier = str(fiche.get("fichier") or "").strip().lstrip("/")
    if fichier:
        racine = next((p for p in chemin.resolve().parents if (p / "medias").is_dir()), chemin.resolve().parent)
        problemes += controler(racine / fichier, fichier)
    return problemes


def main(arguments):
    if not arguments:
        print(__doc__)
        return 2
    code = 0
    for fichier in arguments:
        rappels = []
        problemes = controler_fiche(fichier, rappels) if fichier.endswith(".json") else controler(fichier)
        if problemes:
            code = 1
            print("\n".join(problemes))
        elif rappels:
            print("\n".join(rappels))
            print(f"{fichier} : fichier prêt ; la fiche reste un brouillon.")
        else:
            print(f"{fichier} : prêt à publier.")
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
