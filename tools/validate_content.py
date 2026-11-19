#!/usr/bin/env python3
"""Schema and cross-page validation for site-maintained JSON and HTML."""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors = []


def load_json(rel):
    path = os.path.join(ROOT, rel)
    try:
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        errors.append(f"{rel}: invalid JSON ({exc})")
        return None


def localized(record, fields, rel):
    for field in fields:
        value = record.get(field)
        if not isinstance(value, dict) or not isinstance(value.get("en"), str) or not value["en"].strip():
            errors.append(f"{rel}: needs a non-empty English '{field}'")
        if isinstance(value, dict) and "pt" in value:
            if not isinstance(value.get("pt"), str) or not value["pt"].strip():
                errors.append(f"{rel}: '{field}.pt' must be a non-empty string")


def items_file(rel, fields):
    data = load_json(rel)
    if data is not None:
        items = data.get("items")
        if not isinstance(items, list):
            errors.append(f"{rel}: needs an 'items' list")
        else:
            for number, item in enumerate(items, 1):
                if not isinstance(item, dict):
                    errors.append(f"{rel}: item {number} must be an object")
                    continue
                localized(item, fields, f"{rel} item {number}")


items_file("data/presentations.json", ("title", "meta"))
items_file("data/education.json", ("title", "meta"))
items_file("data/experience.json", ("title", "meta"))
items_file("data/courses.json", ("title", "meta"))

news = load_json("data/news.json")
if isinstance(news, list):
    for number, item in enumerate(news, 1):
        rel = f"data/news.json item {number}"
        if not isinstance(item, dict):
            errors.append(f"{rel}: must be an object")
            continue
        localized(item, ("text",), rel)
        media = item.get("media")
        if media is not None:
            if not isinstance(media, dict) or not isinstance(media.get("src"), str):
                errors.append(f"{rel}: media needs a 'src' string")
            elif media["src"] and not os.path.exists(os.path.join(ROOT, media["src"])):
                errors.append(f"{rel}: missing media '{media['src']}'")

blog = load_json("data/blog.json")
if isinstance(blog, dict):
    posts = blog.get("posts")
    if not isinstance(posts, list):
        errors.append("data/blog.json: needs a 'posts' list")
    else:
        for number, post in enumerate(posts, 1):
            rel = f"data/blog.json post {number}"
            localized(post, ("title", "summary"), rel)
            body = post.get("body")
            if body is not None and not isinstance(body, dict):
                errors.append(f"{rel}: body must be a localized object")

publications = load_json("data/publications.json")
if isinstance(publications, dict):
    works = publications.get("works")
    if not isinstance(works, list):
        errors.append("data/publications.json: needs a 'works' list")
    else:
        for number, work in enumerate(works, 1):
            if not isinstance(work, dict):
                errors.append(f"data/publications.json work {number}: must be an object")
            elif not work.get("doi") or not work.get("title") or not work.get("year"):
                errors.append(f"data/publications.json work {number}: needs doi, title and year")

for path in glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True):
    rel = os.path.relpath(path, ROOT).replace("\\", "/")
    if "/design-system/" in rel or "/_ds/" in rel:
        continue
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    ids = re.findall(r'\bid=["\']([^"\']+)["\']', text, re.I)
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    for duplicate in duplicates:
        errors.append(f"{rel}: duplicate id '{duplicate}'")
    for match in re.finditer(r'<img\b[^>]*>', text, re.I):
        tag = match.group(0)
        if not re.search(r'\balt\s*=', tag, re.I):
            errors.append(f"{rel}: image without alt attribute: {tag[:100]}")

if errors:
    print("\n".join("ERROR: " + error for error in errors))
    print(f"{len(errors)} content validation problem(s) found.")
    sys.exit(1)
print("Content validation OK.")
