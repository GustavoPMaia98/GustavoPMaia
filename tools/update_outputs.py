#!/usr/bin/env python3
"""Datasets and code for the "Data & code" section.

  * data/datasets.json: records on Zenodo (free, gives DOIs) with my ORCID among the
    creators: datasets, software, posters, presentations.
  * data/repos.json: my public GitHub repositories (forks left out), newest first.

Run by .github/workflows/update-data.yml every night, or by hand:
    python tools/update_outputs.py
A source that cannot be reached leaves its file as it was. Standard-library Python only.
On GitHub Actions, GITHUB_TOKEN raises GitHub's rate limit (not required).
"""
import json, os, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORCID = "0000-0001-5314-8816"
GITHUB_USER = "GustavoPMaia98"
UA = "GustavoPMaia-site/1.0 (+https://gustavopmaia98.github.io/GustavoPMaia/)"


def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def write(name, data):
    path = os.path.join(ROOT, "data", name)
    try:
        with open(path, encoding="utf-8") as f:
            if json.load(f) == data:
                print(name, "unchanged")
                return
    except Exception:
        pass
    with open(path, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print("Wrote", name)


def zenodo():
    q = urllib.parse.quote(f'creators.orcid:"{ORCID}"')
    hits = get(f"https://zenodo.org/api/records?q={q}&size=50&sort=mostrecent")["hits"]["hits"]
    items = []
    for h in hits:
        m = h.get("metadata", {})
        items.append({
            "title": m.get("title", ""),
            "type": (m.get("resource_type") or {}).get("title") or (m.get("resource_type") or {}).get("type", ""),
            "date": m.get("publication_date", ""),
            "doi": h.get("doi") or m.get("doi", ""),
            "url": (h.get("links") or {}).get("self_html") or f"https://zenodo.org/records/{h.get('id')}",
            "creators": [c.get("name", "") for c in m.get("creators", [])][:12],
            "license": (m.get("license") or {}).get("id", ""),
        })
    return {"_help": "Made by tools/update_outputs.py from Zenodo (records with my ORCID). Do not edit by hand.", "items": items}


def github():
    h = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        h["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    repos = get(f"https://api.github.com/users/{GITHUB_USER}/repos?per_page=100&sort=pushed", h)
    items = [{"name": r["name"], "description": r.get("description") or "", "url": r["html_url"],
              "homepage": r.get("homepage") or "", "language": r.get("language") or "",
              "stars": r.get("stargazers_count", 0), "pushed": (r.get("pushed_at") or "")[:10],
              "topics": r.get("topics") or []}
             for r in repos if not r.get("fork") and not r.get("archived") and not r.get("private")]
    return {"_help": "Made by tools/update_outputs.py from my public GitHub repositories. Do not edit by hand.", "items": items}


def main():
    for name, fn in (("datasets.json", zenodo), ("repos.json", github)):
        try:
            write(name, fn())
        except Exception as e:
            print(f"warning: {name} not updated ({e})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
