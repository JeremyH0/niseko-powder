# src/ui

Design tokens and shared UI primitives, so new features look consistent without new CSS.

- `global.css` — Tailwind v4 entry + `@theme` tokens (colours, fonts). Placeholder until Phase 3.

Planned primitives (built when first needed): `StatTile.astro`, `Card.astro`,
`SectionHeader.astro`, `chart/Axis.astro`, `Timestamp.astro` (always JST, with stale state).

Rules: primitives take props and render; no data fetching, no feature logic, all copy passed
in from the caller (so it goes through i18n).
