/* =====================================================================
   search.js — lightweight, dependency-free site search.
   Indexes the text already rendered on the page (sections + individual
   cards/items), matches the query, and lets the user jump straight to the
   relevant place. Rebuilds the index each time it opens, so dynamically
   loaded content (e.g. ORCID publications) is always included.
   ===================================================================== */
(function () {
  "use strict";

  const overlay = document.getElementById("searchOverlay");
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");
  const hint = document.getElementById("searchHint");
  const toggle = document.getElementById("searchToggle");
  const closeBtn = document.getElementById("searchClose");
  if (!overlay || !input || !results || !toggle) return;

  // Friendly labels for the section badges
  const LABELS = {
    about: "About", highlights: "Highlights", news: "News", education: "Education", experience: "Experience",
    presentations: "Presentations", funding: "Funding", publications: "Publications",
    awards: "Awards", tree: "Academic tree", map: "Map", tutoring: "Tutoring", courses: "Courses & Formations"
  };
  const labelFor = id => LABELS[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Section");

  const lang = () => (document.documentElement.getAttribute("lang") === "pt" ? "pt" : "en");

  // ---- Ask-a-question knowledge base ------------------------------------
  // Curated answers to the scientific topics this site is about. Lets a
  // visitor type a real question ("what is asteroid gardening?") and get a
  // concise answer right inside the search palette.
  const KB = [
    { keys: ["asteroid gardening", "impact gardening", "gardening", "jardinagem"],
      term: { en: "Asteroid gardening", pt: "Jardinagem de asteroides" },
      a: { en: "The slow churning of an airless body's surface by meteorite and micrometeorite impacts. Over billions of years it buries, exhumes, mixes and shock-heats the regolith — processing any organic matter present, so what we measure today is the survivor of a long impact history.",
           pt: "A agitação lenta da superfície de um corpo sem atmosfera por impactos de meteoritos e micrometeoritos. Ao longo de milhares de milhões de anos, soterra, expõe, mistura e aquece por choque o regolito — processando a matéria orgânica presente, pelo que o que medimos hoje é o sobrevivente de uma longa história de impactos." } },
    { keys: ["astrobiology", "astrobiologia"],
      term: { en: "Astrobiology", pt: "Astrobiologia" },
      a: { en: "The science of life's origin, evolution and distribution in the universe — bringing together chemistry, biology, geology and astronomy to ask how life began and whether it could exist elsewhere.",
           pt: "A ciência da origem, evolução e distribuição da vida no universo — reunindo química, biologia, geologia e astronomia para perguntar como a vida começou e se poderá existir noutros locais." } },
    { keys: ["mechanochemistry", "mechanochemical", "ball milling", "ball-milling", "mecanoquimica", "mecanoquímica"],
      term: { en: "Mechanochemistry", pt: "Mecanoquímica" },
      a: { en: "Chemistry driven by mechanical force rather than heat or solvent — for example grinding solids together in a ball mill. It mimics energy sources available on planetary surfaces and is central to my work on solvent-free prebiotic synthesis.",
           pt: "Química impulsionada por força mecânica em vez de calor ou solvente — por exemplo, moendo sólidos num moinho de bolas. Imita as fontes de energia disponíveis em superfícies planetárias e é central no meu trabalho de síntese prebiótica sem solvente." } },
    { keys: ["prebiotic", "prebiotic chemistry", "prebiótica", "prebiotica"],
      term: { en: "Prebiotic chemistry", pt: "Química prebiótica" },
      a: { en: "The chemistry that could have produced the building blocks of life — amino acids, sugars, nucleobases — before biology itself existed, under conditions plausible on the early Earth or in space.",
           pt: "A química que poderá ter produzido os blocos de construção da vida — aminoácidos, açúcares, nucleobases — antes de a própria biologia existir, em condições plausíveis na Terra primitiva ou no espaço." } },
    { keys: ["ribonucleoside", "ribonucleosides", "ribonucleósidos", "ribonucleosidos", "nucleoside"],
      term: { en: "Ribonucleosides", pt: "Ribonucleósidos" },
      a: { en: "A nucleobase joined to a ribose sugar — the building block one step below RNA. Whether assembled ribonucleosides can form and survive in space is an open question I test with mechanochemistry and shock synthesis.",
           pt: "Uma nucleobase ligada a um açúcar (ribose) — o bloco de construção um passo abaixo do RNA. Se os ribonucleósidos já montados se conseguem formar e sobreviver no espaço é uma questão em aberto que testo com mecanoquímica e síntese por choque." } },
    { keys: ["origin of life", "origin-of-life", "abiogenesis", "origem da vida"],
      term: { en: "Origin of life", pt: "Origem da vida" },
      a: { en: "The transition from non-living chemistry to the first self-sustaining, replicating systems. My research probes one piece of it: how life's molecular building blocks could assemble from simple ingredients and energy.",
           pt: "A transição da química não-viva para os primeiros sistemas auto-sustentáveis e capazes de se replicar. A minha investigação aborda uma parte: como os blocos moleculares da vida se poderão montar a partir de ingredientes simples e energia." } },
    { keys: ["shock synthesis", "shock-driven", "impact synthesis", "síntese por choque", "sintese por choque"],
      term: { en: "Shock-driven synthesis", pt: "Síntese induzida por choque" },
      a: { en: "Using the brief, intense pulse of pressure and temperature from an impact to drive chemical reactions — a way to reproduce, in the lab, the chemistry that comet and meteorite impacts could trigger.",
           pt: "Usar o breve e intenso pulso de pressão e temperatura de um impacto para promover reações químicas — uma forma de reproduzir, em laboratório, a química que os impactos de cometas e meteoritos poderiam desencadear." } },
    { keys: ["regolith", "regolito"],
      term: { en: "Regolith", pt: "Regolito" },
      a: { en: "The loose layer of dust and broken rock covering the surface of an asteroid, moon or planet — the material that impact gardening continually reworks.",
           pt: "A camada solta de poeira e rocha fragmentada que cobre a superfície de um asteroide, lua ou planeta — o material que a jardinagem por impactos remodela continuamente." } },
    { keys: ["meteorite", "meteorites", "meteorito", "meteoritos", "carbonaceous"],
      term: { en: "Meteorites & organics", pt: "Meteoritos e compostos orgânicos" },
      a: { en: "Carbon-rich (carbonaceous) meteorites carry amino acids, sugars and nucleobases formed in space. Studying them — and returned samples from Ryugu and Bennu — links laboratory chemistry to real extraterrestrial material.",
           pt: "Os meteoritos ricos em carbono (carbonáceos) transportam aminoácidos, açúcares e nucleobases formados no espaço. Estudá-los — e às amostras recolhidas de Ryugu e Bennu — liga a química de laboratório a material extraterrestre real." } },
    { keys: ["rna world", "rna", "mundo do rna"],
      term: { en: "RNA world", pt: "Mundo do RNA" },
      a: { en: "The hypothesis that early life relied on RNA both to store information and to catalyse reactions, before DNA and proteins took over. It makes the prebiotic formation of RNA's building blocks a key question.",
           pt: "A hipótese de que a vida primitiva dependeu do RNA tanto para armazenar informação como para catalisar reações, antes de o DNA e as proteínas assumirem esse papel. Torna a formação prebiótica dos blocos do RNA uma questão central." } },
    { keys: ["hplc", "mass spectrometry", "hplc-ms", "espetrometria de massa", "espectrometria"],
      term: { en: "HPLC–MS", pt: "HPLC–MS" },
      a: { en: "High-performance liquid chromatography coupled to mass spectrometry — the analytical workhorse for separating and identifying trace organic molecules in meteoritic and laboratory samples.",
           pt: "Cromatografia líquida de alta eficiência acoplada a espetrometria de massa — a principal técnica analítica para separar e identificar moléculas orgânicas vestigiais em amostras meteoríticas e de laboratório." } }
  ];

  const STOP = new Set(["what","is","are","the","a","an","of","to","do","does","how","why","tell","me","about","explain","define","que","o","e","é","sao","são","como","porque","o-que-é","qual","sobre","me","diz","explica"]);

  function answerFor(query) {
    const q = " " + query.toLowerCase().replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ") + " ";
    let best = null, bestScore = 0;
    for (const item of KB) {
      let s = 0;
      for (const k of item.keys) {
        if (q.indexOf(" " + k + " ") !== -1 || q.indexOf(k) !== -1) s += k.split(" ").length * 3;
      }
      // loose word overlap with the canonical term
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
      for (const w of words) for (const k of item.keys) if (k.indexOf(w) !== -1) s += 1;
      if (s > bestScore) { bestScore = s; best = item; }
    }
    return bestScore >= 3 ? best : null;
  }

  let index = [];   // { id, label, title, text, el }
  let current = []; // current result entries (for keyboard nav)
  let active = -1;

  const norm = s => (s || "").replace(/\s+/g, " ").trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  function buildIndex() {
    index = [];
    const main = document.getElementById("mainContent");
    if (!main) return;
    const sections = main.querySelectorAll("section[id]");
    sections.forEach(sec => {
      const id = sec.id;
      const label = labelFor(id);
      const headingEl = sec.querySelector("h1, h2");
      const heading = headingEl ? norm(headingEl.textContent) : label;

      // One entry for the section itself (so a section is always findable)
      index.push({ id, label, title: heading, text: norm(sec.textContent).toLowerCase(), el: sec });

      // Granular entries for individual items inside the section
      const items = sec.querySelectorAll(".timeline-item, .news-list li, .at-node");
      items.forEach(item => {
        const titleEl = item.querySelector("strong, h3, .at-name, .blog-title");
        const title = norm(titleEl ? titleEl.textContent : item.textContent);
        const text = norm(item.textContent);
        if (text.length < 3) return;
        index.push({ id, label, title: clip(title, 90), text: text.toLowerCase(), el: item, raw: text });
      });
    });
  }

  function score(entry, terms) {
    let s = 0;
    const title = entry.title.toLowerCase();
    for (const t of terms) {
      if (!t) continue;
      if (title.indexOf(t) !== -1) s += 5;
      let from = 0, hit;
      while ((hit = entry.text.indexOf(t, from)) !== -1) { s += 1; from = hit + t.length; if (s > 60) break; }
    }
    return s;
  }

  function snippet(entry, terms) {
    const src = entry.raw || entry.text;
    const low = src.toLowerCase();
    let pos = -1;
    for (const t of terms) { const i = low.indexOf(t); if (i !== -1 && (pos === -1 || i < pos)) pos = i; }
    if (pos === -1) return clip(src, 110);
    const start = Math.max(0, pos - 40);
    return (start > 0 ? "…" : "") + clip(src.slice(start), 130);
  }

  function run(q) {
    const query = q.trim().toLowerCase();
    results.innerHTML = "";
    active = -1;
    if (query.length < 2) {
      current = [];
      hint.textContent = lang() === "pt"
        ? "Pesquise no site ou faça uma pergunta científica — ex.: “o que é jardinagem de asteroides?”"
        : "Search the site, or ask a science question — e.g. “what is asteroid gardening?”";
      hint.style.display = "";
      return;
    }
    const terms = query.split(/\s+/).filter(Boolean);

    // Ask-a-question answer card (shown above navigational results)
    const ans = answerFor(query);
    if (ans) renderAnswer(ans);

    const seen = new Set();
    current = index
      .map(e => ({ e, s: score(e, terms) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .filter(x => { const k = x.e.label + "|" + x.e.title; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 10)
      .map(x => x.e);

    if (!current.length) {
      hint.textContent = ans
        ? (lang() === "pt" ? "Sem outras correspondências no site." : "No other matches on the site.")
        : (lang() === "pt" ? "Sem resultados. Tente outra palavra." : "No matches found. Try another word.");
      hint.style.display = ans ? "none" : "";
      if (ans) hint.style.display = "";
      return;
    }
    hint.style.display = "none";
    current.forEach((e, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-result";
      btn.dataset.idx = i;
      btn.innerHTML =
        '<span class="sr-badge">' + e.label + '</span>' +
        '<span class="sr-body"><span class="sr-title"></span><span class="sr-snip"></span></span>';
      btn.querySelector(".sr-title").textContent = e.title;
      btn.querySelector(".sr-snip").textContent = snippet(e, terms);
      btn.addEventListener("click", () => go(e));
      li.appendChild(btn);
      results.appendChild(li);
    });
  }

  function renderAnswer(item) {
    const li = document.createElement("li");
    li.className = "search-answer-li";
    const card = document.createElement("div");
    card.className = "search-answer";
    const head = document.createElement("div");
    head.className = "sa-head";
    head.innerHTML = '<span class="sa-badge">' + (lang() === "pt" ? "Resposta" : "Answer") + '</span>';
    const term = document.createElement("span");
    term.className = "sa-term";
    term.textContent = (item.term[lang()] || item.term.en);
    head.appendChild(term);
    const body = document.createElement("p");
    body.className = "sa-body";
    body.textContent = (item.a[lang()] || item.a.en);
    card.appendChild(head);
    card.appendChild(body);
    li.appendChild(card);
    results.appendChild(li);
  }

  function go(entry) {
    close();
    const el = entry.el;
    // If the result is (or sits inside) a collapsible timeline item, open it so the
    // hidden abstract, equipment and photos are revealed when we land on it.
    const item = el.classList && el.classList.contains("timeline-item")
      ? el
      : (el.closest ? el.closest(".timeline-item") : null);
    const target = item || el;
    if (item) {
      if (window.SiteApp && typeof window.SiteApp.openItem === "function") {
        window.SiteApp.openItem(item);
      } else {
        const expand = item.querySelector(".timeline-expand");
        const card = item.querySelector(".timeline-card");
        if (expand && card) {
          expand.classList.add("open");
          item.classList.add("open");
          card.setAttribute("aria-expanded", "true");
        }
      }
    }
    setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("search-hit");
      setTimeout(() => target.classList.remove("search-hit"), 1800);
    }, 80);
  }

  function open() {
    buildIndex();
    overlay.hidden = false;
    document.body.classList.add("search-open");
    input.value = "";
    run("");
    setTimeout(() => input.focus(), 40);
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove("search-open");
    results.innerHTML = "";
    toggle.focus();
  }

  function setActive(n) {
    const btns = results.querySelectorAll(".search-result");
    if (!btns.length) return;
    active = (n + btns.length) % btns.length;
    btns.forEach((b, i) => b.classList.toggle("active", i === active));
    btns[active].scrollIntoView({ block: "nearest" });
  }

  // Events
  toggle.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  input.addEventListener("input", () => run(input.value));
  overlay.addEventListener("mousedown", e => { if (e.target === overlay) close(); });

  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (current.length) go(current[active === -1 ? 0 : active]);
    }
  });

  // Global shortcuts: "/" or Ctrl/Cmd+K to open, Esc to close
  document.addEventListener("keydown", e => {
    if (!overlay.hidden && e.key === "Escape") { e.preventDefault(); close(); return; }
    const typing = /^(input|textarea|select)$/i.test((e.target.tagName || "")) || e.target.isContentEditable;
    if (overlay.hidden && !typing && e.key === "/") { e.preventDefault(); open(); }
    if (overlay.hidden && (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
  });
})();
