#!/usr/bin/env python3
"""Make the "front page" shown for a paper in the Publications carousel.

The carousel shows each paper's real first page as published (journal header,
title, authors, affiliations, abstract), with the main text (Introduction and
the rest of the body) blurred. Covers live in images/papers/ and are listed in
data/paper-covers.json; papers without one keep the drawn page.

    python tools/make_cover.py paper.pdf  10.3390/app15031363
    python tools/make_cover.py page1.png  10.1016/j.epsl.2026.120237 --blur-from 0.655 --blur-to 0.893

From a PDF (best quality), page 1 is rendered with pdftoppm (poppler-utils) and the
blurred band is found by itself: from the "1. Introduction" heading down to the
footnotes ("Corresponding author", the DOI line), found with pdftotext. From an
image, give the band as fractions of the page height (--blur-from, --blur-to).
Only use pages you may show: open-access articles (e.g. CC BY) with their licence
line, which stays readable.  Needs Pillow.
"""
import argparse, json, os, re, subprocess, sys, tempfile
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, "data", "paper-covers.json")
WIDTH = 1100            # stored width (sharp in the zoomed view on high-density screens)


def from_pdf(pdf, tmp):
    base = os.path.join(tmp, "p")
    subprocess.run(["pdftoppm", "-r", "200", "-f", "1", "-l", "1", "-png", pdf, base], check=True)
    png = next(os.path.join(tmp, f) for f in os.listdir(tmp) if f.startswith("p") and f.endswith(".png"))
    # find the band to blur from the text layout of page 1
    xml = subprocess.run(["pdftotext", "-bbox-layout", "-f", "1", "-l", "1", pdf, "-"],
                         check=True, capture_output=True, text=True).stdout
    ph = float(re.search(r'<page width="[\d.]+" height="([\d.]+)"', xml).group(1))
    lines = []
    for m in re.finditer(r'<line xMin="[\d.]+" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">(.*?)</line>', xml, re.S):
        text = " ".join(re.findall(r">([^<]+)</word>", m.group(3)))
        lines.append((float(m.group(1)), float(m.group(2)), text))
    intro = [y0 for y0, y1, t in lines if re.match(r"^\s*(1\.?\s*)?Introduction\b", t, re.I)]
    if not intro:
        sys.exit("No 'Introduction' heading found on page 1: give --blur-from/--blur-to and use a page image.")
    top = min(intro) - 4
    foot = [y0 for y0, y1, t in lines if y0 > top and re.match(r"^\s*(\*|E-mail|https://doi\.org|Received\b|Corresponding)", t, re.I)]
    bottom = (min(foot) - 4) if foot else ph
    return png, top / ph, bottom / ph


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="the paper's PDF, or an image of its first page")
    ap.add_argument("doi")
    ap.add_argument("--blur-from", type=float, help="top of the blurred band, fraction of the page height")
    ap.add_argument("--blur-to", type=float, default=1.0, help="bottom of the blurred band, fraction")
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as tmp:
        if a.source.lower().endswith(".pdf"):
            img, y0, y1 = from_pdf(a.source, tmp)
            if a.blur_from is not None:
                y0, y1 = a.blur_from, a.blur_to
        else:
            if a.blur_from is None:
                sys.exit("For an image, give --blur-from (and --blur-to) as fractions of the page height.")
            img, y0, y1 = a.source, a.blur_from, a.blur_to
        im = Image.open(img).convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    w, h = im.size
    box = (0, round(y0 * h), w, round(y1 * h))
    band = im.crop(box)
    r = max(3, round(w / 140))                 # strong enough that the text cannot be read
    band = band.filter(ImageFilter.GaussianBlur(r)).filter(ImageFilter.GaussianBlur(r))
    im.paste(band, box)
    slug = re.sub(r"[^a-z0-9]+", "-", a.doi.lower()).strip("-")
    rel = f"images/papers/{slug}.webp"
    os.makedirs(os.path.join(ROOT, "images", "papers"), exist_ok=True)
    im.save(os.path.join(ROOT, rel), "WEBP", quality=88, method=6)
    covers = {}
    if os.path.exists(LIST):
        with open(LIST, encoding="utf-8") as f:
            covers = json.load(f)
    covers.setdefault("_help", "Real first pages of the papers for the Publications carousel (body blurred). "
                               "Made by tools/make_cover.py; keyed by DOI.")
    covers[a.doi.lower()] = {"src": rel, "width": w, "height": h}
    with open(LIST, "w", encoding="utf-8") as f:
        f.write(json.dumps(covers, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {rel} ({w}x{h}, blurred {y0:.3f}-{y1:.3f}) and data/paper-covers.json")


if __name__ == "__main__":
    main()
