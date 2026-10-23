# Roadmap

Work one phase at a time. At the end of each phase: stop, report (built / how to test / decisions /
questions), wait for Jeremy's "go". Tick boxes as you go.

Target: Phases 0–3 done and live before the ski season opens (late November / early December),
so the site is indexed and ready when people start searching.

---

## Phase 0 — Foundations & decisions
- [x] Read `CLAUDE.md` and all of `docs/`.
- [x] Check current official docs and confirm (or propose changes to) the hosting plan:
      Astro + `@astrojs/cloudflare` on a Worker with static assets, Cron Trigger, KV, D1 — all on
      the free plan. Report the relevant free-plan limits.
- [x] Scaffold Astro + TypeScript (strict) + Tailwind v4 **into this existing folder** without
      deleting `CLAUDE.md` or `docs/`.
- [x] Create the folder structure from "Built to grow" in `CLAUDE.md`
      (`src/features`, `src/lib/data/providers`, `src/worker/jobs`, `src/config`, `src/ui`, i18n helper,
      flags file) with placeholder READMEs where empty.
- [x] `wrangler` config with Cron Trigger (hourly), KV binding, D1 binding (names placeholders).
- [x] Vitest set up. A `scripts/probe-data.ts` that fetches one real JMA point file for station
      16217 and one Open-Meteo forecast for the summit point, and saves them to `tests/fixtures/`.
      Report anything in `docs/DATA_SOURCES.md` marked **verify** that turned out different.
- [x] `git init`, `.gitignore`, first commit. Tell Jeremy how to create the GitHub repo and push.
- [x] Write `docs/ARCHITECTURE.md` (folders, data flow diagram in text/mermaid, how to add a
      feature / provider / page).
- [x] Propose 5 brand names + domains to check (see BRIEF → Branding).

## Phase 1 — Data pipeline (no UI yet)
- [x] Provider interface + `jma-amedas` provider: picks the right 3-hour file(s) in JST, finds the
      latest valid row, maps `[value, flag]` pairs to `Reading<T>`, handles `null`, unknown flags,
      missing files, and JMA being down.
- [x] `open-meteo` provider for summit / mid / base points with `timezone=Asia/Tokyo`.
- [x] Powder score module with thresholds in `src/config/powder.ts` + tests for edge cases
      (no snow season, stale data, huge dump, rain at base, strong wind).
- [x] Job registry + scheduled handler: run all jobs, write normalized `Conditions` JSON to KV,
      keep the previous good value if a source fails (never overwrite good data with an error).
- [x] `GET /api/conditions.json` served from KV with sensible cache headers.
- [x] Unit tests passing against fixtures. Explain how to trigger the cron locally
      (`wrangler dev` with scheduled testing) and what output to expect.

## Phase 2 — Homepage MVP (function first, plain styling)
- [x] `/` server-renders the verdict, key "right now" numbers, 7-day mountain forecast, last-updated
      time (JST), stale-data banner, attribution footer. Works with JavaScript off.
- [x] Clear labels: "Kutchan town · 176 m" vs "Mountain forecast · ~1,300 m".
- [x] Links section (official lift status, webcams, avalanche info, roads) from config.
- [x] `/about` methodology page (sources, powder score explained, caveats, credits).
- [x] First deploy to a free `*.workers.dev` URL. Report the URL and how to redeploy.

## Phase 3 — Art direction & motion (the portfolio moment)
- [ ] Propose 2 short art-direction options (type pairing, palette, mood) before building; wait
      for Jeremy to choose. *(Jeremy asked for "very visual and fun" straight away, so one
      direction — "snow globe" — was built first; an alternative can still be proposed.)*
- [x] Snowfall canvas driven by live data (intensity, flake size, wind drift); paused off-screen;
      disabled with `prefers-reduced-motion`.
- [x] Palette shifts with conditions and time of day (JST).
- [x] Entrance animations, hand-built SVG forecast chart, tabular numbers. *(Done in pure CSS —
      zero JS cost; GSAP not needed yet. Add it when a richer timeline is wanted.)*
- [x] Performance & accessibility pass: Lighthouse mobile **100 / 100 / 100 / 100** on the live
      site (2026-10-23; 98 perf on a re-run), LCP ≈ 1.3 s, CLS 0.: Lighthouse mobile ≥ 95 in all four categories, AA contrast,
      keyboard navigation, screen-reader labels for every number.

## Phase 4 — Season tracker
- [x] Daily snapshot job stored in KV (`history:<location>:<season>`), from the same JMA
      past-data pages as the seed, re-read twice a day so missed days fix themselves.
- [x] One-off script to seed past seasons for Kutchan from JMA past data
      (`npm run seed:season`, 10 winters 2016-17 → 2025-26). Seed JSON committed.
- [x] `/season` page: this season vs last season vs average (+ range of past winters), SVG chart,
      key stats (deepest day, biggest day, days with 20 cm+), every winter in a table; teaser on
      the homepage.

## Phase 5 — Reach
- [ ] SEO: titles/descriptions, schema.org markup, sitemap, robots, canonical URLs.
- [ ] Dynamic OG image with today's numbers (check what works on Workers free plan).
- [ ] PWA: manifest, icons, offline fallback showing last cached conditions.
- [ ] Chinese version — **ask Jeremy: Simplified, Traditional, or both** — with `hreflang`.
- [ ] Cloudflare Web Analytics (cookieless).

## Phase 6 — Launch
- [ ] Custom domain on Cloudflare.
- [ ] Alerting: if the cron fails or data is stale > 3 h, notify Jeremy (free option, e.g. email via
      a free service or a GitHub issue created by an Action — propose options).
- [ ] Final audits (Lighthouse, a11y, broken links), README polished.
- [ ] Write `docs/CASE_STUDY.md` draft for Jeremy's portfolio: problem, approach, design decisions,
      tech, results, screenshots to take.

## Ongoing — keep adding features
After launch, pick items from `docs/FEATURES.md` one at a time using the "Add a feature" prompt in
`docs/PROMPTS.md`. Each feature: plan → build behind a flag → test → ship → move to "Shipped".
