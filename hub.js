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
    homeView: { en: "Standard view", pt: "Vista normal", fr: "Vue d’ensemble", ja: "標準表示" },
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
    // each person appears once: someone who mentored several people in the tree (e.g. one
    // mentor of two of my mentors) keeps one place and gets a line to each of them
    const seen = new Map();
    function grow(n, gen, parent) {
      const k = keyOf(n.name);
      if (parent && seen.has(k)) { const at = seen.get(k); links.push({ a: at, b: parent, kind: "mentor", cross: true }); return at; }
      const node = { id: nodes.length, n, gen, parent, name: n.name, key: k, tree: true, kids: [] };
      seen.set(k, node);
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

    // ---- drawing
    const R = n => n.self ? 36 : 23;
    const ini = nm => { const w = nm.replace(/^(Eng|Prof|Dr)\.?\s+/i, "").replace(/[.\-]/g, " ").split(/\s+/).filter(Boolean); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
    const short = nm => { const w = nm.replace(/^(Eng)\.?\s+/i, "").split(/\s+/); return w.length > 2 ? w[0] + " " + w[w.length - 1] : w.join(" "); };
    const P = (ang, r) => [C + Math.cos(ang) * r, C + Math.sin(ang) * r];
    const path = l => {
      const { a, b } = l;                              // a: further out, b: nearer the centre
      if (l.cross) {                                   // an extra line to a person already placed elsewhere
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, cx = C + (mx - C) * 0.82, cy = C + (my - C) * 0.82;
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, ux = (a.x - b.x) / d, uy = (a.y - b.y) / d;
        const s0 = [b.x + ux * R(b), b.y + uy * R(b)], e0 = [a.x - ux * R(a), a.y - uy * R(a)];
        return "M" + s0.map(v => v.toFixed(1)).join(" ") + " Q" + cx.toFixed(1) + " " + cy.toFixed(1) + " " + e0.map(v => v.toFixed(1)).join(" ");
      }
      if (b.self) { const m = (a.r0) * 0.5; const p1 = P(a.ang, m), p2 = P(a.ang, a.r0 - R(a));
        return "M" + C + " " + C + " Q" + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " " + p2[0].toFixed(1) + " " + p2[1].toFixed(1); }
      const mid = (a.r0 + b.r0) / 2, s = P(b.ang, b.r0 + R(b)), c1 = P(b.ang, mid), c2 = P(a.ang, mid), e = P(a.ang, a.r0 - R(a));
      return "M" + s.map(v => v.toFixed(1)).join(" ") + " C" + c1.map(v => v.toFixed(1)).join(" ") + " " + c2.map(v => v.toFixed(1)).join(" ") + " " + e.map(v => v.toFixed(1)).join(" ");
    };
    // ---- names: each goes to the first free spot around its circle (outward first),
    //      never on top of another name or another person's circle
    const FS = 15.5, FS_SELF = 18, LH = 1.2;
    const meas = document.createElement("canvas").getContext("2d");
    const family = getComputedStyle(stage).fontFamily || "sans-serif";
    const width = (txt, fs) => { meas.font = "600 " + fs + "px " + family; return meas.measureText(txt).width; };
    const boxes = nodes.map(n => { const r = R(n) + 4; return [n.x - r, n.y - r, n.x + r, n.y + r]; });   // the circles
    const hit = (b, list) => { let area = 0; for (const o of list) { const w = Math.min(b[2], o[2]) - Math.max(b[0], o[0]), h = Math.min(b[3], o[3]) - Math.max(b[1], o[1]); if (w > 0 && h > 0) area += w * h; } return area; };
    const placed = [];
    const order = nodes.slice().sort((p, q) => (q.self ? 1 : 0) - (p.self ? 1 : 0) || p.r0 - q.r0);
    order.forEach(n => {
      const r = R(n), fs = n.self ? FS_SELF : FS;
      const full = n.self ? n.name : short(n.name), parts = full.split(" ");
      const variants = [[full]];
      if (parts.length > 1) variants.push([parts.slice(0, Math.ceil(parts.length / 2)).join(" "), parts.slice(Math.ceil(parts.length / 2)).join(" ")]);
      const base = n.self ? Math.PI / 2 : n.ang;
      const turns = [0, 0.6, -0.6, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI];
      let best = null;
      for (const lines of variants) {
        const w = Math.max(...lines.map(l => width(l, fs))), h = lines.length * fs * LH;
        for (const gap of [7, 16, 28]) for (const tt of turns) {
          const th = base + tt, cx = Math.cos(th), cy = Math.sin(th);
          const ax = n.x + cx * (r + gap), ay = n.y + cy * (r + gap);
          const anchor = cx > 0.38 ? "start" : cx < -0.38 ? "end" : "middle";
          const x0 = anchor === "start" ? ax : anchor === "end" ? ax - w : ax - w / 2;
          const y0 = cy > 0.38 ? ay : cy < -0.38 ? ay - h : ay - h / 2;
          const box = [x0 - 2, y0 - 1, x0 + w + 2, y0 + h + 1];
          const cost = hit(box, placed) * 4 + hit(box, boxes.filter((_, i) => i !== nodes.indexOf(n))) + gap * 2 + Math.abs(tt) * 30 + (lines.length - 1) * 60;
          if (!best || cost < best.cost) best = { cost, lines, anchor, x: ax, y0, box, fs };
          if (cost < 120) break;
        }
        if (best && best.cost < 120) break;
      }
      placed.push(best.box);
      n.label = best;
    });
    // the drawing's frame: everything, names included
    const all = boxes.concat(placed);
    const fx = Math.min(...all.map(b => b[0])) - 16, fy = Math.min(...all.map(b => b[1])) - 16;
    const fw = Math.max(...all.map(b => b[2])) + 16 - fx, fh = Math.max(...all.map(b => b[3])) + 16 - fy;

    let defs = "";
    const svgNodes = nodes.map(n => {
      const r = R(n), photo = n.n && safe(n.n.photo), L = n.label;
      if (photo) defs += '<clipPath id="tnc' + n.id + '"><circle r="' + r + '"/></clipPath>';
      const tx = (L.x - n.x).toFixed(1);
      const text = '<text class="tn-name" text-anchor="' + L.anchor + '">' + L.lines.map((l, i) =>
        '<tspan x="' + tx + '" y="' + (L.y0 - n.y + L.fs * (0.85 + i * LH)).toFixed(1) + '">' + esc(l) + "</tspan>").join("") + "</text>";
      return '<g class="tn-node' + (n.self ? " is-self" : "") + (n.co ? " is-co" : "") + (n.mate ? " is-mate" : "") + (n.tree ? " is-tree" : " is-coonly") + '" data-id="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(n.name) + '" transform="translate(' + n.x.toFixed(1) + " " + n.y.toFixed(1) + ')">' +
        (n.co && !n.self ? '<circle class="tn-co-ring" r="' + (r + 5) + '"/>' : "") +
        (n.mate ? '<circle class="tn-mate-ring" r="' + (r + 5) + '"/>' : "") +
        '<circle class="tn-dot" r="' + r + '"/>' +
        (photo ? '<image href="' + esc(photo) + '" x="' + -r + '" y="' + -r + '" width="' + 2 * r + '" height="' + 2 * r + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#tnc' + n.id + ')"/>'
               : '<text class="tn-ini" dy="0.35em">' + esc(n.n && n.n.initials || ini(n.name)) + "</text>") +
        (n.n && n.n.nobel ? '<g class="tn-nobel" transform="translate(' + (r * 0.72) + " " + (-r * 0.72) + ')"><circle r="7"/><text dy="0.35em">★</text></g>' : "") +
        text + "</g>";
    }).join("");
    const rings = RING.slice(1, maxGen + 1).map(r => '<circle class="tn-ring" cx="' + C + '" cy="' + C + '" r="' + r + '"/>').join("");
    stage.innerHTML = '<svg class="tn-svg" viewBox="' + [fx, fy, fw, fh].map(v => v.toFixed(1)).join(" ") + '" role="group" aria-label="Academic tree and co-authors">' +
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
      // the person: photo (or initials), name and what they are, then the details
      const photo = n.n && safe(n.n.photo);
      const head = '<div class="tn-head"><span class="tn-av' + (n.co ? " is-co" : "") + (n.mate ? " is-mate" : "") + '">' +
        (photo ? '<img src="' + esc(photo) + '" alt="">' : esc(n.n && n.n.initials || ini(n.name))) + "</span>" +
        '<div><p class="tn-who">' + esc(n.name) + "</p>" + (n.n && n.n.nobel ? '<span class="tn-badge tn-badge--nobel">' + esc(t("nobel")) + "</span>" : "") + "</div></div>";
      if (n.self) {
        side.innerHTML = head + '<p class="tn-role">' + esc(tr(n.n.role)) + '</p><p class="tn-hint">' +
          esc(t("me", { g: maxGen, n: coCount, p: pubs.length, m: mates.length })) + "</p>";
        return;
      }
      const role = n.n ? tr(n.n.role) : "", inst = n.n && n.n.institution;
      const shared = (n.papers || []);
      side.innerHTML = head +
        (role ? '<p class="tn-role">' + esc(strip(role)) + "</p>" : "") +
        (n.co ? '<p class="tn-badge">' + esc(n.tree ? t("mentorCo") : t("coauthor")) + "</p>" : "") +
        (n.mate ? '<p class="tn-badge tn-badge--mate">' + esc(t("colleague")) + "</p>" : "") +
        (n.n && n.n.about ? '<p class="tn-about">' + esc(tr(n.n.about)) + "</p>" : "") +
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

    // ---- zoom: the mouse wheel zooms in and out around the pointer, a drag moves the
    //      view when zoomed in, pinch on touch screens; the buttons zoom and bring back
    //      the standard view (the whole circle)
    const svg = stage.querySelector("svg"), wrap = stage.parentElement;
    const home = { x: fx, y: fy, w: fw, h: fh };
    let view = Object.assign({}, home);
    const apply = () => { svg.setAttribute("viewBox", [view.x, view.y, view.w, view.h].map(v => v.toFixed(1)).join(" ")); wrap.classList.toggle("is-zoomed", view.w < home.w * 0.98); };
    const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(); return [view.x + (cx - r.left) / r.width * view.w, view.y + (cy - r.top) / r.height * view.h]; };
    function zoom(f, cx, cy) {
      const nw = Math.max(home.w * 0.2, Math.min(home.w, view.w * f));
      const k = nw / view.w; if (k === 1) return;
      const [px, py] = cx == null ? [view.x + view.w / 2, view.y + view.h / 2] : toSvg(cx, cy);
      view = { x: px - (px - view.x) * k, y: py - (py - view.y) * k, w: nw, h: view.h * k };
      clamp(); apply();
    }
    function clamp() {
      view.x = Math.max(home.x, Math.min(home.x + home.w - view.w, view.x));
      view.y = Math.max(home.y, Math.min(home.y + home.h - view.h, view.y));
    }
    wrap.addEventListener("wheel", e => { e.preventDefault(); zoom(Math.pow(1.0018, e.deltaY * (e.deltaMode === 1 ? 30 : 1)), e.clientX, e.clientY); }, { passive: false });
    const pts = new Map(); let pan = null, pinch = null;
    wrap.addEventListener("pointerdown", e => {
      if (e.target.closest(".tn-tools")) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; pan = null; }
      else if (view.w < home.w * 0.98 || e.pointerType === "mouse") pan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
    });
    wrap.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoom(pinch.d / d, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch.d = d; return; }
      if (!pan || view.w >= home.w * 0.98) return;
      const r = svg.getBoundingClientRect(), dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.moved && Math.hypot(dx, dy) < 5) return;
      pan.moved = true; wrap.classList.add("is-panning");
      view.x = pan.vx - dx / r.width * view.w; view.y = pan.vy - dy / r.height * view.h; clamp(); apply();
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pan && pan.moved) { stage.__panned = true; setTimeout(() => { stage.__panned = false; }, 0); } pan = null; wrap.classList.remove("is-panning"); };
    wrap.addEventListener("pointerup", up); wrap.addEventListener("pointercancel", up);
    stage.addEventListener("click", e => { if (stage.__panned) e.stopImmediatePropagation(); }, true);
    const tools = document.createElement("div");
    tools.className = "tn-tools";
    tools.innerHTML = '<button type="button" class="tn-tool" data-z="in" aria-label="Zoom in">+</button><button type="button" class="tn-tool" data-z="out" aria-label="Zoom out">−</button>' +
      '<button type="button" class="tn-tool tn-tool--home" data-z="home"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg><span></span></button>';
    wrap.appendChild(tools);
    const homeLabel = () => { const b = tools.querySelector(".tn-tool--home"); b.querySelector("span").textContent = t("homeView"); b.setAttribute("aria-label", t("homeView")); };
    homeLabel(); new MutationObserver(homeLabel).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    tools.addEventListener("click", e => {
      const b = e.target.closest(".tn-tool"); if (!b) return;
      if (b.dataset.z === "home") { view = Object.assign({}, home); apply(); }
      else zoom(b.dataset.z === "in" ? 0.7 : 1 / 0.7);
    });
  }

  window.Hub = {
    render(data) {
      const pubs = ((data.publications && data.publications.works) || []).slice();
      try { treeNet(data.tree, pubs, data["paper-info"]); } catch (e) { console.warn("tree & collaborations", e); }
    }
  };
})();
