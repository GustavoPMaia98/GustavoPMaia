#!/usr/bin/env python3
"""Find and verify Gustavo P. Maia's journal articles -> data/publications.json

Run by .github/workflows/update-publications.yml every night, or by hand:
    python tools/update_publications.py

Why verification: indexing services match papers by NAME, so a namesake's paper
(e.g. an education paper from Salvador/BA) can be attributed to "Gustavo P. Maia".
Every candidate therefore has to pass ALL of these checks before it is listed:

  1. It is a peer-reviewed journal article (no preprints, posters, datasets).
  2. The author list contains Gustavo P. Maia (surname Maia, first name Gustavo / G.).
  3. It is in my field: chemistry, astrobiology, prebiotic chemistry, meteoritics or
     planetary science (checked on title, journal, subjects, abstract and OpenAlex topics).
  4. Identity is confirmed by at least one of:
       - my ORCID iD is attached to the author entry in the publisher metadata, or
       - the paper is listed on my ORCID record, or
       - it shares a co-author with my known collaborators.

Candidates come from my ORCID record, Crossref (ORCID filter) and OpenAlex (ORCID
filter). Rejected candidates are printed in the GitHub Action log with the reason.
To block a paper for good, add its DOI to EXCLUDE. Standard-library Python only.
"""
import json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request

ORCID = "0000-0001-5314-8816"
MAILTO = "gustavopinho.maia@mnhn.fr"          # Crossref / OpenAlex "polite pool"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "publications.json")

# Papers that must never appear (namesakes, misattributions).
EXCLUDE = {
    "10.55905/cuadv16n8-126",   # "Educação e direitos de estudantes com deficiência…" (not mine)
}

# Preprint servers (Preprints.org, ChemRxiv, bioRxiv, Research Square, EarthArXiv,
# Authorea, arXiv, SSRN, OSF, ESS Open Archive): never listed as papers.
PREPRINT = re.compile(r"^10\.(20944|26434|1101|21203|31223|22541|48550|2139|31219|1002/essoar)\b", re.I)

# Words that place a paper in my field (matched without accents, case-insensitive).
FIELD = re.compile(r"""\b(
    chemi\w* | quimic\w* | chimi\w* | mechanochem\w* | mecanoquim\w* | astrobiolog\w* |
    prebiot\w* | origin\s+of\s+life | origem\s+da\s+vida | meteorit\w* | chondrit\w* |
    asteroid\w* | comet\w* | planetary | cosmochem\w* | geochem\w* | extraterrestrial |
    organic\s+matter | nucleo(side|base|tide)s? | ribonucleo\w* | ribose | amino\s+acids? |
    hexamethylenetetramine | montmorillonite | spectrometr\w* | chromatograph\w* |
    isotop\w* | bioinorganic | mineral\s+catalys\w* | guanosine | uridine | adenosine | cytidine |
    guanine | uracil | adenine | cytosine | thymine | purine\w* | pyrimidine\w*
)\b""", re.I | re.X)
# Journals of my field (matched on the journal name, accents removed).
FIELD_JOURNALS = {"molecules", "earth and planetary science letters", "meteoritics & planetary science",
                  "geochimica et cosmochimica acta", "icarus", "astrobiology", "life",
                  "origins of life and evolution of biospheres", "the planetary science journal",
                  "acs earth and space chemistry", "boletim da sociedade portuguesa de quimica"}
FIELD_TOPICS = {"chemistry", "earth and planetary sciences", "physical and theoretical chemistry",
                "organic chemistry", "inorganic chemistry", "analytical chemistry", "geochemistry",
                "astronomy and astrophysics", "space and planetary science", "biochemistry"}

# Co-authors I have published with (surnames, accents removed).
COAUTHORS = {"silva", "remusat", "dworkin", "galvao", "andre", "ribeiro", "pinheiro", "franco",
             "amano", "viennet", "mclain", "goncalves", "carvalho"}


def plain(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower().strip()


def get(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json",
                                               "User-Agent": f"GustavoPMaia-site (mailto:{MAILTO})"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == 2:
                raise
        except Exception:
            if attempt == 2:
                raise
        time.sleep(3 * (attempt + 1))


def clean_doi(d):
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", (d or "").strip()).lower()


# ------------------------------------------------------------------ candidates
def from_orcid():
    data = get(f"https://pub.orcid.org/v3.0/{ORCID}/works") or {}
    dois = set()
    for g in data.get("group", []):
        s = (g.get("work-summary") or [{}])[0]
        if (s.get("type") or "").lower() != "journal-article":
            continue
        ids = ((g.get("external-ids") or {}).get("external-id") or []) + \
              ((s.get("external-ids") or {}).get("external-id") or [])
        for i in ids:
            if (i.get("external-id-type") or "").lower() == "doi":
                d = clean_doi(i.get("external-id-value"))
                if d and not PREPRINT.match(d):
                    dois.add(d)
    return dois


def from_crossref():
    data = get(f"https://api.crossref.org/works?filter=orcid:{ORCID},type:journal-article&rows=200&mailto={MAILTO}") or {}
    return {clean_doi(i.get("DOI")) for i in (data.get("message") or {}).get("items", []) if i.get("DOI")}


def from_openalex():
    url = ("https://api.openalex.org/works?per-page=200&mailto=" + MAILTO +
           "&filter=" + urllib.parse.quote(f"author.orcid:{ORCID},type:article"))
    data = get(url) or {}
    return {clean_doi(w.get("doi")) for w in data.get("results", []) if w.get("doi")}


# ------------------------------------------------------------------ verification
def crossref_meta(doi):
    return ((get("https://api.crossref.org/works/" + urllib.parse.quote(doi) + "?mailto=" + MAILTO) or {})
            .get("message")) or None


def openalex_topics(doi):
    try:
        w = get("https://api.openalex.org/works/doi:" + urllib.parse.quote(doi) + "?mailto=" + MAILTO) or {}
    except Exception:
        return []
    out = []
    for t in (w.get("topics") or []):
        out.append(t.get("display_name", ""))
        for k in ("subfield", "field", "domain"):
            out.append((t.get(k) or {}).get("display_name", ""))
    return [x for x in out if x]


def is_me(author):
    fam, giv = plain(author.get("family")), plain(author.get("given"))
    if fam.split()[-1:] == ["maia"] and (giv.startswith("gustavo") or re.match(r"^g\.?(\s|$)", giv)):
        return True
    return bool(re.search(r"\bgustavo\b.*\bmaia\b", plain(author.get("name"))))


def verify(doi, sources):
    """Return (entry or None, reason)."""
    if doi in EXCLUDE:
        return None, "on the EXCLUDE list"
    if PREPRINT.match(doi):
        return None, "preprint"
    m = crossref_meta(doi)
    if not m:
        return None, "no Crossref record"
    if (m.get("type") or "") != "journal-article":
        return None, f"not a journal article ({m.get('type')})"
    authors = m.get("author") or []
    mine = [a for a in authors if is_me(a) or ORCID in (a.get("ORCID") or "")]
    if not mine:
        return None, "Gustavo P. Maia is not in the author list"
    orcid_linked = any(ORCID in (a.get("ORCID") or "") for a in authors)
    title = re.sub(r"<[^>]+>", " ", (m.get("title") or [""])[0]).strip()
    journal = (m.get("container-title") or [""])[0].strip()
    abstract = re.sub(r"<[^>]+>", " ", m.get("abstract") or "")
    topics = openalex_topics(doi)
    text = plain(" ".join([title, journal, abstract, " ".join(m.get("subject") or []), " ".join(topics)]))
    field_ok = (bool(FIELD.search(text)) or plain(journal) in FIELD_JOURNALS
                or any(plain(t) in FIELD_TOPICS for t in topics))
    if not field_ok:
        return None, "outside chemistry / astrobiology / meteoritics"
    coauthor = any((plain(a.get("family")).split() or [""])[-1] in COAUTHORS for a in authors if a not in mine)
    on_record = "orcid" in sources
    if not (orcid_linked or on_record or coauthor):
        return None, "name and field match, but no ORCID link, ORCID listing or known co-author"
    parts = ((m.get("issued") or {}).get("date-parts") or [[None]])[0]
    return {
        "doi": doi,
        "title": title,
        "year": parts[0] if parts else None,
        "journal": journal,
        "authors": ", ".join(" ".join(p for p in (a.get("given"), a.get("family")) if p) or a.get("name", "")
                             for a in authors),
        "verified": [x for x, ok in (("orcid-id-on-paper", orcid_linked), ("on-orcid-record", on_record),
                                     ("known-coauthor", coauthor)) if ok],
    }, "ok"


def main():
    sources = {}
    for name, fn in (("orcid", from_orcid), ("crossref", from_crossref), ("openalex", from_openalex)):
        try:
            for d in fn():
                sources.setdefault(d, set()).add(name)
        except Exception as e:
            print(f"warning: {name} unreachable ({e})")
    if not sources:
        print("No source reachable; keeping the existing file.")
        return 0

    prev = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            prev = {w["doi"].lower(): w for w in json.load(f).get("works", [])}

    works, report = [], []
    for doi in sorted(sources):
        try:
            entry, why = verify(doi, sources[doi])
        except Exception as e:                      # network hiccup: keep what we had
            entry = prev.get(doi)
            why = f"check failed ({e})" + ("; kept previous entry" if entry else "")
        report.append(("ACCEPT" if entry else "reject", doi, ",".join(sorted(sources[doi])), why))
        if entry:
            works.append(entry)
        time.sleep(0.3)

    print("\nPublication check:")
    for r in report:
        print("  %-6s %-42s from %-22s %s" % r)

    if not works:
        print("Nothing verified; keeping the existing file.")
        return 0
    works.sort(key=lambda w: (-(w["year"] or 0), w["title"]))
    cur = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            cur = json.load(f)
    if cur.get("works") == works:
        print("No change.")
        return 0
    data = {"source": f"ORCID {ORCID}, Crossref and OpenAlex; every paper verified (author + field + identity)",
            "updated": time.strftime("%Y-%m-%d"), "works": works}
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"Wrote {len(works)} verified works to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
