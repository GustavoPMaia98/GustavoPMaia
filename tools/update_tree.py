#!/usr/bin/env python3
"""Keep the Academic Tree (data/tree.json) in step with Chemistry Tree.

Run by .github/workflows/sync-tree.yml every 3 hours, or by hand:
    python tools/update_tree.py            # update data/tree.json
    python tools/update_tree.py --dry-run  # only print what would change

How it works. Starting from my own Chemistry Tree page (pid 972410), it reads the
"Parents" (mentors) listed on academictree.org for each person in the tree that has
an "academictree" number, and:

  * links people who are already in the tree to their Chemistry Tree number (matched
    by name), so their own mentors can be followed next time;
  * adds mentors who are missing, with initials, a role ("Doctoral advisor of …",
    both in English and Portuguese) and their institution, so they get the same
    card, colours and layout as everybody else. New people are only added up to
    MAX_NEW_GENERATION (2 = my mentors and their mentors) so the tree does not grow
    a century of ancestors on its own; deeper generations stay hand-picked;
  * keeps the people it added itself ("source": "academictree") in step: a new
    name, relationship or institution on Chemistry Tree is copied over, and one
    removed from Chemistry Tree is removed here too.

People written by hand (no "source") are never changed or removed: only linked to
their Chemistry Tree number. To get rid of an added person for good, set
"hidden": true on them in data/tree.json; to give them a photo, add
"photo": "images/tree/<file>". If academictree.org cannot be reached or its page
layout changes, the file is left exactly as it is. Standard-library Python only.
"""
import argparse, html, json, os, re, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TREE = os.path.join(ROOT, "data", "tree.json")
BASE = "https://academictree.org/chemistry/"
MAX_DEPTH = 4             # follow Chemistry Tree links this many generations up
MAX_NEW_GENERATION = 2    # add missing people only up to this generation (1 = my mentors)
UA = "GustavoPMaia-site/1.0 (+https://gustavopmaia98.github.io/GustavoPMaia/; academic tree sync)"

ROLES = {   # Chemistry Tree relationship -> (English, Portuguese)
    "grad":     ("Doctoral advisor", "Orientador de doutoramento"),
    "postdoc":  ("Postdoctoral mentor", "Mentor de pós-doutoramento"),
    "research": ("Research mentor", "Mentor de investigação"),
    "other":    ("Mentor", "Mentor"),
}
PARTICLES = {"da", "de", "do", "dos", "das", "di", "del", "van", "von", "der", "la", "le"}


def plain(s):
    return unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()


TITLES = {"prof", "profa", "dr", "dra", "eng", "engo", "mr", "mrs", "ms"}


def words(name):
    """Name words without titles ("Eng. Carlos Amorim" -> carlos, amorim)."""
    return [w for w in re.split(r"[\s.\-]+", plain(name)) if w and w not in TITLES]


def same_person(a, b):
    """Same surname and same first initial ("José Armando L. da Silva" ~ "Jose A. Silva")."""
    wa, wb = words(a), words(b)
    if not wa or not wb:
        return False
    return wa[-1] == wb[-1] and wa[0][0] == wb[0][0]


def short_name(name):
    """'Stanley Lloyd Miller' -> 'S. L. Miller', 'José Armando L. da Silva' -> 'J. A. L. da Silva'."""
    parts = name.split()
    if len(parts) < 2:
        return name
    i = len(parts) - 1
    while i > 1 and parts[i - 1].lower() in PARTICLES:
        i -= 1
    return " ".join([p[0] + "." for p in parts[:i]] + parts[i:])


def kind(rel):
    r = plain(rel)
    if re.search(r"grad|phd|doctor|thesis", r):
        return "grad"
    if re.search(r"post.?doc", r):
        return "postdoc"
    if re.search(r"research|assistant|scientist|technician|undergrad", r):
        return "research"
    return "other"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read(3_000_000).decode("utf-8", "replace")


def cell_text(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse_parents(page):
    """[(pid, name, relationship, institution)] from a peopleinfo.php page.

    Only the block between the "Parents" heading and the next heading is read."""
    m = re.search(r">\s*Parents\s*<(.*?)(?:<h[1-6]\b|>\s*(?:Children|Collaborators)\s*<|$)", page, re.S | re.I)
    if not m:
        return []
    block = m.group(1)
    out, seen = [], set()
    rows = re.findall(r"<tr\b.*?</tr>", block, re.S | re.I) or re.split(r"<br\s*/?>|</li>|</div>", block)
    for row in rows:
        a = re.search(r'peopleinfo\.php\?pid=(\d+)[^>]*>(.*?)</a>', row, re.S)
        if not a or a.group(1) in seen:
            continue
        seen.add(a.group(1))
        cells = [cell_text(c) for c in re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S | re.I)] or [cell_text(row)]
        rest = [c for c in cells if c and c != cell_text(a.group(2))]
        rel = next((c for c in rest if re.search(r"grad|post|doc|research|assistant|thesis|student|mentor|collab", c, re.I)), "")
        inst = next((c for c in rest if c != rel and not re.fullmatch(r"[\d\s\-–()]+|\(?[A-Z]-?Tree\)?", c)
                     and re.search(r"[A-Za-z]{3}", c)), "")
        out.append((int(a.group(1)), cell_text(a.group(2)), rel, inst))
    return out


def new_node(pid, name, rel, inst, child, depth):
    en, pt = ROLES[kind(rel)]
    if depth > 1:                                  # "Doctoral advisor of S. L. Miller"
        en, pt = f"{en} of {short_name(child)}", f"{pt} de {short_name(child)}"
    node = {"name": name, "url": f"{BASE}peopleinfo.php?pid={pid}", "role": {"en": en, "pt": pt},
            "academictree": pid, "source": "academictree"}
    if inst:
        node["institution"] = {"name": inst, "url": ""}
    return node


def sync(node, depth, get, log, visited):
    pid = node.get("academictree")
    if not pid or depth >= MAX_DEPTH or pid in visited or node.get("hidden"):
        return
    visited.add(pid)
    try:
        parents = parse_parents(get(f"{BASE}peopleinfo.php?pid={pid}"))
    except Exception as e:
        log.append(f"  could not read {node['name']} (pid {pid}): {e}")
        return
    if len(parents) > 8:                            # page layout changed: do not guess
        log.append(f"  {node['name']}: {len(parents)} 'parents' found, looks wrong; skipped")
        return
    time.sleep(1)                                   # be gentle with academictree.org
    mentors = node.setdefault("mentors", [])
    for ppid, name, rel, inst in parents:
        match = next((m for m in mentors if m.get("academictree") == ppid), None) or \
                next((m for m in mentors if not m.get("academictree") and same_person(m.get("name"), name)), None)
        if match:
            if not match.get("academictree"):
                match["academictree"] = ppid
                log.append(f"  linked {match['name']} -> Chemistry Tree {ppid}")
            if match.get("source") == "academictree":      # added by this script: follow Chemistry Tree
                fresh = new_node(ppid, name, rel, inst, node["name"], depth + 1)
                for k in ("name", "role", "institution"):
                    if k == "role" and not rel or k == "institution" and not inst:
                        continue                            # nothing on the page: keep what we have
                    if fresh.get(k) and fresh[k] != match.get(k) and \
                       not (k == "institution" and fresh[k]["name"] == (match.get(k) or {}).get("name")):
                        match[k] = fresh[k]
                        log.append(f"  updated the {k} of {match['name']}")
        elif depth + 1 <= MAX_NEW_GENERATION:
            mentors.append(new_node(ppid, name, rel, inst, node["name"], depth + 1))
            log.append(f"  added {name} ({rel or 'mentor'}) as mentor of {node['name']}")
    # mentors this script added that are no longer on Chemistry Tree (hidden ones stay:
    # "hidden" is a hand-made decision)
    on_page = {p[0] for p in parents}
    if parents:
        for m in [m for m in mentors if m.get("source") == "academictree" and not m.get("hidden")
                  and m.get("academictree") and m["academictree"] not in on_page]:
            mentors.remove(m)
            log.append(f"  removed {m['name']}: no longer a mentor of {node['name']} on Chemistry Tree")
    if not mentors:
        del node["mentors"]
    for m in node.get("mentors", []):
        sync(m, depth + 1, get, log, visited)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    with open(TREE, encoding="utf-8") as f:
        before = f.read()
    data = json.loads(before)
    log = []
    sync(data["root"], 0, fetch, log, set())
    after = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    print("\n".join(log) or "Chemistry Tree: nothing new.")
    if after != before and not a.dry_run:
        with open(TREE, "w", encoding="utf-8") as f:
            f.write(after)
        print("Wrote data/tree.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
