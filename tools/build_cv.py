#!/usr/bin/env python3
"""Turn cv.html into cv.pdf (English) and cv-pt.pdf (Portuguese).

Run by .github/workflows/update-data.yml every night, or by hand:
    pip install playwright && python -m playwright install chromium
    python tools/build_cv.py            # rebuild only when the CV text changed
    python tools/build_cv.py --force    # rebuild anyway

cv.html assembles itself from the website's own files, so the PDFs follow every
change to the site. To avoid a new commit every night, a PDF is only rebuilt when
the CV's text differs from the last build (fingerprints kept in data/cv-build.json).
"""
import hashlib, http.server, json, os, socketserver, sys, threading, time
from functools import partial

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "data", "cv-build.json")
OUT = {"en": "cv.pdf", "pt": "cv-pt.pdf"}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def serve():
    httpd = socketserver.TCPServer(("127.0.0.1", 0), partial(Quiet, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    force = "--force" in sys.argv
    from playwright.sync_api import sync_playwright
    state = {}
    if os.path.exists(STATE):
        with open(STATE, encoding="utf-8") as f:
            state = json.load(f)
    httpd = serve()
    base = f"http://127.0.0.1:{httpd.server_address[1]}/cv.html"
    changed = False
    with sync_playwright() as p:
        exe = os.environ.get("CHROMIUM_PATH")             # optional: use an already installed Chromium
        browser = p.chromium.launch(**({"executable_path": exe} if exe else {}))
        for lang, out in OUT.items():
            page = browser.new_page()
            page.goto(f"{base}?lang={lang}", wait_until="networkidle")
            page.wait_for_function("document.documentElement.dataset.cvReady === '1'", timeout=30000)
            page.evaluate("document.fonts.ready")
            # the "Generated on <date>" line is left out of the fingerprint
            body = page.evaluate("""() => { const c = document.getElementById('cv').cloneNode(true);
                                           c.querySelectorAll('.cv-foot').forEach(e => e.remove());
                                           return c.innerText; }""")
            # rebuild too if the web fonts were missing last time (e.g. no network)
            fonts = page.evaluate("""() => ['Fraunces', 'Manrope'].every(n =>
                [...document.fonts].some(f => f.family.replace(/"/g, '') === n && f.status === 'loaded'))""")
            digest = hashlib.sha256((body + f"|fonts={fonts}").encode("utf-8")).hexdigest()
            path = os.path.join(ROOT, out)
            if force or state.get(lang) != digest or not os.path.exists(path):
                page.emulate_media(media="print")
                page.pdf(path=path, format="A4", print_background=True, prefer_css_page_size=True)
                state[lang] = digest
                changed = True
                print(f"Built {out}")
            else:
                print(f"{out}: CV unchanged")
            page.close()
        browser.close()
    httpd.shutdown()
    if changed:
        state["built"] = time.strftime("%Y-%m-%d")
        with open(STATE, "w", encoding="utf-8") as f:
            f.write(json.dumps(state, indent=1) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
