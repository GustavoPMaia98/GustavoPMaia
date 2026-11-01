/* =====================================================================
   hub.js: "Academic Tree & Collaborations", one network in two directions.
     - Up from me: my academic lineage (data/tree.json, kept in step with Chemistry
       Tree by tools/update_tree.py): advisors, their advisors, and so on, one row
       per generation.
     - Down from me: my co-authors (data/publications.json + data/paper-info.json),
       so the network grows by itself with every new paper. Mentors who are also
       co-authors keep their place in the tree and get a co-author ring.
   Click (or Enter on) a person to see who they are and, for co-authors, the papers
   we share; their line back to me lights up. Drag sideways to explore.
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
    mentorCo: { en: "Mentor and co-author", pt: "Mentor(a) e coautor(a)", fr: "Mentor et co-auteur", ja: "指導者・共著者" },
    me: { en: "{g} generations of mentors above me, {n} co-authors on {p} papers below. Select anyone to see who they are.",
          pt: "{g} gerações de mentores acima de mim, {n} coautores em {p} artigos abaixo. Selecione alguém para ver quem é.",
          fr: "{g} générations de mentors au-dessus de moi, {n} co-auteurs sur {p} articles en dessous. Sélectionnez quelqu’un pour le découvrir.",
          ja: "上に {g} 世代の指導者、下に {p} 本の論文の共著者 {n} 人。選択すると詳細を表示します。" },
    profile: { en: "Profile", pt: "Perfil", fr: "Profil", ja: "プロフィール" },
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
    const SX = 112, SY = 128, PAD = 70;
    // ---- the lineage, laid out as a tidy tree (leaves side by side, parents above the middle of their mentees... here: mentors above)
    const nodes = [], links = [];
    let leafX = 0, maxGen = 0;
    function place(n, gen, parent) {
      const node = { id: nodes.length, n, gen, parent, name: n.name, key: keyOf(n.name), tree: true };
      nodes.push(node);
      if (parent) links.push({ a: node, b: parent, kind: "mentor" });
      maxGen = Math.max(maxGen, gen);
      const kids = (n.mentors || []).filter(m => m && m.name && !m.hidden && !m.cvOnly);
      if (!kids.length) { node.x = leafX; leafX += SX; }
      else { const xs = kids.map(k => place(k, gen + 1, node).x); node.x = (xs[0] + xs[xs.length - 1]) / 2; }
      return node;
    }
    const me = place(tree.root, 0, null);
    me.self = true;
    // ---- co-authors
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
      below.push({ id: nodes.length + below.length, name: c.name, key: c.key, papers: c.papers, co: true, gen: -1 });
    });
    below.sort((p, q) => (p.papers[0] - q.papers[0]) || (q.papers.length - p.papers.length));
    const perRow = Math.max(4, Math.min(9, Math.ceil(leafX / SX)));
    below.forEach((c, i) => {
      const row = Math.floor(i / perRow), inRow = Math.min(perRow, below.length - row * perRow), col = i % perRow;
      c.x = me.x + (col - (inRow - 1) / 2) * SX; c.row = row; nodes.push(c);
      links.push({ a: c, b: me, kind: "co" });
    });
    nodes.filter(n => n.tree && n.co && !n.self).forEach(n => { if (n.parent !== me) links.push({ a: n, b: me, kind: "co" }); });
    // ---- coordinates
    const minX = Math.min(...nodes.map(n => n.x)) - PAD, maxX = Math.max(...nodes.map(n => n.x)) + PAD;
    const rows = below.length ? Math.floor((below.length - 1) / perRow) + 1 : 0;
    const top = 40, meY = top + maxGen * SY + 30;
    nodes.forEach(n => { n.x -= minX; n.y = n.gen >= 0 ? meY - n.gen * SY : meY + 150 + n.row * SY; });
    const W = maxX - minX, H = meY + (rows ? 150 + (rows - 1) * SY + 70 : 80);

    // ---- drawing
    const R = n => n.self ? 30 : 21;
    const ini = nm => { const w = nm.replace(/^(Eng|Prof|Dr)\.?\s+/i, "").replace(/[.\-]/g, " ").split(/\s+/).filter(Boolean); return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase(); };
    const lines = nm => { const w = nm.split(/\s+/); if (nm.length <= 16 || w.length < 2) return [nm]; const h = Math.ceil(w.length / 2); return [w.slice(0, h).join(" "), w.slice(h).join(" ")]; };
    const path = l => {
      const { a, b } = l;
      if (l.kind === "mentor") { const my = (a.y + b.y) / 2; return "M" + b.x + " " + (b.y - R(b)) + " C" + b.x + " " + my + " " + a.x + " " + my + " " + a.x + " " + (a.y + R(a) + 26); }
      return "M" + b.x + " " + (b.y + R(b) + 26) + " C" + b.x + " " + (b.y + 90) + " " + a.x + " " + (a.y - 80) + " " + a.x + " " + (a.y - R(a));
    };
    let defs = "";
    const svgNodes = nodes.map(n => {
      const r = R(n), photo = n.n && safe(n.n.photo);
      if (photo) defs += '<clipPath id="tnc' + n.id + '"><circle r="' + r + '"/></clipPath>';
      const ln = lines(n.name), inst = n.n && n.n.institution ? n.n.institution.name : "";
      return '<g class="tn-node' + (n.self ? " is-self" : "") + (n.co ? " is-co" : "") + (n.tree ? " is-tree" : " is-coonly") + '" data-id="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(n.name) + '" transform="translate(' + n.x.toFixed(1) + " " + n.y.toFixed(1) + ')">' +
        (n.co && !n.self ? '<circle class="tn-co-ring" r="' + (r + 5) + '"/>' : "") +
        '<circle class="tn-dot" r="' + r + '"/>' +
        (photo ? '<image href="' + esc(photo) + '" x="' + -r + '" y="' + -r + '" width="' + 2 * r + '" height="' + 2 * r + '" preserveAspectRatio="xMidYMid slice" clip-path="url(#tnc' + n.id + ')"/>'
               : '<text class="tn-ini" dy="0.35em">' + esc(n.n && n.n.initials || ini(n.name)) + "</text>") +
        (n.n && n.n.nobel ? '<g class="tn-nobel" transform="translate(' + (r * 0.72) + " " + (-r * 0.72) + ')"><circle r="7"/><text dy="0.35em">★</text></g>' : "") +
        ln.map((s, i) => '<text class="tn-name" dy="' + (r + 15 + i * 13) + '">' + esc(s) + "</text>").join("") +
        (inst ? '<text class="tn-inst" dy="' + (r + 15 + ln.length * 13) + '">' + esc(inst.length > 24 ? inst.slice(0, 23) + "…" : inst) + "</text>" : "") +
        "</g>";
    }).join("");
    stage.innerHTML = '<svg class="tn-svg" width="' + Math.round(W) + '" height="' + Math.round(H) + '" viewBox="0 0 ' + Math.round(W) + " " + Math.round(H) + '" role="group" aria-label="Academic tree and co-authors">' +
      "<defs>" + defs + "</defs>" +
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
        p.classList.toggle("is-on", (p.classList.contains("tn-link--mentor") && on.has(a) && on.has(b)) || (p.classList.contains("tn-link--co") && a === n.id));
      });
      if (n.self) {
        side.innerHTML = '<p class="tn-who">' + esc(n.name) + '</p><p class="tn-role">' + esc(tr(n.n.role)) + '</p><p class="tn-hint">' +
          esc(t("me", { g: maxGen, n: coCount, p: pubs.length })) + "</p>";
        return;
      }
      const role = n.n ? tr(n.n.role) : "", inst = n.n && n.n.institution;
      const shared = (n.papers || []);
      side.innerHTML = '<p class="tn-who">' + esc(n.name) + (n.n && n.n.nobel ? ' <span class="tn-badge tn-badge--nobel">' + esc(t("nobel")) + "</span>" : "") + "</p>" +
        (role ? '<p class="tn-role">' + esc(strip(role)) + "</p>" : "") +
        (n.co ? '<p class="tn-badge">' + esc(n.tree ? t("mentorCo") : t("coauthor")) + "</p>" : "") +
        (inst && inst.name ? '<p class="tn-inst-line">' + (safe(inst.url) ? '<a href="' + esc(inst.url) + '" target="_blank" rel="noopener noreferrer">' + esc(inst.name) + " ↗</a>" : esc(inst.name)) + "</p>" : "") +
        (n.n && safe(n.n.url) ? '<p><a class="tn-link-out" href="' + esc(n.n.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t("profile")) + " ↗</a></p>" : "") +
        (shared.length ? '<p class="tn-count">' + esc(shared.length === 1 ? t("papers1") : t("papersN", { n: shared.length })) + '</p><ul class="tn-papers">' +
          shared.map(i => '<li><button type="button" class="tn-paper" data-doi="' + esc(pubs[i].doi) + '"><span class="tn-pt">' + esc(strip(pubs[i].title)) +
            '</span><span class="tn-pm">' + esc(pubs[i].journal + " · " + pubs[i].year) + "</span></button></li>").join("") + "</ul>" : "");
    }
    let current = me.id;
    show(me.id);
    stage.addEventListener("click", e => { if (stage.__dragged) return; const g = e.target.closest(".tn-node"); if (g) { current = +g.dataset.id; show(current); } });
    stage.addEventListener("keydown", e => { const g = e.target.closest(".tn-node"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); current = +g.dataset.id; show(current); } });
    side.addEventListener("click", e => { const b = e.target.closest(".tn-paper"); if (b && window.SiteApp && SiteApp.openPublication) SiteApp.openPublication(b.dataset.doi); });
    new MutationObserver(() => show(current)).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // ---- drag sideways to explore; starts centred on me
    const wrap = stage.parentElement;
    requestAnimationFrame(() => { wrap.scrollLeft = Math.max(0, me.x - wrap.clientWidth / 2); wrap.scrollTop = Math.max(0, me.y - wrap.clientHeight * 0.55); });
    let down = null;
    wrap.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || e.button !== 0) return; down = { x: e.clientX, y: e.clientY, l: wrap.scrollLeft, t: wrap.scrollTop, moved: false }; stage.__dragged = false; });
    addEventListener("pointermove", e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) < 5) return;
      down.moved = true; stage.__dragged = true; wrap.classList.add("is-dragging");
      wrap.scrollLeft = down.l - dx; wrap.scrollTop = down.t - dy;
    });
    addEventListener("pointerup", () => { if (!down) return; down = null; wrap.classList.remove("is-dragging"); setTimeout(() => { stage.__dragged = false; }, 0); });
  }

  window.Hub = {
    render(data) {
      const pubs = ((data.publications && data.publications.works) || []).slice();
      try { treeNet(data.tree, pubs, data["paper-info"]); } catch (e) { console.warn("tree & collaborations", e); }
    }
  };
})();
