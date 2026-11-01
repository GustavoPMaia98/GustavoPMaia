/* =====================================================================
   ask.js: "Ask my research", a chat window that floats over the page.
   - Open it with the round button (bottom right) or the "Ask" menu entry; hide it
     with the minimise button. The conversation is kept in this browser
     (localStorage) until "Clear" is pressed, and reopens as it was.
   - Each answer is put together from the site's own content (papers, highlights,
     talks, courses, positions, funding, awards, news): the passages that match
     the question by words and by meaning, and their sentences closest to it,
     with numbered links to the sources.
   - Meanings come from a small open model (bge-small-en-v1.5, MIT licence) run by
     transformers.js in a background thread (ask-worker.js), loaded only when the
     first question is asked. Nothing typed leaves the device.
   Passages and their meaning vectors: data/research-index.json
   (tools/build_research_index.mjs, rebuilt every night).
   ===================================================================== */
const root = document.documentElement;
if (!window.__askChat) {
  window.__askChat = true;
  const lang = () => { const l = root.getAttribute("lang"); return ["pt", "fr", "ja"].includes(l) ? l : "en"; };
  const T = {
    title: { en: "Ask my research", pt: "Pergunte à minha investigação", fr: "Interrogez mes recherches", ja: "研究に質問する" },
    sub: { en: "Search the site or ask about my research", pt: "Pesquise no site ou pergunte sobre a minha investigação",
           fr: "Cherchez sur le site ou posez une question sur mes recherches", ja: "サイト内検索、または研究について質問" },
    open: { en: "Ask my research", pt: "Perguntar", fr: "Poser une question", ja: "質問する" },
    hide: { en: "Hide the chat", pt: "Esconder o chat", fr: "Masquer le chat", ja: "チャットを隠す" },
    clear: { en: "Clear the conversation", pt: "Apagar a conversa", fr: "Effacer la conversation", ja: "会話を消去" },
    ph: { en: "Search or ask about my research…", pt: "Pesquise ou pergunte sobre a minha investigação…", fr: "Cherchez ou posez une question…", ja: "検索・研究について質問…" },
    onsite: { en: "On this site", pt: "Neste site", fr: "Sur ce site", ja: "サイト内" },
    send: { en: "Send", pt: "Enviar", fr: "Envoyer", ja: "送信" },
    hello: { en: "Hi! Ask me anything about my research: asteroid gardening, mechanochemistry, my papers, talks, where I have worked… I answer from the content of this site and show where it comes from.",
             pt: "Olá! Pergunte-me o que quiser sobre a minha investigação: reprocessamento de asteroides, mecanoquímica, os meus artigos, comunicações, onde trabalhei… Respondo a partir do conteúdo deste site e mostro de onde vem.",
             fr: "Bonjour ! Posez-moi vos questions sur mes recherches : asteroid gardening, mécanochimie, mes articles, présentations, où j’ai travaillé… Je réponds à partir du contenu de ce site et j’indique d’où cela vient.",
             ja: "こんにちは！小惑星表面の撹拌、メカノケミストリー、論文、発表、経歴など、私の研究について何でも質問してください。このサイトの内容から回答し、出典を示します。" },
    ex: { en: ["What is asteroid gardening?", "Do ribonucleosides survive mechanochemistry?", "Who funds your PhD?"],
          pt: ["O que é o reprocessamento de asteroides?", "Os ribonucleósidos sobrevivem à mecanoquímica?", "Quem financia o seu doutoramento?"],
          fr: ["Qu’est-ce que l’asteroid gardening ?", "Les ribonucléosides survivent-ils à la mécanochimie ?", "Qui finance votre doctorat ?"],
          ja: ["小惑星表面の撹拌（asteroid gardening）とは？", "リボヌクレオシドはメカノケミストリーに耐える？", "博士課程の資金は？"] },
    thinking: { en: "Looking through my work…", pt: "A procurar no meu trabalho…", fr: "Je cherche dans mon travail…", ja: "研究内容を検索中…" },
    none: { en: "I could not find that on this site. Try other words, or ask about my papers, talks, projects or career.", pt: "Não encontrei isso neste site. Experimente outras palavras, ou pergunte sobre os meus artigos, comunicações, projetos ou percurso.",
            fr: "Je n’ai pas trouvé cela sur ce site. Essayez d’autres mots, ou posez une question sur mes articles, présentations ou mon parcours.", ja: "このサイトには見つかりませんでした。別の言葉で、または論文・発表・経歴について質問してください。" },
    sources: { en: "Sources", pt: "Fontes", fr: "Sources", ja: "出典" },
    note: { en: "Put together from this site's content; check the sources.", pt: "Composto a partir do conteúdo deste site; confirme nas fontes.", fr: "Composé à partir du contenu de ce site ; vérifiez les sources.", ja: "サイトの内容から作成した回答です。出典をご確認ください。" },
    sec: {
      publications: { en: "Paper", pt: "Artigo", fr: "Article", ja: "論文" }, highlights: { en: "Research", pt: "Investigação", fr: "Recherche", ja: "研究" },
      presentations: { en: "Talk", pt: "Comunicação", fr: "Présentation", ja: "発表" }, courses: { en: "Course", pt: "Curso", fr: "Cours", ja: "講習" },
      experience: { en: "Experience", pt: "Experiência", fr: "Expérience", ja: "経歴" }, education: { en: "Education", pt: "Educação", fr: "Formation", ja: "学歴" },
      news: { en: "News", pt: "Novidades", fr: "Actualités", ja: "ニュース" }, funding: { en: "Funding", pt: "Financiamento", fr: "Financement", ja: "資金" },
      awards: { en: "Award", pt: "Prémio", fr: "Prix", ja: "受賞" }, blog: { en: "Blog", pt: "Blog", fr: "Blog", ja: "ブログ" } }
  };
  const t = k => { const v = T[k]; return v[lang()] || v.en; };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (d, w = 18) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const I = {
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    min: '<path d="M5 12h14"/>', trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>'
  };

  // ------------------------------------------------------------------ the window
  const box = document.createElement("div");
  box.className = "askc";
  box.innerHTML =
    '<button type="button" class="askc-fab" aria-expanded="false" aria-controls="askcPanel">' + icon(I.chat, 22) + '<span class="askc-fab-label"></span></button>' +
    '<section class="askc-panel" id="askcPanel" role="dialog" aria-modal="false" aria-labelledby="askcTitle" hidden>' +
      '<header class="askc-head"><div class="askc-hd"><h2 class="askc-title" id="askcTitle"></h2><p class="askc-sub"></p></div>' +
        '<button type="button" class="askc-ib askc-clear">' + icon(I.trash, 17) + "</button>" +
        '<button type="button" class="askc-ib askc-min">' + icon(I.min, 18) + "</button></header>" +
      '<ol class="askc-log" aria-live="polite"></ol>' +
      '<div class="askc-ex" role="group"></div>' +
      '<form class="askc-form" autocomplete="off"><input class="askc-in" type="text" maxlength="300" enterkeyhint="send">' +
        '<button type="submit" class="askc-send">' + icon(I.send, 17) + "</button></form>" +
    "</section>";
  document.body.appendChild(box);
  const fab = box.querySelector(".askc-fab"), panel = box.querySelector(".askc-panel"), log = box.querySelector(".askc-log");
  const exBox = box.querySelector(".askc-ex"), form = box.querySelector(".askc-form"), input = box.querySelector(".askc-in");

  function texts() {
    fab.querySelector(".askc-fab-label").textContent = t("open");
    fab.setAttribute("aria-label", t("open"));
    box.querySelector(".askc-title").textContent = t("title");
    box.querySelector(".askc-sub").textContent = t("sub");
    const c = box.querySelector(".askc-clear"), m = box.querySelector(".askc-min");
    c.setAttribute("aria-label", t("clear")); c.title = t("clear");
    m.setAttribute("aria-label", t("hide")); m.title = t("hide");
    input.placeholder = t("ph"); input.setAttribute("aria-label", t("ph"));
    box.querySelector(".askc-send").setAttribute("aria-label", t("send"));
    exBox.setAttribute("aria-label", t("ph"));
    exBox.innerHTML = t("ex").map(q => '<button type="button" class="askc-chip">' + esc(q) + "</button>").join("");
    render();
  }

  // ------------------------------------------------------------------ conversation (kept in this browser)
  const KEY = "askChat.v1";
  let chat = [];
  try { chat = JSON.parse(localStorage.getItem(KEY) || "[]"); if (!Array.isArray(chat)) chat = []; } catch (e) { chat = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(chat.slice(-60))); } catch (e) {} };
  function render() {
    const hello = '<li class="askc-msg askc-msg--bot"><p>' + esc(t("hello")) + "</p></li>";
    log.innerHTML = hello + chat.map((m, i) => m.role === "user"
      ? '<li class="askc-msg askc-msg--me"><p>' + esc(m.text) + "</p></li>"
      : '<li class="askc-msg askc-msg--bot">' + (m.pending ? '<p class="askc-wait">' + esc(t("thinking")) + "</p>"
        : (m.none ? "<p>" + esc(t("none")) + "</p>" :
          (m.def ? '<p class="askc-def"><b>' + esc(m.def.term) + "</b>: " + esc(m.def.text) + "</p>" : "") +
          (!m.parts || !m.parts.length ? "" :
          "<p>" + m.parts.map(x => esc(x.s) + ' <a class="askc-cite" href="#" data-m="' + i + '" data-n="' + x.n + '">[' + x.n + "]</a>").join(" ") + "</p>" +
          '<p class="askc-src-h">' + esc(t("sources")) + '</p><ol class="askc-src">' + m.src.map((s, k) =>
            '<li><button type="button" class="askc-open" data-m="' + i + '" data-n="' + (k + 1) + '"><span class="askc-n">' + (k + 1) + "</span>" +
            '<span class="askc-tag">' + esc((T.sec[s.sec] && (T.sec[s.sec][lang()] || T.sec[s.sec].en)) || s.sec) + '</span><span class="askc-st">' + esc(s.title) + "</span></button></li>").join("") +
          '</ol><p class="askc-note">' + esc(t("note")) + "</p>") +
          (m.links && m.links.length ? '<p class="askc-src-h">' + esc(t("onsite")) + '</p><ul class="askc-src askc-site">' + m.links.map((l, k) =>
            '<li><button type="button" class="askc-go" data-m="' + i + '" data-k="' + k + '"><span class="askc-tag">' + esc(l.label) + '</span><span class="askc-st">' + esc(l.title) + "</span></button></li>").join("") + "</ul>" : ""))) + "</li>").join("");
    exBox.hidden = chat.length > 0;
    log.scrollTop = log.scrollHeight;
  }

  function setOpen(on, focus) {
    panel.hidden = !on; fab.hidden = on;
    fab.setAttribute("aria-expanded", on ? "true" : "false");
    box.classList.toggle("is-open", on);
    try { localStorage.setItem("askChat.open", on ? "1" : "0"); } catch (e) {}
    if (on) { render(); if (focus) setTimeout(() => input.focus(), 30); warm(); }
    else if (focus) fab.focus();
  }
  fab.addEventListener("click", () => setOpen(true, true));
  window.AskChat = { open: () => setOpen(true, true) };
  box.querySelector(".askc-min").addEventListener("click", () => setOpen(false, true));
  box.querySelector(".askc-clear").addEventListener("click", () => { chat = []; save(); render(); input.focus(); });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false, true); } });
  exBox.addEventListener("click", e => { const b = e.target.closest(".askc-chip"); if (b) ask(b.textContent); });
  form.addEventListener("submit", e => { e.preventDefault(); const q = input.value.trim(); if (q) { input.value = ""; ask(q); } });
  // the "Ask" entries of the menu open the chat
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href="#ask"]'); if (!a) return;
    e.preventDefault(); setOpen(true, true);
    const pop = document.getElementById("navMoreMenu"); if (pop) pop.hidden = true;
  });
  new MutationObserver(texts).observe(root, { attributes: true, attributeFilter: ["lang"] });
  texts();
  let wasOpen = false; try { wasOpen = localStorage.getItem("askChat.open") === "1"; } catch (e) {}
  setOpen(wasOpen && innerWidth > 760, false);

  // ------------------------------------------------------------------ index + search
  let idxP = null, vecs = null;
  const loadIndex = () => idxP || (idxP = fetch("data/research-index.json", { cache: "no-cache" }).then(r => r.json()).then(idx => {
    if (idx.vectors && idx.dim) {
      const bin = atob(idx.vectors), b = new Int8Array(bin.length);
      for (let i = 0; i < bin.length; i++) b[i] = (bin.charCodeAt(i) << 24) >> 24;
      if (b.length === idx.passages.length * idx.dim) vecs = b;
    }
    idx.passages.forEach(p => { p._t = toks(p.title + " " + p.text + " " + (p.pt || "") + " " + (p.k || "")); p._len = p._t.length; });
    idx._df = {}; idx.passages.forEach(p => new Set(p._t).forEach(w => { idx._df[w] = (idx._df[w] || 0) + 1; }));
    idx._avg = idx.passages.reduce((s, p) => s + p._len, 0) / Math.max(1, idx.passages.length);
    return idx;
  }));
  loadIndex().catch(() => { idxP = null; });

  const STOP = new Set(("the a an of to in on for and or is are was were be been do does did what which who whom how why when where with from by at as it its this that these those your you my me i about tell can could "
    + "o a os as um uma de do da dos das em no na nos nas por para com que qual quais quem como porque onde quando é são foi sobre seu sua meu minha "
    + "le la les un une des du de et ou est sont que qui quoi comment pourquoi où quand avec pour par sur dans ce cette ces votre vos mon ma mes").split(" "));
  function toks(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9぀-ヿ一-鿿]+/g, " ")
      .split(" ").filter(w => w.length > 2 && !STOP.has(w)).map(w => w.length > 5 ? w.replace(/(ing|ion|ions|es|s)$/, "") : w);
  }
  function bm25(idx, qt) {
    const N = idx.passages.length;
    return idx.passages.map(p => {
      let s = 0;
      for (const w of qt) {
        const df = idx._df[w]; if (!df) continue;
        let tf = 0; for (const x of p._t) if (x === w) tf++;
        if (tf) s += Math.log(1 + (N - df + 0.5) / (df + 0.5)) * tf * 2.4 / (tf + 1.4 * (0.25 + 0.75 * p._len / idx._avg));
      }
      return s;
    });
  }

  // the model runs in a background thread; one at a time, started on the first question
  let worker = null, wid = 0, workerBroken = false;
  const pending = new Map();
  function embed(texts, idx, prefix) {
    if (workerBroken || !vecs) return Promise.reject(new Error("no model"));
    if (!worker) {
      try { worker = new Worker(new URL("./ask-worker.js", import.meta.url), { type: "module" }); }
      catch (e) { workerBroken = true; return Promise.reject(e); }
      worker.onmessage = e => { const p = pending.get(e.data.id); if (!p) return; pending.delete(e.data.id); e.data.error ? p.no(new Error(e.data.error)) : p.ok(e.data.vectors); };
      worker.onerror = () => { workerBroken = true; pending.forEach(p => p.no(new Error("worker"))); pending.clear(); };
    }
    const id = ++wid;
    return new Promise((ok, no) => { pending.set(id, { ok, no }); worker.postMessage({ id, texts, model: idx.model, pooling: idx.pooling, prefix }); });
  }
  let warmed = false;
  function warm() { if (warmed) return; warmed = true; loadIndex().then(idx => embed(["hello"], idx, "").catch(() => {})).catch(() => {}); }   // start loading in the background

  const sentences = s => String(s).split(/(?<=[.!?])\s+(?=[A-Z0-9“"(À-Ý])/).map(x => x.trim()).filter(x => x.length > 40);
  let busy = false;
  async function ask(q) {
    if (busy) return; busy = true;
    q = q.trim().slice(0, 300);
    chat.push({ role: "user", text: q });
    const me = { role: "bot", pending: true };
    chat.push(me); render();
    try {
      const idx = await loadIndex();
      const qt = [...new Set(toks(q))], lex = bm25(idx, qt), lmax = Math.max(...lex, 1e-9);
      let score = lex.map(s => s / lmax), qv = null;
      if (vecs) {
        try {
          qv = (await embed([q], idx, idx.queryPrefix || ""))[0];
          const d = idx.dim;
          const cos = idx.passages.map((p, i) => { let c = 0; for (let k = 0; k < d; k++) c += qv[k] * vecs[i * d + k]; return c / 127; });
          const sorted = cos.slice().sort((a, b) => a - b), med = sorted[sorted.length >> 1], top = sorted[sorted.length - 1];
          score = cos.map((c, i) => 0.75 * Math.max(0, (c - med) / Math.max(1e-6, top - med)) + 0.25 * lex[i] / lmax);
        } catch (e) { console.warn("meaning search unavailable", e); }
      }
      const cut = qv ? 0.45 : 0.08;
      const order = idx.passages.map((p, i) => ({ p, s: score[i] })).filter(x => x.s > cut).sort((a, b) => b.s - a.s);
      const seen = new Set(), src = [];
      for (const x of order) { const k = x.p.sec + "|" + x.p.title; if (seen.has(k)) continue; seen.add(k); src.push(x.p); if (src.length === 3) break; }
      if (!src.length) { Object.assign(me, { pending: false, none: true, parts: [], src: [] }); return; }
      // answer: the sentences of these sources closest to the question
      const L = lang();
      const cands = [];
      // (not the passage's own title line, nor bare lists of names and places)
      src.forEach((p, k) => sentences(L === "pt" && p.pt ? p.pt : p.text)
        .filter(s => s.indexOf(p.title) !== 0 && (s.match(/·/g) || []).length < 3)
        .forEach((s, j) => cands.push({ s, n: k + 1, j })));
      let ss = cands.map(c => { const ct = toks(c.s); return qt.filter(w => ct.includes(w)).length / Math.sqrt(1 + ct.length) + (c.n === 1 ? 0.15 : 0) - c.j * 0.01; });
      if (qv && L !== "pt" && cands.length) {
        try {
          const sv = await embed(cands.map(c => c.s), idx, "");
          ss = sv.map((v, i) => { let c = 0; for (let k = 0; k < v.length; k++) c += v[k] * qv[k]; return c + 0.15 * ss[i]; });
        } catch (e) {}
      }
      const pickd = cands.map((c, i) => ({ ...c, v: ss[i] })).sort((a, b) => b.v - a.v).slice(0, 2).sort((a, b) => a.n - b.n || a.j - b.j);
      Object.assign(me, { pending: false, parts: pickd.map(c => ({ s: c.s, n: c.n })),
        src: src.map(p => ({ sec: p.sec, title: p.title, doi: p.doi || "", hl: p.hl || "", url: p.url || "" })) });
    } catch (e) {
      console.warn(e); Object.assign(me, { pending: false, none: true });
    } finally {
      // the site search (search.js): a short definition and links to the places that mention it
      try {
        const f = window.SiteSearch ? SiteSearch.find(q) : null;
        if (f) {
          if (f.answer) me.def = f.answer;
          if (f.results.length) { me.q = q; me.links = f.results.map(r => ({ label: r.label, title: r.title })); }
          if (me.none && (me.def || me.links)) delete me.none;
        }
      } catch (e) {}
      busy = false; save(); render();
    }
  }

  // ------------------------------------------------------------------ open a source on the page
  log.addEventListener("click", e => {
    const g = e.target.closest(".askc-go");
    if (g) {
      const m = chat[+g.dataset.m]; if (!m || !window.SiteSearch) return;
      const r = SiteSearch.find(m.q).results[+g.dataset.k];
      if (r) { if (innerWidth <= 760) setOpen(false, false); SiteSearch.go(r.entry); }
      return;
    }
    const b = e.target.closest(".askc-open, .askc-cite"); if (!b) return;
    e.preventDefault();
    const m = chat[+b.dataset.m], s = m && m.src && m.src[+b.dataset.n - 1]; if (!s) return;
    if (innerWidth <= 760) setOpen(false, false);           // on phones, get the chat out of the way
    const flash = el => { if (!el) return false; el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("search-hit"); setTimeout(() => el.classList.remove("search-hit"), 1800); return true; };
    if (s.doi && window.SiteApp && SiteApp.openPublication) { SiteApp.openPublication(s.doi); return; }
    if (s.hl) { const c = document.querySelector('[data-hl="' + s.hl + '"]'); if (c) { c.click(); return; } }
    const sec = document.getElementById(s.sec);
    const item = sec && [...sec.querySelectorAll(".timeline-item, .award-card")].find(it => it.textContent.indexOf(s.title.slice(0, 40)) !== -1);
    if (item && window.SiteApp && SiteApp.showPathFor && SiteApp.showPathFor(item)) return;
    if (item && item.classList.contains("timeline-item") && window.SiteApp && SiteApp.openItem) { SiteApp.openItem(item); flash(item); return; }
    if (item) { flash(item); return; }
    if (s.url && /^https:/.test(s.url)) { window.open(s.url, "_blank", "noopener"); return; }
    flash(sec);
  });
}
