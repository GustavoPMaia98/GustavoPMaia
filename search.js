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
  const labelFor = id => {
    if (id === "about") return ui("about");
    const h = id && document.querySelector("#" + id + " .h2-label");
    if (h && h.textContent.trim()) return h.textContent.trim();
    return LABELS[id] || (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Section");
  };

  const lang = () => { const l = document.documentElement.getAttribute("lang"); return (l === "pt" || l === "fr" || l === "ja") ? l : "en"; };
  // Interface text of the search palette in the four site languages
  const UI = {
    hint: { en: "Search the site, or ask a science question — e.g. “what is asteroid gardening?”",
            pt: "Pesquise no site ou faça uma pergunta científica — ex.: “o que é jardinagem de asteroides?”",
            fr: "Recherchez sur le site ou posez une question scientifique — p. ex. « qu'est-ce que l'asteroid gardening ? »",
            ja: "サイト内を検索、または科学の質問をどうぞ（例：「小惑星表面の撹拌とは？」）" },
    noOther: { en: "No other matches on the site.", pt: "Sem outras correspondências no site.",
               fr: "Aucun autre résultat sur le site.", ja: "サイト内に他の一致はありません。" },
    none: { en: "No matches found. Try another word.", pt: "Sem resultados. Tente outra palavra.",
            fr: "Aucun résultat. Essayez un autre mot.", ja: "一致する結果がありません。別の言葉をお試しください。" },
    answer: { en: "Answer", pt: "Resposta", fr: "Réponse", ja: "回答" },
    placeholder: { en: "Search the site, or ask a science question…", pt: "Pesquise no site ou faça uma pergunta científica…",
                   fr: "Rechercher sur le site ou poser une question scientifique…", ja: "サイト内検索、または科学の質問…" },
    about: { en: "About", pt: "Sobre", fr: "À propos", ja: "概要" }
  };
  const ui = k => UI[k][lang()] || UI[k].en;

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

  const STOP = new Set(["what","is","are","the","a","an","of","to","do","does","how","why","tell","me","about","explain","define","que","o","e","é","sao","são","como","porque","o-que-é","qual","sobre","me","diz","explica","qu'est-ce","que","qu'est","est","le","la","les","des","du","de","c'est","quoi","comment","pourquoi"]);

  // ---- French / Japanese answers (keyed by the English term) ----
  const KB_I18N = {
    "Asteroid gardening": {
      "fr": [
        "Remaniement de la surface des astéroïdes (asteroid gardening)",
        "Le brassage lent de la surface d'un corps sans atmosphère par les impacts de météorites et de micrométéorites. Sur des milliards d'années, il enfouit, exhume, mélange et chauffe par choc le régolithe — transformant la matière organique présente, si bien que ce que l'on mesure aujourd'hui est le survivant d'une longue histoire d'impacts."
      ],
      "ja": [
        "小惑星表面の撹拌（asteroid gardening）",
        "大気のない天体の表面が、隕石や微小隕石の衝突によってゆっくりと掘り返される現象。数十億年にわたってレゴリスを埋没させ、掘り出し、混ぜ合わせ、衝撃で加熱し、そこに含まれる有機物を変化させます。そのため、今日私たちが測定しているのは、長い衝突の歴史を生き延びたものなのです。"
      ]
    },
    "Astrobiology": {
      "fr": [
        "Astrobiologie",
        "La science de l'origine, de l'évolution et de la distribution de la vie dans l'univers — réunissant chimie, biologie, géologie et astronomie pour comprendre comment la vie est apparue et si elle pourrait exister ailleurs."
      ],
      "ja": [
        "アストロバイオロジー（宇宙生物学）",
        "宇宙における生命の起源・進化・分布を探る科学。化学、生物学、地質学、天文学を結びつけ、生命がどのように始まったのか、そして地球以外にも存在し得るのかを問います。"
      ]
    },
    "Mechanochemistry": {
      "fr": [
        "Mécanochimie",
        "Une chimie entraînée par la force mécanique plutôt que par la chaleur ou un solvant — par exemple en broyant des solides dans un broyeur à billes. Elle reproduit des sources d'énergie disponibles à la surface des planètes et est au cœur de mes travaux sur la synthèse prébiotique sans solvant."
      ],
      "ja": [
        "メカノケミストリー（mechanochemistry）",
        "熱や溶媒ではなく機械的な力によって駆動される化学。例えばボールミルで固体どうしをすりつぶします。惑星表面で利用可能なエネルギー源を再現するもので、無溶媒での前生物的合成に関する私の研究の中心です。"
      ]
    },
    "Prebiotic chemistry": {
      "fr": [
        "Chimie prébiotique",
        "La chimie qui aurait pu produire les briques du vivant — acides aminés, sucres, nucléobases — avant l'existence de la biologie elle-même, dans des conditions plausibles sur la Terre primitive ou dans l'espace."
      ],
      "ja": [
        "前生物化学（prebiotic chemistry）",
        "生物そのものが存在する以前に、初期地球や宇宙でもっともらしい条件のもと、生命の構成要素（アミノ酸、糖、核酸塩基）を生み出し得た化学。"
      ]
    },
    "Ribonucleosides": {
      "fr": [
        "Ribonucléosides",
        "Une nucléobase liée à un sucre, le ribose — la brique située juste en dessous de l'ARN. Savoir si des ribonucléosides déjà assemblés peuvent se former et survivre dans l'espace est une question ouverte que j'étudie par mécanochimie et synthèse par choc."
      ],
      "ja": [
        "リボヌクレオシド",
        "核酸塩基がリボース糖に結合したもので、RNAの一段下の構成単位です。組み上がったリボヌクレオシドが宇宙で生成し生き残れるかは未解決の問題であり、私はメカノケミストリーと衝撃合成で検証しています。"
      ]
    },
    "Origin of life": {
      "fr": [
        "Origine de la vie",
        "Le passage d'une chimie non vivante aux premiers systèmes autonomes capables de se répliquer. Mes recherches en explorent une partie : comment les briques moléculaires du vivant ont pu s'assembler à partir d'ingrédients simples et d'énergie."
      ],
      "ja": [
        "生命の起源",
        "非生命的な化学から、自己維持し複製する最初のシステムへの移行。私の研究はその一部、すなわち生命の分子的構成要素が単純な材料とエネルギーからいかに組み上がり得たかを探っています。"
      ]
    },
    "Shock-driven synthesis": {
      "fr": [
        "Synthèse induite par choc",
        "Utiliser la brève et intense impulsion de pression et de température d'un impact pour déclencher des réactions chimiques — une façon de reproduire en laboratoire la chimie que les impacts de comètes et de météorites pourraient provoquer."
      ],
      "ja": [
        "衝撃駆動合成",
        "衝突による短く強烈な圧力・温度のパルスを利用して化学反応を駆動する手法。彗星や隕石の衝突が引き起こし得る化学を、実験室で再現する方法です。"
      ]
    },
    "Regolith": {
      "fr": [
        "Régolithe",
        "La couche meuble de poussière et de roches fragmentées qui recouvre la surface d'un astéroïde, d'une lune ou d'une planète — le matériau que le remaniement par impacts retravaille sans cesse."
      ],
      "ja": [
        "レゴリス",
        "小惑星、衛星、惑星の表面を覆う、塵と砕けた岩石からなる緩い層。衝突による撹拌で絶えず作り変えられる物質です。"
      ]
    },
    "Meteorites & organics": {
      "fr": [
        "Météorites & matière organique",
        "Les météorites riches en carbone (carbonées) contiennent des acides aminés, des sucres et des nucléobases formés dans l'espace. Les étudier — ainsi que les échantillons rapportés de Ryugu et Bennu — relie la chimie de laboratoire à de la vraie matière extraterrestre."
      ],
      "ja": [
        "隕石と有機物",
        "炭素に富む（炭素質）隕石には、宇宙で生成したアミノ酸、糖、核酸塩基が含まれています。それらや、リュウグウとベンヌから持ち帰られた試料を調べることで、実験室の化学と実際の地球外物質が結びつきます。"
      ]
    },
    "RNA world": {
      "fr": [
        "Monde à ARN",
        "L'hypothèse selon laquelle la vie primitive reposait sur l'ARN à la fois pour stocker l'information et catalyser des réactions, avant que l'ADN et les protéines ne prennent le relais. Elle fait de la formation prébiotique des briques de l'ARN une question clé."
      ],
      "ja": [
        "RNAワールド",
        "初期の生命は、DNAとタンパク質が役割を担う以前、情報の保存と反応の触媒の両方をRNAに頼っていたとする仮説。これにより、RNAの構成要素の前生物的な生成が重要な問いとなります。"
      ]
    },
    "HPLC–MS / LC–MS": {
      "fr": [
        "HPLC–MS / LC–MS",
        "La chromatographie liquide haute performance couplée à la spectrométrie de masse — l'outil analytique de référence pour séparer et identifier des traces de molécules organiques dans des échantillons météoritiques et de laboratoire. La chromatographie sépare le mélange ; le spectromètre de masse pèse chaque molécule pour l'identifier."
      ],
      "ja": [
        "HPLC–MS / LC–MS",
        "高速液体クロマトグラフィーと質量分析を組み合わせた手法で、隕石試料や実験試料中の微量有機分子を分離・同定するための主力分析法です。クロマトグラフィーが混合物を分け、質量分析計が各分子の質量を測って同定します。"
      ]
    },
    "Chromatography": {
      "fr": [
        "Chromatographie",
        "Une famille de techniques qui séparent un mélange en le faisant traverser une colonne retenant chaque composé plus ou moins longtemps. La chromatographie en phase gazeuse (GC) traite les molécules volatiles, la chromatographie liquide (LC) les molécules dissoutes ; toutes deux peuvent être couplées à une détection par spectrométrie de masse ou par ionisation de flamme."
      ],
      "ja": [
        "クロマトグラフィー",
        "混合物をカラムに通し、化合物ごとに異なる度合いで保持させることで分離する一連の手法。ガスクロマトグラフィー（GC）は揮発性分子を、液体クロマトグラフィー（LC）は溶解した分子を扱い、どちらも質量分析や水素炎イオン化検出と組み合わせられます。"
      ]
    },
    "NMR spectroscopy": {
      "fr": [
        "Spectroscopie RMN",
        "La résonance magnétique nucléaire place un échantillon dans un champ magnétique intense et lit les signaux radiofréquence émis par ses noyaux atomiques. Comme chaque noyau renseigne sur son environnement chimique, le spectre cartographie la façon dont les atomes sont liés — ce qui permet de confirmer l'identité et la pureté d'une molécule."
      ],
      "ja": [
        "NMR分光法",
        "核磁気共鳴は、試料を強い磁場の中に置き、原子核から発せられるラジオ波信号を読み取ります。各原子核がその化学的環境を反映するため、スペクトルは原子どうしのつながりを示す地図となり、分子の同定と純度の確認に用いられます。"
      ]
    },
    "X-ray diffraction (XRD)": {
      "fr": [
        "Diffraction des rayons X (DRX)",
        "Les rayons X diffusés par le réseau atomique ordonné d'un solide produisent un motif de pics qui sert d'empreinte de sa structure cristalline — identifiant le minéral ou la phase cristalline présente et si le broyage l'a modifiée."
      ],
      "ja": [
        "X線回折（XRD）",
        "固体の規則正しい原子格子で散乱されたX線は、結晶構造の指紋となるピークのパターンを生みます。どの鉱物・結晶相が存在するか、また粉砕によって変化したかを特定できます。"
      ]
    },
    "FTIR spectroscopy": {
      "fr": [
        "Spectroscopie IRTF",
        "La spectroscopie infrarouge à transformée de Fourier mesure les longueurs d'onde infrarouges absorbées par un échantillon. Les liaisons chimiques vibrent à des fréquences caractéristiques, de sorte que le spectre révèle les groupes fonctionnels présents (C=O, O–H, N–H…). Le mode ATR analyse directement les poudres et les solides."
      ],
      "ja": [
        "FTIR分光法",
        "フーリエ変換赤外分光法は、試料がどの赤外波長を吸収するかを測定します。化学結合は固有の振動数で振動するため、スペクトルから存在する官能基（C=O、O–H、N–H…）がわかります。ATRモードでは粉末や固体を直接測定できます。"
      ]
    },
    "Elemental analysis (CHNS)": {
      "fr": [
        "Analyse élémentaire (CHNS)",
        "L'échantillon est entièrement brûlé et les gaz mesurés pour déterminer sa teneur globale en carbone, hydrogène, azote et soufre — ce qui quantifie la matière organique qu'il contient et permet de vérifier qu'un composé synthétisé correspond à sa formule attendue."
      ],
      "ja": [
        "元素分析（CHNS）",
        "試料を完全に燃焼させ、発生したガスを測定して炭素・水素・窒素・硫黄の総含有量を求めます。含まれる有機物の量を定量し、合成した化合物が期待される組成式に合致するかを確認できます。"
      ]
    },
    "Isotope-ratio MS & stable isotopes": {
      "fr": [
        "SM de rapports isotopiques & isotopes stables",
        "La spectrométrie de masse de rapports isotopiques mesure le rapport précis des isotopes stables (p. ex. ¹³C/¹²C, ¹⁵N/¹⁴N) d'un échantillon. Ces rapports indiquent où une molécule s'est formée et comment elle a été transformée — en astrobiologie, ils aident à distinguer la matière organique réellement extraterrestre de la contamination terrestre."
      ],
      "ja": [
        "同位体比質量分析と安定同位体",
        "同位体比質量分析は、試料中の安定同位体の比（例：¹³C/¹²C、¹⁵N/¹⁴N）を精密に測定します。これらの比は分子がどこで生成し、どのように変化してきたかを示す指紋となり、アストロバイオロジーでは真に地球外起源の有機物と地球由来の汚染を見分ける助けとなります。"
      ]
    },
    "SEM–EDX": {
      "fr": [
        "MEB–EDX",
        "La microscopie électronique à balayage balaie un échantillon avec un faisceau d'électrons focalisé pour en imager la surface à très fort grossissement ; le détecteur EDX associé lit les rayons X émis pour cartographier quels éléments sont présents et où — reliant la texture d'un grain minéral ou météoritique à sa chimie."
      ],
      "ja": [
        "SEM–EDX",
        "走査型電子顕微鏡は、集束した電子ビームで試料を走査し、表面を非常に高い倍率で画像化します。付属のEDX検出器は励起されたX線を読み取り、どの元素がどこに存在するかをマッピングし、鉱物や隕石の粒子の組織と化学を結びつけます。"
      ]
    },
    "Density functional theory (DFT)": {
      "fr": [
        "Théorie de la fonctionnelle de la densité (DFT)",
        "Une méthode de calcul quantique qui détermine les énergies et structures moléculaires à partir des premiers principes. Elle décrit le chemin suivi par une réaction et les barrières d'énergie rencontrées — utilisée pour expliquer des résultats expérimentaux, comme la façon dont un ion métallique et l'eau ouvrent le cycle du ribose d'un ribonucléoside."
      ],
      "ja": [
        "密度汎関数理論（DFT）",
        "分子のエネルギーと構造を第一原理から計算する量子力学的な計算手法。反応がたどる経路と途中のエネルギー障壁を明らかにし、例えば金属イオンと水がリボヌクレオシドのリボース環をいかに開くかといった実験結果の説明に用いられます。"
      ]
    },
    "Organic synthesis": {
      "fr": [
        "Synthèse organique",
        "La construction et la transformation contrôlées de molécules carbonées par des réactions choisies — préparer un composé cible, effectuer des réductions et ajuster les conditions pour le rendement et la pureté. Elle fournit les produits de départ purs pour les expériences de mécanochimie et de choc."
      ],
      "ja": [
        "有機合成",
        "意図した反応によって炭素系分子を制御しながら構築・変換すること。目的化合物の合成、還元反応の実施、収率と純度のための条件最適化を行い、メカノケミストリーや衝撃実験のための純粋な出発物質を供給します。"
      ]
    },
    "Nucleobases": {
      "fr": [
        "Nucléobases",
        "Les cycles azotés (adénine, guanine, cytosine, uracile, thymine) qui portent l'information génétique dans l'ARN et l'ADN. Comment ils se forment, se lient à un sucre et survivent dans l'espace est une question prébiotique centrale."
      ],
      "ja": [
        "核酸塩基",
        "RNAとDNAで遺伝情報を担う窒素含有の環（アデニン、グアニン、シトシン、ウラシル、チミン）。それらがどのように生成し、糖と結合し、宇宙で生き残るかは前生物化学の中心的な問いです。"
      ]
    },
    "Amino acids": {
      "fr": [
        "Acides aminés",
        "Les briques moléculaires des protéines. On en a trouvé dans des météorites carbonées, ce qui montre que les ingrédients de la vie peuvent se former de façon abiotique dans l'espace — un fil conducteur entre la chimie des météorites et l'origine de la vie."
      ],
      "ja": [
        "アミノ酸",
        "タンパク質の分子的構成要素。炭素質隕石から見つかっており、生命の材料が宇宙で非生物的に生成し得ることを示しています。隕石の化学と生命の起源をつなぐ重要な手がかりです。"
      ]
    },
    "Ribose & sugars": {
      "fr": [
        "Ribose & sucres",
        "Le ribose est le sucre à cinq carbones du squelette de l'ARN ; des sucres apparentés ont été détectés dans des météorites. Les sucres sont fragiles : comprendre comment ils se forment et survivent aux impacts est important pour le scénario du monde à ARN."
      ],
      "ja": [
        "リボースと糖",
        "リボースはRNAの骨格をなす五炭糖で、関連する糖は隕石からも検出されています。糖は壊れやすいため、それらがどのように生成し衝突過程を生き延びるかを理解することは、RNAワールドの物語にとって重要です。"
      ]
    },
    "Chirality & homochirality": {
      "fr": [
        "Chiralité & homochiralité",
        "De nombreuses molécules biologiques existent sous deux formes images l'une de l'autre dans un miroir, mais la vie n'en utilise presque qu'une (acides aminés gauches, sucres droits). Expliquer comment cette asymétrie est apparue à partir d'une chimie prébiotique vraisemblablement symétrique reste un problème ouvert majeur."
      ],
      "ja": [
        "キラリティーとホモキラリティー",
        "多くの生体分子は互いに鏡像の関係にある2つの形で存在しますが、生命はほぼ一方だけを使っています（左手型のアミノ酸、右手型の糖）。おそらく対称的だった前生物化学から、この片手性がいかに生じたかを説明することは、根深い未解決問題です。"
      ]
    },
    "Ryugu, Bennu & sample return": {
      "fr": [
        "Ryugu, Bennu & retour d'échantillons",
        "Des missions spatiales qui ont rapporté sur Terre de la matière d'astéroïde intacte — Hayabusa2 depuis Ryugu et OSIRIS-REx depuis Bennu. Ces échantillons non contaminés permettent de confronter directement la chimie de laboratoire à la vraie matière organique d'astéroïdes."
      ],
      "ja": [
        "リュウグウ、ベンヌとサンプルリターン",
        "手つかずの小惑星物質を地球に持ち帰った宇宙ミッション（リュウグウからのはやぶさ2、ベンヌからのOSIRIS-REx）。汚染されていないこれらの試料により、実験室の化学を実際の小惑星有機物と直接照らし合わせることができます。"
      ]
    },
    "Carbonaceous chondrites": {
      "fr": [
        "Chondrites carbonées",
        "Des météorites primitives riches en carbone (comme Murchison) qui conservent des molécules organiques du Système solaire primitif — dont des acides aminés, des nucléobases et des sucres. Ce sont des archives naturelles de la chimie prébiotique."
      ],
      "ja": [
        "炭素質コンドライト",
        "初期太陽系の有機分子（アミノ酸、核酸塩基、糖など）を保存している、炭素に富む始原的な隕石（マーチソン隕石など）。前生物化学の天然のアーカイブです。"
      ]
    },
    "Comets & micrometeorites": {
      "fr": [
        "Comètes & micrométéorites",
        "Les comètes et la pluie constante de micrométéorites apportent de la matière riche en composés organiques à la surface des planètes. Ce sont des vecteurs possibles qui auraient pu ensemencer la Terre primitive avec les molécules nécessaires à la vie."
      ],
      "ja": [
        "彗星と微小隕石",
        "彗星と絶え間なく降り注ぐ微小隕石は、有機物に富む物質を惑星表面にもたらします。生命に必要な分子を初期地球にもたらした可能性のある運び手の候補です。"
      ]
    },
    "Space weathering": {
      "fr": [
        "Altération spatiale",
        "L'altération progressive d'une surface sans atmosphère par les ions du vent solaire, le rayonnement et les impacts de micrométéorites. Avec le remaniement par impacts, elle détermine la façon dont la matière organique est transformée et préservée sur les astéroïdes."
      ],
      "ja": [
        "宇宙風化",
        "太陽風イオン、放射線、微小隕石の衝突による、大気のない天体表面の緩やかな変質。衝突による撹拌とともに、小惑星上で有機物がどのように変化し保存されるかを左右します。"
      ]
    },
    "Miller–Urey experiment": {
      "fr": [
        "Expérience de Miller–Urey",
        "L'expérience de 1953 qui a produit des acides aminés en faisant passer des étincelles électriques dans une atmosphère simulant celle de la Terre primitive — la démonstration fondatrice que les briques du vivant peuvent se former à partir de molécules simples et d'énergie."
      ],
      "ja": [
        "ミラー–ユーリーの実験",
        "初期地球の大気を模した気体に電気火花を通してアミノ酸を生成した1953年の実験。生命の構成要素が単純な分子とエネルギーから生成し得ることを示した、先駆的な実証です。"
      ]
    },
    "Mineral catalysis": {
      "fr": [
        "Catalyse minérale",
        "Les minéraux — argiles comme la montmorillonite, oxydes métalliques et sels — peuvent accélérer et orienter les réactions prébiotiques à leur surface, en concentrant les réactifs et en abaissant les barrières d'énergie. Les surfaces minérales sont un cadre probable de la chimie primitive."
      ],
      "ja": [
        "鉱物触媒",
        "モンモリロナイトのような粘土、金属酸化物、塩などの鉱物は、表面で反応物を濃縮しエネルギー障壁を下げることで、前生物的反応を加速し方向づけることができます。鉱物表面は初期の化学の舞台であった可能性が高いと考えられています。"
      ]
    },
    "Exogenous delivery / panspermia": {
      "fr": [
        "Apport exogène / panspermie",
        "L'idée qu'une partie des ingrédients chimiques de la vie — voire la vie elle-même — est arrivée sur Terre depuis l'espace, transportée par des météorites, des comètes et des poussières. Mes travaux évaluent dans quelle mesure les molécules organiques survivent à ce voyage et à ses impacts."
      ],
      "ja": [
        "外来供給／パンスペルミア",
        "生命の化学的材料の一部、あるいは生命そのものが、隕石、彗星、塵によって宇宙から地球に運ばれてきたという考え。私の研究は、有機分子がその旅と衝突をどれほど生き延びるかを検証しています。"
      ]
    },
    "Habitability & biosignatures": {
      "fr": [
        "Habitabilité & biosignatures",
        "L'habitabilité désigne la capacité d'un environnement à abriter la vie ; une biosignature est un indice chimique ou structural montrant que la vie est ou a été présente. Distinguer les vraies biosignatures de la chimie abiotique est un défi central de l'astrobiologie."
      ],
      "ja": [
        "ハビタビリティと生命痕跡",
        "ハビタビリティとは環境が生命を支えられるかどうかであり、生命痕跡（バイオシグネチャー）とは生命が存在する、あるいは存在したことを示す化学的・構造的な痕跡です。真の生命痕跡を非生物的な化学と見分けることは、アストロバイオロジーの中心的な課題です。"
      ]
    }
  };
  const KB_KEYS = {"Asteroid gardening": ["remaniement", "jardinage", "小惑星表面の撹拌", "撹拌", "ガーデニング"],
    "Mechanochemistry": ["mécanochimie", "mecanochimie", "broyage", "メカノケミストリー", "メカノケミカル", "ボールミル"],
    "Prebiotic chemistry": ["prébiotique", "prebiotique", "前生物化学", "前生物"],
    "Origin of life": ["origine de la vie", "生命の起源"],
    "Astrobiology": ["astrobiologie", "アストロバイオロジー", "宇宙生物学"],
    "Ribonucleosides": ["ribonucléoside", "ribonucléosides", "リボヌクレオシド"],
    "Shock-driven synthesis": ["synthèse par choc", "choc", "衝撃合成", "衝撃"],
    "Regolith": ["régolithe", "regolithe", "レゴリス"],
    "Meteorites & organics": ["météorite", "météorites", "隕石"],
    "RNA world": ["monde à arn", "arn", "rnaワールド"],
    "Chromatography": ["chromatographie", "クロマトグラフィー"],
    "NMR spectroscopy": ["rmn", "résonance magnétique", "核磁気共鳴"],
    "X-ray diffraction (XRD)": ["drx", "diffraction", "x線回折"],
    "FTIR spectroscopy": ["infrarouge", "irtf", "赤外"],
    "Elemental analysis (CHNS)": ["analyse élémentaire", "元素分析"],
    "Isotope-ratio MS & stable isotopes": ["isotope", "isotopes", "同位体"],
    "SEM–EDX": ["meb", "microscopie électronique", "電子顕微鏡"],
    "Density functional theory (DFT)": ["fonctionnelle de la densité", "密度汎関数", "計算化学"],
    "Organic synthesis": ["synthèse organique", "有機合成"],
    "Nucleobases": ["nucléobase", "nucléobases", "核酸塩基"],
    "Amino acids": ["acide aminé", "acides aminés", "アミノ酸"],
    "Ribose & sugars": ["sucre", "sucres", "リボース", "糖"],
    "Chirality & homochirality": ["chiralité", "homochiralité", "キラリティー", "ホモキラリティー"],
    "Ryugu, Bennu & sample return": ["retour d'échantillons", "リュウグウ", "ベンヌ", "はやぶさ", "サンプルリターン"],
    "Carbonaceous chondrites": ["chondrite carbonée", "chondrites", "炭素質コンドライト", "コンドライト"],
    "Comets & micrometeorites": ["comète", "comètes", "micrométéorite", "彗星", "微小隕石"],
    "Space weathering": ["altération spatiale", "宇宙風化"],
    "Miller–Urey experiment": ["miller", "ミラー"],
    "Mineral catalysis": ["catalyse", "argile", "鉱物触媒", "触媒", "粘土"],
    "Exogenous delivery / panspermia": ["apport exogène", "panspermie", "パンスペルミア", "外来供給"],
    "Habitability & biosignatures": ["habitabilité", "biosignature", "ハビタビリティ", "生命痕跡", "バイオシグネチャー"]};
  KB.forEach(item => {
    const t = KB_I18N[item.term.en];
    if (t) for (const L of ["fr", "ja"]) { item.term[L] = t[L][0]; item.a[L] = t[L][1]; }
    (KB_KEYS[item.term.en] || []).forEach(k => { if (item.keys.indexOf(k) === -1) item.keys.push(k); });
  });

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
      hint.textContent = ui("hint");
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
        ? ui("noOther")
        : ui("none");
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
    head.innerHTML = '<span class="sa-badge">' + ui("answer") + '</span>';
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
    input.placeholder = ui("placeholder");
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
