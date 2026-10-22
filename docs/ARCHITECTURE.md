# Architecture

How the site is put together, and checklists for growing it. Keep this file current: update it
in the same commit as any structural change.

## Stack
- **Astro 7** (TypeScript strict) rendered on demand in a **Cloudflare Worker** via
  `@astrojs/cloudflare` 14. Static files (CSS, fonts, images) are served by **Workers Static
  Assets**, which are free and don't count as Worker requests.
- **Tailwind CSS v4** through `@tailwindcss/vite`, tokens in `src/ui/global.css`.
- **GSAP** arrives in Phase 3 (not installed yet).
- **Cron Trigger** (hourly) on the same Worker → **KV** (`CONDITIONS`) for the latest data,
  **D1** (`HISTORY_DB`) for daily history (Phase 4).
- **Vitest** for unit tests. Node ≥ 22.12 (developed on Node 24 LTS).

## Folders

```
src/
  worker.ts              Worker entry: fetch → Astro, scheduled → job registry
  worker/
    scheduled.ts         runJobs(): runs due jobs in parallel, isolates failures
    jobs/                one file per scheduled job + index.ts registry
  lib/data/
    types.ts             the `Conditions` contract between Worker and UI
    providers/           one file per external source (fetch → normalize → typed result)
  config/                locations, flags, site constants (decisions, not logic)
  i18n/                  createTranslator / defineMessages + shared strings
  ui/                    design tokens + shared primitives (StatTile, Card…)
  features/<name>/       user-facing features: components, strings, helpers, tests
  layouts/               page shells (head, footer with attributions)
  pages/                 routes; compose features, contain little logic
scripts/                 one-off Node scripts (run with plain `node`, no build)
tests/fixtures/          real API responses used by tests
migrations/              D1 SQL migrations (Phase 4)
docs/                    brief, roadmap, data sources, this file, backlog
```

Import rules:
- Pages → features → `ui` / `lib` / `config` / `i18n`. Never feature → another feature's internals.
- Raw API shapes stay inside `src/lib/data/providers/`. Everything else sees `Conditions`.
- Relative imports use the explicit `.ts` extension, so `scripts/` can import `src/` modules with
  plain Node. Also no `enum`/`namespace`/parameter properties (`erasableSyntaxOnly`).
- Read bindings with `import { env } from 'cloudflare:workers'` (Astro 6+ removed
  `Astro.locals.runtime`). Types come from `wrangler types` → `worker-configuration.d.ts`
  (generated, gitignored, regenerated on install/dev/build).

## Data flow

```mermaid
flowchart LR
  subgraph Sources
    JMA[JMA AMeDAS<br/>Kutchan 16217<br/>10-min obs]
    OM[Open-Meteo<br/>summit / mid / base]
  end
  subgraph Worker["Cloudflare Worker (one deploy)"]
    CRON[scheduled()<br/>hourly at :10 UTC] --> JOBS[jobs registry]
    JOBS --> P1[providers/jma-amedas]
    JOBS --> P2[providers/open-meteo]
    P1 & P2 --> NORM[normalize + powder score]
    NORM -->|Conditions JSON| KV[(KV CONDITIONS)]
    NORM -->|daily snapshot| D1[(D1 HISTORY_DB)]
    FETCH[fetch()] --> ASTRO[Astro SSR pages<br/>+ /api/conditions.json]
    ASTRO -->|read| KV
    ASTRO -->|read| D1
  end
  JMA --> P1
  OM --> P2
  Browser -->|HTML, no JS needed| FETCH
  Browser -->|CSS/fonts/images| ASSETS[Static Assets]
```

Key properties:
- Visitors **never** trigger calls to JMA or Open-Meteo. One cron run per hour does all fetching.
- A failing source never overwrites good data in KV (the job keeps the previous value; Phase 1).
- Pages render the answer server-side, so it works with JavaScript off and in link previews.

## Free-plan budget (Workers Free, checked 2026-10-22)

| Resource | Free limit | Our expected use |
|---|---|---|
| Worker requests | 100,000 / day | page views (static assets are free & unlimited) |
| CPU per request / per cron run | **10 ms** | SSR of a small page ≈ 2–5 ms; JSON parsing in cron must stay lean |
| Outbound fetches per invocation | 50 | ~3–6 per cron run |
| Cron Triggers | 5 per account | 1 (maybe 2 with a daily snapshot) |
| KV reads / writes | 100,000 / 1,000 per day | reads ≈ page views; writes ≈ 24–50 / day |
| D1 rows read / written | 5 M / 100,000 per day (enforced since 2026-09-01) | tiny |
| D1 storage | 5 GB | tiny |
| Static assets | 20,000 files, 25 MiB each | tiny |

If page views ever approach 100k/day, cache the rendered HTML (Cache API, a few minutes) rather
than upgrading.

## Local development

| Command | What |
|---|---|
| `npm run dev` | Astro dev server inside the real Workers runtime (workerd), with local KV/D1. |
| `curl "http://localhost:4321/cdn-cgi/local/scheduled?cron=10+*+*+*+*"` | Fire the cron once locally (or open `/cdn-cgi/local/explorer` → Cron Triggers). |
| `npm test` | Unit tests (Vitest). |
| `npm run build` | `wrangler types` + `astro check` + build to `dist/`. |
| `npm run preview` | Serve the production build locally in workerd. |
| `npm run probe` | Refresh real API fixtures in `tests/fixtures/`. |
| `npx wrangler deploy --dry-run` | Validate the deploy bundle without uploading. |

Local KV/D1 data lives in `.wrangler/state` (gitignored). KV/D1 in `wrangler.jsonc` have no IDs
on purpose: wrangler auto-provisions them on the first `wrangler deploy` and writes IDs back.

## Checklists

### Add a feature
1. Add/confirm it in `docs/FEATURES.md`; move it to "In progress".
2. Create `src/features/<name>/` with its component(s), `strings.ts` (`defineMessages`), helpers
   and `*.test.ts`.
3. Need new data? → add a provider and/or job (below). Need a threshold or link? → `src/config/`.
4. Ship behind a flag in `src/config/flags.ts` until it's ready; compose it into a page.
5. Use `src/ui/` primitives and tokens; add a primitive there if two features need it.
6. `npm test && npm run build`, then move the item to "Shipped" with the date.

### Add a data provider
1. Extend `scripts/probe-data.ts` to save a real response to `tests/fixtures/<provider>/`.
2. Create `src/lib/data/providers/<name>.ts` implementing `Provider<Query, Raw, Result>`.
3. Test `normalize` against the fixture plus edge cases (nulls, bad flags, HTTP errors).
4. Check the source's licence/terms; add its credit to `attributions` in `src/config/site.ts`.

### Add a scheduled job
1. Create `src/worker/jobs/<name>.ts` exporting a `Job`; use `ctx.now`, throw on failure.
2. Add it to `jobs` in `src/worker/jobs/index.ts`.
3. Different schedule? Add the cron to `wrangler.jsonc` and set `crons` on the job
   (max 5 cron triggers per account on the free plan).

### Add a page
1. `src/pages/<route>.astro` using `BaseLayout`; `export const prerender = true` if it has no live
   data (e.g. `/about`), so it's served as a free static asset.
2. Compose features; all copy through `createTranslator`.
3. Title + description; check it renders with JavaScript disabled.

### Add a location (resort / station)
1. Add an entry to `LOCATIONS` in `src/config/locations.ts` (verify coordinates with the
   Open-Meteo elevation API and JMA's `amedastable.json`).
2. Jobs loop over locations; KV keys are per location (`conditions:<locationId>`).
