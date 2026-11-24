#!/usr/bin/env python3
"""Make the web images for the Projects pages from the original photos.

    python tools/project-images.py
    python tools/project-images.py --thumbs-over-budget   remake only the thumbnails over 100 KB

Reads src/data/projects.json. Each photo's "source" is a path inside "Rj projects/".
An optional "crop" keeps part of the photo, as fractions of the original:
    {"top": 0, "bottom": 0.86, "left": 0, "right": 1}
Use it to remove camera stamps such as "Shot with my Galaxy A71".

Writes, for photo number n of each project:
    src/assets/img/projects/<id>/<n>.webp        long edge up to 1600px, for the gallery and viewer
    src/assets/img/projects/<id>/<n>-thumb.webp  short edge up to 640px, for cards
The folder is rebuilt from scratch each run, except with --thumbs-over-budget, which leaves every other
file as it is. Needs Pillow (pip install pillow).
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
# File size limits; busy photos are saved at a lower quality until they fit
FULL_BUDGET_KB = 250
THUMB_BUDGET_KB = 100


def fit_long(im, limit):
    scale = min(1, limit / max(im.size))
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im


def fit_short(im, short, long_max):
    scale = min(1, short / min(im.size), long_max / max(im.size))
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS) if scale < 1 else im


def save_webp(im, path, quality, budget_kb, floor):
    """Save as WebP, lowering the quality in steps for busy photos until the file fits the budget."""
    while True:
        im.save(path, 'WEBP', quality=quality, method=6)
        if path.stat().st_size <= budget_kb * 1024 or quality <= floor:
            return
        quality -= 4


def save_thumb(im, path):
    """Save a card thumbnail within budget. Very busy photos (leaves, fine screens) don't fit even at the
    lowest quality, so they are made a little smaller instead: cards show thumbnails at most about 460px
    wide, and larger screens get the full photo from the srcset."""
    short = THUMB_SHORT_EDGE
    while True:
        save_webp(fit_short(im, short, THUMB_LONG_EDGE_MAX), path, 74, THUMB_BUDGET_KB, 46)
        if path.stat().st_size <= THUMB_BUDGET_KB * 1024 or short <= 480:
            return
        short -= 40


def load_photo(project, photo):
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
    return im


def remake_heavy_thumbs(projects):
    """Remake only the thumbnails over budget, leaving every other file as it is."""
    for project in projects:
        for n, photo in enumerate(project.get('photos', []), start=1):
            thumb = OUT / project['id'] / f'{n}-thumb.webp'
            before = thumb.stat().st_size
            if before <= THUMB_BUDGET_KB * 1024:
                continue
            save_thumb(load_photo(project, photo), thumb)
            with Image.open(thumb) as im:
                size = im.size
            print(f'{project["id"]}/{n}-thumb.webp: {before // 1024} KB -> {thumb.stat().st_size // 1024} KB, {size[0]}x{size[1]}')


def main():
    projects = json.loads((ROOT / 'src' / 'data' / 'projects.json').read_text(encoding='utf8'))
    if '--thumbs-over-budget' in sys.argv:
        remake_heavy_thumbs(projects)
        return
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
            im = load_photo(project, photo)
            save_webp(fit_long(im, FULL_LONG_EDGE), folder / f'{n}.webp', 80, FULL_BUDGET_KB, 56)
            save_thumb(im, folder / f'{n}-thumb.webp')
            total += 1
        print(f'{project["id"]}: {len(photos)} photos')
    print(f'Done: {total} photos')


if __name__ == '__main__':
    main()
