# Architecture

How the site is put together, and checklists for growing it. Keep this file current: update it
in the same commit as any structural change.

## Stack
- **Astro 7** (TypeScript strict) rendered on demand in a **Cloudflare Worker** via
  `@astrojs/cloudflare` 14. Static files (CSS, fonts, images) are served by **Workers Static
  Assets**, which are free and don't count as Worker requests.
- **Tailwind CSS v4** through `@tailwindcss/vite`, tokens in `src/ui/global.css`.
- Type: **Instrument Serif** (display, self-hosted, 21 KB, one weight — `font-synthesis: none`)
  + the system sans for text and numbers.
- **GSAP** arrives in Phase 3 (not installed yet).
- **Cron Trigger** (hourly) on the same Worker → **KV** (`CONDITIONS`) for the latest data,
  **D1** (`HISTORY_DB`) for daily history (Phase 4).
- **Vitest** for unit tests. Node ≥ 22.12 (developed on Node 24 LTS).

## Folders

```
src/
  worker.ts              Worker entry: fetch → Astro (+ self-heal), scheduled → job registry
  worker/
    scheduled.ts         runJobs(): runs due jobs in parallel, isolates failures
    self-heal.ts         background refresh when KV is empty/very old (KV lock, max 1 per 10 min)
    jobs/                heartbeat, refresh-conditions, season-history (+ index.ts registry)
  lib/
    time.ts              JST helpers (fixed +09:00), JMA block names
    sun.ts               sunrise/sunset (sunrise equation, ±2 min vs NAOJ) → sky palette + hero
    season.ts            seasons (1 Nov → 31 May): day index, merge, stats, averages
    format.ts            display formatting (JST times, °, cm, compass)
    powder/score.ts      the powder score (pure)
    data/
      types.ts           the `Conditions` contract between Worker and UI
      providers/         jma-amedas.ts, open-meteo.ts, jma-daily.ts (fetch → normalize → typed result)
      build-conditions.ts  merge fresh results with the previous good data
      store.ts           KV keys: conditions:<locationId>, history:<locationId>:<season>
      forecast.ts        small shared readers (findPoint, nearestHour, hoursAhead)
  config/                locations, powder thresholds, links, flags, site constants
  i18n/                  createTranslator / defineMessages + shared strings
  ui/                    tokens + glass + motion (global.css), SiteNav, Section, StatTile, Icon,
                         ChartFrame + chart-interact.ts (hover/touch/keyboard read-out for every chart)
  features/
    verdict/             hero: frosted verdict, headline, score ring, powder stake, reasons, sky;
                         landscape.ts generates the mountains (seeded noise, shading, data-driven snowline)
    snowfall/            live canvas (client script) + intensity maths
    outlook/             at-a-glance tiles (fresh / next 24 h / next big snow / town now)
    forecast/            48-hour SVG chart + 7-day list
    right-now/           Kutchan town observations + stale banner
    links/               official links (from config/links.ts)
    share/               share sheet / copy link
    season/              season tracker: load (seed + KV), summary, chart, page body, homepage teaser
    about/               methodology copy
  layouts/BaseLayout.astro  head/meta/manifest, skip link, footer + attributions
  data/                  committed seed: season-history.<locationId>.json (from JMA past data)
  pages/                 index (SSR), season (SSR), about (static), 404 (static), api/conditions.json
scripts/                 probe-data.ts (fixtures), seed-season-history.ts, smoke.ts (checks a running site)
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
    CRON[scheduled()<br/>hourly at :10] --> JOBS[jobs registry]
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
- A failing source never overwrites good data in KV (`build-conditions.ts` keeps the previous
  value and records the error in `sources`).
- Safety net: if the homepage finds no data or data older than 3 h, it sets a header and the
  Worker refreshes once in the background (`self-heal.ts`, KV lock = at most once per 10 min).
- Client JavaScript is small and optional: snowfall canvas, chart read-outs, share button.
  Animations are CSS (entrance, scroll reveals via `animation-timeline: view()`, cross-document
  view transitions) and only run under `prefers-reduced-motion: no-preference`.
- Responsive strategy: mobile-first; components size themselves from their **container**
  (`.cq` + `@container`: season card, even tile/link grids) rather than the viewport. Pages use a
  12-column bento grid from `lg` (48 h + "right now" rail, 7-day + season, links); the hero splits
  (verdict | today panel) from `xl`. Touch targets ≥ 44px (`tap` utility). A sticky "today" bar
  appears after the hero. Speculation Rules prerender internal pages on hover/touch (Chromium;
  ignored elsewhere). `<meta name="text-scale">` + rem-based type respect OS text size.
- Charts follow the dataviz rules: one axis per panel (small multiples, never dual-axis), ≤ 24px
  bars with a 4px rounded data-end, solid hairline grids, legend + selective direct labels,
  hover/keyboard tooltip, and a table view. Series colours validated for colour blindness.
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
| `npm run probe` | Add real API fixtures to `tests/fixtures/` (never overwrites). |
| `npm run smoke -- <url>` | Check a running site (local preview or live) end to end. |
| `npm run deploy` | Build + `wrangler deploy`. |
| `npx wrangler deploy --dry-run` | Validate the deploy bundle without uploading. |

Notes: local dev does **not** run the cron by itself — fire it with the curl above. Stop the dev
server before `npm run build` (`npx astro dev stop`): running both at once can make `astro check`
hang. Local KV/D1 data lives in `.wrangler/state` (gitignored). KV/D1 in `wrangler.jsonc` have no IDs
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
