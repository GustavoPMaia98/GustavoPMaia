/* Builds the News and Academic Tree sections from data/news.json and
   data/tree.json, producing exactly the markup the hand-written sections used
   (same classes, same English text), so styles, translations, search and the
   tree drag-to-pan keep working unchanged.

   The data files are edited by hand or by the GitHub Actions in .github/workflows
   (LinkedIn import, Chemistry Tree sync). Everything they contain is treated as
   untrusted: only a few formatting tags (<em>, <strong>, …) survive, and links
   must be http(s) or site-relative. */
(function () {
  "use strict";

  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_PT = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
  const ALLOWED_TAGS = /&lt;(\/?)(em|strong|i|b|br|sup|sub)\s*\/?&gt;/gi;

  // Escape text for HTML (keeps entities such as &amp; or &#8599; that are already there).
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z]+);)/gi, "&amp;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  // Escaped text with a small whitelist of formatting tags put back.
  function rich(s) { return esc(s).replace(ALLOWED_TAGS, "<$1$2>"); }
  // Value for an attribute that will itself be used as HTML (data-pt).
  function attrHtml(s) {
    return rich(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  // Only web links or files of this site; anything else (javascript:, data:, …) is dropped.
  function safeUrl(u) {
    u = String(u || "").trim();
    if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return esc(u);
    if (/^[a-z0-9_\-./%]+$/i.test(u) && !u.startsWith("//")) return esc(u);
    return "";
  }
  const ext = 'target="_blank" rel="noopener noreferrer"';

  // ---------------------------------------------------------------- news
  function dateChip(d) {
    const m = String(d || "").match(/^(\d{4})(?:-(\d{2}))?/);
    if (!m) return "";
    if (!m[2]) return '<span class="news-date-chip">' + m[1] + "</span>";
    const i = parseInt(m[2], 10) - 1;
    return '<span class="news-date-chip" data-pt="' + MONTHS_PT[i] + " " + m[1] + '">' + MONTHS_EN[i] + " " + m[1] + "</span>";
  }

  function newsItem(n) {
    const href = safeUrl(n.href);
    const md = n.media || { kind: "logo", src: "images/logos/linkedin.png", alt: "LinkedIn" };
    const cls = ["news-media", md.kind === "photo" ? "news-media--photo" : "news-media--logo"];
    if (md.dark) cls.push("news-media--logo-dark");
    if (md.align === "left") cls.push("news-media--left");
    const text = n.text || {};
    const link = n.link || { en: "Read", pt: "Ler" };
    const media = safeUrl(md.src)
      ? '<span class="' + cls.join(" ") + '"><img src="' + safeUrl(md.src) + '" alt="' + esc(md.alt) + '" loading="lazy"></span>'
      : "";
    const info =
      '<span class="news-info">' +
        dateChip(n.date) +
        '<span class="news-text"' + (text.pt ? ' data-pt="' + attrHtml(text.pt) + '"' : "") + ">" + rich(text.en) + "</span>" +
        (href ? '<span class="news-cta"' + (link.pt ? ' data-pt="' + attrHtml(link.pt + " ↗") + '"' : "") + ">" +
                rich(link.en) + ' <span aria-hidden="true">↗</span></span>' : "") +
      "</span>";
    return '<article class="news-slide">' +
      (href ? '<a class="news-card" href="' + href + '" ' + ext + ">" + media + info + "</a>"
            : '<div class="news-card news-card--static">' + media + info + "</div>") +
      "</article>";
  }

  function news(items) {
    if (!Array.isArray(items)) return "";
    return items
      .filter(n => n && !n.hidden && n.text && n.text.en)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
      .map(newsItem).join("\n");
  }

  // ---------------------------------------------------------------- tree
  function initials(name) {
    const w = String(name || "").trim().split(/\s+/);
    return ((w[0] || "")[0] + ((w.length > 1 ? w[w.length - 1] : "")[0] || "")).toUpperCase();
  }

  function treeNode(n, isSelf) {
    const name = esc(n.name);
    const role = n.role || {};
    const inst = n.institution || {};
    const photo = safeUrl(n.photo);
    const kids = (n.mentors || []).filter(c => c && !c.hidden && !c.cvOnly && c.name);
    return "<li>" +
      '<div class="at-node' + (isSelf ? " at-self" : "") + '">' +
        '<span class="at-avatar">' +
          (photo ? '<img src="' + photo + '" alt="' + name + '" loading="lazy" referrerpolicy="no-referrer">' : "") +
          '<span class="at-initials">' + esc(n.initials || initials(n.name)) + "</span></span>" +
        (n.nobel ? '<span class="at-nobel" role="img" title="Nobel laureate" aria-label="Nobel laureate"><i data-lucide="award"></i></span>' : "") +
        (safeUrl(n.url) ? '<a class="at-name" href="' + safeUrl(n.url) + '" ' + ext + ">" + name + "</a>"
                        : '<span class="at-name">' + name + "</span>") +
        (role.en ? '<span class="at-role"' + (role.pt ? ' data-pt="' + attrHtml(role.pt) + '"' : "") + ">" + rich(role.en) + "</span>" : "") +
        (inst.name ? (safeUrl(inst.url) ? '<a class="at-inst" href="' + safeUrl(inst.url) + '" ' + ext + ">" + esc(inst.name) + " &#8599;</a>"
                                       : '<span class="at-inst">' + esc(inst.name) + "</span>") : "") +
      "</div>" +
      (kids.length ? "<ul>" + kids.map(c => treeNode(c, false)).join("") + "</ul>" : "") +
      "</li>";
  }

  function tree(data) {
    return data && data.root ? "<ul>" + treeNode(data.root, true) + "</ul>" : "";
  }

  // ---------------------------------------------------------------- timelines
  // Presentations, Education, Experience and Courses (data/<name>.json).
  // These files are only ever edited by hand (no automation writes them), so
  // their text may contain any HTML: galleries, links, lists in "details".
  const attr = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const ptAttr = t => (t && t.pt != null && t.pt !== "") ? ' data-pt="' + attr(t.pt) + '"' : "";
  const BADGE = { oral: ["Oral", "Oral"], poster: ["Poster", "Póster"] };

  function timelineItem(it, opts) {
    const cls = ["timeline-item"].concat(it.class ? [it.class] : []).join(" ");
    const type = it.type ? ' data-type="' + attr(it.type) + '"' : "";
    const logo = it.logo
      ? '<img src="' + attr(it.logo.src) + '" alt="' + attr(it.logo.alt || "") + '"' +
        (it.logo.class ? ' class="' + attr(it.logo.class) + '"' : "") + ">"
      : "";
    const m = it.meta || {};
    const meta = opts.badges
      ? '<div class="meta"><span' + ptAttr(m) + ">" + (m.en || "") + "</span>" +
        (BADGE[it.type] ? ' <span class="preso-badge preso-' + it.type + '" data-pt="' + BADGE[it.type][1] + '">' +
                          BADGE[it.type][0] + "</span>" : "") + "</div>"
      : '<div class="meta"' + ptAttr(m) + ">" + (m.en || "") + "</div>";
    const t = it.title || {};
    const s = it.summary;
    return '<div class="' + cls + '"' + type + ">" +
      '<div class="timeline-card"><div class="timeline-header">' + logo +
        "<div><strong" + ptAttr(t) + ">" + (t.en || "") + "</strong>" + meta + "</div></div>" +
        (s && s.en ? "<p><em" + ptAttr(s) + ">" + s.en + "</em></p>" : "") +
      "</div>" +
      (it.details ? '<div class="timeline-expand"><div class="expand-body">' + it.details + "</div></div>" : "") +
      "</div>";
  }

  function timeline(data, opts) {
    if (!data || !Array.isArray(data.items)) return "";
    const shown = data.items.filter(it => it && !it.hidden);
    const now = shown.filter(it => !it.earlier), old = shown.filter(it => it.earlier);
    let html = now.map(it => timelineItem(it, opts || {})).join("\n");
    if (old.length) {                       // Experience: folded "Earlier experience" group
      const l = data.earlierLabel || { en: "Earlier", pt: "Anteriores" };
      html += '<details class="exp-earlier"><summary><span' + ptAttr(l) + ">" + l.en + "</span> " +
              '<span class="exp-earlier-count">' + old.length + "</span></summary>" +
              old.map(it => timelineItem(it, opts || {})).join("\n") + "</details>";
    }
    return html;
  }
  const TIMELINES = { presentations: { badges: true }, education: {}, experience: {}, courses: {} };

  // ---------------------------------------------------------------- career paths
  // <!--@path:experience-->: one step per entry, oldest to newest, in the same
  // markup as the hand-written Education path. Each step opens its entry (found by
  // its details line, data-match); script.js puts the logo in and wires the clicks.
  const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  // what the small label above each step says, per section
  const PATH_KIND = {
    experience: it => ({ kind: it.kind }),
    presentations: it => ({ kind: BADGE[it.type] ? { en: BADGE[it.type][0], pt: BADGE[it.type][1] } : null }),
    courses: (it, parts) => ({ kind: { en: parts.en[0], pt: parts.pt[0] }, drop: 0 })   // "Summer School", "Course", ...
  };
  function pathSteps(data, section) {
    if (!data || !Array.isArray(data.items)) return "";
    const items = data.items.filter(it => it && !it.hidden && it.meta && it.meta.en).map(it => {
      const parts = it.meta.en.split(/\s+·\s+/);
      const ptParts = String(it.meta.pt || "").split(/\s+·\s+/);
      // the date: a part with a month or day and a year ("Aug 2026", "22–26 June 2026"), else any part with a year
      const hasYear = p => /\b(19|20)\d{2}\b/.test(p);
      let i = parts.findIndex(p => hasYear(p) && /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\s–-])/i.test(p));
      if (i < 0) i = parts.findIndex(hasYear);
      const when = i >= 0 ? parts[i] : "";
      const y = +(when.match(/\b(19|20)\d{2}\b/) || [0])[0];
      const mo = MONTHS.indexOf((when.match(/[a-z]{3,}/i) || [""])[0].slice(0, 3).toLowerCase()) + 1;
      const k = (PATH_KIND[section] || PATH_KIND.experience)(it, { en: parts, pt: ptParts.length === parts.length ? ptParts : parts });
      // the place / organisation line: the details without the date (and without the kind, when the kind is one of them)
      const keep = (q, j) => j !== (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\s–-])/i.test(when) ? i : -1) && j !== k.drop;
      const rest = t => { const q = String(t || "").split(/\s+·\s+/); return (q.length === parts.length ? q.filter(keep) : []).join(" · "); };
      return { it, y, sort: y * 100 + mo, kind: k.kind, org: { en: rest(it.meta.en), pt: rest(it.meta.pt) } };
    }).sort((a, b) => a.sort - b.sort);
    return items.map(({ it, y, kind, org }) => {
      const t = it.title || {}, k = kind || {};
      const now = /present|ongoing/i.test(it.meta.en);
      return '<li class="path-step' + (now ? " path-now" : "") + '">' +
        '<button type="button" class="path-btn" data-section="' + section + '" data-match="' + attr(it.meta.en) + '" aria-pressed="false">' +
        '<span class="path-logo" aria-hidden="true"><i data-lucide="briefcase"></i></span>' +
        '<span class="path-year">' + (y || "") + "</span>" +
        (k.en ? '<span class="path-kind"' + ptAttr(k) + ">" + k.en + "</span>" : "") +
        '<span class="path-place"' + ptAttr(t) + ">" + (t.en || "") + "</span>" +
        (org.en ? '<span class="path-what"' + (org.pt ? ' data-pt="' + attr(org.pt) + '"' : "") + ">" + org.en + "</span>" : "") +
        "</button></li>";
    }).join("\n");
  }

  // ---------------------------------------------------------------- blog
  // data/blog.json is edited by hand only, so the post body may contain HTML.
  function blog(data) {
    const posts = ((data && data.posts) || []).filter(p => p && !p.hidden && p.title && p.title.en)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (!posts.length) return "";
    return '<div class="timeline blog-list">' + posts.map(p => {
      const d = String(p.date || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
      const tags = (p.tags || []).map(t => typeof t === "string" ? { en: t } : t)
        .map(t => "<span" + ptAttr(t) + ">" + esc(t.en) + "</span>").join("");
      return '<article class="timeline-item blog-post"><div class="timeline-card blog-card"><div class="blog-head">' +
        (d ? '<time class="blog-date" datetime="' + d[0] + '">' + d[3] + "/" + d[2] + "/" + d[1] + "</time>" : "") +
        (tags ? '<div class="blog-tags">' + tags + "</div>" : "") + "</div>" +
        '<h3 class="blog-title"' + ptAttr(p.title) + ">" + p.title.en + "</h3>" +
        (p.summary && p.summary.en ? '<p class="blog-excerpt"' + ptAttr(p.summary) + ">" + p.summary.en + "</p>" : "") +
        "</div>" +
        (p.body && p.body.en ? '<div class="timeline-expand"><div class="expand-body blog-full"' + ptAttr(p.body) + ">" + p.body.en + "</div></div>" : "") +
        "</article>";
    }).join("\n") + "</div>";
  }

  // Replace the <!--@news--> / <!--@tree--> / <!--@timeline:name--> placeholders
  // in the loaded section HTML.
  function fill(html, data) {
    html = html
      .replace("<!--@news-->", () => news(data.news))
      .replace("<!--@tree-->", () => tree(data.tree))
      .replace("<!--@blog-->", () => blog(data.blog));
    Object.keys(TIMELINES).forEach(name => {
      html = html.replace("<!--@timeline:" + name + "-->", () => timeline(data[name], TIMELINES[name]));
    });
    ["experience", "presentations", "courses"].forEach(name => {
      html = html.replace("<!--@path:" + name + "-->", () => pathSteps(data[name], name));
    });
    return updatedLabels(html, data.updated);
  }

  // "Updated dd/mm/yyyy" under each section heading (dates from data/updated.json,
  // written every night by tools/update_dates.py).
  function updatedLabels(html, dates) {
    if (!dates) return html;
    Object.keys(dates).forEach(id => {
      const m = String(dates[id]).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m || !/^[a-z-]+$/.test(id)) return;
      const label = '<p class="sec-updated"><span data-pt="Atualizado">Updated</span> ' +
                    '<time datetime="' + m[0] + '">' + m[3] + "/" + m[2] + "/" + m[1] + "</time></p>";
      html = html.replace(new RegExp('(id="' + id + '"[^>]*>[\\s\\S]*?</h2>)'), "$1" + label);
    });
    return html;
  }

  window.SiteRender = { fill: fill, news: news, tree: tree, timeline: timeline, blog: blog, timelines: Object.keys(TIMELINES),
                        esc: esc, rich: rich, safeUrl: safeUrl };
})();
