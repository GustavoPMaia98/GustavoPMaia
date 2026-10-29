#!/usr/bin/env python3
"""Quick quality gate for the website (used by .github/workflows/site-checks.yml).

Checks:
  1. every local file referenced by the pages exists (images, scripts, styles, links)
  2. no image used by the site is heavier than MAX_KB (resize before adding!)
  3. the JSON blocks inside the sections parse
  4. data/news.json and data/tree.json are valid and their pictures exist
  5. security: the Content-Security-Policy of each page lists the fingerprint
     (sha256) of every inline <script>, and no page uses inline on…="" handlers
     (both would be blocked by the browser and silently break the page)
Run locally with:  python tools/check_site.py
After editing an inline <script> in index.html or cientificamente.html, run
    python tools/check_site.py --fix
to update the fingerprints in the security policy automatically.
"""
import base64, glob, hashlib, html, json, os, re, sys, urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_KB = 600
PAGES = ["index.html", "cientificamente.html"] + sorted(glob.glob(os.path.join(ROOT, "sections", "*.html")))
PAGES = [os.path.relpath(p, ROOT) if os.path.isabs(p) else p for p in PAGES]
REF = re.compile(r'''(?:src|href|data-src)\s*=\s*(["'])(.*?)\1''')
JSON_IMG = re.compile(r'"(?:image|src)"\s*:\s*"([^"]+\.(?:jpe?g|png|webp|svg|gif))"')

errors, warnings, used = [], [], set()


def local(ref):
    ref = html.unescape(ref.strip())
    if not ref or re.match(r"^(https?:|mailto:|tel:|data:|javascript:|//)", ref):
        return None
    return urllib.parse.unquote(ref.split("?")[0])


for page in PAGES:
    text = open(os.path.join(ROOT, page), encoding="utf-8").read()
    # sections are injected into index.html, so their paths are relative to the site root
    for ref in [m[1].split('#')[0] for m in REF.findall(text)] + JSON_IMG.findall(text):
        path = local(ref)
        if not path:
            continue
        used.add(path)
        if not os.path.exists(os.path.join(ROOT, path)):
            errors.append(f"{page}: missing file '{path}'")
    for m in re.finditer(r'<script type="application/json"[^>]*>(.*?)</script>', text, re.S):
        try:
            json.loads(m.group(1))
        except Exception as e:
            errors.append(f"{page}: invalid JSON block ({e})")

# ---------------------------------------------------------------- data files
DATE = re.compile(r"^\d{4}(-\d{2}){0,2}$")


def need_file(where, path):
    path = local(path or "")
    if not path:
        return
    used.add(path)
    if not os.path.exists(os.path.join(ROOT, path)):
        errors.append(f"{where}: missing file '{path}'")


def load_json(rel):
    try:
        with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        errors.append(f"{rel}: not valid JSON ({e})")


news = load_json("data/news.json")
if news is not None:
    if not isinstance(news, list):
        errors.append("data/news.json: must be a list [ ... ] of news items")
    else:
        for i, n in enumerate(news, 1):
            where = f"data/news.json item {i}"
            if not DATE.match(str(n.get("date", ""))):
                errors.append(f"{where}: date must look like 2026, 2026-08 or 2026-08-01")
            if not (n.get("text") or {}).get("en"):
                errors.append(f"{where}: needs \"text\": {{\"en\": ...}}")
            if n.get("href") and not re.match(r"^https?://", n["href"]):
                errors.append(f"{where}: href must start with https://")
            need_file(where, (n.get("media") or {}).get("src"))

tree = load_json("data/tree.json")
if tree is not None:
    def walk(node, path):
        if not node.get("name"):
            errors.append(f"data/tree.json: a person under {path} has no name")
        need_file(f"data/tree.json ({node.get('name')})", node.get("photo"))
        for m in node.get("mentors", []):
            walk(m, node.get("name"))
    if not isinstance(tree.get("root"), dict):
        errors.append("data/tree.json: needs a \"root\" person")
    else:
        walk(tree["root"], "root")

# ---------------------------------------------------------------- security policy
FIX = "--fix" in sys.argv
CSP = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")([^"]*)(")')
INLINE = re.compile(r"<script(?![^>]*\bsrc=)(?![^>]*type=\"application/(?:ld\+)?json\")[^>]*>(.*?)</script>", re.S)
for page in PAGES:
    text = open(os.path.join(ROOT, page), encoding="utf-8").read()
    m = re.search(r"""\son[a-z]+\s*=\s*["']""", re.sub(r"<script.*?</script>", "", text, flags=re.S))
    if m:
        errors.append(f"{page}: inline event handler ({m.group(0).strip()}...) is blocked by the security policy; "
                      "use addEventListener in script.js instead")
    if page.startswith("sections"):
        continue
    csp = CSP.search(text)
    if not csp:
        errors.append(f"{page}: no Content-Security-Policy <meta> tag")
        continue
    hashes = ["'sha256-%s'" % base64.b64encode(hashlib.sha256(b.encode("utf-8")).digest()).decode()
              for b in INLINE.findall(re.sub(r"<!--.*?-->", "", text, flags=re.S))]
    policy = csp.group(2)
    have = re.findall(r"'sha256-[^']+'", policy)
    if sorted(have) != sorted(hashes):
        if FIX:
            new = re.sub(r"\s*'sha256-[^']+'", "", policy)
            new = re.sub(r"(script-src [^;]*)", lambda x: x.group(1) + " " + " ".join(hashes), new, count=1)
            with open(os.path.join(ROOT, page), "w", encoding="utf-8") as f:
                f.write(text[:csp.start(2)] + new + text[csp.end(2):])
            print(f"fixed: {page} security policy now lists {len(hashes)} inline script(s)")
        else:
            errors.append(f"{page}: an inline <script> changed, so the security policy would block it. "
                          "Run:  python tools/check_site.py --fix")

for js in ("script.js", "search.js"):
    for ref in re.findall(r'["\'](images/[^"\']+\.(?:jpe?g|png|webp|svg))["\']', open(os.path.join(ROOT, js), encoding="utf-8").read()):
        used.add(ref)
        if not os.path.exists(os.path.join(ROOT, ref)):
            errors.append(f"{js}: missing file '{ref}'")

for path in sorted(used):
    full = os.path.join(ROOT, path)
    if os.path.isfile(full) and path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif")):
        kb = os.path.getsize(full) // 1024
        if kb > MAX_KB:
            errors.append(f"image too heavy: {path} is {kb} KB (limit {MAX_KB} KB) - resize it to at most 1600 px")

for w in warnings:
    print("warning:", w)
if errors:
    print("\n".join("ERROR: " + e for e in errors))
    print(f"\n{len(errors)} problem(s) found.")
    sys.exit(1)
print(f"OK - {len(PAGES)} pages, {len(used)} local files checked.")
