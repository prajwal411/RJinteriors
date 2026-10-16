#!/usr/bin/env python3
"""Make the web images for the Projects pages from the original photos.

    python tools/project-images.py

Reads src/data/projects.json. Each photo's "source" is a path inside "Rj projects/".
An optional "crop" keeps part of the photo, as fractions of the original:
    {"top": 0, "bottom": 0.86, "left": 0, "right": 1}
Use it to remove camera stamps such as "Shot with my Galaxy A71".

Writes, for photo number n of each project:
    src/assets/img/projects/<id>/<n>.webp        long edge up to 1600px, for the gallery and viewer
    src/assets/img/projects/<id>/<n>-thumb.webp  short edge up to 640px, for cards
The folder is rebuilt from scratch each run. Needs Pillow (pip install pillow).
"""
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'Rj projects'
OUT = ROOT / 'src' / 'assets' / 'img' / 'projects'
FULL_LONG_EDGE = 1600
THUMB_SHORT_EDGE = 640
THUMB_LONG_EDGE_MAX = 1200


def fit_long(im, limit):
    scale = min(1, limit / max(im.size))
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im


def fit_short(im, short, long_max):
    scale = min(1, short / min(im.size), long_max / max(im.size))
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im


def main():
    projects = json.loads((ROOT / 'src' / 'data' / 'projects.json').read_text(encoding='utf8'))
    if OUT.exists():
        shutil.rmtree(OUT)
    total = 0
    for project in projects:
        photos = project.get('photos', [])
        if not photos:
            continue
        folder = OUT / project['id']
        folder.mkdir(parents=True)
        for n, photo in enumerate(photos, start=1):
            path = SOURCE / photo['source']
            if not path.exists():
                sys.exit(f'Missing photo for {project["id"]}: {path}')
            im = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
            crop = photo.get('crop')
            if crop:
                w, h = im.size
                box = (round(w * crop.get('left', 0)), round(h * crop.get('top', 0)),
                       round(w * crop.get('right', 1)), round(h * crop.get('bottom', 1)))
                im = im.crop(box)
            fit_long(im, FULL_LONG_EDGE).save(folder / f'{n}.webp', 'WEBP', quality=80, method=6)
            fit_short(im, THUMB_SHORT_EDGE, THUMB_LONG_EDGE_MAX).save(folder / f'{n}-thumb.webp', 'WEBP', quality=74, method=6)
            total += 1
        print(f'{project["id"]}: {len(photos)} photos')
    print(f'Done: {total} photos')


if __name__ == '__main__':
    main()
