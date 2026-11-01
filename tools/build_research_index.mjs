#!/usr/bin/env node
/* Build data/research-index.json: the passages "Ask my research" (ask.js) searches.

   It gathers short passages from the website's own content (paper abstracts, research
   highlights, projects, talks, courses, positions, degrees, news, blog posts) and, when
   the embedding model is available, adds a 384-number "meaning vector" for each one
   (bge-small-en-v1.5, MIT licence, run with transformers.js). The browser embeds the
   visitor's question with the same model and compares meanings, so a question finds the
   right passage even when it uses other words. Without vectors the search falls back
   to matching words.

   Run by .github/workflows/research-index.yml (every night and whenever this file
   changes), or by hand:
       node tools/build_research_index.mjs              # passages + vectors
       node tools/build_research_index.mjs --no-embed   # passages only
   With vectors, the model files are also saved to vendor/models/ so the site can load
   them from its own address (no third-party requests).
   Needs Node 18+; for vectors, @huggingface/transformers 3.8.1 (the workflow installs
   it; set TRANSFORMERS to the path of its dist/transformers.node.mjs if it is not
   importable by name). */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, "data", "research-index.json");
const MODEL = "Xenova/bge-small-en-v1.5";               // MIT licence, made for search
const POOLING = "cls";
const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";   // added to questions, not passages
const embed = !process.argv.includes("--no-embed");

const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const json = f => { try { return JSON.parse(read(f)); } catch { return null; } };
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", ndash: "–", mdash: "—", hellip: "…", middot: "·" };
const decode = s => String(s || "").replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));
const text = s => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const en = v => (v && typeof v === "object" ? v.en : v) || "";
const pt = v => (v && typeof v === "object" ? v.pt : "") || "";

// split long texts into passages of a few sentences (~550 characters)
function chunks(s, max = 550) {
  s = text(s); if (s.length <= max) return s ? [s] : [];
  const out = []; let cur = "";
  for (const sent of s.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)) {
    if (cur && (cur + " " + sent).length > max) { out.push(cur); cur = sent; } else cur = cur ? cur + " " + sent : sent;
  }
  if (cur) out.push(cur);
  return out;
}

// spelled-out forms of abbreviations, added only to what the model reads, so a question
// in plain words ("worked in the United States?", "who funds...") finds them
const EXPAND = [[/\bUSA\b/g, "USA (United States, America)"], [/\bFCT\b/g, "FCT (Portuguese science funding agency)"],
  [/\bIST\b|\bTécnico\b/g, "$& (Lisbon university)"], [/\bMNHN\b/g, "MNHN (Paris natural history museum, France)"],
  [/\bIMPMC\b/g, "IMPMC (Paris, France)"], [/\bUBI\b/g, "UBI (Covilhã university, Portugal)"]];
const expand = s => EXPAND.reduce((t, [re, to]) => t.replace(re, to), s);

const passages = [];
function add(sec, title, body, extra = {}) {
  const parts = chunks(body);
  const ptParts = chunks(extra.ptBody || "");
  delete extra.ptBody;
  parts.forEach((x, i) => passages.push({ id: passages.length, sec, title: text(title), text: x,
    ...(ptParts[i] ? { pt: ptParts[i] } : {}), ...extra }));
}

// ---- publications: abstracts from sections/publications.html
const pubHTML = read("sections/publications.html");
for (const m of pubHTML.matchAll(/<div class="timeline-item publication">([\s\S]*?)(?=<div class="timeline-item publication">|<!-- Dynamically)/g)) {
  const b = m[1];
  const title = text((b.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1]);
  const meta = text((b.match(/<div class="meta">([\s\S]*?)<\/div>/) || [])[1]);
  const doi = ((b.match(/doi\.org\/([^"]+)"/) || [])[1] || "").toLowerCase();
  const exp = (b.match(/<div class="expand-body">([\s\S]*)/) || [])[1] || "";
  const ps = [...exp.matchAll(/<p(?:\s+data-pt="([^"]*)")?>([\s\S]*?)<\/p>/g)].filter(p => !/doi\.org/.test(p[2]));
  const abs = ps.map(p => p[2]).join(" "), absPt = ps.map(p => p[1] || "").join(" ");
  add("publications", title, title + ". " + meta + ". " + abs, { doi, url: doi ? "https://doi.org/" + doi : "", ptBody: absPt });
}

// ---- research highlights (the detail texts of the highlight cards)
const hl = (read("sections/highlights.html").match(/<script type="application\/json" id="hl-detail-data">([\s\S]*?)<\/script>/) || [])[1];
if (hl) {
  try {
    for (const [key, h] of Object.entries(JSON.parse(hl))) {
      add("highlights", en(h.title), [].concat(h.body?.en || []).join(" ") + " " + [].concat(h.points?.en || []).join(". "),
        { hl: key, ptBody: [].concat(h.body?.pt || []).join(" ") });
    }
  } catch (e) { console.warn("highlights: " + e.message); }
}

// ---- projects
for (const p of (json("data/projects.json")?.items || []).filter(p => !p.hidden))
  add("projects", en(p.title), en(p.title) + ". " + en(p.summary) + " " + en(p.details), { anchor: "project-" + p.id, ptBody: pt(p.summary) + " " + pt(p.details) });

// ---- talks, courses, positions, degrees
for (const [file, sec] of [["presentations", "presentations"], ["courses", "courses"], ["experience", "experience"], ["education", "education"]]) {
  for (const it of (json("data/" + file + ".json")?.items || []).filter(i => !i.hidden)) {
    const det = typeof it.details === "string" ? it.details : en(it.details);
    add(sec, en(it.title), en(it.title) + ". " + text(en(it.meta)) + ". " + text(en(it.summary)) + ". " + text(det),
      { ptBody: pt(it.title) + ". " + text(pt(it.meta)) + ". " + text(pt(it.summary)) });
  }
}

// ---- funding (grants) and awards, from their section HTML
for (const m of read("sections/funding.html").matchAll(/<div class="timeline-item">([\s\S]*?)(?=<div class="timeline-item">|<\/section>)/g)) {
  const b = m[1], title = text((b.match(/<strong>([\s\S]*?)<\/strong>/) || [])[1]);
  if (title) add("funding", title, "Funding: " + title + ". " + text(b.replace(/<strong>[\s\S]*?<\/strong>/, "")), {});
}
for (const m of read("sections/awards.html").matchAll(/<article class="award-card">([\s\S]*?)<\/article>/g)) {
  const b = m[1], title = text((b.match(/<h3 class="award-title"[^>]*>([\s\S]*?)<\/h3>/) || [])[1]);
  const pick = c => text((b.match(new RegExp('<[a-z0-9]+ class="' + c + '"[^>]*>([\\s\\S]*?)</[a-z0-9]+>')) || [])[1]);
  if (title) add("awards", title, "Award: " + title + " (" + pick("award-year") + "). " + pick("award-issuer") + ". " + pick("award-desc"), {});
}

// ---- news and blog
for (const n of (json("data/news.json") || []).filter(n => !n.hidden).slice(0, 40))
  add("news", text(en(n.text)).slice(0, 90), (n.date ? n.date + ": " : "") + text(en(n.text)), { url: n.href || "", ptBody: text(pt(n.text)) });
for (const b of (json("data/blog.json")?.posts || []).filter(b => !b.hidden))
  add("blog", en(b.title), en(b.summary) + " " + text(en(b.body)), { ptBody: pt(b.summary) });

const index = { _help: "Made by tools/build_research_index.mjs (do not edit by hand). Passages of the site's own content searched by 'Ask my research' (ask.js); 'vectors' are their meanings (int8, base64) from the model named in 'model'.",
  model: null, dim: 0, passages, vectors: null };

if (embed) {
  try {
    const tf = await import(process.env.TRANSFORMERS || "@huggingface/transformers");
    tf.env.cacheDir = path.join(ROOT, "vendor", "models") + path.sep;   // the download lands where the site loads it from
    tf.env.allowLocalModels = false;
    const extractor = await tf.pipeline("feature-extraction", MODEL, { dtype: "q8" });
    const dim = 384, all = new Int8Array(passages.length * dim);
    for (let i = 0; i < passages.length; i += 16) {
      const batch = passages.slice(i, i + 16).map(p => expand(p.title + ". " + p.text));
      const out = await extractor(batch, { pooling: POOLING, normalize: true });
      const v = out.data;
      for (let k = 0; k < v.length; k++) all[i * dim + k] = Math.max(-127, Math.min(127, Math.round(v[k] * 127)));
    }
    index.model = MODEL; index.dim = dim; index.pooling = POOLING; index.queryPrefix = QUERY_PREFIX; index.vectors = Buffer.from(all.buffer).toString("base64");
    console.log("Embedded", passages.length, "passages with", MODEL);
  } catch (e) {
    console.warn("No vectors (" + e.message + "): word matching only.");
  }
}

fs.writeFileSync(OUT, JSON.stringify(index) + "\n");
console.log("Wrote", passages.length, "passages to data/research-index.json");
