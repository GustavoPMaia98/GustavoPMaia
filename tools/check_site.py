#!/usr/bin/env python3
"""Quick quality gate for the website (used by .github/workflows/site-checks.yml).

Checks:
  1. every local file referenced by the pages exists (images, scripts, styles, links)
  2. no image used by the site is heavier than MAX_KB (resize before adding!)
  3. the JSON blocks inside the sections parse
Run locally with:  python tools/check_site.py
"""
import glob, html, json, os, re, sys, urllib.parse

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
