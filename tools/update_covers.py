#!/usr/bin/env python3
"""Fetch the first page of each paper from its publisher and make the "front page"
shown in the Publications carousel (images/papers/*.webp, data/paper-covers.json).

Run by .github/workflows/update-data.yml every night, or by hand:
    python tools/update_covers.py                 # papers that have no cover yet
    python tools/update_covers.py --force         # rebuild every cover
    python tools/update_covers.py --pdf 10.3390/app15031363 paper.pdf   # from a local PDF
    python tools/update_covers.py --image DOI page1.png --blur "0.26,0.70,0.97,0.955"   # from an image

Covers already listed are never replaced by the nightly run (only with --force), so a
cover made by hand stays.

How it works, for every paper on the site (data/publications.json and the hand-written
list in sections/publications.html):
  1. OpenAlex says whether the paper is open access and under which licence. Only
     papers under a Creative Commons licence (or public domain) are used; any other
     paper keeps the drawn page, so nothing is shown that may not be shared.
  2. The PDF is downloaded from the publisher first, then from other open copies
     (repositories) that OpenAlex lists.
  3. Page 1 is rendered (pdftoppm) and its text layout read (pdftotext -bbox).
     Everything from the "Introduction" heading down is blurred: the main text and
     the footnotes (e-mail addresses included), but not the last lines with the DOI,
     dates and licence, which stay readable as the licence's attribution. With a
     side column (MDPI), only the main column is blurred. If no "Introduction" heading
     is found the paper is skipped, so unblurred main text is never published.
Needs Pillow and poppler-utils (pdftoppm, pdftotext). Network failures change nothing.
"""
import argparse, html, json, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIST = os.path.join(ROOT, "data", "paper-covers.json")
WIDTH = 1100            # stored width: sharp in the zoomed view on high-density screens
MAILTO = os.environ.get("CONTACT_EMAIL", "").strip()
UA = "Mozilla/5.0 (compatible; GustavoPMaia-site/1.0; +https://gustavopmaia98.github.io/GustavoPMaia/" + \
     (f"; mailto:{MAILTO}" if MAILTO else "") + ")"
# the last lines of a first page that stay readable (attribution), and where blurring stops
KEEP = re.compile(r"^\s*(https?://(dx\.)?doi\.org|doi:|Received\b|Available online|Accepted\b|Published\b|©|Copyright\b|\d{4}-\d{3}[\dX]/)", re.I)
INTRO = re.compile(r"^\s*(1\.?\s*)?Introduction\b", re.I)


def get(url, binary=False, limit=30_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/pdf,*/*" if binary else "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read(limit)
    return data if binary else json.loads(data)


def site_dois():
    dois = set()
    try:
        with open(os.path.join(ROOT, "data", "publications.json"), encoding="utf-8") as f:
            for w in json.load(f).get("works", []):
                if w.get("doi") and not w.get("hidden") and w.get("verified"):
                    dois.add(w["doi"].lower())
    except (OSError, ValueError):
        pass
    try:
        with open(os.path.join(ROOT, "sections", "publications.html"), encoding="utf-8") as f:
            for m in re.finditer(r'href="https?://(?:dx\.)?doi\.org/([^"]+)"', f.read()):
                dois.add(urllib.parse.unquote(html.unescape(m.group(1))).strip().lower())
    except OSError:
        pass
    return sorted(dois)


def open_pdfs(doi):
    """(licence, [pdf urls]) for an openly licensed paper, else (licence or None, [])."""
    w = get("https://api.openalex.org/works/doi:" + urllib.parse.quote(doi) + (f"?mailto={urllib.parse.quote(MAILTO)}" if MAILTO else ""))
    if not w:
        return None, []
    locs = [w.get("primary_location") or {}] + (w.get("locations") or [])
    best = w.get("best_oa_location") or {}
    lic = (best.get("license") or next((l.get("license") for l in locs if l.get("license")), "") or "").lower()
    if not (lic.startswith("cc-") or lic in ("cc0", "public-domain")):
        return lic or None, []
    urls = []
    for l in [w.get("primary_location") or {}, best] + locs:        # publisher first, then open copies
        u = l.get("pdf_url")
        # the journal's own page 1 only: never a preprint or accepted manuscript
        if u and u not in urls and l.get("version") in (None, "publishedVersion"):
            urls.append(u)
    return lic, urls


def layout(pdf):
    xml = subprocess.run(["pdftotext", "-bbox-layout", "-f", "1", "-l", "1", pdf, "-"],
                         check=True, capture_output=True, text=True).stdout
    pw, ph = map(float, re.search(r'<page width="([\d.]+)" height="([\d.]+)"', xml).groups())
    lines = []
    for m in re.finditer(r'<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</line>', xml, re.S):
        text = html.unescape(" ".join(re.findall(r">([^<]+)</word>", m.group(5))))
        lines.append((float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4)), text))
    return pw, ph, lines


def band(pw, ph, lines):
    """The box to blur, as fractions (x0, y0, x1, y1), or None if page 1 has no Introduction."""
    intro = [l for l in lines if INTRO.match(l[4]) and len(l[4]) < 40]
    if not intro:
        return None
    hx0, hy0, hx1, hy1, _ = min(intro, key=lambda l: l[1])
    lh = max(6.0, hy1 - hy0)
    # a side column (MDPI) left of the main text stays readable; two equal columns do not
    x0 = hx0 - 4 if hx0 > pw * 0.25 else 0
    # the main text may start a little higher in another column: take lines beside the
    # heading that begin just above it
    top = min([hy0] + [l[1] for l in lines if l[0] >= x0 and l[0] > hx1 and hy0 - 1.6 * lh <= l[1] < hy0]) - 3
    # stop above the last lines with DOI, dates and licence (in the blurred column only)
    keep = [l[1] for l in lines if l[1] > hy1 + lh and l[0] >= x0 - 2 and KEEP.match(l[4])]
    bottom = (min(keep) - 2) if keep else ph
    return x0 / pw, top / ph, 1.0, bottom / ph


def make_cover(pdf, doi, source, lic):
    pw, ph, lines = layout(pdf)
    b = band(pw, ph, lines)
    if not b:
        return f"{doi}: no 'Introduction' heading on page 1, skipped"
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", "170", "-f", "1", "-l", "1", "-png", pdf, os.path.join(tmp, "p")], check=True)
        png = next(os.path.join(tmp, f) for f in os.listdir(tmp) if f.endswith(".png"))
        im = Image.open(png).convert("RGB")
    return save_cover(im, [b], doi, source, lic)


def save_cover(im, boxes, doi, source, lic):
    """Blur each box (fractions x0, y0, x1, y1), save the page and list it."""
    if im.width > WIDTH:
        im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
    w, h = im.size
    r = max(4, round(w / 120))                       # strong enough that the text cannot be read
    for b in boxes:
        box = (round(b[0] * w), round(b[1] * h), round(b[2] * w), round(b[3] * h))
        if box[3] > box[1] and box[2] > box[0]:
            part = im.crop(box).filter(ImageFilter.GaussianBlur(r)).filter(ImageFilter.GaussianBlur(r))
            im.paste(part, box)
    slug = re.sub(r"[^a-z0-9]+", "-", doi.lower()).strip("-")
    rel = f"images/papers/{slug}.webp"
    os.makedirs(os.path.join(ROOT, "images", "papers"), exist_ok=True)
    im.save(os.path.join(ROOT, rel), "WEBP", quality=86, method=6)
    covers = load()
    covers[doi] = {"src": rel, "width": w, "height": h, "license": lic, "source": source,
                   "made": time.strftime("%Y-%m-%d")}
    save(covers)
    return f"{doi}: cover from {source} ({lic})"


def load():
    try:
        with open(LIST, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def save(covers):
    covers["_help"] = ("First pages of the papers for the Publications carousel, main text blurred. "
                       "Written by tools/update_covers.py; keyed by DOI.")
    out = {"_help": covers.pop("_help")}
    out.update(sorted(covers.items()))
    with open(LIST, "w", encoding="utf-8") as f:
        f.write(json.dumps(out, ensure_ascii=False, indent=2) + "\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--pdf", nargs=2, metavar=("DOI", "FILE"), help="make one cover from a local PDF")
    ap.add_argument("--image", nargs=2, metavar=("DOI", "FILE"), help="make one cover from an image of page 1")
    ap.add_argument("--blur", help='with --image: boxes to blur, as fractions "x0,y0,x1,y1;x0,y0,x1,y1"')
    ap.add_argument("--license", default="", help="with --pdf/--image: the paper's licence, e.g. cc-by")
    a = ap.parse_args()
    if a.pdf:
        print(make_cover(a.pdf[1], a.pdf[0].lower(), "local file", a.license or "given"))
        return 0
    if a.image:
        if not a.blur:
            sys.exit("--image needs --blur with the boxes to blur (main text, e-mail addresses).")
        boxes = [tuple(float(v) for v in b.split(",")) for b in a.blur.split(";") if b.strip()]
        im = Image.open(a.image[1]).convert("RGB")
        print(save_cover(im, boxes, a.image[0].lower(), "page image", a.license or "given"))
        return 0
    have = load()
    for doi in site_dois():
        if doi in have and not a.force:
            continue
        try:
            lic, urls = open_pdfs(doi)
        except Exception as e:
            print(f"{doi}: OpenAlex not reachable ({e}); later")
            continue
        if not urls:
            print(f"{doi}: {'licence ' + lic if lic else 'no open licence'}; drawn page kept")
            continue
        done = False
        for u in urls:
            try:
                data = get(u, binary=True)
                if not data.startswith(b"%PDF"):
                    raise ValueError("not a PDF (the site may need a browser)")
                with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
                    f.write(data)
                try:
                    print(make_cover(f.name, doi, u, lic))
                finally:
                    os.unlink(f.name)
                done = True
                break
            except Exception as e:
                print(f"{doi}: {u}: {e}")
            time.sleep(1)
        if not done:
            print(f"{doi}: no PDF could be read; drawn page kept")
    return 0


if __name__ == "__main__":
    sys.exit(main())
