# Data sources

Checked on 2026-10-22. Re-verify anything marked **verify** during Phase 0/1 — these endpoints are
public but not formally documented APIs and can change.

---

## 1. JMA AMeDAS — observed conditions (Kutchan station)

JMA = Japan Meteorological Agency. AMeDAS = its network of automated weather stations.

### Station
| Field | Value |
|---|---|
| Station ID | **16217** |
| Name | 倶知安 (Kutchan) — the town next to Niseko |
| Type | B (full set of elements, includes snow depth) |
| Location | 42°54.0′ N, 140°45.4′ E → ≈ 42.9000, 140.7567 |
| Elevation | **176 m** (town level, *not* the mountain) |

Other nearby stations (for later / comparison only):
- 16272 ニセコ (Niseko) — 113 m — **precipitation only**, no snow depth, not useful for us.
- 16281 真狩 (Makkari, a village south of Mt. Yotei) — 440 m — temp/precip/wind, no snow depth.
- 16206 蘭越 (Rankoshi, a town west of Niseko) — 39 m — includes snow depth.

### Endpoints
- Station list (metadata, names, coordinates):
  `https://www.jma.go.jp/bosai/amedas/const/amedastable.json`
- Latest observation time (plain text ISO timestamp, JST) — **verify**:
  `https://www.jma.go.jp/bosai/amedas/data/latest_time.txt`
- Point data for one station, in **3-hour files**, 10-minute rows:
  `https://www.jma.go.jp/bosai/amedas/data/point/16217/{YYYYMMDD}_{HH}.json`
  - `HH` is the start of the 3-hour block in **JST**: `00, 03, 06, 09, 12, 15, 18, 21`.
  - Verified: `.../point/16217/20261022_12.json` returned 18 rows, keys like `20261022120000`
    (YYYYMMDDHHmmss, JST), one every 10 minutes from 12:00 to 14:50.
  - To build "latest" you usually need the current block and sometimes the previous one.

### Fields seen in a real row (16217, 2026-10-22 12:00 JST)
Each value is a pair `[value, qualityFlag]`. Value can be `null`.

| Field | Meaning | Example |
|---|---|---|
| `temp` | air temperature °C | `[5.2, 0]` |
| `snow` | **snow depth** cm (積雪深, sekisetsu-shin, "snow depth") | `[null, 5]` (no snow season yet) |
| `snow1h` / `snow6h` / `snow12h` / `snow24h` | **new snowfall** cm over that window (降雪量, kōsetsu-ryō, "snowfall amount") | `[0, 6]` |
| `precipitation10m` / `1h` / `3h` / `24h` | precipitation mm | `[2.0, 0]` |
| `wind` | wind speed m/s | `[5.8, 0]` |
| `windDirection` | 16-point compass index (1 = NNE … 16 = N, 0 = calm) — **verify mapping** | `[13, 0]` |
| `gust`, `gustDirection`, `gustTime` | daily max gust and when | `[16.0, 0]`, `{"hour":19,"minute":37}` |
| `maxTemp`/`minTemp` + `maxTempTime`/`minTempTime` | daily extremes | |
| `humidity` | % | `[72, 0]` |
| `pressure`, `normalPressure` | hPa | |
| `sun10m`, `sun1h` | sunshine duration | |
| `visibility` | m | `[20000.0, 0]` |
| `weather` | weather code | `[7, 0]` |

### Quality flags — **verify**
`0` = normal. Non-zero values mean estimated, missing, or "not observed in this period". In the
October sample, `snow` came back `[null, 5]` and `snowNh` as `[0, 6]` — i.e. snow is not being
measured yet this season. Treat any non-zero flag as "unreliable / show as —" unless documented
otherwise, and log unknown flags.

### Historical data (for the season-comparison chart)
The real-time JSON only covers recent days. For previous seasons use JMA's past-weather-data pages:
過去の気象データ検索 (kako no kishō dēta kensaku, "past weather data search"), daily values for
Kutchan. Plan (Phase 4): write a one-off script that pulls daily snow depth for the last ~5–10
seasons (Nov–May), saves a static seed JSON in the repo, and from launch onward the Worker appends
one daily snapshot itself. **Verify** the exact URL/parameters for Kutchan before writing the script,
and fall back to Open-Meteo's historical archive (snow depth from reanalysis) if JMA's pages are
impractical — label it as modelled data if so.

### Licence / attribution
JMA content falls under the Government of Japan Standard Terms of Use (compatible with CC BY 4.0).
Credit: **"Source: Japan Meteorological Agency (JMA)"** with a link. Be polite: one fetch per hour
is plenty.

---

## 2. Open-Meteo — mountain forecast

- Forecast API: `https://api.open-meteo.com/v1/forecast`
- Free tier rules (from their terms page, checked 2026-10-22):
  - **Non-commercial use only.** Ads or subscriptions on the site would make it commercial.
  - Limits: < 600 calls/min, 5,000/hour, 10,000/day (and ~300,000/month), **per IP**. Shared cloud
    IPs (like Cloudflare Workers) can hit limits sooner because other users share them — so fetch
    on a schedule, cache, and **never** call Open-Meteo from the visitor's browser or per request.
  - Licence: CC BY 4.0 — credit "Weather data by Open-Meteo.com" with a link.
- Query at mountain points and pass `elevation` so the model is downscaled correctly. Starting
  points (**verify on a map** before relying on them):
  - Summit of Mt. Niseko Annupuri ≈ 42.873, 140.658, elevation ~1,300 m
  - Mid-mountain (above Hirafu) ≈ 42.86, 140.68, elevation ~800 m
  - Base (Hirafu village) ≈ 42.85, 140.70, elevation ~250 m
- Useful variables to evaluate (**verify availability** in current docs): hourly `snowfall`,
  `snow_depth`, `temperature_2m`, `wind_speed_10m`, `wind_gusts_10m`, `freezing_level_height`,
  `weather_code`, `cloud_cover`; daily `snowfall_sum`, `temperature_2m_max/min`,
  `wind_speed_10m_max`. Use `timezone=Asia/Tokyo`.
- Use 1 multi-location request per run if the API supports it (comma-separated latitude/longitude),
  otherwise 3 small requests. Hourly cron ⇒ ~24–72 calls/day. Far under the limit.
- If Cloudflare's shared IPs get rate-limited: fall back to a scheduled GitHub Actions job that
  fetches and pushes the JSON to KV via the Cloudflare API.

---

## 3. Links only (no scraping, no embedding without permission)
- Official Niseko United site — lift status & webcams (link out).
- Niseko Avalanche Information (backcountry conditions) — link out.
- Hokkaido road conditions / traffic info — link out (find the official English page in Phase 5).

---

## Phase 0 verification results (2026-10-22, `npm run probe`)

Fixtures in `tests/fixtures/` (see its README).

**Confirmed as documented**
- `latest_time.txt` exists and returns e.g. `2026-10-22T15:20:00+09:00` (JST, with offset).
- Point files are named by the JST 3-hour block start; row keys are `YYYYMMDDHHmmss` JST.
  At 15:20 the `_15` file had only 3 rows, so stitching with the previous block is needed early
  in each block.
- Station 16217: type B, `elems` `11111111`, 42°54.0′N 140°45.4′E, 176 m — matches.
- Out of season: `snow` = `[null, 5]`, `snow1h/6h/12h/24h` = `[0, 6]` on every row. All other
  fields had flag `0`. Treat 5 and 6 as "not usable" (exact meanings still undocumented —
  look again once the season starts and log any new flags).
- `windDirection` values seen: 11, 12, 14 — consistent with a 1–16 compass index; the exact
  mapping (1 = NNE … 16 = N) is still unproven from data alone.
- Open-Meteo accepts comma-separated `latitude`/`longitude`/`elevation` and returns an **array**
  in request order. All listed hourly/daily variables exist for the default model.

**Different from / missing in this doc**
- **Forecast points corrected** using the Open-Meteo elevation API: summit 42.8755, 140.658
  (DEM ~1,250 m, real summit 1,308 m → we pass 1,300); mid 42.8672, 140.6795 (~820 m);
  base 42.859, 140.701 (~280 m). The old summit point (42.873, 140.658) sat at ~1,190 m.
- **Model resolution matters.** With the default `best_match` model, all three points fall in the
  **same grid cell** (42.847, 140.667), so they differ only by elevation adjustment. With
  `models=jma_seamless` (JMA MSM 5 km, then GSM) summit and mid get different cells, and today's
  summit snowfall was 20.8 cm vs 6.2 cm for `best_match`. But `jma_seamless` returns **all-null**
  `wind_gusts_10m`, `freezing_level_height` and `snow_depth`. Decision for Phase 1.
- Open-Meteo `snow_depth` is in **metres** (snowfall is cm).
- Historical Forecast API (`historical-forecast-api.open-meteo.com`) works with the same
  parameters, which is useful for winter test data and possibly the Phase 4 fallback.
- Station 16206 蘭越 (Rankoshi) is type **C** with `elems` `11112110`; its snow element is `2`,
  not `1` — check what that means before using it.

**Found while building Phase 1 (2026-10-22)**
- Snow fields (`snow`, `snow1h/6h/12h/24h`) appear **only on the :00 rows**; the 10-minute rows
  don't have them. The provider takes the newest row that has each field (max 70 min old).
- `maxTempTime` / `minTempTime` / `gustTime` look like **UTC** (e.g. min temp at "22:36" in a file
  that ends at 14:50 JST). Unverified — don't display them until checked.
- `jma_seamless` with `past_days=1, forecast_days=7` returns 8 daily rows and 192 hourly rows;
  base and mid share a grid cell (42.85, 140.6875); summit is its own (42.9, 140.625).

---

## Normalized contract

Implemented in `src/lib/data/types.ts` (the source of truth — the draft below is the original
sketch). Main changes: observed/forecast can be `null` when never fetched, a `sources` status
block, hourly window from −24 h to +48 h, per-point past/next 24 h snowfall, and powder
`reasons` as codes + numbers (translated in the UI) instead of English strings.

```ts
type Reading<T> = { value: T | null; ok: boolean };   // ok = quality flag was normal

interface Conditions {
  generatedAt: string;          // ISO, when the Worker built this
  observed: {
    source: "jma-amedas";
    stationId: "16217";
    observedAt: string;         // ISO JST of the latest row used
    isStale: boolean;           // observedAt older than 2 h
    snowDepthCm: Reading<number>;
    newSnow: { h1: Reading<number>; h6: Reading<number>; h12: Reading<number>; h24: Reading<number> };
    tempC: Reading<number>;
    windMs: Reading<number>;
    windDirDeg: Reading<number>;
    gustMs: Reading<number>;
  };
  forecast: {
    source: "open-meteo";
    fetchedAt: string;
    points: Array<{
      id: "summit" | "mid" | "base";
      elevationM: number;
      daily: Array<{ date: string; snowfallCm: number; tMaxC: number; tMinC: number; windMaxMs: number }>;
      hourlyNext48h: Array<{ time: string; snowfallCm: number; tempC: number; windMs: number }>;
    }>;
  };
  powder: { score: number; verdict: "epic" | "good" | "some" | "none"; headline: string; reasons: string[] };
}
```
