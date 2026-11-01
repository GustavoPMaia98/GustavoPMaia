/* =====================================================================
   hub.js: the data-driven research sections
     - Collaborations     (co-author network from data/publications.json and
                           data/paper-info.json; updates itself with new papers)
     - Data & code        (data/datasets.json from Zenodo, data/repos.json from GitHub;
                           both refreshed every night by tools/update_outputs.py)
   index.html calls Hub.render(data) after loading the sections and before
   SiteApp.init(), so the [data-pt] texts made here are translated with the rest.
   ===================================================================== */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const en = v => (v && typeof v === "object" ? v.en : v) || "";
  const ptAttr = v => (v && typeof v === "object" && v.pt ? ' data-pt="' + esc(v.pt) + '"' : "");
  const lang = () => { const l = document.documentElement.getAttribute("lang"); return ["pt", "fr", "ja"].includes(l) ? l : "en"; };
  const T = {   // words made in JS (the rest is translated through data-pt / translations.js)
    papers1: { en: "1 paper together", pt: "1 artigo em conjunto", fr: "1 article ensemble", ja: "共著論文 1 本" },
    papersN: { en: "{n} papers together", pt: "{n} artigos em conjunto", fr: "{n} articles ensemble", ja: "共著論文 {n} 本" },
    me: { en: "{n} co-authors on {p} papers. Tap a name to see the papers you share.", pt: "{n} coautores em {p} artigos. Toque num nome para ver os artigos em comum.",
          fr: "{n} co-auteurs sur {p} articles. Touchez un nom pour voir les articles communs.", ja: "{p} 本の論文に {n} 人の共著者。名前をタップすると共著論文を表示します。" },
  };
  const t = (k, o) => { let s = (T[k][lang()] || T[k].en); for (const x in o || {}) s = s.replace("{" + x + "}", o[x]); return s; };
  const plain = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  // ------------------------------------------------------------- co-author network
  function authorsOf(w, info) {
    const i = info && info[String(w.doi).toLowerCase()];
    if (i && i.authors && i.authors.length) return i.authors.map(a => a.name);
    return String(w.authors || "").split(/,\s*|\s+and\s+|\s*&\s*/).map(s => s.trim()).filter(Boolean);
  }
  const keyOf = name => {
    const w = plain(name).replace(/[.\-]/g, " ").split(/\s+/).filter(Boolean);
    return w.length ? w[w.length - 1] + "|" + w[0][0] : "";
  };

  function network(pubs, info) {
    const stage = document.getElementById("netStage"), side = document.getElementById("netSide");
    if (!stage || !side || !(pubs || []).length) return;
    const people = new Map(), links = new Map();
    const SELF = "maia|g";
    pubs.forEach((w, pi) => {
      const keys = [];
      authorsOf(w, info).forEach(n => {
        const k = keyOf(n); if (!k || keys.includes(k)) return;
        keys.push(k);
        const p = people.get(k) || { k, name: n, papers: [] };
        if (n.length > p.name.length) p.name = n;          // keep the fullest spelling
        p.papers.push(pi); people.set(k, p);
      });
      for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
        const id = [keys[a], keys[b]].sort().join("~");
        links.set(id, (links.get(id) || 0) + 1);
      }
    });
    if (!people.has(SELF)) return;
    const nodes = [...people.values()];
    const W = 760, H = 460, cx = W / 2, cy = H / 2;
    // deterministic layout: me in the centre; co-authors evenly around an ellipse,
    // grouped by paper, closer to the centre when we share more papers
    const others = nodes.filter(n => n.k !== SELF).sort((p, q) => (p.papers[0] - q.papers[0]) || (q.papers.length - p.papers.length) || p.name.localeCompare(q.name));
    nodes.forEach(n => { n.self = n.k === SELF; n.r = n.self ? 30 : 9 + 5 * Math.min(4, n.papers.length); });
    const me = people.get(SELF); me.x = cx; me.y = cy;
    others.forEach((n, i) => {
      const ang = -Math.PI / 2 + (i + 0.5) / others.length * Math.PI * 2;
      const ring = 1 - 0.22 * Math.min(2, n.papers.length - 1);
      n.x = cx + Math.cos(ang) * 300 * ring; n.y = cy + Math.sin(ang) * 175 * ring;
    });
    const L = [...links.entries()].map(([id, w]) => { const [a, b] = id.split("~"); return { a: people.get(a), b: people.get(b), w }; });
    const ini = n => { const w = n.name.replace(/[.\-]/g, " ").split(/\s+/).filter(Boolean); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
    const short = n => { const w = n.name.split(/\s+/); return w.length > 2 ? w[0] + " " + w[w.length - 1] : n.name; };
    stage.innerHTML = '<svg class="net-svg" viewBox="0 0 ' + W + " " + H + '" role="group" aria-label="Co-author network">' +
      L.map(l => '<line class="net-link" data-a="' + l.a.k + '" data-b="' + l.b.k + '" x1="' + l.a.x.toFixed(1) + '" y1="' + l.a.y.toFixed(1) +
        '" x2="' + l.b.x.toFixed(1) + '" y2="' + l.b.y.toFixed(1) + '" stroke-width="' + (0.8 + l.w * 0.9).toFixed(1) + '"/>').join("") +
      nodes.map(n => '<g class="net-node' + (n.self ? " is-self" : "") + '" data-k="' + n.k + '" tabindex="0" role="button" aria-label="' + esc(n.name) + '" transform="translate(' + n.x.toFixed(1) + " " + n.y.toFixed(1) + ')">' +
        '<circle r="' + n.r + '"/><text class="net-ini" dy="0.35em">' + esc(ini(n)) + '</text><text class="net-name" dy="' + (n.r + 13) + '">' + esc(short(n)) + "</text></g>").join("") +
      "</svg>";
    const coauthors = nodes.length - 1;
    const showMe = () => {
      side.innerHTML = '<p class="net-who">' + esc(people.get(SELF).name) + '</p><p class="net-hint">' + esc(t("me", { n: coauthors, p: pubs.length })) + "</p>";
    };
    const show = k => {
      const p = people.get(k); if (!p) return;
      stage.querySelectorAll(".net-node").forEach(g => g.classList.toggle("is-on", g.dataset.k === k));
      stage.querySelectorAll(".net-link").forEach(l => l.classList.toggle("is-on", l.dataset.a === k || l.dataset.b === k));
      if (p.k === SELF) { showMe(); return; }
      const shared = p.papers.filter(i => people.get(SELF).papers.includes(i));
      side.innerHTML = '<p class="net-who">' + esc(p.name) + '</p><p class="net-count">' + esc(shared.length === 1 ? t("papers1") : t("papersN", { n: shared.length })) + "</p>" +
        '<ul class="net-papers">' + shared.map(i => '<li><button type="button" class="net-paper" data-doi="' + esc(pubs[i].doi) + '"><span class="net-pt">' + esc(strip(pubs[i].title)) +
          '</span><span class="net-pm">' + esc(pubs[i].journal + " · " + pubs[i].year) + "</span></button></li>").join("") + "</ul>";
    };
    showMe();
    stage.addEventListener("click", e => { const g = e.target.closest(".net-node"); if (g) show(g.dataset.k); });
    stage.addEventListener("keydown", e => { const g = e.target.closest(".net-node"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); show(g.dataset.k); } });
    side.addEventListener("click", e => {
      const b = e.target.closest(".net-paper"); if (!b) return;
      if (window.SiteApp && SiteApp.openPublication) SiteApp.openPublication(b.dataset.doi);
    });
    new MutationObserver(() => { const on = stage.querySelector(".net-node.is-on"); on ? show(on.dataset.k) : showMe(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  // ------------------------------------------------------------- data & code
  function datacode(datasets, repos) {
    const dl = document.getElementById("dcData"), cl = document.getElementById("dcCode");
    if (!dl || !cl) return;
    const ds = (datasets && datasets.items) || [];
    dl.innerHTML = ds.length ? ds.map(d =>
      '<li class="dc-item"><a href="' + esc(d.doi ? "https://doi.org/" + d.doi : d.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="dc-title">' + esc(d.title) + '</span><span class="dc-meta">' + esc([d.type, (d.date || "").slice(0, 4), d.doi ? "DOI " + d.doi : "", d.license].filter(Boolean).join(" · ")) + "</span></a></li>").join("")
      : '<li class="dc-empty" data-pt="Os conjuntos de dados aparecem aqui sozinhos quando forem publicados no Zenodo com o meu ORCID.">Datasets appear here by themselves once they are published on Zenodo with my ORCID.</li>';
    const rs = (repos && repos.items) || [];
    cl.innerHTML = rs.map(r => {
      const site = /\.github\.io/i.test(r.homepage || "") && /gustavopmaia/i.test(r.name);
      return '<li class="dc-item"><a href="' + esc(r.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="dc-title">' + esc(r.name) + "</span>" +
        (site ? '<span class="dc-desc" data-pt="Este site: dados, automatização e código, de código aberto.">This website: data, automation and code, open source.</span>'
              : (r.description ? '<span class="dc-desc">' + esc(r.description) + "</span>" : "")) +
        '<span class="dc-meta">' + esc([r.language, r.pushed ? r.pushed.slice(0, 7) : "", r.stars ? "★ " + r.stars : ""].filter(Boolean).join(" · ")) + "</span></a></li>";
    }).join("");
  }

  window.Hub = {
    render(data) {
      const pubs = ((data.publications && data.publications.works) || []).slice();
      try { network(pubs, data["paper-info"]); } catch (e) { console.warn("network", e); }
      try { datacode(data.datasets, data.repos); } catch (e) { console.warn("data & code", e); }
    }
  };
})();
