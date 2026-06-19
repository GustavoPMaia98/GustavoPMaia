---
name: gpm-astrobiology-design
description: Use this skill to generate well-branded interfaces and assets for Gustavo Pinho Maia's astrobiology research brand (GPM Astrobiology), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the dark-cosmos, frosted-glass academic-portfolio aesthetic.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map
- `styles.css` — link this one file to inherit all tokens + fonts.
- `tokens/` — colors, typography, spacing, effects (CSS custom properties; dark + light themes).
- `components/` — React primitives (`Button`, `Tag`, `IconButton`, `Card`, `MetricStat`, `PresoBadge`, `StatusDot`, `NewsWindow`/`NewsItem`, `TimelineItem`). Each has a `.prompt.md` with usage.
- `ui_kits/portfolio/` — full interactive recreation of the research site.
- `guidelines/` — foundation specimen cards.
- `assets/` — avatar, favicon, institutional + social logos, science imagery.

## Brand in one line
A dark observatory: navy void, animated starfield, frosted-glass cards, cyan (`#7dd3fc`) + blue (`#60a5fa`) starlight accents, Fraunces display serif + Manrope body, Lucide line icons, no emoji. Calm, precise, citation-grade tone, bilingual EN/PT.
