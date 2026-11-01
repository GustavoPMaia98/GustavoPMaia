#!/usr/bin/env python3
"""Find freely licensed portraits for the people in the Academic Tree.

For every person in data/tree.json without a "photo", this looks for their Wikipedia
article (the "url" when it is a Wikipedia link, otherwise their name), checks that
the article is about a scientist, takes the article's main picture, and keeps it only
if it is on Wikimedia Commons under a free licence (public domain or Creative
Commons). The picture is saved as images/tree/<name>.jpg (square, 320 px) and the
person gets "photo" and "photoCredit" (author, licence, source page) in data/tree.json;
the site shows the credit next to the photo. Nothing is changed for anyone it cannot
find with certainty.

Run by .github/workflows/tree-photos.yml ("Run workflow"), or by hand:
    python tools/fetch_tree_photos.py            # find and save
    python tools/fetch_tree_photos.py --dry-run  # only report
Needs Pillow; network access to wikipedia.org and wikimedia.org.
"""
import argparse, html, io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TREE = os.path.join(ROOT, "data", "tree.json")
OUT = os.path.join(ROOT, "images", "tree")
UA = "GustavoPMaia-site/1.0 (+https://gustavopmaia98.github.io/GustavoPMaia/; academic tree photos)"
SCIENCE = re.compile(r"chemist|physicist|scientist|biochemist|astronom|astrophysic|geochemist|cosmochemist|planetary|researcher|professor|biologist|microbiologist|crystallograph|spectroscop", re.I)
FREE = re.compile(r"^(cc[ -]?(by|zero|0)|public domain|pd\b|pd-|cc0)", re.I)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def api(host, **params):
    params.update(format="json", formatversion="2")
    return json.loads(get("https://" + host + "/w/api.php?" + urllib.parse.urlencode(params)))


def plain(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", plain(s)).strip("-")


def titles_for(node):
    url = node.get("url") or ""
    m = re.match(r"https?://en\.wikipedia\.org/wiki/(.+)$", url)
    out = []
    if m:
        out.append(urllib.parse.unquote(m.group(1)).replace("_", " "))
    name = re.sub(r"^(Eng|Prof|Dr)\.?\s+", "", node["name"])
    out.append(name)
    w = name.split()
    if len(w) > 2:
        out.append(w[0] + " " + w[-1])                         # "Louis J. Allamandola" -> "Louis Allamandola"
        out.append(" ".join(x for x in w if not re.fullmatch(r"[A-Z]\.", x)))
    return list(dict.fromkeys(out))


def same_person(node_name, title):
    a, b = plain(node_name).replace(".", " ").split(), plain(re.sub(r"\(.*?\)", "", title)).replace(".", " ").split()
    return bool(a and b) and a[-1] == b[-1] and a[0][0] == b[0][0]


def find(node):
    for title in titles_for(node):
        try:
            r = api("en.wikipedia.org", action="query", titles=title, redirects=1, prop="pageimages|description", piprop="name")
        except Exception as e:
            print("   wikipedia unreachable:", e)
            return None
        page = (r.get("query", {}).get("pages") or [{}])[0]
        if page.get("missing") or not page.get("pageimage"):
            continue
        if not same_person(node["name"], page.get("title", "")):
            continue
        if not SCIENCE.search(page.get("description", "")):
            print("   skip (not a scientist?):", page.get("title"), "-", page.get("description"))
            continue
        file = "File:" + page["pageimage"]
        info = api("commons.wikimedia.org", action="query", titles=file, prop="imageinfo", iiprop="url|extmetadata", iiurlwidth=480)
        fp = (info.get("query", {}).get("pages") or [{}])[0]
        if fp.get("missing") or not fp.get("imageinfo"):
            print("   skip (picture not on Commons, may be non-free):", file)
            continue
        ii = fp["imageinfo"][0]
        meta = ii.get("extmetadata", {})
        lic = (meta.get("LicenseShortName", {}).get("value") or "").strip()
        if not FREE.search(lic):
            print("   skip (licence):", lic, file)
            continue
        artist = re.sub(r"<[^>]+>", "", html.unescape(meta.get("Artist", {}).get("value") or "")).strip() or "unknown"
        return {"thumb": ii.get("thumburl") or ii["url"], "page": ii.get("descriptionurl", ""), "license": lic,
                "author": artist[:120], "title": page["title"]}
    return None


def square(data, size=320):
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = im.size
    s = min(w, h)
    top = 0 if h > w else (h - s) // 2                      # portraits: keep the top (the face)
    left = (w - s) // 2
    im = im.crop((left, top, left + s, top + s)).resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=86, optimize=True)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    with open(TREE, encoding="utf-8") as f:
        tree = json.load(f)
    people = []

    def walk(n):
        people.append(n)
        for m in n.get("mentors") or []:
            walk(m)
    walk(tree["root"])
    found, done = {}, 0
    for n in people:
        if n.get("photo") or n.get("hidden"):
            continue
        key = plain(n["name"])
        if key not in found:
            print("Looking for", n["name"])
            found[key] = find(n)
            time.sleep(0.5)
            hit = found[key]
            print("   ->", ("%s (%s, %s)" % (hit["title"], hit["license"], hit["author"])) if hit else "nothing free")
            if hit and not a.dry_run:
                rel = "images/tree/" + slug(n["name"]) + ".jpg"
                os.makedirs(OUT, exist_ok=True)
                with open(os.path.join(ROOT, rel), "wb") as f:
                    f.write(square(get(hit["thumb"])))
                hit["rel"] = rel
        hit = found[key]
        if hit and not a.dry_run and hit.get("rel"):
            n["photo"] = hit["rel"]
            n["photoCredit"] = {"author": hit["author"], "license": hit["license"], "source": hit["page"]}
            done += 1
    if done:
        with open(TREE, "w", encoding="utf-8") as f:
            f.write(json.dumps(tree, ensure_ascii=False, indent=2) + "\n")
    print("Photos added to", done, "people")
    return 0


if __name__ == "__main__":
    sys.exit(main())
