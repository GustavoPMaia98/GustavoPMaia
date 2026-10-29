/* Builds cv.html from the website's own content, so the CV never needs
   separate updating. Everything shown on the site goes in:
     sections/highlights.html (research interests), data/education.json,
     data/experience.json, data/tree.json (supervisors, including "cvOnly" ones), data/publications.json +
     sections/publications.html, data/presentations.json, sections/awards.html,
     sections/funding.html, data/courses.json, sections/experience.html (skills),
     data/news.json (media & recognition), script.js (profile text).
   Languages: English, Portuguese (the data files' "pt"), French and Japanese (the
   website's dictionary, i18n/translations.js). Every date is parsed and written in
   one format per language. ?lang=en|pt|fr|ja, else the language chosen on the
   website, else the browser's. */
(function () {
  "use strict";
  const LANGS = ["en", "pt", "fr", "ja"];
  const lang = (function () {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.indexOf(q) !== -1) return q;
    let saved = null; try { saved = localStorage.getItem("lang"); } catch (e) {}
    if (LANGS.indexOf(saved) !== -1) return saved;
    const b = String(navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.indexOf(b) !== -1 ? b : "en";
  })();
  document.documentElement.lang = lang;

  const L = {
    en: { profile: "Profile", interests: "Research interests", education: "Education",
          experience: "Research & professional experience", supervisors: "Supervisors", publications: "Peer-reviewed publications",
          presentations: "Conference presentations", awards: "Awards & distinctions", funding: "Funding",
          courses: "Courses & training", skills: "Techniques & software", media: "Media & recognition",
          keywords: "Keywords", cited: "Cited by", present: "Present", back: "Website", pdf: "Download PDF",
          print: "Print / save as PDF", generated: "Generated from the website on", oral: "Oral", poster: "Poster",
          email: "Email", web: "Website" },
    pt: { profile: "Perfil", interests: "Interesses de investigação", education: "Formação académica",
          experience: "Experiência profissional e de investigação", supervisors: "Orientadores", publications: "Publicações com revisão por pares",
          presentations: "Comunicações em conferências", awards: "Prémios e distinções", funding: "Financiamento",
          courses: "Cursos e formações", skills: "Técnicas e software", media: "Comunicação social e reconhecimento",
          keywords: "Palavras-chave", cited: "Citado", present: "presente", back: "Website", pdf: "Descarregar PDF",
          print: "Imprimir / guardar PDF", generated: "Gerado a partir do website em", oral: "Oral", poster: "Póster",
          email: "Email", web: "Website" },
    fr: { profile: "Profil", interests: "Thèmes de recherche", education: "Formation",
          experience: "Expérience professionnelle et de recherche", supervisors: "Encadrants", publications: "Publications à comité de lecture",
          presentations: "Communications en conférence", awards: "Prix et distinctions", funding: "Financements",
          courses: "Cours et formations", skills: "Techniques et logiciels", media: "Médias et reconnaissance",
          keywords: "Mots-clés", cited: "Cité", present: "aujourd’hui", back: "Site web", pdf: "Télécharger le PDF",
          print: "Imprimer / enregistrer en PDF", generated: "Généré à partir du site web le", oral: "Orale", poster: "Poster",
          email: "Courriel", web: "Site web" },
    ja: { profile: "プロフィール", interests: "研究テーマ", education: "学歴",
          experience: "研究・職務経歴", supervisors: "指導教員", publications: "査読付き論文",
          presentations: "学会発表", awards: "受賞歴", funding: "研究資金",
          courses: "研修・講習", skills: "技術・ソフトウェア", media: "メディア・表彰",
          keywords: "キーワード", cited: "被引用", present: "現在", back: "ウェブサイト", pdf: "PDFをダウンロード",
          print: "印刷 / PDFに保存", generated: "ウェブサイトから生成：", oral: "口頭", poster: "ポスター",
          email: "メール", web: "ウェブサイト" }
  }[lang];

  // ---------------------------------------------------------------- text
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const plain = html => { const d = document.createElement("div"); d.innerHTML = html || ""; return d.textContent.replace(/\s+/g, " ").trim(); };
  const key = s => String(s || "").replace(/\s+/g, " ").trim();
  // One text in the CV language: Portuguese from the data, French/Japanese from the dictionary.
  function tr(en, pt) {
    if (lang === "pt") return plain(pt || en);
    if (lang === "fr" || lang === "ja") {
      const d = window.TR && window.TR[lang];
      const v = d && d[key(en)];
      return plain(v != null ? v : en);
    }
    return plain(en);
  }
  const pick = o => o ? tr(o.en, o.pt) : "";
  const fromEl = el => el ? tr(el.innerHTML, el.getAttribute("data-pt")) : "";

  // ---------------------------------------------------------------- dates
  const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const NAMES = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    pt: ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."],
    fr: ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
  };
  function fmt(d) {                                  // {y, m?, day?} in the CV language
    if (!d) return "";
    if (!d.m) return lang === "ja" ? d.y + "年" : String(d.y);
    if (lang === "ja") return d.y + "年" + d.m + "月" + (d.day ? d.day + "日" : "");
    return (d.day ? d.day + " " : "") + NAMES[lang][d.m - 1] + " " + d.y;
  }
  function side(s) {
    const y = s.match(/\b(19|20)\d{2}\b/);
    const mo = (s.match(/[a-z]{3,}/gi) || []).map(w => MON.indexOf(w.slice(0, 3).toLowerCase())).find(i => i >= 0);
    const day = s.replace(/\b(19|20)\d{2}\b/, "").match(/\b\d{1,2}\b/);
    return { y: y ? +y[0] : null, m: mo != null && mo >= 0 ? mo + 1 : null, day: day ? +day[0] : null };
  }
  // English date text (as written on the site) -> "Nov 2024 – Present" in the CV language
  function when(s) {
    s = key(s);
    if (!s) return "";
    const parts = s.split(/\s*[–—-]\s*/);
    if (parts.length === 1) { const a = side(s); return a.y ? fmt({ y: a.y, m: a.m }) : s; }
    const a = side(parts[0]), b = /present|ongoing|now/i.test(parts[1]) ? null : side(parts[1]);
    if (b && !a.y) a.y = b.y;                        // "Aug–Sep 2022", "Jun – Nov 2023"
    if (b && !a.m && a.day) a.m = b.m;               // "22–26 June 2026" -> one month
    const A = a.y ? { y: a.y, m: a.m } : null, B = b && b.y ? { y: b.y, m: b.m } : null;
    if (A && B && A.y === B.y && A.m === B.m) return fmt(A);
    return fmt(A) + " – " + (b ? fmt(B) : L.present);
  }
  // start date as a number (yyyymm) to list entries newest first
  function startKey(s) {
    const parts = key(s).split(/\s*[–—-]\s*/);
    const a = side(parts[0]), b = parts[1] ? side(parts[1]) : {};
    return (a.y || b.y || 0) * 100 + (a.m || (a.day ? b.m : 0) || 0);
  }
  // The date part of a details line ("Nov 2024 – Dec 2024 · NASA ...") and the rest,
  // the rest taken from the same line in the CV language.
  const DATE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[\s–-]|\d{4}(?![.\d]))/i;
  function splitMeta(enMeta, localMeta) {
    const en = key(plain(enMeta)).split(/\s+·\s+/);
    const i = en.findIndex(p => DATE.test(p) && /\d{4}/.test(p));
    if (i < 0) {                                     // no date part: the year mentioned ("EANA 2025")
      const y = enMeta.match(/\b(19|20)\d{2}\b/);
      return { when: y ? fmt({ y: +y[0] }) : "", rest: localMeta, sort: y ? +y[0] * 100 : 0 };
    }
    const loc = localMeta.split(/\s+·\s+/);
    const rest = loc.length === en.length ? loc.filter((_, j) => j !== i) : en.filter((_, j) => j !== i);
    return { when: when(en[i]), rest: rest.join(" · "), sort: startKey(en[i]) };
  }

  // ---------------------------------------------------------------- blocks
  // section heading with a small line icon (Lucide, as on the website)
  const section = (title, body, icon) => body ? '<section class="cv-sec"><h2>' +
    (icon ? '<span class="cv-ico" aria-hidden="true"><i data-lucide="' + icon + '"></i></span>' : "") +
    "<span>" + esc(title) + "</span></h2>" + body + "</section>" : "";
  const safeSrc = s => /^images\/[\w./ -]+$/.test(String(s || "")) ? s : "";
  function entry(w, title, sub, note, desc, logo) {
    logo = safeSrc(logo);
    return '<div class="cv-entry' + (logo ? " cv-entry--logo" : "") + '"><div class="cv-when">' + esc(w) + "</div>" +
      (logo ? '<img class="cv-logo" src="' + esc(logo) + '" alt="">' : "") + '<div class="cv-what">' +
      (title ? '<div class="cv-title">' + title + "</div>" : "") +
      (sub ? '<div class="cv-sub">' + esc(sub) + "</div>" : "") +
      (note ? '<div class="cv-note">' + esc(note) + "</div>" : "") +
      (desc ? '<div class="cv-desc">' + esc(desc) + "</div>" : "") + "</div></div>";
  }
  // first paragraph of an item's opened text, in the CV language
  function firstPara(details) {
    if (!details) return "";
    const d = document.createElement("div"); d.innerHTML = details;
    const p = d.querySelector("p");
    return p ? fromEl(p) : "";
  }
  function timeline(data, opts) {
    if (!data || !Array.isArray(data.items)) return "";
    return data.items.filter(it => !it.hidden).map(it => ({ it, m: splitMeta(it.meta ? it.meta.en : "", pick(it.meta)) }))
      .sort((x, y) => y.m.sort - x.m.sort)          // newest first (stable for equal dates)
      .map(({ it, m }) => {
        const tag = opts.badges && L[it.type] ? '<span class="cv-tag">' + esc(L[it.type]) + "</span>" : "";
        return entry(m.when, esc(pick(it.title)) + tag, m.rest, opts.summary ? pick(it.summary) : "",
                     opts.desc && !it.earlier ? firstPara(it.details) : "", opts.logos && it.logo ? it.logo.src : "");
      }).join("");
  }
  const ME = /(Gustavo\s+(P\.|Pinho)\s+Maia|G\.\s*P\.\s*Maia|Gustavo\s+Maia)/g;
  function publications(doc, db) {
    const byDoi = {};
    ((db && db.works) || []).forEach(w => { if (w.doi) byDoi[w.doi.toLowerCase()] = w; });
    const items = [], seen = new Set();
    if (doc) doc.querySelectorAll(".timeline-item.publication").forEach(it => {
      const meta = plain((it.querySelector(".meta") || {}).innerHTML).split(/\s+·\s+/);
      const a = it.querySelector('a[href*="doi.org/"]');
      const doi = a ? decodeURIComponent(a.getAttribute("href").replace(/^.*doi\.org\//, "")) : "";
      if (doi) seen.add(doi.toLowerCase());
      items.push(Object.assign({ title: plain((it.querySelector(".timeline-header strong") || {}).innerHTML),
        authors: meta[0] || "", year: meta[1] || "", journal: meta.slice(2).join(" · "), doi }, byDoi[doi.toLowerCase()] ? {
          volume: byDoi[doi.toLowerCase()].volume, issue: byDoi[doi.toLowerCase()].issue, pages: byDoi[doi.toLowerCase()].pages,
          keywords: byDoi[doi.toLowerCase()].keywords, cited_by: byDoi[doi.toLowerCase()].cited_by } : {}));
    });
    ((db && db.works) || []).forEach(w => {
      if (!w.doi || seen.has(w.doi.toLowerCase()) || w.hidden || !(w.verified || []).length) return;
      items.push(Object.assign({}, w, { year: String(w.year || "") }));
    });
    items.sort((x, y) => (parseInt(y.year, 10) || 0) - (parseInt(x.year, 10) || 0));
    if (!items.length) return "";
    return '<ol class="cv-pubs">' + items.map(p => {
      const vol = p.volume ? " " + esc(p.volume) + (p.issue ? "(" + esc(p.issue) + ")" : "") + (p.pages ? ", " + esc(p.pages) : "") : "";
      const extra = [];
      if (p.keywords && p.keywords.length) extra.push("<span>" + esc(L.keywords) + ": " + esc(p.keywords.join(", ")) + "</span>");
      if (+p.cited_by > 0) extra.push("<span>" + esc(L.cited) + ": " + (+p.cited_by) + "</span>");
      return "<li>" + esc(p.authors).replace(ME, '<span class="cv-me">$1</span>') + " (" + esc(p.year) + "). " +
        '<span class="cv-ptitle">' + esc(p.title) + "</span>. <i>" + esc(p.journal) + "</i>" + vol + "." +
        (p.doi ? ' <a href="https://doi.org/' + esc(p.doi) + '">https://doi.org/' + esc(p.doi) + "</a>" : "") +
        (extra.length ? '<div class="cv-pmeta">' + extra.join("") + "</div>" : "") + "</li>";
    }).join("") + "</ol>";
  }
  // the research highlights shown in the Current Work Interests carousel
  function interests(doc) {
    if (!doc) return "";
    const cards = [...doc.querySelectorAll(".hl-card")];
    return cards.length ? '<ul class="cv-interests">' + cards.map(c =>
      "<li><b>" + esc(fromEl(c.querySelector(".hl-title")).replace(/([^.?!？。])$/, "$1.")) + "</b> " +
      esc(fromEl(c.querySelector(".hl-text"))) + "</li>").join("") + "</ul>" : "";
  }
  function supervisors(tree) {
    const ms = ((tree && tree.root && tree.root.mentors) || []).filter(m => !m.hidden);
    return ms.length ? '<ul class="cv-list">' + ms.map(m => "<li><b>" + esc(m.name) + "</b> · " +
      esc([pick(m.role), m.institution ? tr(m.institution.name) : ""].filter(Boolean).join(" · ")) + "</li>").join("") + "</ul>" : "";
  }
  function awards(doc) {
    if (!doc) return "";
    return [...doc.querySelectorAll(".award-card")].map(c =>
      entry(fmt({ y: +plain((c.querySelector(".award-year") || {}).innerHTML) || null }) || "",
            esc(fromEl(c.querySelector(".award-title"))), fromEl(c.querySelector(".award-issuer")), "",
            fromEl(c.querySelector(".award-desc")))).join("");
  }
  function funding(doc) {
    if (!doc) return "";
    return [...doc.querySelectorAll(".timeline-item")].map(it => {
      const meta = it.querySelector(".meta");
      const m = splitMeta(meta ? meta.innerHTML : "", fromEl(meta));
      const a = it.querySelector('a[href*="doi.org/"]');
      return entry(m.when, esc(fromEl(it.querySelector("strong"))), m.rest, a ? "DOI: " + plain(a.innerHTML) : "", "");
    }).join("");
  }
  function skills(doc) {
    if (!doc) return "";
    const groups = [...doc.querySelectorAll(".skill-card")].map(c =>
      "<tr><th>" + esc(fromEl(c.querySelector(".skill-card-title"))) + "</th><td>" +
      esc([...c.querySelectorAll(".skill-item-name")].map(fromEl).join(", ")) + "</td></tr>");
    return groups.length ? '<table class="cv-skills">' + groups.join("") + "</table>" : "";
  }
  function media(news) {
    return (news || []).filter(n => n && !n.hidden && n.text && /Featured|Interview|Recogni[sz]ed/i.test(n.text.en))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map(n => {
        const d = String(n.date || "").match(/^(\d{4})(?:-(\d{2}))?/);
        return entry(d ? fmt({ y: +d[1], m: d[2] ? +d[2] : null }) : "", "", "", "", pick(n.text));
      }).join("");
  }
  // profile sentences: the I18N table in script.js (EN + PT; FR/JA via the dictionary)
  function profileText(src) {
    const get = k => {
      const m = src.match(new RegExp("\\b" + k + ':\\{en:"((?:[^"\\\\]|\\\\.)*)",pt:"((?:[^"\\\\]|\\\\.)*)"'));
      return m ? tr(m[1].replace(/\\(.)/g, "$1"), m[2].replace(/\\(.)/g, "$1")) : "";
    };
    return { role: get("role"), bio: get("bio"), opento: get("opento") };
  }

  const contact = (icon, label, link) => '<li><span class="cv-cico" aria-hidden="true">' + icon + "</span><span>" + esc(label) + "</span>" + link + "</li>";

  // ---------------------------------------------------------------- load
  const getJSON = n => fetch("data/" + n + ".json", { cache: "no-cache" }).then(r => r.ok ? r.json() : null).catch(() => null);
  const getDoc = n => fetch("sections/" + n + ".html", { cache: "no-cache" }).then(r => r.ok ? r.text() : "")
    .then(t => new DOMParser().parseFromString("<body>" + t + "</body>", "text/html")).catch(() => null);
  const dictionary = (lang === "fr" || lang === "ja") ? new Promise(res => {
    const s = document.createElement("script"); s.src = "i18n/translations.js"; s.onload = res; s.onerror = res;
    document.head.appendChild(s);
  }) : Promise.resolve();
  if (lang === "ja") {                               // Japanese needs a font with kanji/kana
    const l = document.createElement("link"); l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700&display=swap";
    document.head.appendChild(l);
  }

  Promise.all([
    getJSON("education"), getJSON("experience"), getJSON("presentations"), getJSON("courses"), getJSON("publications"),
    getJSON("tree"), getJSON("news"),
    getDoc("highlights"), getDoc("publications"), getDoc("awards"), getDoc("funding"), getDoc("experience"),
    fetch("script.js").then(r => r.text()).catch(() => ""), dictionary
  ]).then(([edu, exp, pres, courses, pubdb, tree, news, hlDoc, pubDoc, awDoc, funDoc, expDoc, js]) => {
    const prof = profileText(js);
    const today = new Date();
    const html =
      '<header class="cv-head"><div class="cv-head-text">' +
        '<h1 class="cv-name">Gustavo Pinho Maia</h1>' +
        '<p class="cv-role">' + esc(prof.role || "PhD Researcher in Chemistry · Astrobiology") + "</p>" +
        '<ul class="cv-contact">' +
          contact('<i data-lucide="mail"></i>', L.email, '<a href="#" id="cvMail" data-user="gustavopinho.maia" data-domain="mnhn.fr"></a>') +
          contact('<img src="images/logos/orcid.png" alt="">', "ORCID", '<a href="https://orcid.org/0000-0001-5314-8816">0000-0001-5314-8816</a>') +
          contact('<i data-lucide="globe"></i>', L.web, '<a href="https://gustavopmaia98.github.io/GustavoPMaia/">gustavopmaia98.github.io/GustavoPMaia</a>') +
          contact('<img src="images/logos/linkedin.png" alt="">', "LinkedIn", '<a href="https://www.linkedin.com/in/gustavopinhomaia">linkedin.com/in/gustavopinhomaia</a>') +
          contact('<i data-lucide="id-card"></i>', "CiênciaVitae", '<a href="https://www.cienciavitae.pt/portal/en/8212-CEE3-E928">8212-CEE3-E928</a>') +
          contact('<i data-lucide="graduation-cap"></i>', "Google Scholar", '<a href="https://scholar.google.com/citations?user=TTVIFykAAAAJ">TTVIFykAAAAJ</a>') +
        "</ul></div>" +
        '<figure class="cv-portrait"><img class="cv-photo" src="images/cv-photo.jpg" alt="">' +
          '<figcaption>' + esc(tr("<em>Credit: IMPMC · Cécile Duflot</em>", "<em>Crédito: IMPMC · Cécile Duflot</em>")) + "</figcaption></figure></header>" +
      section(L.profile, prof.bio ? '<p class="cv-profile">' + esc(prof.bio) +
        (prof.opento ? ' <span class="cv-open">' + esc(prof.opento) + ".</span>" : "") + "</p>" : "", "user") +
      section(L.interests, interests(hlDoc), "atom") +
      section(L.education, timeline(edu, { summary: true, desc: true, logos: true }), "graduation-cap") +
      section(L.experience, timeline(exp, { desc: true, logos: true }), "flask-conical") +
      section(L.supervisors, supervisors(tree), "users") +
      section(L.publications, publications(pubDoc, pubdb), "book-open") +
      section(L.presentations, timeline(pres, { badges: true, summary: true }), "presentation") +
      section(L.awards, awards(awDoc), "award") +
      section(L.funding, funding(funDoc), "landmark") +
      section(L.courses, timeline(courses, { summary: true }), "notebook-pen") +
      section(L.skills, skills(expDoc), "microscope") +
      section(L.media, media(news), "newspaper") +
      '<p class="cv-foot">' + esc(L.generated) + (lang === "ja" ? "" : " ") +
        fmt({ y: today.getFullYear(), m: today.getMonth() + 1, day: today.getDate() }) + (lang === "ja" ? "" : ".") + "</p>";
    const cv = document.getElementById("cv");
    cv.innerHTML = html;
    // the email text is put together here, so it is not in the page source
    const mail = document.getElementById("cvMail");
    mail.textContent = mail.dataset.user + "@" + mail.dataset.domain;
    if (window.lucide && lucide.createIcons) try { lucide.createIcons({ attrs: { "stroke-width": 1.8 } }); } catch (e) {}
    cv.setAttribute("aria-busy", "false");
    document.documentElement.dataset.cvReady = "1";  // tools/build_cv.py waits for this
  });

  // top bar: labels, language, PDF (the print dialog until the nightly PDF exists)
  document.querySelectorAll("[data-l]").forEach(el => { el.textContent = L[el.dataset.l]; });
  document.querySelectorAll("[data-set-lang]").forEach(a => a.setAttribute("aria-current", String(a.dataset.setLang === lang)));
  const pdf = document.getElementById("cvPdf");
  pdf.href = lang === "en" ? "cv.pdf" : "cv-" + lang + ".pdf";
  fetch(pdf.href, { method: "HEAD", cache: "no-cache" }).then(r => { if (!r.ok) throw 0; }).catch(() => {
    pdf.removeAttribute("download");
    pdf.querySelector("span").textContent = L.print;
    pdf.addEventListener("click", e => { e.preventDefault(); window.print(); });
  });
})();
