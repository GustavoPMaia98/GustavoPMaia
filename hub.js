/* =====================================================================
   hub.js: "Academic Tree & Collaborations", one network in two directions.
     - Up from me: my academic lineage (data/tree.json, kept in step with Chemistry
       Tree by tools/update_tree.py): advisors, their advisors, and so on, one row
       per generation.
     - Down from me: my co-authors (data/publications.json + data/paper-info.json),
       so the network grows by itself with every new paper. Mentors who are also
       co-authors keep their place in the tree and get a co-author ring.
   Drawn as one circle so everyone fits on screen: me in the centre, each generation of
   mentors on a ring further out, co-authors on the inner rings of their own part.
   Click (or Enter on) a person to see who they are and, for co-authors, the papers
   we share; their line back to me lights up.
   index.html calls Hub.render(data) after loading the sections and before
   SiteApp.init().
   ===================================================================== */
(function () {
  "use strict";
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const lang = () => { const l = document.documentElement.getAttribute("lang"); return ["pt", "fr", "ja"].includes(l) ? l : "en"; };
  const tr = (v) => { if (!v || typeof v !== "object") return v || ""; const l = lang(); if (v[l]) return v[l];
    if ((l === "fr" || l === "ja") && window.TR && TR[l] && TR[l][v.en]) return TR[l][v.en]; return v.en || ""; };
  const T = {
    papers1: { en: "1 paper together", pt: "1 artigo em conjunto", fr: "1 article ensemble", ja: "共著論文 1 本" },
    papersN: { en: "{n} papers together", pt: "{n} artigos em conjunto", fr: "{n} articles ensemble", ja: "共著論文 {n} 本" },
    coauthor: { en: "Co-author", pt: "Coautor(a)", fr: "Co-auteur", ja: "共著者" },
    colleague: { en: "Research colleague", pt: "Colega de investigação", fr: "Collègue de recherche", ja: "研究仲間" },
    mentorCo: { en: "Mentor and co-author", pt: "Mentor(a) e coautor(a)", fr: "Mentor et co-auteur", ja: "指導者・共著者" },
    me: { en: "{g} generations of mentors around me, ring after ring, {n} co-authors on {p} papers (orange) and {m} research colleagues (green). Select anyone to see who they are.",
          pt: "{g} gerações de mentores à minha volta, anel após anel, {n} coautores em {p} artigos (laranja) e {m} colegas de investigação (verde). Selecione alguém para ver quem é.",
          fr: "{g} générations de mentors autour de moi, anneau après anneau, {n} co-auteurs sur {p} articles (orange) et {m} collègues de recherche (vert). Sélectionnez quelqu’un pour le découvrir.",
          ja: "周囲の輪に {g} 世代の指導者、{p} 本の論文の共著者 {n} 人（オレンジ）、研究仲間 {m} 人（緑）。選択すると詳細を表示します。" },
    profile: { en: "Profile", pt: "Perfil", fr: "Profil", ja: "プロフィール" },
    photo: { en: "Photo", pt: "Foto", fr: "Photo", ja: "写真" },
    nobel: { en: "Nobel laureate", pt: "Prémio Nobel", fr: "Prix Nobel", ja: "ノーベル賞受賞者" }
  };
  const t = (k, o) => { let s = T[k][lang()] || T[k].en; for (const x in o || {}) s = s.replace("{" + x + "}", o[x]); return s; };
  const plain = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const keyOf = name => {
    const w = plain(name).replace(/[.\-]/g, " ").split(/\s+/).filter(w => w && !["eng", "prof", "dr"].includes(w));
    return w.length ? w[w.length - 1] + "|" + w[0][0] : "";
  };
  const safe = u => /^(https?:\/\/|images\/)/.test(String(u || "")) ? String(u) : "";
  function authorsOf(w, info) {
    const i = info && info[String(w.doi).toLowerCase()];
    if (i && i.authors && i.authors.length) return i.authors.map(a => a.name);
    return String(w.authors || "").split(/,\s*|\s+and\s+|\s*&\s*/).map(s => s.trim()).filter(Boolean);
  }

  function treeNet(tree, pubs, info) {
    const stage = document.getElementById("tnStage"), side = document.getElementById("tnSide");
    if (!stage || !side || !tree || !tree.root) return;
    pubs = pubs || [];
    // ---- one circle: me in the centre, each generation of mentors on a ring further out,
    //      my co-authors on the inner rings of their own part of the circle
    const nodes = [], links = [];
    let maxGen = 0;
    function grow(n, gen, parent) {
      const node = { id: nodes.length, n, gen, parent, name: n.name, key: keyOf(n.name), tree: true, kids: [] };
      nodes.push(node);
      if (parent) { links.push({ a: node, b: parent, kind: "mentor" }); parent.kids.push(node); }
      maxGen = Math.max(maxGen, gen);
      (n.mentors || []).filter(m => m && m.name && !m.hidden && !m.cvOnly).forEach(k => grow(k, gen + 1, node));
      return node;
    }
    const me = grow(tree.root, 0, null);
    me.self = true;
    // co-authors
    const SELF = keyOf(tree.root.name);
    const byKey = new Map();
    pubs.forEach((w, pi) => authorsOf(w, info).forEach(nm => {
      const k = keyOf(nm); if (!k || k === SELF) return;
      const c = byKey.get(k) || { key: k, name: nm, papers: [] };
      if (nm.length > c.name.length) c.name = nm;
      if (!c.papers.includes(pi)) c.papers.push(pi);
      byKey.set(k, c);
    }));
    const below = [];
    byKey.forEach(c => {
      const inTree = nodes.find(n => n.tree && !n.self && n.gen === 1 && n.key === c.key) || nodes.find(n => n.tree && !n.self && n.key === c.key);
      if (inTree) { inTree.papers = c.papers; inTree.co = true; return; }
      const extra = Object.entries(tree.coauthors || {}).find(([nm]) => nm !== "_help" && keyOf(nm) === c.key);
      below.push({ id: 0, name: c.name, key: c.key, papers: c.papers, co: true, gen: 1, kids: [], n: extra ? Object.assign({ name: c.name }, extra[1]) : null });
    });
    below.sort((p, q) => (p.papers[0] - q.papers[0]) || (q.papers.length - p.papers.length));
    below.forEach((c, i) => { c.id = nodes.length; c.alt = i % 3; nodes.push(c); links.push({ a: c, b: me, kind: "co" }); });
    // research colleagues (data/tree.json "colleagues"), on their own part of the circle
    const mates = (tree.colleagues || []).filter(c => c && c.name && !c.hidden && !byKey.has(keyOf(c.name)))
      .map((c, i) => ({ id: nodes.length + i, name: c.name, key: keyOf(c.name), mate: true, gen: 1, kids: [], alt: (below.length + i) % 3, n: c }));
    mates.forEach(c => { nodes.push(c); links.push({ a: c, b: me, kind: "mate" }); });
    nodes.filter(n => n.tree && n.co && !n.self).forEach(n => { if (n.parent !== me) links.push({ a: n, b: me, kind: "co" }); });
    // angles: every leaf gets a slice of the circle (co-authors a slightly smaller one);
    // a mentor sits in the middle of the people it trained
    const leaves = n => n.kids.length ? n.kids.reduce((s, k) => s + leaves(k), 0) : 1;
    const total = me.kids.reduce((s, k) => s + leaves(k), 0) + (below.length + mates.length) * 0.9;
    let at = -Math.PI / 2 - (me.kids.reduce((s, k) => s + leaves(k), 0) / total) * Math.PI;   // the lineage around the top
    const span = Math.PI * 2 / total;
    function angle(n) {
      if (!n.kids.length) { n.ang = at + span / 2; at += span; return n.ang; }
      const as = n.kids.map(angle); n.ang = (as[0] + as[as.length - 1]) / 2; return n.ang;
    }
    me.kids.forEach(angle);
    below.concat(mates).forEach(c => { c.ang = at + span * 0.45; at += span * 0.9; });
    const RING = [0, 175, 300, 410, 510, 600, 680];
    const ringOf = g => RING[Math.min(g, RING.length - 1)] + Math.max(0, g - RING.length + 1) * 80;
    const outer = ringOf(maxGen) + 30, C = outer + 120;   // room for the names on the outer ring
    nodes.forEach(n => {
      const r = n.self ? 0 : (n.tree ? ringOf(n.gen) : [190, 270, 350][n.alt || 0]);
      n.r0 = r; n.x = C + Math.cos(n.ang || 0) * r; n.y = C + Math.sin(n.ang || 0) * r;
    });
    const W = 2 * C, H = 2 * C;

    // ---- drawing
    const R = n => n.self ? 36 : 23;
    const ini = nm => { const w = nm.replace(/^(Eng|Prof|Dr)\.?\s+/i, "").replace(/[.\-]/g, " ").split(/\s+/).filter(Boolean); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
    const short = nm => { const w = nm.replace(/^(Eng)\.?\s+/i, "").split(/\s+/); return w.length > 2 ? w[0] + " " + w[w.length - 1] : w.join(" "); };
    const P = (ang, r) => [C + Math.cos(ang) * r, C + Math.sin(ang) * r];
    const path = l => {
      const { a, b } = l;                              // a: further out, b: nearer the centre
      if (b.self) { const m = (a.r0) * 0.5; const p1 = P(a.ang, m), p2 = P(a.ang, a.r0 - R(a));
        return "M" + C + " " + C + " Q" + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1); }
      const mid = (a.r0 + b.r0) / 2, s = P(b.ang, b.r0 + R(b)), c1 = P(b.ang, mid), c2 = P(a.ang, mid), e = P(a.ang, a.r0 - R(a));
      return "M" + s.map(v => v.toFixed(1)).join(" ") + " C" + c1.map(v => v.toFixed(1)).join(" ") + " " + c2.map(v => v.toFixed(1)).join(" ") + " " + e.map(v => v.toFixed(1)).join(" ");
    };
    let defs = "";
    const svgNodes = nodes.map(n => {
      const r = R(n), photo = n.n && safe(n.n.photo);
      if (photo) defs += '<clipPath id="tnc' + n.id + '"><circle r="' + r + '"/></clipPath>';
      // the name sits outside the node, away from the centre
      const cos = Math.cos(n.ang || Math.PI / 2), sin = Math.sin(n.ang || Math.PI / 2);
      const lx = n.self ? 0 : cos * (r + 8), ly = n.self ? r + 18 : sin * (r + 8) + (sin > 0.3 ? 10 : sin < -0.3 ? -2 : 4);
      const anchor = n.self ? "middle" : (cos > 0.35 ? "start" : cos < -0.35 ? "end" : "middle");
      return '<g class="tn-node' + (n.self ? " is-self" : "") + (n.co ? " is-co" : "") + (n.mate ? " is-mate" : "") + (n.tree ? " is-tree" : " is-coonly") + '" data-id="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(n.name) + '" transform="translate(' + n.x.toFixed(1) + " " + n.y.toFixed(1) + ')">' +
        (n.co && !n.self ? '<circle class="tn-co-ring" r="' + (r + 5) + '"/>' : "") +
        (n.mate ? '<circle class="tn-mate-ring" r="' + (r + 5) + '"/>' : "") +
        '<circle class="tn-dot" r="' + r + '"/>' +
        (photo ? '<image href="' + esc(photo) + '" x="' + -r + '" y="' + -r + '" width="' + 2 * r + '" height="' + 2 * r + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#tnc' + n.id + ')"/>'
               : '<text class="tn-ini" dy="0.35em">' + esc(n.n && n.n.initials || ini(n.name)) + "</text>") +
        (n.n && n.n.nobel ? '<g class="tn-nobel" transform="translate(' + (r * 0.72) + " " + (-r * 0.72) + ')"><circle r="7"/><text dy="0.35em">★</text></g>' : "") +
        '<text class="tn-name" text-anchor="' + anchor + '" x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '">' + esc(n.self ? n.name : short(n.name)) + "</text>" +
        "</g>";
    }).join("");
    const rings = RING.slice(1, maxGen + 1).map(r => '<circle class="tn-ring" cx="' + C + '" cy="' + C + '" r="' + r + '"/>').join("");
    stage.innerHTML = '<svg class="tn-svg" viewBox="0 0 ' + Math.round(W) + " " + Math.round(H) + '" role="group" aria-label="Academic tree and co-authors">' +
      "<defs>" + defs + "</defs>" + rings +
      links.map(l => '<path class="tn-link tn-link--' + l.kind + '" data-a="' + l.a.id + '" data-b="' + l.b.id + '" d="' + path(l) + '"/>').join("") + svgNodes + "</svg>";

    // ---- details
    const coCount = nodes.filter(n => n.co && !n.self).length;
    function chain(n) { const ids = new Set(); let c = n; while (c) { ids.add(c.id); c = c.parent; } return ids; }
    function show(id) {
      const n = nodes[id]; if (!n) return;
      const on = n.self ? new Set([n.id]) : chain(n);
      stage.querySelectorAll(".tn-node").forEach(g => g.classList.toggle("is-on", on.has(+g.dataset.id) || +g.dataset.id === n.id));
      stage.querySelectorAll(".tn-link").forEach(p => {
        const a = +p.dataset.a, b = +p.dataset.b;
        p.classList.toggle("is-on", (p.classList.contains("tn-link--mentor") && on.has(a) && on.has(b)) || (!p.classList.contains("tn-link--mentor") && a === n.id));
      });
      if (n.self) {
        side.innerHTML = '<p class="tn-who">' + esc(n.name) + '</p><p class="tn-role">' + esc(tr(n.n.role)) + '</p><p class="tn-hint">' +
          esc(t("me", { g: maxGen, n: coCount, p: pubs.length, m: mates.length })) + "</p>";
        return;
      }
      const role = n.n ? tr(n.n.role) : "", inst = n.n && n.n.institution;
      const shared = (n.papers || []);
      side.innerHTML = '<p class="tn-who">' + esc(n.name) + (n.n && n.n.nobel ? ' <span class="tn-badge tn-badge--nobel">' + esc(t("nobel")) + "</span>" : "") + "</p>" +
        (role ? '<p class="tn-role">' + esc(strip(role)) + "</p>" : "") +
        (n.co ? '<p class="tn-badge">' + esc(n.tree ? t("mentorCo") : t("coauthor")) + "</p>" : "") +
        (n.mate ? '<p class="tn-badge tn-badge--mate">' + esc(t("colleague")) + "</p>" : "") +
        (inst && inst.name ? '<p class="tn-inst-line">' + (safe(inst.url) ? '<a href="' + esc(inst.url) + '" target="_blank" rel="noopener noreferrer">' + esc(inst.name) + " ↗</a>" : esc(inst.name)) + "</p>" : "") +
        (n.n && safe(n.n.url) ? '<p><a class="tn-link-out" href="' + esc(n.n.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t("profile")) + " ↗</a></p>" : "") +
        (n.n && n.n.photoCredit ? '<p class="tn-credit">' + esc(t("photo")) + ": " + esc(n.n.photoCredit.author) + " · " +
          (safe(n.n.photoCredit.source) ? '<a href="' + esc(n.n.photoCredit.source) + '" target="_blank" rel="noopener noreferrer">' + esc(n.n.photoCredit.license) + "</a>" : esc(n.n.photoCredit.license)) + "</p>" : "") +
        (shared.length ? '<p class="tn-count">' + esc(shared.length === 1 ? t("papers1") : t("papersN", { n: shared.length })) + '</p><ul class="tn-papers">' +
          shared.map(i => '<li><button type="button" class="tn-paper" data-doi="' + esc(pubs[i].doi) + '"><span class="tn-pt">' + esc(strip(pubs[i].title)) +
            '</span><span class="tn-pm">' + esc(pubs[i].journal + " · " + pubs[i].year) + "</span></button></li>").join("") + "</ul>" : "");
    }
    let current = me.id;
    show(me.id);
    stage.addEventListener("click", e => { const g = e.target.closest(".tn-node"); if (g) { current = +g.dataset.id; show(current); } });
    stage.addEventListener("keydown", e => { const g = e.target.closest(".tn-node"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); current = +g.dataset.id; show(current); } });
    side.addEventListener("click", e => { const b = e.target.closest(".tn-paper"); if (b && window.SiteApp && SiteApp.openPublication) SiteApp.openPublication(b.dataset.doi); });
    new MutationObserver(() => show(current)).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // on phones the circle is wider than the screen: start with me in the middle
    const wrap = stage.parentElement;
    requestAnimationFrame(() => { wrap.scrollLeft = Math.max(0, (wrap.scrollWidth - wrap.clientWidth) / 2); });
  }

  window.Hub = {
    render(data) {
      const pubs = ((data.publications && data.publications.works) || []).slice();
      try { treeNet(data.tree, pubs, data["paper-info"]); } catch (e) { console.warn("tree & collaborations", e); }
    }
  };
})();
