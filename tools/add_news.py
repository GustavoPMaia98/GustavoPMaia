#!/usr/bin/env python3
"""Add LinkedIn posts to the News section (data/news.json).

LinkedIn has no public API for reading a person's posts, so there are two ways in:

  1. One post at a time (works today, no set-up). In GitHub: Actions -> "Add news
     from LinkedIn" -> Run workflow, paste the post's link (the "Copy link to post"
     menu item on LinkedIn). The date comes from the link itself; the text and the
     picture are read from the public post page. If LinkedIn hides the page from
     GitHub's servers, type the text in the optional box instead.
         python tools/add_news.py --url https://www.linkedin.com/posts/...-activity-7490678147051479041-xxxx
         python tools/add_news.py --url ... --text "My English text" --text-pt "O meu texto"

  2. Fully automatic (needs a feed). Services such as rss.app, FetchRSS or a Zapier/
     Make "new LinkedIn post -> RSS" zap turn your public LinkedIn activity into an
     RSS feed. Save that feed address as the repository secret LINKEDIN_FEED_URL and
     the nightly "Update site data" workflow imports new posts by itself:
         python tools/add_news.py --feed https://rss.app/feeds/xxxx.xml

A post that is already on the site is never added twice. Posts imported from the
feed are only the ones newer than the newest LinkedIn post already listed, so a post
you delete from news.json does not come back. To hide one without deleting it, set
"hidden": true on it. Standard-library Python; Pillow is used to shrink the picture
when it is installed.
"""
import argparse, html, io, json, os, re, sys, time, urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NEWS = os.path.join(ROOT, "data", "news.json")
IMG_DIR = os.path.join(ROOT, "images", "news")
MAX_TEXT = 320            # characters shown on the card; the full post is one click away
MAX_IMG_KB = 550          # tools/check_site.py rejects images over 600 KB
UA = "Mozilla/5.0 (compatible; GustavoPMaia-site/1.0; +https://gustavopmaia98.github.io/GustavoPMaia/)"
LINK_LABEL = {"en": "Post", "pt": "Publicação"}


def fetch(url, binary=False, limit=8_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read(limit)
        ctype = r.headers.get("Content-Type", "")
    return (data, ctype) if binary else data.decode("utf-8", "replace")


def activity_id(url):
    """The 19-digit post id inside any LinkedIn post link."""
    m = re.search(r"(?:activity|share|ugcPost)[:\-](\d{18,20})", url or "")
    return m.group(1) if m else None


def id_date(aid):
    """LinkedIn post ids start with the creation time in milliseconds."""
    try:
        d = datetime.fromtimestamp((int(aid) >> 22) / 1000, tz=timezone.utc)
        return d if 2010 <= d.year <= 2100 else None
    except (ValueError, OverflowError, OSError):
        return None


def canonical(aid):
    return f"https://www.linkedin.com/feed/update/urn:li:activity:{aid}/"


def plain_text(s):
    s = re.sub(r"<br\s*/?>|</?(p|div|li)\b[^>]*>", "\n", s or "", flags=re.I)
    s = html.unescape(re.sub(r"<[^>]+>", "", s))
    s = re.sub(r"^.{0,80}? on LinkedIn: ", "", s.strip())         # "Gustavo Maia on LinkedIn: …"
    s = re.sub(r"(\s*#\w+)+\s*$", "", s)                           # trailing hashtag block
    return re.sub(r"\s+", " ", s).strip()


def shorten(s, n=MAX_TEXT):
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0].rstrip(",;:—-")
    return cut + "…"


def to_html(s):
    """Plain text -> safe HTML for news.json (render.js escapes again anyway)."""
    return html.escape(s, quote=False)


def meta_tags(page):
    out = {}
    for m in re.finditer(r"<meta\s+[^>]*>", page, re.I):
        tag = m.group(0)
        k = re.search(r'(?:property|name)\s*=\s*"([^"]+)"', tag)
        v = re.search(r'content\s*=\s*"([^"]*)"', tag)
        if k and v:
            out.setdefault(k.group(1).lower(), html.unescape(v.group(1)))
    return out


def save_image(url, aid):
    """Download the post picture into images/news/, shrunk to fit the size limit."""
    if not url or not url.startswith("https://"):
        return None
    try:
        data, ctype = fetch(url, binary=True)
    except Exception as e:
        print(f"  picture not downloaded ({e})")
        return None
    if not ctype.startswith("image/"):
        return None
    os.makedirs(IMG_DIR, exist_ok=True)
    rel = f"images/news/linkedin-{aid}.jpg"
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((1200, 1200))
        for q in (82, 72, 62):
            buf = io.BytesIO()
            im.save(buf, "JPEG", quality=q, optimize=True, progressive=True)
            if buf.tell() <= MAX_IMG_KB * 1024:
                break
        data = buf.getvalue()
    except ImportError:
        if "jpeg" not in ctype and "jpg" not in ctype:
            return None
    except Exception as e:
        print(f"  picture could not be read ({e})")
        return None
    if len(data) > MAX_IMG_KB * 1024:
        print("  picture too large; using the LinkedIn logo instead")
        return None
    with open(os.path.join(ROOT, rel), "wb") as f:
        f.write(data)
    return rel


def make_item(url, text=None, text_pt=None, image=None, date=None, page_fetch=True):
    aid = activity_id(url)
    if not aid:
        raise SystemExit(f"Not a LinkedIn post link: {url}\n"
                         "Use the post's '…' menu -> 'Copy link to post'.")
    when = date or id_date(aid)
    og = {}
    if page_fetch and not (text and image):
        try:
            og = meta_tags(fetch(url))
        except Exception as e:
            print(f"  LinkedIn page not readable from here ({e}); using what was given")
    body = plain_text(text or og.get("og:description") or og.get("description") or og.get("og:title") or "")
    if not body:
        raise SystemExit("Could not read the post text from LinkedIn. Run again and type the text in the 'text' box.")
    img = save_image(image or og.get("og:image"), aid)
    item = {
        "date": when.strftime("%Y-%m") if when else time.strftime("%Y-%m"),
        "href": canonical(aid),
        "media": ({"kind": "photo", "src": img, "alt": shorten(body, 90)} if img
                  else {"kind": "logo", "src": "images/logos/linkedin.png", "alt": "LinkedIn"}),
        "text": {"en": to_html(shorten(body))},
        "link": dict(LINK_LABEL),
        "source": "linkedin",
    }
    if text_pt:
        item["text"]["pt"] = to_html(shorten(plain_text(text_pt)))
    return item


def load():
    with open(NEWS, encoding="utf-8") as f:
        return json.load(f)


def save(items):
    with open(NEWS, "w", encoding="utf-8") as f:
        f.write(json.dumps(items, ensure_ascii=False, indent=2) + "\n")


def known_ids(items):
    return {activity_id(n.get("href", "")) for n in items} - {None}


def read_feed(url):
    """RSS 2.0 or Atom -> [(link, text, image, date)]."""
    root = ET.fromstring(fetch(url).encode("utf-8"))
    ns = {"atom": "http://www.w3.org/2005/Atom", "media": "http://search.yahoo.com/mrss/"}
    out = []
    for it in root.iter("item"):
        link = (it.findtext("link") or "").strip()
        text = it.findtext("description") or it.findtext("title") or ""
        img = None
        for tag in (it.find("enclosure"), it.find("media:content", ns), it.find("media:thumbnail", ns)):
            if tag is not None and tag.get("url"):
                img = tag.get("url")
                break
        if not img:
            m = re.search(r'<img[^>]+src="([^"]+)"', text)
            img = m and html.unescape(m.group(1))
        out.append((link, text, img))
    for e in root.iter("{http://www.w3.org/2005/Atom}entry"):
        le = e.find("atom:link", ns)
        link = le.get("href") if le is not None else ""
        text = e.findtext("atom:content", default="", namespaces=ns) or e.findtext("atom:summary", default="", namespaces=ns) \
            or e.findtext("atom:title", default="", namespaces=ns)
        m = re.search(r'<img[^>]+src="([^"]+)"', text)
        out.append((link, text, m and html.unescape(m.group(1))))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", help="link to one LinkedIn post")
    ap.add_argument("--text", help="English text (optional; read from LinkedIn otherwise)")
    ap.add_argument("--text-pt", help="Portuguese text (optional)")
    ap.add_argument("--image", help="picture link (optional; read from LinkedIn otherwise)")
    ap.add_argument("--feed", help="RSS/Atom feed of your LinkedIn posts")
    ap.add_argument("--max", type=int, default=5, help="most posts to import from the feed per run")
    a = ap.parse_args()
    items = load()
    have = known_ids(items)

    if a.url:
        aid = activity_id(a.url)
        if aid in have:
            print("This post is already in the News section; nothing to do.")
            return 0
        item = make_item(a.url, a.text, a.text_pt, a.image)
        items.insert(0, item)
        save(items)
        print(f"Added: {item['date']}  {item['text']['en'][:80]}…")
        return 0

    if a.feed:
        try:
            entries = read_feed(a.feed)
        except Exception as e:
            print(f"Feed not readable ({e}); News left unchanged.")
            return 0
        newest = max((n.get("date", "") for n in items if n.get("source") == "linkedin"
                      or "linkedin.com" in n.get("href", "")), default="")
        added = 0
        for link, text, img in entries:
            aid = activity_id(link)
            when = aid and id_date(aid)
            if not aid or aid in have or not when or when.strftime("%Y-%m") < newest:
                continue
            try:
                item = make_item(link, text=text, image=img, page_fetch=False)
            except SystemExit as e:
                print(f"  skipped {link}: {e}")
                continue
            items.insert(0, item)
            have.add(aid)
            added += 1
            print(f"Added: {item['date']}  {item['text']['en'][:80]}…")
            if added >= a.max:
                break
        if added:
            save(items)
        else:
            print("No new LinkedIn posts.")
        return 0

    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
