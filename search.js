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
    about: "About", highlights: "Current Work Interests", news: "News", education: "Education", experience: "Experience",
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
    { keys: ["hplc", "mass spectrometry", "hplc-ms", "lc-ms", "lc/ms", "lcms", "espetrometria de massa", "espectrometria"],
      term: { en: "HPLC–MS / LC–MS", pt: "HPLC–MS / LC–MS" },
      a: { en: "High-performance liquid chromatography coupled to mass spectrometry — the analytical workhorse for separating and identifying trace organic molecules in meteoritic and laboratory samples. Chromatography pulls the mixture apart; the mass spectrometer weighs each molecule to name it.",
           pt: "Cromatografia líquida de alta eficiência acoplada a espetrometria de massa — a principal técnica analítica para separar e identificar moléculas orgânicas vestigiais em amostras meteoríticas e de laboratório. A cromatografia separa a mistura; o espetrómetro de massa pesa cada molécula para a identificar." } },
    { keys: ["chromatography", "gc-ms", "gc/ms", "gc-fid", "gas chromatography", "cromatografia"],
      term: { en: "Chromatography", pt: "Cromatografia" },
      a: { en: "A family of techniques that separate a mixture by carrying it through a column that holds each compound back by a different amount. Gas chromatography (GC) handles volatile molecules, liquid chromatography (LC) handles dissolved ones; both can be paired with mass-spectrometric or flame-ionization detection.",
           pt: "Uma família de técnicas que separam uma mistura ao fazê-la passar por uma coluna que retém cada composto de forma diferente. A cromatografia gasosa (GC) lida com moléculas voláteis, a líquida (LC) com as dissolvidas; ambas podem ser acopladas a deteção por massa ou ionização de chama." } },
    { keys: ["nmr", "nuclear magnetic resonance", "ressonancia magnetica", "ressonância magnética", "rmn", "proton nmr"],
      term: { en: "NMR spectroscopy", pt: "Espetroscopia de RMN" },
      a: { en: "Nuclear magnetic resonance places a sample in a strong magnetic field and reads the radio-frequency signals from its atomic nuclei. Because each nucleus reports on its chemical surroundings, the spectrum maps how atoms are connected — used to confirm a molecule's identity and purity.",
           pt: "A ressonância magnética nuclear coloca a amostra num campo magnético intenso e lê os sinais de radiofrequência dos seus núcleos atómicos. Como cada núcleo reflete a sua vizinhança química, o espetro mapeia a ligação entre os átomos — usada para confirmar a identidade e a pureza de uma molécula." } },
    { keys: ["xrd", "x-ray diffraction", "difracao de raios x", "difração de raios x", "crystallography", "cristalografia"],
      term: { en: "X-ray diffraction (XRD)", pt: "Difração de raios X (XRD)" },
      a: { en: "X-rays scattered off a solid's ordered atomic lattice produce a pattern of peaks that fingerprints its crystal structure — identifying which mineral or crystalline phase is present and whether grinding has changed it.",
           pt: "Os raios X dispersos pela rede atómica ordenada de um sólido produzem um padrão de picos que identifica a sua estrutura cristalina — revelando a fase mineral ou cristalina presente e se a moagem a alterou." } },
    { keys: ["ftir", "infrared", "infrared spectroscopy", "atr", "infravermelho", "espetroscopia de infravermelho"],
      term: { en: "FTIR spectroscopy", pt: "Espetroscopia FTIR" },
      a: { en: "Fourier-transform infrared spectroscopy measures which infrared wavelengths a sample absorbs. Chemical bonds vibrate at characteristic frequencies, so the spectrum reveals the functional groups present (C=O, O–H, N–H…). ATR mode reads powders and solids directly.",
           pt: "A espetroscopia de infravermelho com transformada de Fourier mede que comprimentos de onda no infravermelho uma amostra absorve. As ligações vibram a frequências características, revelando os grupos funcionais presentes (C=O, O–H, N–H…). O modo ATR lê pós e sólidos diretamente." } },
    { keys: ["elemental analysis", "chns", "analise elementar", "análise elementar", "combustion analysis"],
      term: { en: "Elemental analysis (CHNS)", pt: "Análise elementar (CHNS)" },
      a: { en: "The sample is fully combusted and the gases measured to determine its bulk carbon, hydrogen, nitrogen and sulfur content — quantifying how much organic matter it holds and checking a synthesised compound against its expected formula.",
           pt: "A amostra é totalmente queimada e os gases medidos para determinar o seu teor global de carbono, hidrogénio, azoto e enxofre — quantificando a matéria orgânica presente e comparando um composto sintetizado com a fórmula esperada." } },
    { keys: ["irms", "isotope ratio", "isotope-ratio", "stable isotopes", "isotopes", "isotopos", "isótopos", "razao isotopica", "razão isotópica", "delta 13c", "13c"],
      term: { en: "Isotope-ratio MS & stable isotopes", pt: "irMS e isótopos estáveis" },
      a: { en: "Isotope-ratio mass spectrometry measures the precise ratio of stable isotopes (e.g. ¹³C/¹²C, ¹⁵N/¹⁴N) in a sample. Those ratios fingerprint where a molecule formed and how it was processed — in astrobiology they help tell genuinely extraterrestrial organics apart from terrestrial contamination.",
           pt: "A espetrometria de massa de razão isotópica mede a razão precisa de isótopos estáveis (ex.: ¹³C/¹²C, ¹⁵N/¹⁴N) numa amostra. Essas razões identificam onde uma molécula se formou e como foi processada — em astrobiologia ajudam a distinguir compostos orgânicos genuinamente extraterrestres de contaminação terrestre." } },
    { keys: ["sem", "scanning electron", "edx", "eds", "electron microscopy", "microscopia eletronica", "microscopia eletrónica"],
      term: { en: "SEM–EDX", pt: "SEM–EDX" },
      a: { en: "Scanning electron microscopy rasters a focused electron beam across a sample to image its surface at very high magnification; the attached EDX detector reads the excited X-rays to map which elements are present and where — linking the texture of a mineral or meteorite grain to its chemistry.",
           pt: "A microscopia eletrónica de varrimento faz varrer um feixe de eletrões sobre a amostra para a imagiar a alta ampliação; o detetor EDX acoplado lê os raios X excitados para mapear que elementos estão presentes e onde — ligando a textura de um grão mineral ou de meteorito à sua química." } },
    { keys: ["dft", "density functional theory", "computational chemistry", "ab initio", "teoria do funcional da densidade", "modelacao", "modelação"],
      term: { en: "Density functional theory (DFT)", pt: "Teoria do funcional da densidade (DFT)" },
      a: { en: "A quantum-mechanical computer method that calculates molecular energies and structures from first principles. It maps the pathway a reaction follows and the energy barriers along it — used to explain experimental results, such as how a metal ion and water open a ribonucleoside's ribose ring.",
           pt: "Um método computacional de mecânica quântica que calcula energias e estruturas moleculares a partir de princípios fundamentais. Mapeia o percurso de uma reação e as suas barreiras energéticas — usado para explicar resultados experimentais, como a abertura do anel de ribose de um ribonucleósido por um ião metálico e água." } },
    { keys: ["organic synthesis", "synthesis", "reduction", "sintese organica", "síntese orgânica", "sintese"],
      term: { en: "Organic synthesis", pt: "Síntese orgânica" },
      a: { en: "The controlled construction and transformation of carbon-based molecules through deliberate reactions — building a target compound, running reductions, and tuning conditions for yield and purity. It supplies the clean starting materials for the mechanochemical and shock experiments.",
           pt: "A construção e transformação controladas de moléculas baseadas em carbono através de reações deliberadas — construir um composto-alvo, realizar reduções e ajustar condições para rendimento e pureza. Fornece os materiais de partida puros para as experiências mecanoquímicas e de choque." } },
    { keys: ["nucleobase", "nucleobases", "adenine", "guanine", "uracil", "cytosine", "nucleobases", "bases azotadas"],
      term: { en: "Nucleobases", pt: "Nucleobases" },
      a: { en: "The nitrogen-containing rings (adenine, guanine, cytosine, uracil, thymine) that carry genetic information in RNA and DNA. How they form, attach to a sugar and survive in space is a central prebiotic question.",
           pt: "Os anéis azotados (adenina, guanina, citosina, uracilo, timina) que transportam a informação genética no RNA e no DNA. Como se formam, se ligam a um açúcar e sobrevivem no espaço é uma questão prebiótica central." } },
    { keys: ["amino acid", "amino acids", "aminoacidos", "aminoácidos", "peptide", "peptides"],
      term: { en: "Amino acids", pt: "Aminoácidos" },
      a: { en: "The molecular building blocks of proteins. They have been found in carbonaceous meteorites, showing that life's ingredients can form abiotically in space — a key thread linking meteorite chemistry to the origin of life.",
           pt: "Os blocos moleculares das proteínas. Foram encontrados em meteoritos carbonáceos, mostrando que os ingredientes da vida se podem formar abioticamente no espaço — um elo central entre a química dos meteoritos e a origem da vida." } },
    { keys: ["ribose", "sugar", "sugars", "carbohydrate", "acucar", "açúcar", "acucares"],
      term: { en: "Ribose & sugars", pt: "Ribose e açúcares" },
      a: { en: "Ribose is the five-carbon sugar in the backbone of RNA; related sugars have been detected in meteorites. Sugars are fragile, so understanding how they form and survive impact processing is important for the RNA-world story.",
           pt: "A ribose é o açúcar de cinco carbonos no esqueleto do RNA; açúcares relacionados foram detetados em meteoritos. Os açúcares são frágeis, pelo que compreender como se formam e sobrevivem ao processamento por impactos é importante para a hipótese do mundo do RNA." } },
    { keys: ["chirality", "homochirality", "enantiomer", "quiralidade", "homoquiralidade", "handedness"],
      term: { en: "Chirality & homochirality", pt: "Quiralidade e homoquiralidade" },
      a: { en: "Many biological molecules exist in two mirror-image forms, yet life uses almost exclusively one (left-handed amino acids, right-handed sugars). Explaining how this single-handedness arose from a presumably symmetric prebiotic chemistry is a deep open problem.",
           pt: "Muitas moléculas biológicas existem em duas formas em espelho, mas a vida usa quase exclusivamente uma (aminoácidos à esquerda, açúcares à direita). Explicar como esta lateralidade única surgiu de uma química prebiótica presumivelmente simétrica é um problema profundo em aberto." } },
    { keys: ["ryugu", "bennu", "hayabusa", "hayabusa2", "osiris-rex", "osiris rex", "sample return", "amostras de asteroide"],
      term: { en: "Ryugu, Bennu & sample return", pt: "Ryugu, Bennu e amostras retornadas" },
      a: { en: "Space missions that brought pristine asteroid material back to Earth — Hayabusa2 from Ryugu and OSIRIS-REx from Bennu. These uncontaminated samples let laboratory chemistry be tested directly against real asteroid organics.",
           pt: "Missões espaciais que trouxeram material de asteroide intacto para a Terra — a Hayabusa2 de Ryugu e a OSIRIS-REx de Bennu. Estas amostras não contaminadas permitem testar a química de laboratório diretamente contra compostos orgânicos reais de asteroides." } },
    { keys: ["carbonaceous chondrite", "chondrite", "condrito", "condrito carbonaceo", "murchison"],
      term: { en: "Carbonaceous chondrites", pt: "Condritos carbonáceos" },
      a: { en: "Primitive, carbon-rich meteorites (like Murchison) that preserve organic molecules from the early Solar System — amino acids, nucleobases and sugars among them. They are natural archives of prebiotic chemistry.",
           pt: "Meteoritos primitivos e ricos em carbono (como Murchison) que preservam moléculas orgânicas do início do Sistema Solar — aminoácidos, nucleobases e açúcares entre elas. São arquivos naturais de química prebiótica." } },
    { keys: ["comet", "comets", "micrometeorite", "micrometeorites", "cometa", "cometas", "interplanetary dust"],
      term: { en: "Comets & micrometeorites", pt: "Cometas e micrometeoritos" },
      a: { en: "Comets and the constant rain of micrometeorites deliver organic-rich material to planetary surfaces. They are candidate carriers that could have seeded the early Earth with the molecules needed for life.",
           pt: "Os cometas e a chuva constante de micrometeoritos entregam material rico em compostos orgânicos às superfícies planetárias. São candidatos a transportadores que poderão ter semeado a Terra primitiva com as moléculas necessárias à vida." } },
    { keys: ["space weathering", "meteorizacao espacial", "meteorização espacial", "solar wind"],
      term: { en: "Space weathering", pt: "Meteorização espacial" },
      a: { en: "The gradual alteration of an airless surface by solar-wind ions, radiation and micrometeorite impacts. Alongside impact gardening it shapes how organic matter is processed and preserved on asteroids.",
           pt: "A alteração gradual de uma superfície sem atmosfera por iões do vento solar, radiação e impactos de micrometeoritos. Juntamente com a jardinagem por impactos, condiciona como a matéria orgânica é processada e preservada nos asteroides." } },
    { keys: ["miller-urey", "miller urey", "spark discharge", "primitive earth", "terra primitiva"],
      term: { en: "Miller–Urey experiment", pt: "Experiência de Miller–Urey" },
      a: { en: "The 1953 experiment that produced amino acids by passing electric sparks through a simulated early-Earth atmosphere — the founding demonstration that life's building blocks can form from simple molecules and energy.",
           pt: "A experiência de 1953 que produziu aminoácidos ao passar faíscas elétricas por uma atmosfera simulada da Terra primitiva — a demonstração fundadora de que os blocos da vida se podem formar a partir de moléculas simples e energia." } },
    { keys: ["mineral catalysis", "montmorillonite", "clay", "argila", "catalysis", "catalise", "catálise"],
      term: { en: "Mineral catalysis", pt: "Catálise mineral" },
      a: { en: "Minerals — clays like montmorillonite, metal oxides and salts — can speed up and steer prebiotic reactions on surfaces, concentrating reactants and lowering energy barriers. Mineral surfaces are a likely setting for early chemistry.",
           pt: "Os minerais — argilas como a montmorilonite, óxidos metálicos e sais — podem acelerar e orientar reações prebióticas em superfícies, concentrando reagentes e reduzindo barreiras energéticas. As superfícies minerais são um cenário provável para a química primitiva." } },
    { keys: ["panspermia", "exogenous delivery", "entrega exogena", "entrega exógena"],
      term: { en: "Exogenous delivery / panspermia", pt: "Entrega exógena / panspermia" },
      a: { en: "The idea that some of life's chemical ingredients — or even life itself — arrived on Earth from space, carried by meteorites, comets and dust. My work tests how well organic molecules survive that journey and its impacts.",
           pt: "A ideia de que alguns dos ingredientes químicos da vida — ou a própria vida — chegaram à Terra vindos do espaço, transportados por meteoritos, cometas e poeira. O meu trabalho testa quão bem as moléculas orgânicas sobrevivem a essa viagem e aos seus impactos." } },
    { keys: ["habitability", "biosignature", "biosignatures", "habitabilidade", "bioassinatura"],
      term: { en: "Habitability & biosignatures", pt: "Habitabilidade e bioassinaturas" },
      a: { en: "Habitability is whether an environment can support life; a biosignature is a chemical or structural sign that life is or was present. Distinguishing true biosignatures from abiotic chemistry is a core challenge of astrobiology.",
           pt: "A habitabilidade é a capacidade de um ambiente sustentar vida; uma bioassinatura é um sinal químico ou estrutural de que a vida está ou esteve presente. Distinguir bioassinaturas verdadeiras de química abiótica é um desafio central da astrobiologia." } }
  ];

  // Compact CV science context — grounds the optional free-form AI answers.
  const CV_CONTEXT =
    "Gustavo P. Maia is a chemist / astrobiology researcher. His work studies the origin of life and how " +
    "organic molecules (amino acids, nucleobases, sugars, ribonucleosides, RNA building blocks) form, survive and " +
    "are destroyed under conditions found in space and on asteroids. Core idea: asteroid (impact) gardening and " +
    "meteorite impacts continuously grind and shock-process organic matter. He reproduces this in the lab with " +
    "mechanochemistry (solvent-free ball-milling) and shock-driven synthesis, then analyses products with " +
    "chromatography–mass spectrometry (LC–MS, GC–MS), NMR, XRD, FTIR, elemental analysis (CHNS), isotope-ratio MS, " +
    "SEM–EDX, and explains them computationally with density functional theory (DFT). Themes: prebiotic chemistry, " +
    "RNA world, chirality/homochirality, carbonaceous chondrites, returned samples from Ryugu (Hayabusa2) and Bennu " +
    "(OSIRIS-REx), comets, micrometeorites, regolith, space weathering, mineral catalysis, panspermia, habitability and biosignatures.";

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
