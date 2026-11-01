#!/usr/bin/env python3
"""Turn notes from a "Blog draft from notes (AI)" issue into a hidden blog draft.

Run by .github/workflows/blog-draft.yml, which starts Ollama (open source) with an
open model (Mistral 7B, Apache 2.0) on GitHub's machine; nothing is sent to a paid or
closed AI service. The draft is written in English, then translated to Portuguese,
and saved in data/blog.json with "hidden": true. It goes on the website only when
the issue gets the "publish" label (or when "hidden" is removed by hand).

    python tools/blog_draft.py draft   event.json   # write the draft, print it (markdown)
    python tools/blog_draft.py publish event.json   # make the issue's draft visible
Standard-library Python only. OLLAMA_MODEL picks another model (default mistral:7b).
"""
import html, json, os, re, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "data", "blog.json")
MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b")
OLLAMA = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")


def form(body):
    out = {}
    for m in re.finditer(r"^###\s+(.+?)\s*\n(.*?)(?=^###\s|\Z)", body or "", re.S | re.M):
        v = m.group(2).strip()
        out[m.group(1).strip()] = "" if v == "_No response_" else v
    return out


def ask(prompt, system):
    req = urllib.request.Request(OLLAMA + "/api/generate", data=json.dumps({
        "model": MODEL, "system": system, "prompt": prompt, "stream": False, "format": "json",
        "options": {"temperature": 0.4, "num_ctx": 8192}}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=2400) as r:
        txt = json.load(r)["response"]
    return json.loads(txt)


def paras(x):
    if isinstance(x, list):
        return [str(p).strip() for p in x if str(p).strip()]
    return [p.strip() for p in re.split(r"\n\s*\n", str(x or "")) if p.strip()]


def as_html(ps):
    return "".join("<p>" + html.escape(p, quote=False) + "</p>" for p in ps)


def load():
    with open(BLOG, encoding="utf-8") as f:
        return json.load(f)


def save(data):
    with open(BLOG, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def draft(ev):
    issue = ev["issue"]
    f = form(issue.get("body", ""))
    topic, notes = f.get("Topic or working title", ""), f.get("Notes", "")
    audience = f.get("Audience", "General public") or "General public"
    system = ("You help Gustavo Pinho Maia, a PhD researcher in chemistry and astrobiology (mechanochemistry, "
              "asteroid gardening, prebiotic chemistry), write blog posts for his website. Write in the first person, "
              "clearly and warmly, without hype. Use ONLY the facts in his notes; never invent results, numbers, "
              "names or references. Reply with JSON only.")
    en = ask(f"Audience: {audience}.\nWorking title: {topic}\n\nNotes:\n{notes}\n\n"
             "Write a blog post of 4 to 6 short paragraphs. Reply as JSON: "
             '{"title": "...", "summary": "one or two sentences for the card", "paragraphs": ["...", "..."]}', system)
    en_ps = paras(en.get("paragraphs") or en.get("body"))
    pt = ask("Translate this blog post into European Portuguese (Portugal), keeping the meaning and tone. "
             "Reply as JSON with the same keys.\n\n" + json.dumps({"title": en.get("title", topic),
             "summary": en.get("summary", ""), "paragraphs": en_ps}, ensure_ascii=False),
             "You are a careful scientific translator into European Portuguese. Reply with JSON only.")
    pt_ps = paras(pt.get("paragraphs") or pt.get("body"))
    post = {"date": time.strftime("%Y-%m-%d"),
            "title": {"en": html.escape(en.get("title") or topic, quote=False), "pt": html.escape(pt.get("title") or "", quote=False)},
            "summary": {"en": html.escape(en.get("summary", ""), quote=False), "pt": html.escape(pt.get("summary", ""), quote=False)},
            "body": {"en": as_html(en_ps), "pt": as_html(pt_ps)},
            "hidden": True, "issue": issue["number"], "draft": f"AI draft ({MODEL} via Ollama), check before publishing"}
    data = load()
    data["posts"] = [p for p in data.get("posts", []) if p.get("issue") != issue["number"]]
    data["posts"].insert(0, post)
    save(data)
    md = [f"## {en.get('title') or topic}", "", f"_{en.get('summary', '')}_", ""] + [p + "\n" for p in en_ps]
    md += ["---", "", f"### {pt.get('title', '')}", "", f"_{pt.get('summary', '')}_", ""] + [p + "\n" for p in pt_ps]
    print("\n".join(md))


def publish(ev):
    n = ev["issue"]["number"]
    data = load()
    hit = [p for p in data.get("posts", []) if p.get("issue") == n]
    if not hit:
        print(f"No draft for issue #{n}.")
        return
    for p in hit:
        p.pop("hidden", None)
        p.pop("draft", None)
    save(data)
    print(f"Published “{html.unescape(hit[0]['title']['en'])}”.")


if __name__ == "__main__":
    with open(sys.argv[2] if len(sys.argv) > 2 else os.environ["GITHUB_EVENT_PATH"], encoding="utf-8") as f:
        event = json.load(f)
    (publish if sys.argv[1] == "publish" else draft)(event)
