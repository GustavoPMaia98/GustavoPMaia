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
    const kids = (n.mentors || []).filter(c => c && !c.hidden && c.name);
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

  // Replace the <!--@news--> / <!--@tree--> placeholders in the loaded section HTML.
  function fill(html, data) {
    return html
      .replace("<!--@news-->", () => news(data.news))
      .replace("<!--@tree-->", () => tree(data.tree));
  }

  window.SiteRender = { fill: fill, news: news, tree: tree, esc: esc, rich: rich, safeUrl: safeUrl };
})();
