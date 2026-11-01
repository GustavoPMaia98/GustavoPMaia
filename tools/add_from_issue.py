#!/usr/bin/env python3
"""Add a talk, course or award to the website from a GitHub issue form.

The forms are in .github/ISSUE_TEMPLATE (add-talk, add-course, add-award): on GitHub,
Issues -> New issue -> pick a form, fill it in (from a phone too) and submit.
.github/workflows/add-from-issue.yml then runs this script, commits the change and
closes the issue with a link. Only issues opened by the owner of the repository count.

By hand:  python tools/add_from_issue.py event.json
(event.json = a GitHub "issues" event; on Actions it is $GITHUB_EVENT_PATH)
Prints a short summary on the last line for the issue comment. Pillow is used to
shrink an attached picture when it is installed.
"""
import html, io, json, os, re, sys, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def parse_form(body):
    """Issue-form markdown ("### Label" + value) -> {label: value}; "_No response_" -> ""."""
    out = {}
    for m in re.finditer(r"^###\s+(.+?)\s*\n(.*?)(?=^###\s|\Z)", body or "", re.S | re.M):
        v = m.group(2).strip()
        out[m.group(1).strip()] = "" if v == "_No response_" else v
    return out


def slug(s, n=40):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:n] or "item"


def esc(s):
    return html.escape(s or "", quote=False)


def attr(s):
    return html.escape(s or "", quote=True)


def first_image(text):
    m = re.search(r"!\[[^\]]*\]\((https://[^)\s]+)\)|<img[^>]+src=\"(https://[^\"]+)\"", text or "")
    return (m.group(1) or m.group(2)) if m else None


def save_image(url, folder, name, max_side):
    """Download an attached picture into images/<folder>/; returns the site path or None."""
    if not url or not url.startswith(("https://github.com/", "https://user-images.githubusercontent.com/",
                                      "https://private-user-images.githubusercontent.com/")):
        return None
    headers = {"User-Agent": "GustavoPMaia-site/1.0"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
            data = r.read()
    except Exception as e:
        print("picture not downloaded:", e)
        return None
    os.makedirs(os.path.join(ROOT, "images", folder), exist_ok=True)
    try:
        from PIL import Image
        im = Image.open(io.BytesIO(data))
        im.thumbnail((max_side, max_side))
        rel = f"images/{folder}/{name}.webp"
        im.save(os.path.join(ROOT, rel), "WEBP", quality=85)
    except Exception:
        ext = ".png" if data[:4] == b"\x89PNG" else ".jpg"
        rel = f"images/{folder}/{name}{ext}"
        with open(os.path.join(ROOT, rel), "wb") as f:
            f.write(data)
    return rel


def paragraphs(en, pt):
    """English text with its Portuguese in data-pt, one <p> per paragraph."""
    ens = [p.strip() for p in re.split(r"\n\s*\n", en or "") if p.strip()]
    pts = [p.strip() for p in re.split(r"\n\s*\n", pt or "") if p.strip()]
    return "".join(f'<p data-pt="{attr(pts[i] if i < len(pts) else e)}">{esc(e)}</p>' for i, e in enumerate(ens))


def load(name):
    with open(os.path.join(ROOT, "data", name), encoding="utf-8") as f:
        return json.load(f)


def dump(name, data):
    with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def add_talk(f):
    t_en, t_pt = f.get("Title (English)", ""), f.get("Title (Portuguese)", "")
    kind = "poster" if f.get("Type", "").lower().startswith("poster") else "oral"
    meta = " · ".join(x for x in (f.get("Event"), f.get("Date"), f.get("City")) if x)
    who = f.get("Authors (surnames)", "")
    item = {"type": kind,
            "title": {"en": esc(t_en), "pt": esc(t_pt or t_en)},
            "meta": {"en": esc(meta), "pt": esc(meta)},
            "summary": {"en": ("Poster" if kind == "poster" else "Oral talk") + (" · " + esc(who) if who else ""),
                        "pt": ("Póster" if kind == "poster" else "Comunicação oral") + (" · " + esc(who) if who else "")},
            "details": paragraphs(f.get("Description (English)"), f.get("Description (Portuguese)"))}
    logo = save_image(first_image(f.get("Event logo (optional)")), "logos", slug(f.get("Event") or t_en), 320)
    if logo:
        item = {"type": kind, "logo": {"src": logo, "alt": ""}, **{k: v for k, v in item.items() if k != "type"}}
    data = load("presentations.json")
    data["items"].insert(0, item)
    dump("presentations.json", data)
    return f"Added the {'poster' if kind == 'poster' else 'talk'} “{t_en}” to Presentations."


def add_course(f):
    t_en, t_pt = f.get("Title (English)", ""), f.get("Title (Portuguese)", "")
    parts = [f.get("Kind"), f.get("Organiser"), f.get("Place"), f.get("Date")]
    meta = " · ".join(x for x in parts if x)
    item = {"title": {"en": esc(t_en), "pt": esc(t_pt or t_en)},
            "meta": {"en": esc(meta), "pt": esc(meta)},
            "details": paragraphs(f.get("Description (English)"), f.get("Description (Portuguese)"))}
    logo = save_image(first_image(f.get("Logo or photo (optional)")), "courses", slug(t_en), 640)
    if logo:
        item = {"logo": {"src": logo, "alt": ""}, **item}
    data = load("courses.json")
    data["items"].insert(0, item)
    dump("courses.json", data)
    return f"Added the course “{t_en}” to Courses & Formations."


def add_award(f):
    t_en, t_pt = f.get("Award (English)", ""), f.get("Award (Portuguese)", "")
    issuer, year = f.get("Given by", ""), f.get("Year", "")
    d_en, d_pt = f.get("Description (English)", ""), f.get("Description (Portuguese)", "")
    img = save_image(first_image(f.get("Certificate or photo (optional)")), "awards", slug(t_en) + "-" + slug(year, 8), 1400)
    cert = (f'      <div class="award-cert">\n        <img src="{attr(img)}" alt="{attr(t_en)}" loading="lazy">\n'
            f'        <span class="award-zoom" aria-hidden="true"><i data-lucide="maximize-2"></i></span>\n      </div>\n') if img else \
           '      <div class="award-cert award-cert--icon" aria-hidden="true"><i data-lucide="award"></i></div>\n'
    card = ('\n    <article class="award-card">\n' + cert +
            '      <div class="award-body">\n'
            f'        <span class="award-year">{esc(year)}</span>\n'
            f'        <h3 class="award-title" data-pt="{attr(t_pt or t_en)}">{esc(t_en)}</h3>\n'
            f'        <p class="award-issuer" data-pt="{attr(issuer)}">{esc(issuer)}</p>\n' +
            (f'        <p class="award-desc" data-pt="{attr(d_pt or d_en)}">{esc(d_en)}</p>\n' if d_en else "") +
            '      </div>\n    </article>\n')
    path = os.path.join(ROOT, "sections", "awards.html")
    with open(path, encoding="utf-8") as fh:
        s = fh.read()
    anchor = '<div class="awards-grid">\n'
    if anchor not in s:
        raise SystemExit("Could not find the awards list in sections/awards.html")
    s = s.replace(anchor, anchor + card, 1)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(s)
    return f"Added the award “{t_en}” to Awards."


ACTIONS = {"add-talk": add_talk, "add-course": add_course, "add-award": add_award}


def main():
    with open(sys.argv[1] if len(sys.argv) > 1 else os.environ["GITHUB_EVENT_PATH"], encoding="utf-8") as f:
        ev = json.load(f)
    issue = ev["issue"]
    labels = {l["name"] for l in issue.get("labels", [])}
    title = issue.get("title", "").lower()
    by_title = {"add talk:": "add-talk", "add course:": "add-course", "add award:": "add-award"}
    act = next((ACTIONS[l] for l in ACTIONS if l in labels), None) or \
        next((ACTIONS[v] for k, v in by_title.items() if title.startswith(k)), None)
    if not act:
        print("Not a website form; nothing to do.")
        return 0
    print(act(parse_form(issue.get("body", ""))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
