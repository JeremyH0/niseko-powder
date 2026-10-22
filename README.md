# Niseko Powder (working title)

A free, non-commercial website answering **"Is it a powder day in Niseko?"** — live snow and
weather from the Japan Meteorological Agency (JMA) and Open-Meteo, a 7-day mountain forecast,
and a season tracker. Built with Astro, Tailwind v4, GSAP, and Cloudflare (free plan).

## Getting started

1. Open this folder in VS Code.
2. Open the terminal and run `claude` to start Claude Code.
3. Paste the **Kickoff** prompt from `docs/PROMPTS.md`.
4. After each phase: test what Claude Code tells you, then paste the next phase's prompt.

## Develop

Requires Node ≥ 22.12 (Node 24 LTS recommended).

```sh
npm install        # also generates worker-configuration.d.ts
npm run dev        # http://localhost:4321 (runs inside the real Workers runtime)
npm test           # unit tests
npm run build      # typecheck + production build
npm run probe      # refresh real API fixtures in tests/fixtures/
```

See `docs/ARCHITECTURE.md` for structure, data flow and "how to add" checklists.

## What's in here

| File | What it's for |
|---|---|
| `CLAUDE.md` | Rules and context Claude Code reads automatically every session |
| `docs/BRIEF.md` | The product: audience, features, design direction |
| `docs/DATA_SOURCES.md` | Verified data endpoints, field names, licences, caveats |
| `docs/ROADMAP.md` | Phases 0–6 with checkboxes |
| `docs/ARCHITECTURE.md` | Folders, data flow, free-plan budget, how to add things |
| `docs/FEATURES.md` | Ideas backlog for adding features after launch |
| `docs/PROMPTS.md` | Prompts to paste: each phase, "Add a feature", health check |

## Credits
Observed data: Japan Meteorological Agency (JMA). Forecast data: Open-Meteo.com (CC BY 4.0).
