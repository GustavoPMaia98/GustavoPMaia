#!/usr/bin/env python3
"""Write data/updated.json: when each section of the site last changed.

Run by .github/workflows/update-data.yml every night (after the other updates),
or by hand:  python tools/update_dates.py
The date of a section is the newest git commit touching its files; files changed
but not yet committed (e.g. by tonight's run) count as today. Each section then
shows a small "Updated dd/mm/yyyy" line under its heading.
"""
import json, os, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "updated.json")
SECTIONS = {                    # section id -> files it is built from
    "news": ["data/news.json", "sections/news.html"],
    "publications": ["data/publications.json", "sections/publications.html"],
    "presentations": ["data/presentations.json", "sections/presentations.html"],
    "education": ["data/education.json", "sections/education.html"],
    "experience": ["data/experience.json"],
    "courses": ["data/courses.json", "sections/courses.html"],
    "awards": ["sections/awards.html"],
    "funding": ["sections/funding.html"],
    "tree": ["data/tree.json"],
    "blog": ["data/blog.json"],
}


def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True).stdout.strip()


def main():
    today = time.strftime("%Y-%m-%d")
    dirty = set(git("status", "--porcelain").splitlines())
    dirty = {line[3:].strip() for line in dirty}
    out = {}
    for sec, files in SECTIONS.items():
        dates = [git("log", "-1", "--format=%cs", "--", f) for f in files]
        if any(f in dirty for f in files):
            dates.append(today)
        dates = [d for d in dates if d]
        if dates:
            out[sec] = max(dates)
    cur = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            cur = json.load(fh)
    if cur == out:
        print("Section dates unchanged.")
        return 0
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(out, indent=1) + "\n")
    print("Wrote data/updated.json:", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
