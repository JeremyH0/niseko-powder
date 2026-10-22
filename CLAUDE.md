# CLAUDE.md — Niseko Powder (working title)

You are building a free, public website that answers one question beautifully:
**"Is it a powder day in Niseko?"** — with live snow, weather and forecast data.

It is a personal, non-commercial portfolio project for Jeremy (French web/design engineer based in
Kutchan, Hokkaido). Read every file in `docs/` before starting any phase:

- `docs/BRIEF.md` — product, audience, features, design direction
- `docs/DATA_SOURCES.md` — verified data endpoints, field names, licences, caveats
- `docs/ROADMAP.md` — phases with acceptance criteria (the source of truth for what to build next)
- `docs/PROMPTS.md` — the prompts Jeremy will paste for each phase

## How Jeremy works with you

- He delegates execution and **validates step by step**. Work on **one phase at a time**.
- At the start of a phase: read the phase in `docs/ROADMAP.md`, make a short plan, then build.
- At the end of a phase, **stop** and give:
  1. what you built (short),
  2. exactly how to test it locally (commands + what to look at),
  3. anything you decided on his behalf and why,
  4. open questions for him.
  Then wait for his "go" before starting the next phase.
- Tick the phase's checkboxes in `docs/ROADMAP.md` as you complete them and commit.
- Ask before: adding a paid service, adding a dependency over ~50 kB gzipped to the client bundle,
  changing the stack, or anything that would cost money.
- **Jeremy cannot read Japanese.** Whenever you show him Japanese text (from JMA pages, error
  messages, docs, UI strings), always give the reading in romaji and an English translation next to it.
  Example: 倶知安 (Kutchan) — the town; 積雪深 (sekisetsu-shin, "snow depth").

## Stack (his established stack — keep to it)

- **Astro** + **TypeScript** (strict) + **Tailwind CSS v4** + **GSAP** (all plugins are free now).
  Lenis only if the page ends up long enough to benefit.
- Hosting: **Cloudflare, free plan only.** Default plan (verify against current Cloudflare and Astro
  docs in Phase 0 and tell Jeremy if something has changed):
  - One **Cloudflare Worker with static assets** serving the Astro site via `@astrojs/cloudflare`
    (Workers static assets are Cloudflare's recommended successor to Pages for new projects).
  - A **Cron Trigger** on the same Worker fetches data hourly.
  - **KV** for the latest normalized conditions; **D1** (or KV) for the daily season history.
- Repo on GitHub; deploy with `wrangler` (and later GitHub Actions if useful).
- Package manager: npm. Node: current LTS.

## Non-negotiables

- **Free and non-commercial**: no ads, no paid tiers, no tracking cookies. The Open-Meteo free API
  is only allowed for non-commercial use — adding ads would break its terms.
- **Attribution** visible in the footer: Japan Meteorological Agency (JMA) and Open-Meteo (CC BY 4.0).
- **Honesty about data**: the JMA station is in Kutchan town (176 m), not on the mountain. Label
  town readings vs mountain forecasts clearly. Show "last updated" time (JST) everywhere data appears,
  and a visible "data delayed" state if the latest reading is more than 2 hours old.
- **No scraping** of resort websites (lift status, webcams). Link out to official pages instead.
- **Fast**: HTML must render the key answer with JavaScript disabled. Target Lighthouse ≥ 95 on
  mobile for Performance, Accessibility, Best Practices, SEO. LCP < 2.0 s on 4G.
- **Accessible**: WCAG 2.1 AA, `prefers-reduced-motion` respected (snow animation off or minimal),
  real text for all numbers (no numbers baked into images or canvas only).
- Times are shown in **JST (Asia/Tokyo)**. Units: metric by default (cm, °C, m/s); an optional
  imperial toggle is a nice-to-have.

## Built to grow (very important)

This site will keep getting new features for years. Design every phase so that adding the next
feature is cheap and safe:

- **Feature folders**: each user-facing feature lives in `src/features/<feature-name>/`
  (its components, small helpers, copy/strings, and its own tests). Pages compose features;
  features don't import each other's internals.
- **Data providers are pluggable**: every external source is a provider in
  `src/lib/data/providers/<name>.ts` implementing one small interface (fetch → normalize →
  typed result). Adding a new source (e.g. another station, another resort, an avalanche feed)
  must not require touching existing providers.
- **One registry for scheduled work**: the cron handler loops over a list of registered jobs
  (`src/worker/jobs/`). A new data job = a new file + one line in the registry.
- **Config over code**: locations, stations, thresholds (powder score), units and links live in
  `src/config/`. Adding a second resort or station should mostly be a config change. Keep the code
  multi-location-ready even though v1 shows Niseko only.
- **Design tokens + shared UI primitives** in `src/ui/` (stat tile, card, section header, chart axes)
  so new features look consistent without new CSS.
- **i18n from day one**: all UI strings go through a tiny translation helper, even while the site is
  English-only, so adding a language later is translation work, not refactoring.
- **Feature flags**: a simple typed `src/config/flags.ts` so half-finished features can ship hidden.
- **Tests as a safety net**: data normalization, powder score and each provider have unit tests
  with real fixtures; a smoke test checks the homepage renders. New features add their own tests.
- **Keep the backlog alive**: `docs/FEATURES.md` holds the ideas backlog. When a feature ships,
  move it to "Shipped" with the date. When you notice a good idea while working, add it there
  instead of building it unasked.
- **Document as you go**: `docs/ARCHITECTURE.md` (you create it in Phase 0, keep it updated)
  explains folders, the data flow, and a short "How to add a feature / provider / page" checklist.

## Code conventions

- Small, typed modules. Data fetching + normalization lives in `src/lib/data/` and is pure and
  unit-tested (Vitest) against saved real responses in `tests/fixtures/`.
- One normalized `Conditions` type is the contract between the Worker and the UI. Never let raw
  JMA / Open-Meteo shapes leak into components.
- Handle nulls and JMA quality flags everywhere (JMA returns `[value, flag]` pairs, and values can be
  `null`, e.g. snow depth outside the snow season).
- No secrets in the repo. Use `wrangler secret` if any are ever needed.
- Commit at the end of each phase with a clear message (`phase-1: data pipeline`).
