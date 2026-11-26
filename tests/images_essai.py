#!/usr/bin/env python3
"""Images d'essai pour les tests, dessinées par programme (formes et bruit) : jamais publiées sur le site.

Usage : python3 tests/images_essai.py DOSSIER
Écrit DOSSIER/photo.jpg (couleur, bruitée : cas le plus difficile à compresser), DOSSIER/planche.png (traits noirs
sur papier jauni, à la manière d'une gravure) et DOSSIER/transparente.png (fond transparent).
"""

import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def photo(chemin):
    random.seed(1)
    image = Image.new("RGB", (3000, 2000))
    dessin = ImageDraw.Draw(image)
    for y in range(0, 2000, 4):
        dessin.rectangle((0, y, 3000, y + 4), fill=(40 + y // 16, 90 + y // 30, 160 - y // 20))
    for _ in range(300):
        x, y, r = random.randrange(3000), random.randrange(2000), random.randrange(20, 220)
        dessin.ellipse((x - r, y - r, x + r, y + r), fill=tuple(random.randrange(256) for _ in range(3)))
    bruit = Image.effect_noise((3000, 2000), 60).convert("RGB")
    Image.blend(image, bruit, 0.25).save(chemin, quality=92)


def planche(chemin):
    image = Image.new("RGB", (2400, 1600), (236, 226, 200))
    dessin = ImageDraw.Draw(image)
    for cx, cy, r, dents in ((700, 800, 420, 24), (1450, 700, 300, 18), (1950, 1150, 220, 14)):
        dessin.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(30, 25, 20), width=8)
        dessin.ellipse((cx - r // 5, cy - r // 5, cx + r // 5, cy + r // 5), outline=(30, 25, 20), width=6)
        for i in range(dents):
            a = 2 * math.pi * i / dents
            dessin.line((cx + r * math.cos(a), cy + r * math.sin(a), cx + (r + 50) * math.cos(a),
                         cy + (r + 50) * math.sin(a)), fill=(30, 25, 20), width=14)
    for y in range(100, 1500, 18):
        dessin.line((80, y, 260, y + 40), fill=(60, 50, 40), width=2)
    image.save(chemin)


def transparente(chemin):
    image = Image.new("RGBA", (1200, 900), (0, 0, 0, 0))
    ImageDraw.Draw(image).ellipse((200, 150, 1000, 750), fill=(178, 106, 0, 255))
    image.save(chemin)


if __name__ == "__main__":
    dossier = Path(sys.argv[1])
    dossier.mkdir(parents=True, exist_ok=True)
    photo(dossier / "photo.jpg")
    planche(dossier / "planche.png")
    transparente(dossier / "transparente.png")
