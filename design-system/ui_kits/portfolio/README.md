# Portfolio UI Kit — GPM Astrobiology

A high-fidelity, interactive recreation of the research portfolio site
(github.com/GustavoPMaia98/GustavoPMaia), composed entirely from the
design-system primitives.

## Files
- `index.html` — entry point. Loads React, the DS bundle, Lucide icons,
  the starfield, then `app.jsx`. Tagged as a Design System card **and** a
  starting point.
- `app.jsx` — the full app: `Nav`, `Hero`, `NewsSection`,
  `ExperienceSection`, `PublicationsSection`, `Tutoring`, `Footer`,
  `SearchOverlay`, `App`.
- `starfield.js` — the signature animated star canvas (drifting stars +
  meteors), theme-aware, respects `prefers-reduced-motion`.

## Interactions
- **Theme toggle** — switches `data-theme` dark ⇄ light (whole palette flips).
- **Language toggle** — EN ⇄ PT swaps nav + hero + section copy.
- **Search** (nav magnifier) — command-palette overlay over a small index; Esc closes.
- **Publication filter** — All / Oral / Poster, using `PresoBadge`.

## Components used
`Button`, `Tag`, `IconButton`, `MetricStat`, `PresoBadge`, `NewsWindow` +
`NewsItem`, `TimelineItem` — all from `window.GPMAstrobiologyDesignSystem_e8cc9f`.

This is a recreation, not a redesign — copy, structure, and visual
language follow the source site.
