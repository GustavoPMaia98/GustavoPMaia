/* @ds-bundle: {"format":3,"namespace":"GPMAstrobiologyDesignSystem_e8cc9f","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"MetricStat","sourcePath":"components/core/MetricStat.jsx"},{"name":"PresoBadge","sourcePath":"components/core/PresoBadge.jsx"},{"name":"StatusDot","sourcePath":"components/core/StatusDot.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"NewsWindow","sourcePath":"components/feedback/NewsWindow.jsx"},{"name":"NewsItem","sourcePath":"components/feedback/NewsWindow.jsx"},{"name":"TimelineItem","sourcePath":"components/feedback/TimelineItem.jsx"}],"sourceHashes":{"components/core/Button.jsx":"a5eabfd05253","components/core/Card.jsx":"654d3aa22bc0","components/core/IconButton.jsx":"4db7da75463a","components/core/MetricStat.jsx":"842e49e41356","components/core/PresoBadge.jsx":"5b9e04956e68","components/core/StatusDot.jsx":"f3cbafe81780","components/core/Tag.jsx":"3710bb118b60","components/feedback/NewsWindow.jsx":"675a7936d22a","components/feedback/TimelineItem.jsx":"9e0c4229940c","ui_kits/portfolio/app.jsx":"063a893b5d21","ui_kits/portfolio/starfield.js":"8d3afb5f5ba0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GPMAstrobiologyDesignSystem_e8cc9f = window.GPMAstrobiologyDesignSystem_e8cc9f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Button — the brand's primary action. A cyan→blue gradient pill with
 * near-black text, a ghost outline variant, and the italic "cta" pill
 * used for the tutoring sub-brand. Lifts 2px and glows on hover.
 */
function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  disabled = false,
  icon = null,
  type = 'button',
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const pad = size === 'sm' ? '8px 16px' : '11px 20px';
  const fontSize = size === 'sm' ? '.9rem' : '1rem';
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: pad,
    fontFamily: 'var(--font-body)',
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'none',
    border: 'none',
    transition: 'filter .2s, transform .12s, box-shadow .25s',
    transform: press ? 'translateY(0)' : hover && !disabled ? 'translateY(-2px)' : 'translateY(0)'
  };
  const variants = {
    primary: {
      background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))',
      color: 'var(--on-accent)',
      filter: hover && !disabled ? 'brightness(1.06)' : 'none',
      boxShadow: hover && !disabled ? 'var(--shadow-glow-cyan)' : 'none'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1px solid var(--border-strong)',
      boxShadow: hover && !disabled ? '0 8px 22px rgba(255,255,255,.10)' : 'none'
    },
    cta: {
      background: 'var(--grad-cosmic)',
      color: '#fff',
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      boxShadow: hover && !disabled ? '0 8px 22px rgba(27,154,170,.4)' : 'none'
    }
  };
  const style = {
    ...base,
    ...(variants[variant] || variants.primary)
  };
  const handlers = disabled ? {} : {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    onClick
  };
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, icon, children);
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: style
    }, handlers, rest), content);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    style: style,
    disabled: disabled
  }, handlers, rest), content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Card — the frosted-glass surface that holds all content. Translucent
 * white fill over the starfield, hairline border, soft drop shadow.
 * When `interactive`, it lightens, gains a cyan border, and lifts on hover.
 */
function Card({
  children,
  interactive = false,
  padding = 24,
  style: styleProp = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const lift = interactive && hover;
  const style = {
    background: lift ? 'var(--card-hover)' : 'var(--card)',
    border: `1px solid ${lift ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-lg)',
    boxShadow: lift ? 'var(--shadow-card-hover)' : 'var(--shadow)',
    padding: `${padding}px`,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    transform: lift ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'background .25s, border-color .25s, transform .2s, box-shadow .25s',
    cursor: interactive ? 'pointer' : 'default',
    ...styleProp
  };
  const handlers = interactive ? {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  } : {};
  return /*#__PURE__*/React.createElement("div", _extends({
    style: style
  }, handlers, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * IconButton — a square, bordered ghost button for nav tools and icon-only
 * actions (search, theme toggle, language). Holds a Lucide SVG or short
 * text label (e.g. "PT"). 38×38 by default.
 */
function IconButton({
  children,
  label,
  onClick,
  size = 38,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    background: hover ? 'rgba(255,255,255,.06)' : 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: '.82rem',
    transition: 'background .2s, border-color .2s'
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: style,
    "aria-label": label,
    title: label,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/MetricStat.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * MetricStat — a single highlight statistic: a large Fraunces number in
 * cyan above a small uppercase label. Used in the hero metrics strip.
 */
function MetricStat({
  value,
  label,
  href,
  ...rest
}) {
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: 'var(--font-body)'
  };
  const num = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 'var(--text-metric)',
    color: 'var(--accent)',
    lineHeight: 1
  };
  const lab = {
    fontSize: 'var(--text-eyebrow)',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-eyebrow)',
    marginTop: '4px'
  };
  const Inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: num
  }, value), /*#__PURE__*/React.createElement("span", {
    style: lab
  }, label));
  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: wrap
    }, rest), Inner);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    style: wrap
  }, rest), Inner);
}
Object.assign(__ds_scope, { MetricStat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/MetricStat.jsx", error: String((e && e.message) || e) }); }

// components/core/PresoBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * PresoBadge — an uppercase pill marking a presentation as an oral talk
 * (cyan) or a poster (amber). Mirrors the All / Oral / Poster filter.
 */
function PresoBadge({
  type = 'oral',
  children,
  ...rest
}) {
  const palettes = {
    oral: {
      color: 'var(--accent)',
      background: 'rgba(125,211,252,.12)',
      border: 'rgba(125,211,252,.28)'
    },
    poster: {
      color: '#fbbf24',
      background: 'rgba(251,191,36,.12)',
      border: 'rgba(251,191,36,.30)'
    }
  };
  const p = palettes[type] || palettes.oral;
  const style = {
    display: 'inline-block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-eyebrow)',
    fontWeight: 800,
    letterSpacing: 'var(--tracking-eyebrow)',
    textTransform: 'uppercase',
    padding: '3px 9px',
    borderRadius: 'var(--radius-pill)',
    color: p.color,
    background: p.background,
    border: `1px solid ${p.border}`
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: style
  }, rest), children || (type === 'poster' ? 'Poster' : 'Oral'));
}
Object.assign(__ds_scope, { PresoBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PresoBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusDot.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StatusDot — a small filled circle with a soft halo, borrowed from
 * terminal traffic-lights. `live` (green), `warn` (amber), `danger` (red).
 */
function StatusDot({
  status = 'live',
  size = 9,
  ...rest
}) {
  const colors = {
    live: {
      c: 'var(--status-live)',
      halo: 'rgba(40,200,64,.18)'
    },
    warn: {
      c: 'var(--status-warn)',
      halo: 'rgba(251,191,36,.18)'
    },
    danger: {
      c: 'var(--status-danger)',
      halo: 'rgba(255,95,87,.18)'
    }
  };
  const s = colors[status] || colors.live;
  const style = {
    display: 'inline-block',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: s.c,
    boxShadow: `0 0 0 3px ${s.halo}`,
    flex: 'none'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: style
  }, rest));
}
Object.assign(__ds_scope, { StatusDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusDot.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — a small cyan-tinted chip used for research keywords and topics
 * (e.g. "Mechanochemistry", "Astrobiology"). Pill-shaped, translucent.
 */
function Tag({
  children,
  ...rest
}) {
  const style = {
    display: 'inline-block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-chip)',
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--accent)',
    background: 'rgba(125,211,252,.12)',
    border: '1px solid rgba(125,211,252,.22)',
    padding: '5px 11px',
    borderRadius: 'var(--radius-pill)'
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/NewsWindow.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * NewsWindow — a "terminal window" panel with macOS-style traffic-light
 * dots and a monospace title. Holds a list of dated news items. The
 * signature container for the site's News section.
 */
function NewsWindow({
  title = '~/updates',
  action = null,
  children,
  ...rest
}) {
  const win = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    background: 'var(--card)',
    boxShadow: 'var(--shadow)',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)'
  };
  const bar = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,.05)',
    borderBottom: '1px solid var(--border)'
  };
  const dots = {
    display: 'inline-flex',
    gap: '6px'
  };
  const dot = bg => ({
    width: '11px',
    height: '11px',
    borderRadius: '50%',
    background: bg,
    display: 'block'
  });
  const titleStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '.85rem',
    color: 'var(--muted)'
  };
  const actionStyle = {
    marginLeft: 'auto',
    fontSize: '.82rem',
    fontWeight: 600
  };
  const body = {
    padding: '6px 16px 14px'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: win
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: bar
  }, /*#__PURE__*/React.createElement("span", {
    style: dots,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    style: dot('#ff5f57')
  }), /*#__PURE__*/React.createElement("span", {
    style: dot('#febc2e')
  }), /*#__PURE__*/React.createElement("span", {
    style: dot('#28c840')
  })), /*#__PURE__*/React.createElement("span", {
    style: titleStyle
  }, title), action && /*#__PURE__*/React.createElement("span", {
    style: actionStyle
  }, action)), /*#__PURE__*/React.createElement("div", {
    style: body
  }, children));
}

/**
 * NewsItem — one dated row inside a NewsWindow. The date is a monospace
 * cyan token; the body wraps freely.
 */
function NewsItem({
  date,
  children,
  last = false
}) {
  const li = {
    padding: '11px 2px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    fontSize: '.95rem',
    lineHeight: 1.55,
    display: 'flex',
    gap: '10px',
    alignItems: 'baseline'
  };
  const dateStyle = {
    display: 'inline-block',
    minWidth: '76px',
    fontWeight: 700,
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '.78rem',
    flex: 'none'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: dateStyle
  }, date), /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { NewsWindow, NewsItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/NewsWindow.jsx", error: String((e && e.message) || e) }); }

// components/feedback/TimelineItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * TimelineItem — a single entry on the vertical timeline (education,
 * experience, publications). A cyan node dot on a gradient rail, then a
 * frosted card with an optional logo, title, meta line, and body.
 */
function TimelineItem({
  logo = null,
  title,
  meta,
  children,
  last = false,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const wrap = {
    position: 'relative',
    paddingLeft: '28px',
    marginBottom: last ? 0 : '26px'
  };
  const rail = {
    content: '""',
    position: 'absolute',
    left: '8px',
    top: '6px',
    bottom: last ? 'auto' : '-26px',
    height: last ? '100%' : 'auto',
    width: '2px',
    background: 'linear-gradient(180deg, rgba(125,211,252,.5), rgba(255,255,255,.1))'
  };
  const node = {
    position: 'absolute',
    left: '8px',
    top: '26px',
    transform: 'translate(-50%,-50%)',
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 0 4px rgba(125,211,252,.15)',
    zIndex: 1
  };
  const card = {
    background: hover ? 'var(--card-hover)' : 'var(--card)',
    border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '16px 22px',
    transition: 'border-color .25s, background .25s, transform .2s, box-shadow .25s',
    transform: hover ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hover ? 'var(--shadow-card-hover)' : 'none',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)'
  };
  const header = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  };
  const titleStyle = {
    fontSize: 'var(--text-lead)',
    fontWeight: 700,
    lineHeight: 1.3
  };
  const metaStyle = {
    fontSize: 'var(--text-meta)',
    color: 'var(--muted)',
    marginTop: '3px'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: wrap
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: rail
  }), /*#__PURE__*/React.createElement("span", {
    style: node
  }), /*#__PURE__*/React.createElement("div", {
    style: card,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, /*#__PURE__*/React.createElement("div", {
    style: header
  }, logo && /*#__PURE__*/React.createElement("img", {
    src: logo,
    alt: "",
    style: {
      width: '48px',
      height: '48px',
      objectFit: 'contain',
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: titleStyle
  }, title), meta && /*#__PURE__*/React.createElement("div", {
    style: metaStyle
  }, meta))), children && /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '8px 0 0'
    }
  }, children)));
}
Object.assign(__ds_scope, { TimelineItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/TimelineItem.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/app.jsx
try { (() => {
/* GPM Astrobiology — portfolio UI kit.
   Composes the design-system primitives into the real research site:
   sticky nav (theme + language + search), hero, news, experience
   timeline, publications with an oral/poster filter, tutoring CTA. */
const {
  useState,
  useEffect,
  useRef
} = React;
const DS = window.GPMAstrobiologyDesignSystem_e8cc9f;
const {
  Button,
  Card,
  Tag,
  IconButton,
  MetricStat,
  PresoBadge,
  StatusDot,
  NewsWindow,
  NewsItem,
  TimelineItem
} = DS;
const LOGO = '../../assets/logos';

/* ---- tiny bilingual dictionary ---- */
const I18N = {
  en: {
    news: 'News',
    exp: 'Experience',
    pubs: 'Publications',
    tutoring: 'Tutoring',
    research: 'Research',
    role: 'PhD Researcher in Chemistry · Astrobiology',
    bio: 'Research on mechanochemical and shock-driven synthesis of organic molecules relevant to prebiotic chemistry and the origin of life.',
    cv: 'Download CV',
    m_pubs: 'Publications',
    m_talks: 'Talks & posters',
    m_areas: 'Research areas',
    m_h: 'h-index',
    research_lead: 'What I am working on right now — open questions in the chemistry of life\u2019s origins.',
    tut_lead: 'One-to-one science tutoring',
    tut_cta: 'Curiosity, made rigorous.',
    book: 'Book a session'
  },
  pt: {
    news: 'Notícias',
    exp: 'Experiência',
    pubs: 'Publicações',
    tutoring: 'Explicações',
    research: 'Investigação',
    role: 'Investigador de Doutoramento em Química · Astrobiologia',
    bio: 'Investigação sobre síntese mecanoquímica e por choque de moléculas orgânicas relevantes para a química prebiótica e a origem da vida.',
    cv: 'Descarregar CV',
    m_pubs: 'Publicações',
    m_talks: 'Palestras & posters',
    m_areas: 'Áreas',
    m_h: 'índice-h',
    research_lead: 'No que estou a trabalhar neste momento — questões em aberto na química das origens da vida.',
    tut_lead: 'Explicações de ciência individuais',
    tut_cta: 'Curiosidade, com rigor.',
    book: 'Marcar sessão'
  }
};
const wrap = {
  maxWidth: 'var(--max-width)',
  margin: '0 auto',
  padding: '0 20px'
};
const h2Style = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 'var(--text-h2)',
  letterSpacing: '-.01em',
  margin: '0 0 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};
const sectionStyle = {
  marginBottom: 'var(--space-section)',
  scrollMarginTop: 'calc(var(--nav-h) + 16px)'
};

/* ================= NAV ================= */
function Nav({
  lang,
  setLang,
  theme,
  setTheme,
  onSearch
}) {
  const t = I18N[lang];
  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 50,
    background: theme === 'light' ? 'rgba(255,255,255,.72)' : 'rgba(8,12,24,.62)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)'
  };
  const inner = {
    ...wrap,
    height: 'var(--nav-h)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };
  const logo = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '1.3rem',
    color: 'var(--text)',
    letterSpacing: '.02em',
    textDecoration: 'none'
  };
  const links = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  };
  const link = {
    padding: '8px 12px',
    borderRadius: '9px',
    color: 'var(--muted)',
    fontWeight: 600,
    fontSize: '.94rem',
    textDecoration: 'none'
  };
  const items = [['#research', t.research], ['#news', t.news], ['#experience', t.exp], ['#publications', t.pubs], ['#tutoring', t.tutoring]];
  return /*#__PURE__*/React.createElement("header", {
    style: navStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: inner
  }, /*#__PURE__*/React.createElement("a", {
    href: "#about",
    style: logo
  }, "G", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "P"), "M"), /*#__PURE__*/React.createElement("nav", {
    style: links,
    className: "nav-desktop"
  }, items.map(([href, label]) => /*#__PURE__*/React.createElement("a", {
    key: href,
    href: href,
    style: link,
    onMouseEnter: e => {
      e.target.style.color = 'var(--text)';
      e.target.style.background = 'rgba(255,255,255,.06)';
    },
    onMouseLeave: e => {
      e.target.style.color = 'var(--muted)';
      e.target.style.background = 'transparent';
    }
  }, label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    label: "Search the site",
    onClick: onSearch
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search"
  })), /*#__PURE__*/React.createElement(IconButton, {
    label: "Switch language",
    onClick: () => setLang(lang === 'en' ? 'pt' : 'en')
  }, lang === 'en' ? 'PT' : 'EN'), /*#__PURE__*/React.createElement(IconButton, {
    label: "Switch theme",
    onClick: () => setTheme(theme === 'dark' ? 'light' : 'dark')
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": theme === 'dark' ? 'sun' : 'moon'
  })))));
}

/* ================= HERO ================= */
function Hero({
  lang
}) {
  const t = I18N[lang];
  const card = {
    display: 'flex',
    gap: '26px',
    flexWrap: 'wrap',
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px'
  };
  const heroShell = {
    background: 'linear-gradient(180deg,rgba(255,255,255,.04),transparent)',
    padding: '20px',
    borderRadius: 'var(--radius-lg)',
    margin: '28px 0 48px'
  };
  const tile = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '56px',
    height: '56px',
    padding: '9px',
    borderRadius: '14px',
    background: 'var(--card)',
    border: '1px solid var(--border)'
  };
  const social = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 13px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid var(--border)',
    fontWeight: 600,
    fontSize: '.92rem',
    color: 'var(--text)',
    textDecoration: 'none'
  };
  const affils = [['cqe-t.png', 'CQE'], ['nasa-t.png', 'NASA'], ['impmc-t.png', 'IMPMC']];
  return /*#__PURE__*/React.createElement("section", {
    id: "about",
    style: heroShell
  }, /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/avatar.jpg",
    alt: "Gustavo Pinho Maia",
    style: {
      width: 'min(210px,52vw)',
      aspectRatio: '23/24',
      borderRadius: '16px',
      objectFit: 'cover',
      boxShadow: 'var(--shadow)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '.4em',
      fontSize: '.72rem',
      color: 'var(--muted)',
      fontStyle: 'italic'
    }
  }, "Credit: IMPMC \u2014 C\xE9cile Duflot")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: '300px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '18px',
      flexWrap: 'wrap',
      marginBottom: '6px'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 'var(--text-hero)',
      lineHeight: 1.15,
      margin: 0
    }
  }, "Gustavo Pinho Maia"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '12px',
      marginLeft: 'auto'
    }
  }, affils.map(([f, alt]) => /*#__PURE__*/React.createElement("span", {
    key: alt,
    style: tile
  }, /*#__PURE__*/React.createElement("img", {
    src: `${LOGO}/${f}`,
    alt: alt,
    style: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain'
    }
  }))))), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--accent)',
      fontWeight: 600,
      marginBottom: '12px'
    }
  }, t.role), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 16px',
      maxWidth: '60ch',
      color: 'var(--text)',
      lineHeight: 1.6
    }
  }, t.bio), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      marginBottom: '18px'
    }
  }, /*#__PURE__*/React.createElement(Tag, null, "Mechanochemistry"), /*#__PURE__*/React.createElement(Tag, null, "Prebiotic Chemistry"), /*#__PURE__*/React.createElement(Tag, null, "Astrobiology"), /*#__PURE__*/React.createElement(Tag, null, "Origin of Life")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '28px',
      flexWrap: 'wrap',
      margin: '0 0 18px'
    }
  }, /*#__PURE__*/React.createElement(MetricStat, {
    value: "3",
    label: t.m_pubs
  }), /*#__PURE__*/React.createElement(MetricStat, {
    value: "11",
    label: t.m_talks
  }), /*#__PURE__*/React.createElement(MetricStat, {
    value: "4",
    label: t.m_areas
  }), /*#__PURE__*/React.createElement(MetricStat, {
    value: "2",
    label: t.m_h,
    href: "https://scholar.google.com/citations?user=TTVIFykAAAAJ"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    href: "../../assets/cv.pdf",
    download: "Gustavo-Pinho-Maia-CV.pdf",
    icon: /*#__PURE__*/React.createElement("i", {
      "data-lucide": "download",
      style: {
        width: 16,
        height: 16
      }
    })
  }, t.cv), /*#__PURE__*/React.createElement("a", {
    href: "https://orcid.org/0000-0001-5314-8816",
    style: social,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: `${LOGO}/orcid.png`,
    width: "18",
    height: "18",
    alt: ""
  }), " ORCID"), /*#__PURE__*/React.createElement("a", {
    href: "https://www.linkedin.com/in/gustavopinhomaia",
    style: social,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: `${LOGO}/linkedin.png`,
    width: "18",
    height: "18",
    alt: ""
  }), " LinkedIn"), /*#__PURE__*/React.createElement("a", {
    href: "https://www.researchgate.net/profile/Gustavo_Maia2",
    style: social,
    target: "_blank",
    rel: "noopener"
  }, /*#__PURE__*/React.createElement("img", {
    src: `${LOGO}/researchgate.png`,
    width: "18",
    height: "18",
    alt: ""
  }), " ResearchGate"), /*#__PURE__*/React.createElement(Button, {
    variant: "cta",
    href: "#tutoring"
  }, "Cientifica(mente)")))));
}

/* ================= CURRENT RESEARCH ================= */
const RESEARCH = [{
  eyebrow: 'Impact shock chemistry',
  title: 'Asteroid Gardening',
  body: 'How impacts could affect our understanding of extraterrestrial organic matter.',
  tags: ['Shock synthesis', 'Exogenous delivery']
}, {
  eyebrow: 'Prebiotic chemistry',
  title: 'Extraterrestrial Ribonucleosides',
  body: 'Possibility or myth?',
  tags: ['Ribonucleosides', 'Mechanochemistry']
}];
function ResearchSection({
  lang
}) {
  const t = I18N[lang];
  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
    gap: '18px'
  };
  return /*#__PURE__*/React.createElement("section", {
    id: "research",
    style: sectionStyle
  }, /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "atom",
    style: {
      width: 22,
      height: 22,
      color: 'var(--accent)'
    }
  }), "Current Research"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--muted)',
      margin: '0 0 20px',
      maxWidth: '64ch'
    }
  }, t.research_lead), /*#__PURE__*/React.createElement("div", {
    style: grid
  }, RESEARCH.map(r => /*#__PURE__*/React.createElement(Card, {
    key: r.title,
    interactive: true,
    padding: 24,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      alignSelf: 'flex-start',
      fontSize: '.64rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--accent)',
      background: 'rgba(125,211,252,.12)',
      border: '1px solid rgba(125,211,252,.22)',
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)'
    }
  }, r.eyebrow), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: '1.32rem',
      lineHeight: 1.22,
      margin: 0
    }
  }, r.title), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--muted)',
      fontSize: '.96rem',
      lineHeight: 1.55,
      flex: 1
    }
  }, r.body), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '7px',
      flexWrap: 'wrap'
    }
  }, r.tags.map(tag => /*#__PURE__*/React.createElement(Tag, {
    key: tag
  }, tag)))))));
}

/* ================= NEWS ================= */
function NewsSection({
  lang
}) {
  const t = I18N[lang];
  return /*#__PURE__*/React.createElement("section", {
    id: "news",
    style: sectionStyle
  }, /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "newspaper",
    style: {
      width: 22,
      height: 22,
      color: 'var(--accent)'
    }
  }), t.news), /*#__PURE__*/React.createElement(NewsWindow, {
    title: "~/updates",
    action: /*#__PURE__*/React.createElement("a", {
      href: "https://www.linkedin.com/in/gustavopinhomaia",
      style: {
        color: 'var(--accent)',
        textDecoration: 'none',
        fontWeight: 600
      },
      target: "_blank",
      rel: "noopener"
    }, "LinkedIn \u2197")
  }, /*#__PURE__*/React.createElement(NewsItem, {
    date: "2026"
  }, "Recognised among the ", /*#__PURE__*/React.createElement("em", null, "\u201CExcellent Teachers 2024/2025\u201D"), " at Instituto Superior T\xE9cnico, for teaching in the General Chemistry laboratories."), /*#__PURE__*/React.createElement(NewsItem, {
    date: "Oct 2025"
  }, "Oral talk at ", /*#__PURE__*/React.createElement("em", null, "AbGradE\u201925"), " and a poster at ", /*#__PURE__*/React.createElement("em", null, "EANA 2025"), " (Lisbon) \u2014 which earned the ", /*#__PURE__*/React.createElement("strong", null, "EANA 2025 Poster Award"), " \u2014 plus an oral at the ", /*#__PURE__*/React.createElement("em", null, "\u201CSmall Bodies Day\u201D"), " Symposium (IPGP, Paris)."), /*#__PURE__*/React.createElement(NewsItem, {
    date: "Jul 2025"
  }, "Oral presentation at ", /*#__PURE__*/React.createElement("em", null, "BEACON 2025"), " (Harpa, Reykjavik) on mechanochemical events and the exogenous delivery of organic matter."), /*#__PURE__*/React.createElement(NewsItem, {
    date: "Feb 2025"
  }, "New paper out in ", /*#__PURE__*/React.createElement("em", null, "Applied Sciences"), ": Mechanochemical Reactivity of Ribonucleosides Mediated by Inorganic Species."), /*#__PURE__*/React.createElement(NewsItem, {
    date: "Jan 2025",
    last: true
  }, "Started as Visiting Scientist at ", /*#__PURE__*/React.createElement("em", null, "MNHN \u2014 IMPMC"), " (Paris), working with Prof. Laurent Remusat.")));
}

/* ================= EXPERIENCE ================= */
function ExperienceSection({
  lang
}) {
  const t = I18N[lang];
  return /*#__PURE__*/React.createElement("section", {
    id: "experience",
    style: sectionStyle
  }, /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "flask-conical",
    style: {
      width: 22,
      height: 22,
      color: 'var(--accent)'
    }
  }), t.exp), /*#__PURE__*/React.createElement(TimelineItem, {
    logo: `${LOGO}/mnhn.png`,
    title: "Visiting Scientist \xB7 MNHN \u2014 IMPMC, Paris",
    meta: "Jan 2025 \u2014 present"
  }, "Isotopic & molecular analysis of carbon-rich extraterrestrial samples with Prof. Laurent Remusat."), /*#__PURE__*/React.createElement(TimelineItem, {
    logo: `${LOGO}/nasa-t.png`,
    title: "Research Stay \xB7 NASA Goddard Astrobiology Analytical Lab",
    meta: "Nov 2024"
  }, "HPLC\u2013MS of extraterrestrial organics."), /*#__PURE__*/React.createElement(TimelineItem, {
    logo: `${LOGO}/cqe-t.png`,
    title: "PhD Researcher \xB7 CQE \u2014 Instituto Superior T\xE9cnico",
    meta: "2023 \u2014 present"
  }, "FCT doctoral grant 2023.01099.BD \u2014 \u201CMechanochemical energy and prebiotic synthesis\u201D."), /*#__PURE__*/React.createElement(TimelineItem, {
    logo: `${LOGO}/ubi.png`,
    title: "MSc in Chemistry \xB7 Universidade da Beira Interior",
    meta: "2021",
    last: true
  }));
}

/* ================= PUBLICATIONS ================= */
const PUBS = [{
  type: 'oral',
  title: 'Mechanochemical Reactivity of Ribonucleosides Mediated by Inorganic Species',
  venue: 'Applied Sciences · 2025',
  logo: 'applied_sciences'
}, {
  type: 'poster',
  title: 'Shock-driven synthesis and the exogenous delivery of organic matter',
  venue: 'EANA 2025 · Poster Award',
  logo: 'EANA'
}, {
  type: 'oral',
  title: 'Mechanochemical events in prebiotic chemistry',
  venue: 'BEACON 2025 · Reykjavik',
  logo: null
}];
function PublicationsSection({
  lang
}) {
  const t = I18N[lang];
  const [filter, setFilter] = useState('all');
  const fbtn = (k, label) => {
    const active = filter === k;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilter(k),
      style: {
        border: '1px solid ' + (active ? 'transparent' : 'var(--border)'),
        background: active ? 'linear-gradient(90deg,var(--accent),var(--accent-strong))' : 'rgba(255,255,255,.04)',
        color: active ? 'var(--on-accent)' : 'var(--muted)',
        padding: '5px 13px',
        borderRadius: 'var(--radius-pill)',
        fontWeight: 600,
        fontSize: '.82rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)'
      }
    }, label);
  };
  const shown = PUBS.filter(p => filter === 'all' || p.type === filter);
  return /*#__PURE__*/React.createElement("section", {
    id: "publications",
    style: sectionStyle
  }, /*#__PURE__*/React.createElement("h2", {
    style: h2Style
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "book-open",
    style: {
      width: 22,
      height: 22,
      color: 'var(--accent)'
    }
  }), t.pubs), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      marginBottom: '18px',
      flexWrap: 'wrap'
    }
  }, fbtn('all', 'All'), fbtn('oral', 'Oral'), fbtn('poster', 'Poster')), shown.map((p, i) => /*#__PURE__*/React.createElement(TimelineItem, {
    key: p.title,
    logo: p.logo ? `${LOGO}/${p.logo}.png` : null,
    title: p.title,
    meta: p.venue,
    last: i === shown.length - 1
  }, /*#__PURE__*/React.createElement(PresoBadge, {
    type: p.type
  }))));
}

/* ================= TUTORING ================= */
function Tutoring({
  lang
}) {
  const t = I18N[lang];
  const box = {
    background: 'var(--grad-cosmic)',
    borderRadius: 'var(--radius-lg)',
    padding: 'clamp(22px,4vw,36px)',
    boxShadow: '0 14px 40px rgba(0,0,0,.4)',
    border: '1px solid rgba(255,255,255,.08)'
  };
  return /*#__PURE__*/React.createElement("section", {
    id: "tutoring",
    style: sectionStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: box
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      fontWeight: 700,
      fontSize: 'var(--text-brand)',
      margin: 0,
      color: '#fff'
    }
  }, "Cientifica(mente)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '.82rem',
      fontWeight: 700,
      color: '#cdeeff',
      background: 'rgba(255,255,255,.14)',
      padding: '6px 12px',
      borderRadius: 'var(--radius-pill)'
    }
  }, "EN \xB7 PT")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: '#eef4ff',
      margin: '14px 0 0',
      maxWidth: '60ch'
    }
  }, t.tut_lead, " \u2014 chemistry, physics, and scientific method, from secondary school to undergraduate."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      color: '#a9ecff',
      fontSize: 'clamp(1.3rem,1rem+1.6vw,1.9rem)',
      marginTop: '22px'
    }
  }, t.tut_cta), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '20px'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost"
  }, t.book))));
}

/* ================= FOOTER ================= */
function Footer() {
  const linkS = {
    color: 'var(--muted)',
    fontWeight: 600,
    fontSize: '.9rem',
    textDecoration: 'none'
  };
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: '1px solid var(--border)',
      marginTop: '40px',
      background: 'rgba(7,12,29,.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: '24px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--muted)',
      fontSize: '.86rem',
      margin: 0
    }
  }, "\xA9 2026 Gustavo Pinho Maia \xB7 Astrobiology Research"), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://orcid.org/0000-0001-5314-8816",
    style: linkS,
    target: "_blank",
    rel: "noopener"
  }, "ORCID"), /*#__PURE__*/React.createElement("a", {
    href: "https://www.linkedin.com/in/gustavopinhomaia",
    style: linkS,
    target: "_blank",
    rel: "noopener"
  }, "LinkedIn"), /*#__PURE__*/React.createElement("a", {
    href: "https://scholar.google.com/citations?user=TTVIFykAAAAJ",
    style: linkS,
    target: "_blank",
    rel: "noopener"
  }, "Google Scholar"), /*#__PURE__*/React.createElement("a", {
    href: "mailto:gustavopinho.maia@mnhn.fr",
    style: linkS
  }, "Email"))));
}

/* ================= SEARCH OVERLAY ================= */
const SEARCH_INDEX = [{
  badge: 'Research',
  title: 'Asteroid Gardening',
  snip: 'How impacts could affect our understanding of extraterrestrial organic matter',
  href: '#research'
}, {
  badge: 'Research',
  title: 'Extraterrestrial Ribonucleosides — possibility or myth?',
  snip: 'Prebiotic chemistry · mechanochemistry',
  href: '#research'
}, {
  badge: 'Section',
  title: 'News & updates',
  snip: 'Excellent Teachers 2024/2025 · EANA Poster Award · NASA research stay',
  href: '#news'
}, {
  badge: 'Experience',
  title: 'NASA Goddard Astrobiology Analytical Lab',
  snip: 'HPLC–MS of extraterrestrial organics, Nov 2024',
  href: '#experience'
}, {
  badge: 'Experience',
  title: 'MNHN — IMPMC, Paris',
  snip: 'Visiting Scientist with Prof. Laurent Remusat',
  href: '#experience'
}, {
  badge: 'Publication',
  title: 'Mechanochemical Reactivity of Ribonucleosides',
  snip: 'Applied Sciences, 2025',
  href: '#publications'
}, {
  badge: 'Tutoring',
  title: 'Cientifica(mente)',
  snip: 'One-to-one science tutoring, EN · PT',
  href: '#tutoring'
}];
function SearchOverlay({
  open,
  onClose
}) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);
  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') onClose();
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  if (!open) return null;
  const results = SEARCH_INDEX.filter(r => (r.title + r.snip).toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1200,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '14vh 20px 24px',
      background: 'rgba(4,8,20,.66)',
      backdropFilter: 'blur(8px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 'min(640px,100%)',
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-modal)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '14px',
      borderBottom: '1px solid var(--border)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "search",
    style: {
      width: 20,
      height: 20,
      color: 'var(--accent)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Search research, publications, experience\u2026",
    style: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'var(--text)',
      fontFamily: 'var(--font-body)',
      fontSize: '1.05rem'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: '.68rem',
      color: 'var(--muted)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      padding: '3px 7px'
    }
  }, "Esc")), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: '6px',
      maxHeight: '54vh',
      overflowY: 'auto'
    }
  }, results.map(r => /*#__PURE__*/React.createElement("li", {
    key: r.title
  }, /*#__PURE__*/React.createElement("a", {
    href: r.href,
    onClick: onClose,
    style: {
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      padding: '12px',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text)',
      textDecoration: 'none'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--card-hover)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 'none',
      marginTop: '2px',
      fontSize: '.64rem',
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '.05em',
      color: 'var(--accent)',
      background: 'rgba(125,211,252,.12)',
      border: '1px solid rgba(125,211,252,.2)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-pill)'
    }
  }, r.badge), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '3px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: '.96rem'
    }
  }, r.title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '.84rem',
      color: 'var(--muted)'
    }
  }, r.snip))))), results.length === 0 && /*#__PURE__*/React.createElement("li", {
    style: {
      padding: '16px',
      color: 'var(--muted)'
    }
  }, "No matches."))));
}

/* ================= APP ================= */
function App() {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('dark');
  const [search, setSearch] = useState(false);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  useEffect(() => {
    if (window.lucide) window.lucide.createIcons();
  });
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Nav, {
    lang: lang,
    setLang: setLang,
    theme: theme,
    setTheme: setTheme,
    onSearch: () => setSearch(true)
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      ...wrap,
      paddingTop: '8px',
      position: 'relative',
      zIndex: 0
    }
  }, /*#__PURE__*/React.createElement(Hero, {
    lang: lang
  }), /*#__PURE__*/React.createElement(ResearchSection, {
    lang: lang
  }), /*#__PURE__*/React.createElement(NewsSection, {
    lang: lang
  }), /*#__PURE__*/React.createElement(ExperienceSection, {
    lang: lang
  }), /*#__PURE__*/React.createElement(PublicationsSection, {
    lang: lang
  }), /*#__PURE__*/React.createElement(Tutoring, {
    lang: lang
  })), /*#__PURE__*/React.createElement(Footer, null), /*#__PURE__*/React.createElement(SearchOverlay, {
    open: search,
    onClose: () => setSearch(false)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/portfolio/starfield.js
try { (() => {
/* Animated starfield — drifting stars + occasional meteor, drawn on a
   fixed full-viewport canvas behind all content. Recolours with theme. */
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, stars, meteors, raf;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function accent() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7dd3fc';
  }
  function resize() {
    w = canvas.width = innerWidth * devicePixelRatio;
    h = canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const count = Math.min(220, Math.round(innerWidth * innerHeight / 9000));
    stars = Array.from({
      length: count
    }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.2 + 0.3) * devicePixelRatio,
      a: Math.random() * 0.6 + 0.2,
      tw: Math.random() * 0.02 + 0.004,
      dir: Math.random() > 0.5 ? 1 : -1,
      vy: (Math.random() * 0.12 + 0.02) * devicePixelRatio
    }));
    meteors = [];
  }
  function spawnMeteor() {
    if (reduce) return;
    meteors.push({
      x: Math.random() * w * 0.7,
      y: Math.random() * h * 0.3,
      len: (Math.random() * 120 + 80) * devicePixelRatio,
      sp: (Math.random() * 6 + 6) * devicePixelRatio,
      life: 1
    });
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    const col = accent();
    for (const s of stars) {
      s.a += s.tw * s.dir;
      if (s.a > 0.85 || s.a < 0.15) s.dir *= -1;
      s.y += s.vy;
      if (s.y > h) {
        s.y = 0;
        s.x = Math.random() * w;
      }
      ctx.globalAlpha = s.a;
      ctx.fillStyle = Math.random() > 0.985 ? col : '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.sp;
      m.y += m.sp * 0.5;
      m.life -= 0.012;
      if (m.life <= 0) {
        meteors.splice(i, 1);
        continue;
      }
      const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.len, m.y - m.len * 0.5);
      grad.addColorStop(0, col);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = m.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6 * devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.len, m.y - m.len * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }
  resize();
  addEventListener('resize', resize);
  if (!reduce) {
    draw();
    setInterval(() => {
      if (Math.random() > 0.55) spawnMeteor();
    }, 2600);
  } else {
    // static field
    const col = accent();
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/portfolio/starfield.js", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.MetricStat = __ds_scope.MetricStat;

__ds_ns.PresoBadge = __ds_scope.PresoBadge;

__ds_ns.StatusDot = __ds_scope.StatusDot;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.NewsWindow = __ds_scope.NewsWindow;

__ds_ns.NewsItem = __ds_scope.NewsItem;

__ds_ns.TimelineItem = __ds_scope.TimelineItem;

})();
