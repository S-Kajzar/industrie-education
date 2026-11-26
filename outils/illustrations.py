#!/usr/bin/env python3
"""Traitement des images du site (TRAME § 10, DESIGN § 9).

À partir des originaux téléversés dans medias/cartes/ et medias/illustrations/, produit des variantes WebP :
  - carte : image de carte, en couleur, recadrée au format 16/9 (centre), 480 px (≤ 40 Ko) et 960 px de large ;
  - accueil : planche de l'accueil, 640 et 1280 px (≤ 150 Ko) ;
  - theme : planche d'une page de thème, 480 et 960 px (≤ 60 Ko) ;
  - vignette : planche d'un thème dans l'index de l'accueil, carré de 128 px (affiché en 64 px).
Les planches passent en niveaux de gris, contraste renforcé, fond rendu blanc pur ; les images de cartes restent en
couleur (fond blanc sous les zones transparentes).

Les variantes sont mises en cache dans .cache/images/ (jamais versionné), selon l'empreinte de l'original et des
réglages : une image déjà traitée n'est pas refaite. La construction copie les variantes dans _site/medias/.

Dépendance : Pillow (lecture JPEG/PNG/WebP, recadrage, encodage WebP).

Usage : python3 outils/illustrations.py PROFIL ORIGINAL   (affiche les variantes produites)
"""

import hashlib
import io
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageEnhance, ImageOps
except ImportError:  # pragma: no cover
    sys.exit("Pillow est introuvable : lancez « pip install -r requirements.txt ».")

VERSION = "1"  # à changer si le traitement change : invalide le cache
EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

# largeurs (et budget en octets, ou None), format imposé (largeur/hauteur) ou None, traitement « planche »
PROFILS = {
    "carte": {"largeurs": [(480, 40_000), (960, 120_000)], "format": 16 / 9, "planche": False},
    "accueil": {"largeurs": [(640, 70_000), (1280, 150_000)], "format": None, "planche": True},
    "theme": {"largeurs": [(480, 30_000), (960, 60_000)], "format": None, "planche": True},
    "vignette": {"largeurs": [(128, 12_000)], "format": 1.0, "planche": True},
}
QUALITES = (82, 76, 70, 64, 58, 52, 46, 40, 34, 28, 22, 16, 10)


class ErreurImage(Exception):
    """Image illisible ou impossible à ramener sous son budget."""


def sur_fond_blanc(image):
    image = ImageOps.exif_transpose(image)
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        rgba = image.convert("RGBA")
        fond = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
        return Image.alpha_composite(fond, rgba).convert("RGB")
    return image.convert("RGB")


def traiter_planche(image):
    """Niveaux de gris, contraste renforcé, papier ramené au blanc pur."""
    gris = ImageOps.autocontrast(image.convert("L"), cutoff=1)
    gris = ImageEnhance.Contrast(gris).enhance(1.25)
    # Tout ce qui est plus clair que 225 devient blanc : le papier jauni disparaît.
    return gris.point(lambda v: 255 if v >= 225 else round(v * 255 / 225))


def recadrer(image, rapport):
    largeur, hauteur = image.size
    if largeur / hauteur > rapport:
        nouvelle = round(hauteur * rapport)
        gauche = (largeur - nouvelle) // 2
        return image.crop((gauche, 0, gauche + nouvelle, hauteur))
    nouvelle = round(largeur / rapport)
    haut = (hauteur - nouvelle) // 2
    return image.crop((0, haut, largeur, haut + nouvelle))


def encoder(image, budget):
    for qualite in QUALITES:
        tampon = io.BytesIO()
        image.save(tampon, "WEBP", quality=qualite, method=6)
        if budget is None or tampon.tell() <= budget:
            return tampon.getvalue(), qualite
    raise ErreurImage(f"impossible de descendre sous {budget // 1000} Ko, même en qualité minimale")


def empreinte(original, profil):
    h = hashlib.sha256()
    h.update(f"{VERSION}|{profil}|{json.dumps(PROFILS[profil], sort_keys=True)}|".encode())
    h.update(Path(original).read_bytes())
    return h.hexdigest()[:20]


def variantes(original, profil, cache):
    """Produit (ou relit en cache) les variantes WebP d'un original.

    Renvoie une liste de dictionnaires {fichier (Path dans le cache), largeur, hauteur, octets, qualite}.
    """
    original = Path(original)
    if profil not in PROFILS:
        raise ErreurImage(f"profil inconnu « {profil} »")
    if original.suffix.lower() not in EXTENSIONS:
        raise ErreurImage(f"format non pris en charge ({original.suffix}) : JPEG, PNG ou WebP attendu")
    dossier = Path(cache) / f"{original.stem}-{profil}-{empreinte(original, profil)}"
    index = dossier / "variantes.json"
    if index.is_file():
        donnees = json.loads(index.read_text(encoding="utf-8"))
        if all((dossier / v["nom"]).is_file() for v in donnees):
            return [{**v, "fichier": dossier / v["nom"]} for v in donnees]

    reglages = PROFILS[profil]
    try:
        with Image.open(original) as ouverte:
            image = sur_fond_blanc(ouverte)
    except (OSError, ValueError) as erreur:
        raise ErreurImage(f"image illisible ({erreur})") from None
    if reglages["planche"]:
        image = traiter_planche(image)
    if reglages["format"]:
        image = recadrer(image, reglages["format"])

    dossier.mkdir(parents=True, exist_ok=True)
    produites = []
    for largeur_cible, budget in reglages["largeurs"]:
        largeur = min(largeur_cible, image.width)  # jamais d'agrandissement
        hauteur = round(image.height * largeur / image.width)
        reduite = image.resize((largeur, hauteur), Image.LANCZOS) if largeur != image.width else image
        octets, qualite = encoder(reduite, budget)
        nom = f"{original.stem}-{largeur_cible}.webp"
        (dossier / nom).write_bytes(octets)
        produites.append({"nom": nom, "largeur": largeur, "hauteur": hauteur, "octets": len(octets), "qualite": qualite})
    index.write_text(json.dumps(produites, indent=2), encoding="utf-8")
    return [{**v, "fichier": dossier / v["nom"]} for v in produites]


def main(arguments):
    if len(arguments) != 2:
        print(__doc__)
        return 2
    profil, original = arguments
    cache = Path(__file__).resolve().parent.parent / ".cache" / "images"
    try:
        for v in variantes(original, profil, cache):
            print(f"{v['fichier']} : {v['largeur']} × {v['hauteur']} px, {v['octets'] / 1000:.1f} ko (qualité {v['qualite']})")
    except ErreurImage as erreur:
        print(f"{original} : {erreur}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
