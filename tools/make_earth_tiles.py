#!/usr/bin/env python3
"""Make the high-resolution Earth tiles the globe shows when zoomed in.

The globe's base map is a 4K picture of the whole Earth (images/earth/earth-4k.webp),
which turns soft close up. This cuts NASA's Blue Marble (public domain, NASA Earth
Observatory, ~2 km per pixel) into 16 x 8 tiles of 22.5 degrees; scenes3d.js loads only
the tiles in view once the globe is zoomed in.

Run once by .github/workflows/earth-tiles.yml ("Run workflow"), or by hand:
    python tools/make_earth_tiles.py                 # download from NASA and cut
    python tools/make_earth_tiles.py --src big.jpg   # cut an image you already have
Writes images/earth/tiles/<row>-<col>.webp and images/earth/tiles/index.json.
Needs Pillow.
"""
import argparse, io, json, os, sys, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images", "earth", "tiles")
COLS, ROWS = 16, 8
# Blue Marble Next Generation, August 2004, with topography and bathymetry shading
URLS = [
    "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74042/world.200408.3x21600x10800.jpg",
    "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73776/world.topo.bathy.200408.3x21600x10800.jpg",
]


def fetch():
    for u in URLS:
        try:
            print("Downloading", u)
            req = urllib.request.Request(u, headers={"User-Agent": "GustavoPMaia-site/1.0 (earth tiles)"})
            with urllib.request.urlopen(req, timeout=600) as r:
                data = r.read()
            if len(data) > 5_000_000:
                return data, u
            print("  too small, skipped")
        except Exception as e:
            print("  failed:", e)
    sys.exit("Could not download the Blue Marble image.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", help="an equirectangular Earth image (2:1) to cut instead of downloading")
    ap.add_argument("--size", type=int, default=1350, help="tile size in pixels (default 1350)")
    a = ap.parse_args()
    Image.MAX_IMAGE_PIXELS = None
    if a.src:
        im, source = Image.open(a.src), a.src
    else:
        data, source = fetch()
        im = Image.open(io.BytesIO(data))
    im = im.convert("RGB")
    W, H = im.size
    if abs(W - 2 * H) > 2:
        sys.exit(f"The image should be twice as wide as tall (got {W}x{H}).")
    os.makedirs(OUT, exist_ok=True)
    tw, th = W / COLS, H / ROWS
    for r in range(ROWS):
        for c in range(COLS):
            box = (round(c * tw), round(r * th), round((c + 1) * tw), round((r + 1) * th))
            tile = im.crop(box).resize((a.size, a.size), Image.LANCZOS)
            tile.save(os.path.join(OUT, f"{r}-{c}.webp"), "WEBP", quality=82, method=6)
        print(f"row {r + 1}/{ROWS} done")
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"_help": "High-resolution Earth tiles for the globe (scenes3d.js); made by tools/make_earth_tiles.py. "
                            "Tile <row>-<col> covers latitude 90-22.5*row down 22.5 degrees and longitude -180+22.5*col east 22.5 degrees.",
                   "cols": COLS, "rows": ROWS, "size": a.size,
                   "source": "NASA Earth Observatory, Blue Marble Next Generation (public domain)" if not a.src else source}, f, indent=1)
    print("Wrote", COLS * ROWS, "tiles to images/earth/tiles")


if __name__ == "__main__":
    main()
