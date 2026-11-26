#!/usr/bin/env python3
"""Contrôle d'un fichier HTML autonome avant publication (TRAME § 11).

Un fichier autonome (annale ou contenu produit par le projet Claude « Exercices interactifs », ou contenu repris d'un
ancien dépôt) est publié tel quel, seulement enveloppé. Avant cela, on vérifie :
  - taille au plus 5 Mo, encodage UTF-8 ;
  - document HTML complet : <html>, <head>…</head>, <body>…</body> explicites ;
  - aucune ressource extérieure : rien n'est chargé depuis un autre site (src, href hors liens <a>, srcset, url(),
    @import, fetch et autres adresses http(s):// ou // dans les scripts), pas de <base>, pas de redirection ;
  - ressources relatives : interdites pour un fichier déposé seul (medias/depots/) ; présentes sur le disque pour un
    fichier rangé dans son dossier avec ses ressources.

Chaque problème est signalé avec le fichier et la ligne.

Usage : python3 outils/annale.py FICHIER.html [FICHIER.html …]
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

TAILLE_MAX = 5 * 1024 * 1024

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

    def verifier_adresse(self, adresse, quoi, ligne, relative_permise=True):
        if est_exterieure(adresse):
            self.signaler(ligne, f"ressource extérieure interdite ({quoi}) : {adresse[:90]}")
        elif relative_permise and est_relative(adresse):
            if self.dossier is None:
                self.signaler(ligne, f"ressource relative ({quoi}) : {adresse[:90]} — un fichier déposé seul doit "
                                     "tout contenir (images intégrées)")
            else:
                chemin = unquote(urlsplit(adresse).path)
                if chemin and not (self.dossier / chemin).exists():
                    self.signaler(ligne, f"ressource introuvable ({quoi}) : {adresse[:90]}")

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
                    continue  # lien de navigation : permis, il ne charge rien
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
    for balise in ("html", "head", "body"):
        if analyse.ouvertures[balise] != 1:
            signaler(None, f"document incomplet : une seule balise <{balise}> attendue "
                           f"({analyse.ouvertures[balise]} trouvée{'s' if analyse.ouvertures[balise] > 1 else ''})")
    for balise in ("head", "body"):
        if analyse.fermetures[balise] != 1:
            signaler(None, f"document incomplet : une seule balise </{balise}> attendue")
    return problemes


def main(arguments):
    if not arguments:
        print(__doc__)
        return 2
    code = 0
    for fichier in arguments:
        problemes = controler(fichier)
        if problemes:
            code = 1
            print("\n".join(problemes))
        else:
            print(f"{fichier} : prêt à publier.")
    return code


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
