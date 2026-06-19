/* GPM Astrobiology — portfolio UI kit.
   Composes the design-system primitives into the real research site:
   sticky nav (theme + language + search), hero, news, experience
   timeline, publications with an oral/poster filter, tutoring CTA. */
const { useState, useEffect, useRef } = React;
const DS = window.GPMAstrobiologyDesignSystem_e8cc9f;
const { Button, Card, Tag, IconButton, MetricStat, PresoBadge, StatusDot, NewsWindow, NewsItem, TimelineItem } = DS;

const LOGO = '../../assets/logos';

/* ---- tiny bilingual dictionary ---- */
const I18N = {
  en: { news:'News', exp:'Experience', pubs:'Publications', tutoring:'Tutoring', research:'Research',
        role:'PhD Researcher in Chemistry · Astrobiology',
        bio:'Research on mechanochemical and shock-driven synthesis of organic molecules relevant to prebiotic chemistry and the origin of life.',
        cv:'Download CV', m_pubs:'Publications', m_talks:'Talks & posters', m_areas:'Research areas', m_h:'h-index',
        research_lead:'What I am working on right now — open questions in the chemistry of life\u2019s origins.',
        tut_lead:'One-to-one science tutoring', tut_cta:'Curiosity, made rigorous.', book:'Book a session' },
  pt: { news:'Notícias', exp:'Experiência', pubs:'Publicações', tutoring:'Explicações', research:'Investigação',
        role:'Investigador de Doutoramento em Química · Astrobiologia',
        bio:'Investigação sobre síntese mecanoquímica e por choque de moléculas orgânicas relevantes para a química prebiótica e a origem da vida.',
        cv:'Descarregar CV', m_pubs:'Publicações', m_talks:'Palestras & posters', m_areas:'Áreas', m_h:'índice-h',
        research_lead:'No que estou a trabalhar neste momento — questões em aberto na química das origens da vida.',
        tut_lead:'Explicações de ciência individuais', tut_cta:'Curiosidade, com rigor.', book:'Marcar sessão' },
};

const wrap = { maxWidth: 'var(--max-width)', margin: '0 auto', padding: '0 20px' };
const h2Style = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-h2)', letterSpacing: '-.01em', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' };
const sectionStyle = { marginBottom: 'var(--space-section)', scrollMarginTop: 'calc(var(--nav-h) + 16px)' };

/* ================= NAV ================= */
function Nav({ lang, setLang, theme, setTheme, onSearch }) {
  const t = I18N[lang];
  const navStyle = {
    position: 'sticky', top: 0, zIndex: 50,
    background: theme === 'light' ? 'rgba(255,255,255,.72)' : 'rgba(8,12,24,.62)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
  };
  const inner = { ...wrap, height: 'var(--nav-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const logo = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text)', letterSpacing: '.02em', textDecoration: 'none' };
  const links = { display: 'flex', gap: '4px', alignItems: 'center' };
  const link = { padding: '8px 12px', borderRadius: '9px', color: 'var(--muted)', fontWeight: 600, fontSize: '.94rem', textDecoration: 'none' };
  const items = [['#research', t.research], ['#news', t.news], ['#experience', t.exp], ['#publications', t.pubs], ['#tutoring', t.tutoring]];
  return (
    <header style={navStyle}>
      <div style={inner}>
        <a href="#about" style={logo}>G<span style={{ color: 'var(--accent)' }}>P</span>M</a>
        <nav style={links} className="nav-desktop">
          {items.map(([href, label]) => (
            <a key={href} href={href} style={link}
               onMouseEnter={(e) => { e.target.style.color = 'var(--text)'; e.target.style.background = 'rgba(255,255,255,.06)'; }}
               onMouseLeave={(e) => { e.target.style.color = 'var(--muted)'; e.target.style.background = 'transparent'; }}>{label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconButton label="Search the site" onClick={onSearch}><i data-lucide="search"></i></IconButton>
          <IconButton label="Switch language" onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}>{lang === 'en' ? 'PT' : 'EN'}</IconButton>
          <IconButton label="Switch theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <i data-lucide={theme === 'dark' ? 'sun' : 'moon'}></i>
          </IconButton>
        </div>
      </div>
    </header>
  );
}

/* ================= HERO ================= */
function Hero({ lang }) {
  const t = I18N[lang];
  const card = {
    display: 'flex', gap: '26px', flexWrap: 'wrap',
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '24px',
  };
  const heroShell = { background: 'linear-gradient(180deg,rgba(255,255,255,.04),transparent)', padding: '20px', borderRadius: 'var(--radius-lg)', margin: '28px 0 48px' };
  const tile = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', padding: '9px', borderRadius: '14px', background: 'var(--card)', border: '1px solid var(--border)' };
  const social = { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 13px', borderRadius: '10px', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', fontWeight: 600, fontSize: '.92rem', color: 'var(--text)', textDecoration: 'none' };
  const affils = [['cqe-t.png', 'CQE'], ['nasa-t.png', 'NASA'], ['impmc-t.png', 'IMPMC']];
  return (
    <section id="about" style={heroShell}>
      <div style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <img src="../../assets/avatar.jpg" alt="Gustavo Pinho Maia" style={{ width: 'min(210px,52vw)', aspectRatio: '23/24', borderRadius: '16px', objectFit: 'cover', boxShadow: 'var(--shadow)' }} />
          <div style={{ marginTop: '.4em', fontSize: '.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>Credit: IMPMC — Cécile Duflot</div>
        </div>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-hero)', lineHeight: 1.15, margin: 0 }}>Gustavo Pinho Maia</h1>
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              {affils.map(([f, alt]) => (
                <span key={alt} style={tile}><img src={`${LOGO}/${f}`} alt={alt} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /></span>
              ))}
            </div>
          </div>
          <div style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: '12px' }}>{t.role}</div>
          <p style={{ margin: '0 0 16px', maxWidth: '60ch', color: 'var(--text)', lineHeight: 1.6 }}>{t.bio}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
            <Tag>Mechanochemistry</Tag><Tag>Prebiotic Chemistry</Tag><Tag>Astrobiology</Tag><Tag>Origin of Life</Tag>
          </div>
          <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', margin: '0 0 18px' }}>
            <MetricStat value="3" label={t.m_pubs} />
            <MetricStat value="11" label={t.m_talks} />
            <MetricStat value="4" label={t.m_areas} />
            <MetricStat value="2" label={t.m_h} href="https://scholar.google.com/citations?user=TTVIFykAAAAJ" />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <Button variant="primary" href="../../assets/cv.pdf" download="Gustavo-Pinho-Maia-CV.pdf" icon={<i data-lucide="download" style={{ width: 16, height: 16 }}></i>}>{t.cv}</Button>
            <a href="https://orcid.org/0000-0001-5314-8816" style={social} target="_blank" rel="noopener"><img src={`${LOGO}/orcid.png`} width="18" height="18" alt="" /> ORCID</a>
            <a href="https://www.linkedin.com/in/gustavopinhomaia" style={social} target="_blank" rel="noopener"><img src={`${LOGO}/linkedin.png`} width="18" height="18" alt="" /> LinkedIn</a>
            <a href="https://www.researchgate.net/profile/Gustavo_Maia2" style={social} target="_blank" rel="noopener"><img src={`${LOGO}/researchgate.png`} width="18" height="18" alt="" /> ResearchGate</a>
            <Button variant="cta" href="#tutoring">Cientifica(mente)</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================= CURRENT RESEARCH ================= */
const RESEARCH = [
  {
    eyebrow: 'Impact shock chemistry',
    title: 'Asteroid Gardening',
    body: 'How impacts could affect our understanding of extraterrestrial organic matter.',
    tags: ['Shock synthesis', 'Exogenous delivery'],
  },
  {
    eyebrow: 'Prebiotic chemistry',
    title: 'Extraterrestrial Ribonucleosides',
    body: 'Possibility or myth?',
    tags: ['Ribonucleosides', 'Mechanochemistry'],
  },
];
function ResearchSection({ lang }) {
  const t = I18N[lang];
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '18px' };
  return (
    <section id="research" style={sectionStyle}>
      <h2 style={h2Style}><i data-lucide="atom" style={{ width: 22, height: 22, color: 'var(--accent)' }}></i>Current Research</h2>
      <p style={{ color: 'var(--muted)', margin: '0 0 20px', maxWidth: '64ch' }}>{t.research_lead}</p>
      <div style={grid}>
        {RESEARCH.map((r) => (
          <Card key={r.title} interactive padding={24} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ alignSelf: 'flex-start', fontSize: '.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--accent)', background: 'rgba(125,211,252,.12)', border: '1px solid rgba(125,211,252,.22)', padding: '4px 10px', borderRadius: 'var(--radius-pill)' }}>{r.eyebrow}</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.32rem', lineHeight: 1.22, margin: 0 }}>{r.title}</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '.96rem', lineHeight: 1.55, flex: 1 }}>{r.body}</p>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>{r.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ================= NEWS ================= */
function NewsSection({ lang }) {
  const t = I18N[lang];
  return (
    <section id="news" style={sectionStyle}>
      <h2 style={h2Style}><i data-lucide="newspaper" style={{ width: 22, height: 22, color: 'var(--accent)' }}></i>{t.news}</h2>
      <NewsWindow title="~/updates" action={<a href="https://www.linkedin.com/in/gustavopinhomaia" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }} target="_blank" rel="noopener">LinkedIn ↗</a>}>
        <NewsItem date="2026">Recognised among the <em>“Excellent Teachers 2024/2025”</em> at Instituto Superior Técnico, for teaching in the General Chemistry laboratories.</NewsItem>
        <NewsItem date="Oct 2025">Oral talk at <em>AbGradE’25</em> and a poster at <em>EANA 2025</em> (Lisbon) — which earned the <strong>EANA 2025 Poster Award</strong> — plus an oral at the <em>“Small Bodies Day”</em> Symposium (IPGP, Paris).</NewsItem>
        <NewsItem date="Jul 2025">Oral presentation at <em>BEACON 2025</em> (Harpa, Reykjavik) on mechanochemical events and the exogenous delivery of organic matter.</NewsItem>
        <NewsItem date="Feb 2025">New paper out in <em>Applied Sciences</em>: Mechanochemical Reactivity of Ribonucleosides Mediated by Inorganic Species.</NewsItem>
        <NewsItem date="Jan 2025" last>Started as Visiting Scientist at <em>MNHN — IMPMC</em> (Paris), working with Prof. Laurent Remusat.</NewsItem>
      </NewsWindow>
    </section>
  );
}

/* ================= EXPERIENCE ================= */
function ExperienceSection({ lang }) {
  const t = I18N[lang];
  return (
    <section id="experience" style={sectionStyle}>
      <h2 style={h2Style}><i data-lucide="flask-conical" style={{ width: 22, height: 22, color: 'var(--accent)' }}></i>{t.exp}</h2>
      <TimelineItem logo={`${LOGO}/mnhn.png`} title="Visiting Scientist · MNHN — IMPMC, Paris" meta="Jan 2025 — present">
        Isotopic & molecular analysis of carbon-rich extraterrestrial samples with Prof. Laurent Remusat.
      </TimelineItem>
      <TimelineItem logo={`${LOGO}/nasa-t.png`} title="Research Stay · NASA Goddard Astrobiology Analytical Lab" meta="Nov 2024">
        HPLC–MS of extraterrestrial organics.
      </TimelineItem>
      <TimelineItem logo={`${LOGO}/cqe-t.png`} title="PhD Researcher · CQE — Instituto Superior Técnico" meta="2023 — present">
        FCT doctoral grant 2023.01099.BD — “Mechanochemical energy and prebiotic synthesis”.
      </TimelineItem>
      <TimelineItem logo={`${LOGO}/ubi.png`} title="MSc in Chemistry · Universidade da Beira Interior" meta="2021" last />
    </section>
  );
}

/* ================= PUBLICATIONS ================= */
const PUBS = [
  { type: 'oral', title: 'Mechanochemical Reactivity of Ribonucleosides Mediated by Inorganic Species', venue: 'Applied Sciences · 2025', logo: 'applied_sciences' },
  { type: 'poster', title: 'Shock-driven synthesis and the exogenous delivery of organic matter', venue: 'EANA 2025 · Poster Award', logo: 'EANA' },
  { type: 'oral', title: 'Mechanochemical events in prebiotic chemistry', venue: 'BEACON 2025 · Reykjavik', logo: null },
];
function PublicationsSection({ lang }) {
  const t = I18N[lang];
  const [filter, setFilter] = useState('all');
  const fbtn = (k, label) => {
    const active = filter === k;
    return (
      <button key={k} onClick={() => setFilter(k)} style={{
        border: '1px solid ' + (active ? 'transparent' : 'var(--border)'),
        background: active ? 'linear-gradient(90deg,var(--accent),var(--accent-strong))' : 'rgba(255,255,255,.04)',
        color: active ? 'var(--on-accent)' : 'var(--muted)',
        padding: '5px 13px', borderRadius: 'var(--radius-pill)', fontWeight: 600, fontSize: '.82rem',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>{label}</button>
    );
  };
  const shown = PUBS.filter((p) => filter === 'all' || p.type === filter);
  return (
    <section id="publications" style={sectionStyle}>
      <h2 style={h2Style}><i data-lucide="book-open" style={{ width: 22, height: 22, color: 'var(--accent)' }}></i>{t.pubs}</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {fbtn('all', 'All')}{fbtn('oral', 'Oral')}{fbtn('poster', 'Poster')}
      </div>
      {shown.map((p, i) => (
        <TimelineItem key={p.title} logo={p.logo ? `${LOGO}/${p.logo}.png` : null} title={p.title} meta={p.venue} last={i === shown.length - 1}>
          <PresoBadge type={p.type} />
        </TimelineItem>
      ))}
    </section>
  );
}

/* ================= TUTORING ================= */
function Tutoring({ lang }) {
  const t = I18N[lang];
  const box = { background: 'var(--grad-cosmic)', borderRadius: 'var(--radius-lg)', padding: 'clamp(22px,4vw,36px)', boxShadow: '0 14px 40px rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.08)' };
  return (
    <section id="tutoring" style={sectionStyle}>
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 'var(--text-brand)', margin: 0, color: '#fff' }}>Cientifica(mente)</h3>
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: '#cdeeff', background: 'rgba(255,255,255,.14)', padding: '6px 12px', borderRadius: 'var(--radius-pill)' }}>EN · PT</span>
        </div>
        <p style={{ color: '#eef4ff', margin: '14px 0 0', maxWidth: '60ch' }}>{t.tut_lead} — chemistry, physics, and scientific method, from secondary school to undergraduate.</p>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#a9ecff', fontSize: 'clamp(1.3rem,1rem+1.6vw,1.9rem)', marginTop: '22px' }}>{t.tut_cta}</p>
        <div style={{ marginTop: '20px' }}>
          <Button variant="ghost">{t.book}</Button>
        </div>
      </div>
    </section>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  const linkS = { color: 'var(--muted)', fontWeight: 600, fontSize: '.9rem', textDecoration: 'none' };
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: '40px', background: 'rgba(7,12,29,.5)' }}>
      <div style={{ ...wrap, padding: '24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--muted)', fontSize: '.86rem', margin: 0 }}>© 2026 Gustavo Pinho Maia · Astrobiology Research</p>
        <nav style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="https://orcid.org/0000-0001-5314-8816" style={linkS} target="_blank" rel="noopener">ORCID</a>
          <a href="https://www.linkedin.com/in/gustavopinhomaia" style={linkS} target="_blank" rel="noopener">LinkedIn</a>
          <a href="https://scholar.google.com/citations?user=TTVIFykAAAAJ" style={linkS} target="_blank" rel="noopener">Google Scholar</a>
          <a href="mailto:gustavopinho.maia@mnhn.fr" style={linkS}>Email</a>
        </nav>
      </div>
    </footer>
  );
}

/* ================= SEARCH OVERLAY ================= */
const SEARCH_INDEX = [
  { badge: 'Research', title: 'Asteroid Gardening', snip: 'How impacts could affect our understanding of extraterrestrial organic matter', href: '#research' },
  { badge: 'Research', title: 'Extraterrestrial Ribonucleosides — possibility or myth?', snip: 'Prebiotic chemistry · mechanochemistry', href: '#research' },
  { badge: 'Section', title: 'News & updates', snip: 'Excellent Teachers 2024/2025 · EANA Poster Award · NASA research stay', href: '#news' },
  { badge: 'Experience', title: 'NASA Goddard Astrobiology Analytical Lab', snip: 'HPLC–MS of extraterrestrial organics, Nov 2024', href: '#experience' },
  { badge: 'Experience', title: 'MNHN — IMPMC, Paris', snip: 'Visiting Scientist with Prof. Laurent Remusat', href: '#experience' },
  { badge: 'Publication', title: 'Mechanochemical Reactivity of Ribonucleosides', snip: 'Applied Sciences, 2025', href: '#publications' },
  { badge: 'Tutoring', title: 'Cientifica(mente)', snip: 'One-to-one science tutoring, EN · PT', href: '#tutoring' },
];
function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  if (!open) return null;
  const results = SEARCH_INDEX.filter((r) => (r.title + r.snip).toLowerCase().includes(q.toLowerCase()));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14vh 20px 24px', background: 'rgba(4,8,20,.66)', backdropFilter: 'blur(8px)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px,100%)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderBottom: '1px solid var(--border)' }}>
          <i data-lucide="search" style={{ width: 20, height: 20, color: 'var(--accent)' }}></i>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search research, publications, experience…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1.05rem' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.68rem', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 7px' }}>Esc</span>
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: '6px', maxHeight: '54vh', overflowY: 'auto' }}>
          {results.map((r) => (
            <li key={r.title}>
              <a href={r.href} onClick={onClose} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--text)', textDecoration: 'none' }}
                 onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-hover)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <span style={{ flex: 'none', marginTop: '2px', fontSize: '.64rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--accent)', background: 'rgba(125,211,252,.12)', border: '1px solid rgba(125,211,252,.2)', padding: '4px 8px', borderRadius: 'var(--radius-pill)' }}>{r.badge}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontWeight: 700, fontSize: '.96rem' }}>{r.title}</span>
                  <span style={{ fontSize: '.84rem', color: 'var(--muted)' }}>{r.snip}</span>
                </span>
              </a>
            </li>
          ))}
          {results.length === 0 && <li style={{ padding: '16px', color: 'var(--muted)' }}>No matches.</li>}
        </ul>
      </div>
    </div>
  );
}

/* ================= APP ================= */
function App() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [search, setSearch] = useState(false);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <>
      <Nav lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onSearch={() => setSearch(true)} />
      <main style={{ ...wrap, paddingTop: '8px', position: 'relative', zIndex: 0 }}>
        <Hero lang={lang} />
        <ResearchSection lang={lang} />
        <NewsSection lang={lang} />
        <ExperienceSection lang={lang} />
        <PublicationsSection lang={lang} />
        <Tutoring lang={lang} />
      </main>
      <Footer />
      <SearchOverlay open={search} onClose={() => setSearch(false)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
