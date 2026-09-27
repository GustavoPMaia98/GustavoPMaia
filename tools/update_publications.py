#!/usr/bin/env python3
"""Refresh data/publications.json from OpenAlex (+ Crossref for page ranges).

Run by .github/workflows/update-publications.yml every night, or by hand:
    python tools/update_publications.py

The website reads data/publications.json to
  * add any new journal article that is not yet written in sections/publications.html,
  * show "Cited by N" under each paper,
  * offer ready-made BibTeX / APA citations ("Cite" button).
Only standard-library Python is used, so no install step is needed.
"""
import json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

ORCID = "0000-0001-5314-8816"
MAILTO = "gustavopinho.maia@mnhn.fr"          # OpenAlex / Crossref "polite pool"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "publications.json")
PARTICLES = {"da", "de", "do", "dos", "das", "di", "del", "van", "von", "der", "den", "la", "le"}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": f"GustavoPMaia-site (mailto:{MAILTO})"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # network hiccup: retry, then give up
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def ascii_key(s):
    return re.sub(r"[^a-z]", "", unicodedata.normalize("NFD", s).lower())


def bibtex(w):
    authors = " and ".join(w["authors_list"]) or "Maia, Gustavo P."
    first = ascii_key((w["authors_list"][0].split(",")[0].split()[-1]) if w["authors_list"] else "maia")
    key = f"{first}{w['year'] or ''}{ascii_key((w['title'].split() or [''])[0])}"
    fields = [("title", "{" + w["title"] + "}"), ("author", authors), ("journal", w["journal"]),
              ("year", w["year"]), ("volume", w["volume"]), ("number", w["issue"]),
              ("pages", w["pages"]), ("doi", w["doi"])]
    body = ",\n".join(f"  {k} = {{{v}}}" for k, v in fields if v)
    return f"@article{{{key},\n{body}\n}}"


def apa(w):
    names = []
    for a in w["authors_list"]:
        last, _, given = a.partition(", ")
        initials = " ".join(p[0] + "." for p in re.split(r"[\s-]+", given) if p)
        names.append(f"{last}, {initials}".strip(", "))
    if len(names) > 20:
        names = names[:19] + ["…", names[-1]]
    au = names[0] if len(names) == 1 else ", ".join(names[:-1]) + ", & " + names[-1] if names else ""
    vol = f", {w['volume']}" + (f"({w['issue']})" if w["issue"] else "") if w["volume"] else ""
    pg = f", {w['pages']}" if w["pages"] else ""
    return f"{au} ({w['year'] or 'n.d.'}). {w['title']}. {w['journal']}{vol}{pg}. https://doi.org/{w['doi']}"


def main():
    old = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            prev = json.load(f)
        old = {w["doi"].lower(): w for w in prev.get("works", [])}

    url = ("https://api.openalex.org/works?per-page=200&mailto=" + MAILTO +
           "&filter=" + urllib.parse.quote(f"author.orcid:{ORCID},type:article"))
    res = get(url)
    works = []
    for it in res.get("results", []):
        doi = (it.get("doi") or "").replace("https://doi.org/", "")
        loc = it.get("primary_location") or {}
        src = loc.get("source") or {}
        if not doi or src.get("type") == "repository" or loc.get("version") == "submittedVersion" and src.get("type") != "journal":
            continue                                   # journal versions only, no preprints
        b = it.get("biblio") or {}
        pages = "–".join(p for p in (b.get("first_page"), b.get("last_page")) if p) or ""
        authors = []
        for au in it.get("authorships", []):
            name = (au.get("author") or {}).get("display_name") or ""
            parts = name.split()
            cut = len(parts) - 1                       # keep "da Silva", "van der Berg" together
            while cut > 1 and parts[cut - 1].lower() in PARTICLES:
                cut -= 1
            authors.append(f"{' '.join(parts[cut:])}, {' '.join(parts[:cut])}" if len(parts) > 1 else name)
        w = {
            "doi": doi,
            "title": re.sub(r"<[^>]+>", "", it.get("title") or ""),
            "year": it.get("publication_year"),
            "journal": src.get("display_name") or "",
            "volume": b.get("volume") or "",
            "issue": b.get("issue") or "",
            "pages": pages,
            "authors_list": authors,
            "authors": ", ".join(" ".join(reversed(a.split(", "))) for a in authors),
            "cited_by": it.get("cited_by_count", 0),
        }
        keep = old.get(doi.lower(), {})
        if keep.get("hidden"):
            w["hidden"] = True                         # hand-set flag survives refreshes
        w["bibtex"] = bibtex(w)
        w["apa"] = apa(w)
        works.append(w)

    if not works:
        print("OpenAlex returned no works; keeping the existing file.")
        return 0
    works.sort(key=lambda w: (-(w["year"] or 0), w["title"]))
    try:
        author = get(f"https://api.openalex.org/authors/orcid:{ORCID}?mailto={MAILTO}")
        stats = author.get("summary_stats") or {}
    except Exception:
        stats = {}
    data = {
        "source": "OpenAlex (https://openalex.org) for ORCID " + ORCID,
        "h_index_openalex": stats.get("h_index"),
        "citations_openalex": author.get("cited_by_count") if stats else None,
        "works": works,
    }
    new = json.dumps(data, ensure_ascii=False, indent=1)
    cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    if json.loads(cur or "{}").get("works") == works and cur:
        print("No change.")
        return 0
    data["updated"] = time.strftime("%Y-%m-%d")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {len(works)} works to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
