#!/usr/bin/env python3
"""Refresh data/publications.json from your ORCID record (+ Crossref details).

Run by .github/workflows/update-publications.yml every night, or by hand:
    python tools/update_publications.py

Only journal articles listed on ORCID 0000-0001-5314-8816 are used, so the
site never picks up someone else's paper. The website adds any article from
this file that is not yet written in sections/publications.html.

To hide a paper for good, add its DOI to EXCLUDE below.
Only standard-library Python is used, so no install step is needed.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

ORCID = "0000-0001-5314-8816"
MAILTO = "gustavopinho.maia@mnhn.fr"          # Crossref "polite pool"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "publications.json")

# DOI prefixes of preprint servers (Preprints.org, ChemRxiv, bioRxiv, Research Square,
# EarthArXiv, Authorea, arXiv, SSRN, OSF, ESS Open Archive): never listed as papers.
PREPRINT = re.compile(r"^10\.(20944|26434|1101|21203|31223|22541|48550|2139|31219|1002/essoar)\b", re.I)

# DOIs that must never appear on the site (e.g. papers by a namesake).
EXCLUDE = {
    "10.55905/cuadv16n8-126",   # "Educação e direitos de estudantes com deficiência…" (not mine)
}


def get(url, accept="application/json"):
    req = urllib.request.Request(url, headers={"Accept": accept,
                                               "User-Agent": f"GustavoPMaia-site (mailto:{MAILTO})"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def orcid_works():
    data = get(f"https://pub.orcid.org/v3.0/{ORCID}/works")
    works = []
    for group in data.get("group", []):
        s = (group.get("work-summary") or [{}])[0]
        if (s.get("type") or "").lower() != "journal-article":
            continue                                   # peer-reviewed articles only
        ids = ((group.get("external-ids") or {}).get("external-id") or []) + \
              ((s.get("external-ids") or {}).get("external-id") or [])
        dois = [re.sub(r"^https?://(dx\.)?doi\.org/", "", i.get("external-id-value", "")).strip()
                for i in ids if (i.get("external-id-type") or "").lower() == "doi"]
        dois = [d for d in dois if d and not PREPRINT.match(d)]   # journal version only
        doi = dois[0] if dois else ""
        if not doi or doi.lower() in EXCLUDE:
            continue
        title = (((s.get("title") or {}).get("title") or {}).get("value") or "").strip()
        journal = ((s.get("journal-title") or {}).get("value") or "").strip()
        year = (((s.get("publication-date") or {}).get("year") or {}).get("value") or "")
        works.append({"doi": doi, "title": title, "journal": journal, "year": int(year) if year else None})
    return works


def crossref(doi):
    try:
        m = get("https://api.crossref.org/works/" + urllib.parse.quote(doi) + "?mailto=" + MAILTO).get("message", {})
    except Exception:
        return {}
    parts = ((m.get("issued") or {}).get("date-parts") or [[None]])[0]
    authors = ", ".join(" ".join(p for p in (a.get("given"), a.get("family")) if p) for a in m.get("author", []))
    return {
        "title": re.sub(r"<[^>]+>", "", (m.get("title") or [""])[0]).strip(),
        "journal": (m.get("container-title") or [""])[0].strip(),
        "year": parts[0] if parts else None,
        "authors": authors,
    }


def main():
    try:
        found = orcid_works()
    except Exception as e:
        print("ORCID unreachable, keeping the existing file:", e)
        return 0
    if not found:
        print("ORCID returned no journal articles; keeping the existing file.")
        return 0
    works = []
    for w in found:
        extra = crossref(w["doi"])
        works.append({
            "doi": w["doi"],
            "title": extra.get("title") or w["title"],
            "year": extra.get("year") or w["year"],
            "journal": extra.get("journal") or w["journal"],
            "authors": extra.get("authors", ""),
        })
        time.sleep(0.3)
    works.sort(key=lambda w: (-(w["year"] or 0), w["title"]))

    cur = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            cur = json.load(f)
    if cur.get("works") == works:
        print("No change.")
        return 0
    data = {"source": f"ORCID {ORCID} (journal articles) + Crossref metadata",
            "updated": time.strftime("%Y-%m-%d"), "works": works}
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {len(works)} works to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
