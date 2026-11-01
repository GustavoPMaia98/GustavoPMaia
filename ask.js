/* =====================================================================
   ask.js: "Ask my research"
   1. Finds the passages of the site (papers, highlights, projects, talks...) that
      answer a question. data/research-index.json holds the passages and their
      meaning vectors (tools/build_research_index.mjs). The question is matched by
      words at once, then by meaning with the same small open model
      (all-MiniLM-L6-v2, Apache 2.0) run in the browser by transformers.js
      (Apache 2.0), both self-hosted in vendor/. Nothing leaves the device.
   2. Optional: "Write an answer with AI" loads an open chat model (Qwen2.5 1.5B
      Instruct, Apache 2.0) with WebLLM (Apache 2.0) on the visitor's GPU and writes
      a short answer from those passages only, citing them [1], [2]...
   ===================================================================== */
const form = document.getElementById("askForm");
if (form && !form.__wired) {
  form.__wired = true;
  const input = document.getElementById("askInput");
  const status = document.getElementById("askStatus");
  const list = document.getElementById("askResults");
  const gen = document.getElementById("askGen");
  const genBtn = document.getElementById("askGenBtn");
  const answer = document.getElementById("askAnswer");
  const base = new URL("./", document.baseURI).href;

  const lang = () => { const l = document.documentElement.getAttribute("lang"); return ["pt", "fr", "ja"].includes(l) ? l : "en"; };
  const T = {
    placeholder: { en: "e.g. What happens to organic matter when asteroids are hit by small impacts?", pt: "ex.: O que acontece à matéria orgânica quando os asteroides sofrem pequenos impactos?",
                   fr: "ex. : Que devient la matière organique quand des astéroïdes subissent de petits impacts ?", ja: "例：小さな衝突を受けた小惑星の有機物はどうなる？" },
    loading: { en: "Loading the search model (about 23 MB, only the first time)…", pt: "A carregar o modelo de pesquisa (cerca de 23 MB, só da primeira vez)…",
               fr: "Chargement du modèle de recherche (environ 23 Mo, la première fois seulement)…", ja: "検索モデルを読み込み中（約 23 MB、初回のみ）…" },
    found: { en: "The passages of my work closest to your question:", pt: "As passagens do meu trabalho mais próximas da sua pergunta:",
             fr: "Les passages de mon travail les plus proches de votre question :", ja: "質問に最も近い研究内容：" },
    words: { en: "(matched by words)", pt: "(correspondência por palavras)", fr: "(correspondance par mots)", ja: "（単語で一致）" },
    none: { en: "Nothing on this site answers that yet. Try other words, or one of the examples.", pt: "Ainda nada neste site responde a isso. Experimente outras palavras ou um dos exemplos.",
            fr: "Rien sur ce site n'y répond encore. Essayez d'autres mots ou l'un des exemples.", ja: "このサイトにはまだ該当する内容がありません。別の言葉か例をお試しください。" },
    open: { en: "Open", pt: "Abrir", fr: "Ouvrir", ja: "開く" },
    nogpu: { en: "This browser cannot run the AI model (it needs WebGPU, e.g. a recent Chrome or Edge on a computer).", pt: "Este navegador não consegue correr o modelo de IA (requer WebGPU, p. ex. um Chrome ou Edge recente num computador).",
             fr: "Ce navigateur ne peut pas exécuter le modèle d'IA (WebGPU requis, p. ex. un Chrome ou Edge récent sur ordinateur).", ja: "このブラウザでは AI モデルを実行できません（WebGPU が必要です。例：PC の最新 Chrome / Edge）。" },
    dl: { en: "Downloading the AI model: {p}% (once; next time it starts from your device)", pt: "A descarregar o modelo de IA: {p}% (uma vez; da próxima vez arranca do seu dispositivo)",
          fr: "Téléchargement du modèle d'IA : {p} % (une seule fois ; ensuite il démarre depuis votre appareil)", ja: "AI モデルをダウンロード中：{p}%（初回のみ）" },
    writing: { en: "Writing…", pt: "A escrever…", fr: "Rédaction…", ja: "作成中…" },
    failed: { en: "The AI model could not start on this device.", pt: "O modelo de IA não conseguiu arrancar neste dispositivo.", fr: "Le modèle d'IA n'a pas pu démarrer sur cet appareil.", ja: "この端末では AI モデルを起動できませんでした。" },
    disclaimer: { en: "Written by an AI model from the passages above; it can be wrong. The passages are the source.", pt: "Escrito por um modelo de IA a partir das passagens acima; pode conter erros. As passagens são a fonte.",
                  fr: "Rédigé par un modèle d'IA à partir des passages ci-dessus ; il peut se tromper. Les passages font foi.", ja: "上記の内容から AI が作成した回答です。誤りがある可能性があります。" },
    sec: {
      publications: { en: "Paper", pt: "Artigo", fr: "Article", ja: "論文" }, highlights: { en: "Research", pt: "Investigação", fr: "Recherche", ja: "研究" },
      projects: { en: "Project", pt: "Projeto", fr: "Projet", ja: "プロジェクト" }, presentations: { en: "Talk", pt: "Comunicação", fr: "Présentation", ja: "発表" },
      courses: { en: "Course", pt: "Curso", fr: "Cours", ja: "講習" }, experience: { en: "Experience", pt: "Experiência", fr: "Expérience", ja: "経歴" },
      education: { en: "Education", pt: "Educação", fr: "Formation", ja: "学歴" }, news: { en: "News", pt: "Novidades", fr: "Actualités", ja: "ニュース" },
      funding: { en: "Funding", pt: "Financiamento", fr: "Financement", ja: "資金" }, awards: { en: "Award", pt: "Prémio", fr: "Prix", ja: "受賞" }, blog: { en: "Blog", pt: "Blog", fr: "Blog", ja: "ブログ" } }
  };
  const t = (k, o) => { let s = T[k][lang()] || T[k].en; for (const x in o || {}) s = s.replace("{" + x + "}", o[x]); return s; };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const setPlaceholder = () => { input.placeholder = t("placeholder"); };
  setPlaceholder();
  new MutationObserver(setPlaceholder).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  // ------------------------------------------------------------------ index
  let idxP = null, vecs = null;
  const loadIndex = () => idxP || (idxP = fetch("data/research-index.json", { cache: "no-cache" }).then(r => r.json()).then(idx => {
    if (idx.vectors && idx.dim) {
      const bin = atob(idx.vectors), b = new Int8Array(bin.length);
      for (let i = 0; i < bin.length; i++) b[i] = (bin.charCodeAt(i) << 24) >> 24;
      if (b.length === idx.passages.length * idx.dim) vecs = b;
    }
    idx.passages.forEach(p => { p._t = toks(p.title + " " + p.text + " " + (p.pt || "")); p._len = p._t.length; });
    idx._df = {}; idx.passages.forEach(p => new Set(p._t).forEach(w => { idx._df[w] = (idx._df[w] || 0) + 1; }));
    idx._avg = idx.passages.reduce((s, p) => s + p._len, 0) / Math.max(1, idx.passages.length);
    return idx;
  }));

  const STOP = new Set(("the a an of to in on for and or is are was were be been do does did what which who whom how why when where with from by at as it its this that these those your you my me i about tell "
    + "o a os as um uma de do da dos das em no na nos nas por para com que qual quais quem como porque onde quando é são foi sobre seu sua meu minha "
    + "le la les un une des du de et ou est sont que qui quoi comment pourquoi où quand avec pour par sur dans ce cette ces votre vos mon ma mes").split(" "));
  function toks(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9぀-ヿ一-鿿]+/g, " ")
      .split(" ").filter(w => w.length > 2 && !STOP.has(w)).map(w => w.length > 5 ? w.replace(/(ing|ion|ions|es|s)$/, "") : w);
  }
  function lexical(idx, q) {   // BM25
    const qt = [...new Set(toks(q))], N = idx.passages.length, k1 = 1.4, b = 0.75;
    return idx.passages.map(p => {
      let s = 0;
      for (const w of qt) {
        const df = idx._df[w]; if (!df) continue;
        let tf = 0; for (const x of p._t) if (x === w) tf++;
        if (!tf) continue;
        s += Math.log(1 + (N - df + 0.5) / (df + 0.5)) * tf * (k1 + 1) / (tf + k1 * (1 - b + b * p._len / idx._avg));
      }
      return s;
    });
  }

  // ------------------------------------------------------------------ meaning model
  let embP = null;
  const loadEmbedder = model => embP || (embP = (async () => {
    const tf = await import(base + "vendor/transformers-3.8.1/transformers.min.js");
    tf.env.allowRemoteModels = false;
    tf.env.allowLocalModels = true;
    tf.env.localModelPath = base + "vendor/models/";
    tf.env.backends.onnx.wasm.wasmPaths = base + "vendor/transformers-3.8.1/";
    tf.env.backends.onnx.wasm.numThreads = 1;
    return tf.pipeline("feature-extraction", model, { dtype: "q8", device: "wasm" });
  })());

  // ------------------------------------------------------------------ search
  let last = { q: "", hits: [] }, run = 0;
  async function ask(q) {
    q = q.trim(); if (q.length < 3) return;
    const my = ++run;
    answer.hidden = true; answer.innerHTML = "";
    const idx = await loadIndex();
    const lex = lexical(idx, q), lmax = Math.max(...lex, 1e-9);
    let score = lex.map(s => s / lmax), semantic = false;
    show(q, idx, score, false, my);                     // words first: instant
    if (vecs) {
      try {
        if (!embP) status.textContent = t("loading");
        const emb = await loadEmbedder(idx.model);
        if (my !== run) return;
        const out = await emb(q, { pooling: "mean", normalize: true }), v = out.data, d = idx.dim;
        score = idx.passages.map((p, i) => {
          let c = 0; for (let k = 0; k < d; k++) c += v[k] * vecs[i * d + k];
          c /= 127;
          return 0.72 * Math.max(0, (c - 0.15) / 0.6) + 0.28 * lex[i] / lmax;
        });
        semantic = true;
      } catch (e) { console.warn("meaning search unavailable", e); }
    }
    if (my === run) show(q, idx, score, semantic, my, true);
  }

  function show(q, idx, score, semantic, my, final) {
    const order = idx.passages.map((p, i) => ({ p, s: score[i] })).filter(x => x.s > (semantic ? 0.18 : 0.05)).sort((a, b) => b.s - a.s);
    const seen = new Set(), hits = [];
    for (const x of order) { const k = x.p.sec + "|" + x.p.title; if (seen.has(k)) continue; seen.add(k); hits.push(x.p); if (hits.length === 5) break; }
    last = { q, hits };
    if (!hits.length) { list.innerHTML = ""; gen.hidden = true; if (final || !vecs) status.textContent = t("none"); return; }
    status.textContent = t("found") + (final && !semantic ? " " + t("words") : "");
    const terms = [...new Set(toks(q))];
    list.innerHTML = hits.map((p, i) => {
      const L = lang(), body = L === "pt" && p.pt ? p.pt : p.text;
      let snip = esc(body.length > 260 ? body.slice(0, 259) + "…" : body);
      if (terms.length) snip = snip.replace(new RegExp("\\b(" + terms.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")[a-z]*", "gi"), "<mark>$&</mark>");
      const tag = T.sec[p.sec] ? (T.sec[p.sec][L] || T.sec[p.sec].en) : p.sec;
      return '<li class="ask-hit" id="ask-src-' + (i + 1) + '"><span class="ask-n">' + (i + 1) + '</span><div class="ask-body">' +
        '<div class="ask-head"><span class="ask-tag">' + esc(tag) + '</span><span class="ask-title">' + esc(p.title) + "</span></div>" +
        '<p class="ask-snip">' + snip + "</p>" +
        '<button type="button" class="ask-open" data-i="' + i + '">' + esc(t("open")) + ' <span aria-hidden="true">→</span></button></div></li>';
    }).join("");
    gen.hidden = !final;
  }

  // jump to where a passage lives on the site
  list.addEventListener("click", e => {
    const b = e.target.closest(".ask-open"); if (!b) return;
    const p = last.hits[+b.dataset.i]; if (!p) return;
    const go = el => { if (!el) return false; el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("search-hit"); setTimeout(() => el.classList.remove("search-hit"), 1800); return true; };
    if (p.doi && window.SiteApp && SiteApp.openPublication) { SiteApp.openPublication(p.doi); return; }
    if (p.hl) { const c = document.querySelector('[data-hl="' + p.hl + '"]'); if (c) { c.click(); return; } }
    if (p.anchor && go(document.getElementById(p.anchor))) return;
    if (p.url && /^https:/.test(p.url)) { window.open(p.url, "_blank", "noopener"); return; }
    // talks, courses, positions, degrees: the site search knows how to open them
    const sec = document.getElementById(p.sec);
    const item = sec && [...sec.querySelectorAll(".timeline-item")].find(it => it.textContent.indexOf(p.title.slice(0, 40)) !== -1);
    if (item && window.SiteApp && SiteApp.showPathFor && SiteApp.showPathFor(item)) return;
    if (item && window.SiteApp && SiteApp.openItem) { SiteApp.openItem(item); go(item); return; }
    go(sec);
  });

  form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
  document.querySelectorAll(".ask-chip").forEach(c => c.addEventListener("click", () => { input.value = c.textContent.trim(); ask(input.value); }));
  input.addEventListener("focus", () => { loadIndex().catch(() => {}); }, { once: true });

  // ------------------------------------------------------------------ optional AI answer (WebLLM)
  let engineP = null;
  const LANGNAME = { en: "English", pt: "European Portuguese", fr: "French", ja: "Japanese" };
  async function engine() {
    if (engineP) return engineP;
    engineP = (async () => {
      const adapter = navigator.gpu && await navigator.gpu.requestAdapter();
      if (!adapter) throw new Error("no WebGPU");
      const f16 = adapter.features && adapter.features.has("shader-f16");
      const webllm = await import(base + "vendor/web-llm-0.2.87/web-llm.min.js");
      return webllm.CreateMLCEngine(f16 ? "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" : "Qwen2.5-1.5B-Instruct-q4f32_1-MLC", {
        initProgressCallback: r => { status.textContent = t("dl", { p: Math.round((r.progress || 0) * 100) }); }
      });
    })();
    engineP.catch(() => { engineP = null; });
    return engineP;
  }
  genBtn.addEventListener("click", async () => {
    if (!last.hits.length) return;
    if (!navigator.gpu) { status.textContent = t("nogpu"); return; }
    genBtn.disabled = true;
    const L = lang(), q = last.q, hits = last.hits;
    try {
      const eng = await engine();
      status.textContent = t("writing");
      answer.hidden = false; answer.innerHTML = '<p class="ask-ans-text"></p><p class="ask-ans-note">' + esc(t("disclaimer")) + "</p>";
      const out = answer.querySelector(".ask-ans-text");
      const sources = hits.map((p, i) => "[" + (i + 1) + "] " + p.title + ": " + p.text).join("\n\n");
      const chunks = await eng.chat.completions.create({
        stream: true, temperature: 0.2, max_tokens: 380,
        messages: [
          { role: "system", content: "You answer questions about the research of Gustavo Pinho Maia (chemistry, astrobiology) for visitors of his website. " +
            "Use ONLY the numbered sources. Cite them like [1] or [2]. If the sources do not answer the question, say so briefly. " +
            "Be concise (at most 120 words), refer to him as Gustavo, and answer in " + LANGNAME[L] + "." },
          { role: "user", content: "Sources:\n" + sources + "\n\nQuestion: " + q }
        ]
      });
      let txt = "";
      for await (const c of chunks) {
        txt += (c.choices[0] && c.choices[0].delta && c.choices[0].delta.content) || "";
        out.innerHTML = esc(txt).replace(/\[(\d)\]/g, (m, n) => +n >= 1 && +n <= hits.length ? '<a class="ask-cite" href="#ask-src-' + n + '">[' + n + "]</a>" : m);
      }
      status.textContent = t("found");
    } catch (e) {
      console.warn("AI answer", e);
      status.textContent = /WebGPU/i.test(String(e && e.message)) ? t("nogpu") : t("failed");
    } finally { genBtn.disabled = false; }
  });
}
