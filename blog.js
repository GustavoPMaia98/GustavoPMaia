/* blog.html: the Blog page. Shows the published posts of data/blog.json; while there
   are none, a "being synthesized" note. Language: ?lang=, else the one chosen on the
   main site, else the browser's. */
(function () {
  "use strict";
  const T = {
    en: { site: "Personal website", back: "← Back to the research website", title: "The blog is being synthesized", text: "New writing on astrobiology, mechanochemistry and research life is in the flask. Come back soon.", home: "Back to the research website", research: "Research", skip: "Skip to content" },
    pt: { site: "Site pessoal", back: "← Voltar ao site de investigação", title: "O blog está a ser sintetizado", text: "Novos textos sobre astrobiologia, mecanoquímica e a vida de investigação estão no balão. Volte em breve.", home: "Voltar ao site de investigação", research: "Investigação", skip: "Saltar para o conteúdo" },
    fr: { site: "Site personnel", back: "← Retour au site de recherche", title: "Le blog est en cours de synthèse", text: "De nouveaux textes sur l’astrobiologie, la mécanochimie et la vie de chercheur sont dans le ballon. Revenez bientôt.", home: "Retour au site de recherche", research: "Recherche", skip: "Aller au contenu" },
    ja: { site: "個人サイト", back: "← 研究サイトに戻る", title: "ブログは現在「合成中」です", text: "宇宙生物学、メカノケミストリー、研究生活についての新しい記事をフラスコの中で準備中です。また来てください。", home: "研究サイトに戻る", research: "研究", skip: "本文へスキップ" }
  };
  let lang = "en";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    lang = q || localStorage.getItem("lang") || (navigator.language || "en").slice(0, 2);
  } catch (e) {}
  if (!T[lang]) lang = "en";
  const t = T[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-t]").forEach(el => { const k = el.dataset.t; if (t[k]) el.textContent = t[k]; });
  const skip = document.querySelector(".skip-link"); if (skip) skip.textContent = t.skip;
  document.querySelectorAll('a[href="./"]').forEach(a => { if (lang !== "en") a.href = "./?lang=" + lang; });
  const y = document.getElementById("footerYear"); if (y) y.textContent = new Date().getFullYear();

  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = v => (v && typeof v === "object" ? (v[lang] || v.en) : v) || "";
  fetch("data/blog.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
    const posts = ((d && d.posts) || []).filter(p => p && !p.hidden && p.title).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    if (!posts.length) return;
    document.getElementById("blogSoon").hidden = true;
    // post bodies are written by the site owner (data/blog.json) and may contain simple HTML
    document.getElementById("blogPosts").innerHTML = posts.map(p =>
      '<article class="blog-post-page"><time class="blog-date">' + esc(p.date || "") + "</time>" +
      "<h2>" + pick(p.title) + "</h2>" + (p.summary ? '<p class="blog-excerpt">' + pick(p.summary) + "</p>" : "") +
      '<div class="blog-full">' + pick(p.body) + "</div></article>").join("");
  }).catch(() => {});
})();
