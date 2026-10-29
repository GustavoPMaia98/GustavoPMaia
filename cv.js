/* Builds cv.html from the website's own content, so the CV never needs
   separate updating:
     data/education.json, experience.json, presentations.json, courses.json
     data/publications.json + sections/publications.html  (papers)
     sections/awards.html, sections/funding.html, sections/experience.html (skills)
     script.js (profile text, English and Portuguese)
   English by default, Portuguese with ?lang=pt. */
(function () {
  "use strict";
  const lang = new URLSearchParams(location.search).get("lang") === "pt" ? "pt" : "en";
  document.documentElement.lang = lang;
  const L = {
    en: { profile: "Profile", education: "Education", experience: "Research & professional experience",
          publications: "Publications", presentations: "Presentations", awards: "Awards", funding: "Funding",
          courses: "Courses & training", skills: "Techniques & software", back: "Website", pdf: "Download PDF",
          print: "Print / save as PDF", updated: "Generated from gustavopmaia98.github.io/GustavoPMaia on",
          oral: "Oral", poster: "Poster" },
    pt: { profile: "Perfil", education: "Formação", experience: "Experiência profissional e de investigação",
          publications: "Publicações", presentations: "Comunicações", awards: "Prémios", funding: "Financiamento",
          courses: "Cursos e formações", skills: "Técnicas e software", back: "Website", pdf: "Descarregar PDF",
          print: "Imprimir / guardar PDF", updated: "Gerado a partir de gustavopmaia98.github.io/GustavoPMaia em",
          oral: "Oral", poster: "Póster" }
  }[lang];

  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const text = html => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent.replace(/\s+/g, " ").trim(); };
  const pick = o => o ? text(lang === "pt" && o.pt ? o.pt : o.en) : "";
  const getJSON = n => fetch("data/" + n + ".json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).catch(() => null);
  const getDoc = n => fetch("sections/" + n + ".html", { cache: "no-cache" }).then(r => r.ok ? r.text() : "")
    .then(t => new DOMParser().parseFromString("<body>" + t + "</body>", "text/html")).catch(() => null);
  const ptOf = el => el ? (lang === "pt" && el.getAttribute("data-pt") ? text(el.getAttribute("data-pt")) : text(el.innerHTML)) : "";

  // "Nov 2024 – Dec 2024 · NASA Goddard" -> { when: "Nov 2024 – Dec 2024", rest: "NASA Goddard" }
  // a date starts with a month, a day ("22–26 June 2026") or a year ("2023–2027"),
  // but not a code such as the grant number "2023.01099.BD"
  const DATE = /^(jan|feb|fev|mar|apr|abr|may|mai|jun|jul|aug|ago|sep|set|oct|out|nov|dec|dez|\d{1,2}[\s–-]|\d{4}(?![.\d]))/i;
  function splitMeta(meta) {
    const parts = meta.split(/\s+·\s+/);
    const i = parts.findIndex(p => DATE.test(p) && /\d{4}/.test(p));
    if (i < 0) {                       // no date part: use the year mentioned, e.g. "EANA 2025"
      const y = meta.match(/\b(19|20)\d{2}\b/);
      return { when: y ? y[0] : "", rest: meta };
    }
    const when = parts.splice(i, 1)[0];
    return { when, rest: parts.join(" · ") };
  }
  function entry(when, title, sub, note) {
    return '<div class="cv-entry"><div class="cv-when">' + esc(when) + '</div><div class="cv-what">' +
      '<div class="cv-title">' + title + "</div>" + (sub ? '<div class="cv-sub">' + esc(sub) + "</div>" : "") +
      (note ? '<div class="cv-note">' + esc(note) + "</div>" : "") + "</div></div>";
  }
  function timelineSection(key, data, opts) {
    if (!data || !Array.isArray(data.items)) return "";
    const rows = data.items.filter(it => !it.hidden).map(it => {
      const m = splitMeta(pick(it.meta));
      const badge = opts && opts.badges && L[it.type] ? '<span class="cv-tag">' + L[it.type] + "</span>" : "";
      return entry(m.when, esc(pick(it.title)) + badge, m.rest, opts && opts.summary ? pick(it.summary) : "");
    });
    return rows.length ? "<h2>" + L[key] + "</h2>" + rows.join("") : "";
  }
  const ME = /(Gustavo\s+(P\.|Pinho)\s+Maia|G\.\s*P\.\s*Maia|Gustavo\s+Maia)/g;

  function publications(doc, db) {
    const items = [], seen = new Set();
    if (doc) doc.querySelectorAll(".timeline-item.publication").forEach(it => {
      const title = text((it.querySelector(".timeline-header strong") || {}).innerHTML);
      const meta = text((it.querySelector(".meta") || {}).innerHTML).split(/\s+·\s+/);
      const a = it.querySelector('a[href*="doi.org/"]');
      const doi = a ? decodeURIComponent(a.getAttribute("href").replace(/^.*doi\.org\//, "")) : "";
      if (doi) seen.add(doi.toLowerCase());
      items.push({ title, authors: meta[0] || "", year: meta[1] || "", journal: meta.slice(2).join(" · "), doi });
    });
    ((db && db.works) || []).forEach(w => {
      if (!w.doi || seen.has(w.doi.toLowerCase()) || w.hidden || !(w.verified || []).length) return;
      items.push({ title: w.title, authors: w.authors, year: String(w.year || ""), journal: w.journal, doi: w.doi });
    });
    items.sort((x, y) => (parseInt(y.year, 10) || 0) - (parseInt(x.year, 10) || 0));
    if (!items.length) return "";
    return "<h2>" + L.publications + '</h2><ol class="cv-pubs">' + items.map(p =>
      "<li>" + esc(p.authors).replace(ME, '<span class="cv-me">$1</span>') + " (" + esc(p.year) + "). " +
      "<b>" + esc(p.title) + "</b>. <i>" + esc(p.journal) + "</i>." +
      (p.doi ? ' <a href="https://doi.org/' + esc(p.doi) + '">doi:' + esc(p.doi) + "</a>" : "") + "</li>").join("") + "</ol>";
  }
  function awards(doc) {
    if (!doc) return "";
    const rows = [...doc.querySelectorAll(".award-card")].map(c =>
      entry(text((c.querySelector(".award-year") || {}).innerHTML), esc(ptOf(c.querySelector(".award-title"))),
            ptOf(c.querySelector(".award-issuer")), ""));
    return rows.length ? "<h2>" + L.awards + "</h2>" + rows.join("") : "";
  }
  function funding(doc) {
    if (!doc) return "";
    const rows = [...doc.querySelectorAll(".timeline-item")].map(it => {
      const m = splitMeta(ptOf(it.querySelector(".meta")));
      return entry(m.when, esc(ptOf(it.querySelector("strong"))), m.rest, "");
    });
    return rows.length ? "<h2>" + L.funding + "</h2>" + rows.join("") : "";
  }
  function skills(doc) {
    if (!doc) return "";
    const groups = [...doc.querySelectorAll(".skill-card")].map(c =>
      "<p><b>" + esc(ptOf(c.querySelector(".skill-card-title"))) + "</b>" +
      esc([...c.querySelectorAll(".skill-item-name")].map(n => ptOf(n)).join(", ")) + "</p>");
    return groups.length ? "<h2>" + L.skills + '</h2><div class="cv-skills">' + groups.join("") + "</div>" : "";
  }
  // Profile sentences live in script.js (I18N table) in both languages.
  function profileText(src) {
    const get = key => {
      const m = src.match(new RegExp("\\b" + key + ':\\{en:"((?:[^"\\\\]|\\\\.)*)",pt:"((?:[^"\\\\]|\\\\.)*)"'));
      return m ? (lang === "pt" ? m[2] : m[1]).replace(/\\(.)/g, "$1") : "";
    };
    return { role: get("role"), bio: get("bio"), opento: get("opento") };
  }

  Promise.all([
    getJSON("education"), getJSON("experience"), getJSON("presentations"), getJSON("courses"), getJSON("publications"),
    getDoc("publications"), getDoc("awards"), getDoc("funding"), getDoc("experience"),
    fetch("script.js").then(r => r.text()).catch(() => "")
  ]).then(([edu, exp, pres, courses, pubdb, pubDoc, awDoc, funDoc, expDoc, js]) => {
    const prof = profileText(js);
    const html =
      '<header class="cv-head"><img class="cv-photo" src="images/avatar.jpg" alt="">' +
      '<div><h1 class="cv-name">Gustavo Pinho Maia</h1>' +
      '<p class="cv-role">' + esc(prof.role || "PhD Researcher in Chemistry · Astrobiology") + "</p>" +
      '<p class="cv-contact"><span><a href="#" id="cvMail" data-user="gustavopinho.maia" data-domain="mnhn.fr"></a></span>' +
      '<span><a href="https://orcid.org/0000-0001-5314-8816">ORCID 0000-0001-5314-8816</a></span>' +
      '<span><a href="https://gustavopmaia98.github.io/GustavoPMaia/">gustavopmaia98.github.io/GustavoPMaia</a></span>' +
      '<span><a href="https://www.linkedin.com/in/gustavopinhomaia">linkedin.com/in/gustavopinhomaia</a></span>' +
      '<span><a href="https://www.cienciavitae.pt/portal/en/8212-CEE3-E928">CiênciaVitae 8212-CEE3-E928</a></span></p></div></header>' +
      (prof.bio ? "<h2>" + L.profile + '</h2><p class="cv-profile">' + esc(prof.bio) +
        (prof.opento ? " <b>" + esc(prof.opento) + ".</b>" : "") + "</p>" : "") +
      timelineSection("education", edu, { summary: true }) +
      timelineSection("experience", exp, {}) +
      publications(pubDoc, pubdb) +
      timelineSection("presentations", pres, { badges: true, summary: true }) +
      awards(awDoc) + funding(funDoc) +
      timelineSection("courses", courses, {}) +
      skills(expDoc) +
      '<p class="cv-foot">' + L.updated + " " + new Date().toISOString().slice(0, 10) + ".</p>";
    const cv = document.getElementById("cv");
    cv.innerHTML = html;
    // email text is put together here, so it is not in the page source
    const mail = document.getElementById("cvMail");
    mail.textContent = mail.dataset.user + "@" + mail.dataset.domain;
    cv.setAttribute("aria-busy", "false");
    document.documentElement.dataset.cvReady = "1";   // tools/build_cv.py waits for this
  });

  // top bar: labels, language, PDF (falls back to the print dialog until the
  // nightly job has made the PDF)
  document.querySelectorAll("[data-l]").forEach(el => { el.textContent = L[el.dataset.l]; });
  document.querySelectorAll("[data-set-lang]").forEach(a => a.setAttribute("aria-current", String(a.dataset.setLang === lang)));
  const pdf = document.getElementById("cvPdf");
  pdf.href = lang === "pt" ? "cv-pt.pdf" : "cv.pdf";
  fetch(pdf.href, { method: "HEAD", cache: "no-cache" }).then(r => { if (!r.ok) throw 0; }).catch(() => {
    pdf.removeAttribute("download");
    pdf.querySelector("span").textContent = L.print;
    pdf.addEventListener("click", e => { e.preventDefault(); window.print(); });
  });
})();
