# Brief — Niseko Powder (working title)

## One-liner
A free, beautiful, honest answer to **"Is it a powder day in Niseko?"** — live snow and weather,
a 7-day powder forecast, and how this season compares to previous ones.

## Why
- Skiers and riders in Niseko check snow conditions every morning all winter. Existing sources are
  either ugly, cluttered with ads, or bury the answer.
- Portfolio goal: show creative frontend + data design skills (live data, motion, performance,
  bilingual SEO) in Jeremy's niche: hospitality and the Niseko / Japan market.
- Traffic goal: modest but real organic traffic from searches like "Niseko snow report",
  "Niseko snow depth today", "Niseko weather", "is it snowing in Niseko".

## Audience
1. Visitors staying in Niseko (Australia, Hong Kong, Taiwan, mainland China, Singapore, Europe, US)
   checking on their phone in the morning — mobile-first.
2. People planning a trip, comparing how much snow there is right now / this season.
3. Locals and seasonal workers.
4. (Secondary) Hotels, lodges and rental shops that might link to it.

## Core features (MVP)
1. **The answer** — a huge, glanceable verdict at the top: e.g. *"Yes — 28 cm overnight"*,
   *"Decent — 8 cm fresh"*, *"No new snow — groomers day"*. Driven by a transparent
   "powder score" (see below).
2. **Right now** (Kutchan station, town level): snow depth, fresh snow 24 h / 12 h / 6 h,
   temperature, wind, last updated time.
3. **Mountain forecast** (Open-Meteo at summit / mid-mountain coordinates): next 7 days of snowfall,
   temperature, wind, freezing level if available. Highlight upcoming powder days.
4. **Season tracker**: snow depth this season vs last season vs multi-year average, as a chart.
5. **Useful links** (link out, never scrape): official Niseko United lift status, official webcams,
   road conditions, avalanche/backcountry info.
6. **About & methodology** page: where the data comes from, what the powder score means,
   town vs mountain caveat, credits.

## Powder score (transparent heuristic, explained on the methodology page)
Inputs: fresh snow last 24 h (observed, town), forecast snowfall next 12–24 h (mountain),
temperature (colder = lighter snow), wind (strong wind = lift holds / wind-affected snow).
Output: 0–100 plus a plain-English verdict. Thresholds live in one config file so Jeremy can tune
them after a few weeks of real winter data. Never present it as an official forecast.

## Nice-to-haves (after MVP)
- Imperial toggle (in / °F).
- "Best day this week" callout.
- Daily auto-generated share image (OG image) with today's numbers, so links shared in group chats
  look great.
- Installable PWA (add to home screen), with an offline fallback showing the last cached data.
- Optional Japanese version later.

## Languages
- English first.
- Chinese in Phase 5 — **ask Jeremy** whether to do Simplified (zh-Hans), Traditional (zh-Hant)
  or both before building it. Machine translation is fine as a first draft but must be marked for
  human review.

## Design direction
- Feel: calm, premium, Japanese-minimal, a bit cinematic — like a luxury hotel's weather page,
  not a weather app. This is the portfolio piece, so the design is the point.
- **Snow that reacts to reality**: a lightweight canvas/WebGL snowfall whose intensity, flake size
  and wind drift are driven by the live data (heavy dumping vs calm vs no snow). Off when
  `prefers-reduced-motion` is set.
- Colour shifts with conditions and time of day (deep blue night, pale dawn, white-out grey during
  heavy snow).
- Typography-led: one big confident display face for the verdict, a clean grotesk for data.
  Numbers use tabular figures.
- Charts hand-built in SVG (no heavy chart library), animated on enter with GSAP.
- Mobile first: the verdict and today's key numbers fit on the first phone screen.

## SEO & reach
- Server-rendered numbers in the HTML (crawlers and link previews see real data).
- Pages: `/` (today), `/forecast`, `/season`, `/about`. Chinese under `/zh/...` (or `/zh-hant/...`).
- Titles/descriptions targeting the search phrases above; schema.org `WebSite` + `Dataset` or
  `WebPage` markup; sitemap; `hreflang` once Chinese exists.
- Privacy-friendly analytics: Cloudflare Web Analytics (free, cookieless).

## Out of scope
- Accounts, comments, user-generated content, ads, paid features, scraping resort data.

## Branding
Working title "Niseko Powder". In Phase 0, propose 5 short brand names (with a one-line rationale
each and suggested `.com` / `.jp` / `.app` domains to check). Avoid resort trademarks such as
"Niseko United" or "Grand Hirafu" in the brand name.
