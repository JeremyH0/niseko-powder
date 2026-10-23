# Feature backlog

Living list. Add ideas freely; build them one at a time with the "Add a feature" prompt in
`docs/PROMPTS.md`. Effort: S (an evening), M (a weekend), L (several weekends).

## Ideas

### Snow & weather
- [ ] **Powder alerts** — opt-in email or Web Push when the forecast shows 20 cm+ overnight. (M–L)
- [ ] **Best day this week** callout on the homepage. (S) — partly shipped as "Next big snow".
- [ ] **Hour-by-hour tonight** — when will the snow actually fall, so people know if it's a
      first-chair morning. (S)
- [ ] **Snow quality indicator** — light/dry vs heavy/wet, from temperature during snowfall. (S)
- [ ] **Wind hold risk** — likelihood of upper lifts closing due to wind (clearly labelled as an
      estimate). (S)
- [ ] **Imperial toggle** (in / °F), remembered per visitor. (S)
- [ ] **Season records** — biggest dumps, deepest base, compared across years. (M)
- [ ] **Model agreement** — show when JMA's high-res model and the global models disagree
      ("forecasts range 6–20 cm"), an honest uncertainty cue. (S–M)
- [ ] **Forecast vs reality** — compare yesterday's forecast with what Kutchan measured, to
      show (and tune) how trustworthy the forecast is. (M)
- [ ] **Monthly snowfall averages** — "how much snow does Niseko get in January?" (great for SEO). (M)

### More places
- [ ] **Other Hokkaido resorts** (Rusutsu, Kiroro, Furano, Teine…) using the multi-location
      config — each gets its own page, good for SEO. (M each, after the first)
- [ ] **Compare resorts** side by side. (M)

### Visitors' practical stuff
- [ ] **Road & travel conditions** — links and a simple "driving tonight?" note from temperature +
      snowfall. (S)
- [ ] **Daylight & sunrise times** for first chair / night skiing. (S)
- [ ] **Packing / what to wear today** suggestion from conditions. (S)
- [ ] **First-timer guide to Niseko snow** — evergreen content page, SEO. (M)

### Sharing & reach
- [ ] **Daily OG share image** with today's numbers. (M — planned in Phase 5)
- [ ] **Embeddable widget** that lodges/hotels can put on their sites (link back = traffic). (M)
- [ ] **Public JSON API / RSS** of daily conditions for other hobby projects. (S)
- [ ] **Japanese version**. (M)

### Design & fun
- [ ] **Season timelapse** — animated snow-depth "growing" through the season. (M)
- [ ] **Sound toggle** — subtle ambient snow/wind sound. (S)
- [ ] **Night mode for night skiing** hours. (S)

## In progress
_(none yet)_

## Shipped
- 2026-10-23 — **Season tracker** (/season + homepage teaser): 10 winters of JMA Kutchan data,
  this season vs last vs average, stats and a table of every winter. Also: verdict always from
  the score (no "Not yet."), Lighthouse 100/100/100/100, public GitHub repo with CI.
- 2026-10-23 — Homepage: verdict + powder score with reasons, at-a-glance tiles (incl. **next big
  snow**), 48-hour SVG chart (snow summit / rain base / temp mid), 7-day mountain forecast, right
  now in Kutchan, official links, share button ("send to the group chat"), live snowfall canvas
  with "preview the next snowfall", sky palette by JST time + weather, snowcaps that appear when
  the summit has snow, /about methodology, JSON API, installable manifest.
