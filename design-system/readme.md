# GPM Astrobiology — Design System

The brand system of **Gustavo Pinho Maia**, a PhD researcher in Chemistry (Astrobiology) studying the *mechanochemical and shock-driven synthesis of organic molecules relevant to prebiotic chemistry and the origin of life*. The brand lives in his personal research portfolio — a single-page, bilingual (EN/PT) academic site with a deep-space aesthetic: a navy void, an animated starfield, cyan/blue starlight accents, and faint nebula glows.

It is a personal-researcher brand, not a corporate one. The tone is precise, warm, and quietly ambitious — a working scientist documenting an "improbable path from Ovar to NASA." The visual language treats the cosmos as backdrop and chemistry as subject.

## Sources

This system was reverse-engineered from the researcher's own portfolio codebase. If you have access, explore these to go deeper:

- **GitHub:** https://github.com/GustavoPMaia98/GustavoPMaia — the live single-page site (`index.html`, `style.css`, `ui-extra.css`, `sections/*.html`, an AI assistant widget, a command-palette search, an academic-tree graph, and a Leaflet presentation map). The design tokens, components, and UI kit here are lifted directly from `style.css` + `ui-extra.css`.

Affiliations referenced by the brand: Centro de Química Estrutural (CQE) — Instituto Superior Técnico, U. Lisboa · NASA Goddard Astrobiology Analytical Laboratory · MNHN — IMPMC, Sorbonne Université (Paris).

---

## CONTENT FUNDAMENTALS

**Voice.** First-person-singular for the human ("I research…", "my work"), but the portfolio prose is largely *third-person impersonal* and institutional — it states facts and lets credentials speak. News items are dated, terse, and link out ("Announcement ↗", "Read ↗", "Post ↗"). The register is academic but never stiff; it allows a wink.

**Casing.** Sentence case everywhere for body and headings (`News`, `Publications`, `Origin of Life`). Eyebrow/label text is UPPERCASE with wide tracking (`.06em`) — used for metric labels and category tags. Proper nouns, venues, and awards keep their exact capitalisation (`EANA 2025 Poster Award`, `Applied Sciences`).

**Bilingual.** Content ships EN + PT and toggles in place. Portuguese titles and quotes are preserved verbatim and italicised — e.g. *"O percurso improvável de Gustavo Maia levou-o de Ovar até à NASA"*, *"Portanto, a Vida foi criada a partir de surras."* Never translate a cited headline; quote it as published.

**Punctuation & detail.** Middot separators (` · `) join affiliations and metadata. En-dashes for ranges and technique pairs (`HPLC–MS`). Grant and DOI identifiers are shown in full (`2023.01099.BD`, `doi.org/10.3390/app15031363`). Italics carry titles of works, venues, and publications.

**Vibe.** Credible, specific, citation-grade. Numbers are real and modest (3 publications, h-index 2, 11 talks & posters) — *no inflated stats, no marketing adjectives.* The one playful flourish is the tutoring sub-brand **"Cientifica(mente)"** (an italic Fraunces wordmark, a pun on *scientifically* / *scientific mind*).

**No emoji.** The brand never uses emoji. Iconography is line icons and real institutional logos. Terminal/monospace touches (`~/updates`) add a maker's wink without emoji.

---

## VISUAL FOUNDATIONS

**Overall feeling.** A dark observatory. Content floats as frosted-glass cards over a fixed, animated starfield and a multi-stop nebula gradient (violet, cyan, blue, magenta radials fading into navy). A light theme exists and mirrors the structure with a near-white background and a deeper-blue accent.

**Color.** Deep navy void (`--bg #0b1020`, `--bg-2 #070c1d`). Two accents: **cyan `#7dd3fc`** (links, focus, primary) and **blue `#60a5fa`** (gradient partner). Buttons are a cyan→blue gradient with near-black text (`#04203a`). Semantic colors are borrowed from terminal traffic-lights: green `#28c840` (live), amber `#fbbf24` (poster/warn), red `#ff5f57` (close). Cards and borders are white at very low alpha (`.045`–`.09`), so the background shows through.

**Type.** **Fraunces** (variable optical-size serif) for headings, the logo, and italic brand flourishes — frequently used *italic* for warmth ("Cientifica(mente)", the tutoring CTA). **Manrope** (humanist sans) for all body and UI, weights 400–800. A **monospace** stack appears in "terminal" moments (news titlebar, dates, kbd hints). Headings use tight leading (1.15) and slightly negative tracking; eyebrows are uppercase, `.06em`.

**Spacing & layout.** A single centered content column, `max-width 1120px`, 20px side padding. A 60px sticky, blurred nav. Sections separated by a fluid `clamp(40px,6vw,64px)`. Generous, airy density — this is a reading experience, not a dashboard.

**Backgrounds.** Never flat. The signature is the fixed nebula gradient + a JS starfield canvas behind everything (`z-index:-1`). Feature surfaces (tutoring box, assistant header) use a fixed cosmic gradient `linear-gradient(135deg,#23276b,#178a98)` regardless of theme. No photographic hero backgrounds; imagery is reserved for content (lab photos, the Miller–Urey apparatus, NASA labs).

**Corners & cards.** Radii: 18px (hero, news window, modals), 12px (content/timeline cards), 10px (inputs, icon buttons), 999px (pills/CTAs/FAB). Cards = frosted glass: `rgba(255,255,255,.045)` fill, `1px` hairline border `rgba(255,255,255,.09)`, soft drop shadow `0 10px 30px rgba(0,0,0,.6)`. On hover, fill lightens to `.07`, border becomes cyan `rgba(125,211,252,.45)`.

**Borders & shadows.** Hairline translucent-white borders define every card; the cyan "strong" border signals interactivity/focus. Outer shadows only (no inner shadows except focus rings). Gallery images get a *starlit* treatment: a 1px cyan ring + drop shadow + soft cyan glow.

**Transparency & blur.** Heavy use of backdrop-blur: nav (12px), search/lightbox scrims (8px), the floating scroll-top button (4px). Glass everywhere — translucency over the starfield is the core motif.

**Animation.** Calm and purposeful, never bouncy. Reveal-on-scroll: elements fade up 20px over `.6s ease`. Timeline items stagger in. Buttons: a sheen sweep on hover (`background-position`), a `translateY(-2px)` lift, and a click *ripple*. The starfield drifts; the collapsed AI bubble has a gentle 3.4s pulse ring. Everything respects `prefers-reduced-motion` (all transforms/animations disabled).

**Hover states.** Cards lighten fill + gain a cyan border + lift 2px. Links underline (cyan). Nav links lighten text + get a faint white wash; the active link gets a cyan underline bar. Buttons brighten `1.06` + lift + glow. Icon buttons gain a faint wash + cyan border.

**Press states.** Buttons drop back to `translateY(0)` (the lift collapses); no shrink-scale. The scroll-top button is translucent at rest (`opacity .55`) and becomes near-solid on hover (`.95`).

**Iconography.** See ICONOGRAPHY below — Lucide line icons + real institutional PNG logos.

---

## ICONOGRAPHY

- **Primary icon set: [Lucide](https://lucide.dev)** — loaded from CDN (`unpkg.com/lucide@latest`) and rendered via `<i data-lucide="…">` placeholders that Lucide hydrates into inline SVGs. Stroke style, ~2px weight, rounded caps/joins, `currentColor`. Used for nav tools (`search`, `moon`, `sun`), section heading icons (`.h2-ico`, 22px, cyan), and the assistant. **When building with this system, link Lucide from CDN and use the same names** — do not hand-draw replacements.
- **Inline brand SVGs** for a few logos without a Lucide equivalent (Google Scholar mortarboard, the email envelope) — single `<path fill="currentColor">`, 24×24 viewBox.
- **Institutional logos (raster PNG).** Real partner/affiliation marks live in `assets/logos/`: CQE, NASA (`nasa-t` = transparent variant), IMPMC, MNHN, IST, UBI, plus social marks ORCID, LinkedIn, ResearchGate, and venue logos (EANA). Affiliation logos sit in frosted square tiles (`--card`, 14px radius) in the hero; social logos are 20px inline. Always use the supplied PNGs — never recolor or redraw them.
- **Favicon:** `assets/favicon.svg` (a small inline SVG mark).
- **Terminal glyphs as decoration:** macOS-style traffic-light dots (`news-dots`) and `~/updates` set in monospace — a maker's wink, not functional icons.
- **No emoji, ever.** No unicode pictographs used as icons.

---

## INDEX / MANIFEST

**Root**
- `styles.css` — global entry point (consumers link this); `@import`s every token + font file.
- `readme.md` — this guide.
- `SKILL.md` — Agent-Skills front-matter wrapper.

**`tokens/`** — CSS custom properties
- `fonts.css` — Google Fonts import (Fraunces + Manrope).
- `colors.css` — surfaces, text, accents, nebula stops, semantic status; light-theme overrides.
- `typography.css` — families, weights, fluid + static sizes, rhythm.
- `spacing.css` — radii, spacing scale, layout rails, shadows.
- `effects.css` — motion timings, blur, the signature `--bg-nebula` + `.gpm-cosmos` helper.

**`components/`** — reusable React primitives (`<Name>.jsx` + `.d.ts` + `.prompt.md` + a card HTML)
- `core/` — `Button`, `Tag`, `IconButton`, `Card`, `MetricStat`, `PresoBadge`, `StatusDot`.
- `feedback/` — `NewsWindow`, `TimelineItem`.

**`ui_kits/portfolio/`** — high-fidelity recreation of the research-portfolio site (hero, nav, news, timeline, footer) as an interactive `index.html`.

**`guidelines/`** & foundation cards — specimen `.html` files surfaced in the Design System tab (Type, Colors, Spacing, Brand, Components).

**`assets/`** — `avatar.jpg`, `background.png`, `favicon.svg`, `logos/` (institutions + social), `imagery/` (lab/science photos).
