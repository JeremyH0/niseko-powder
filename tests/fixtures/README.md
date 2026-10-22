# Test fixtures

Real responses saved by `npm run probe` (`scripts/probe-data.ts`). Tests read these files;
they never hit the network. Re-run the probe to refresh them (it overwrites files with the
same name and adds new dated JMA files; delete stale ones by hand if a test doesn't use them).

## jma/ — JMA AMeDAS, station 16217 倶知安 (Kutchan)
| File | What |
|---|---|
| `latest_time.txt` | Latest observation time, e.g. `2026-10-22T15:20:00+09:00` (JST). |
| `amedastable-nearby.json` | Station metadata for 16217, 16272, 16281, 16206 (subset of the full table). |
| `point-16217-20261022_15.json` | 3-hour block starting 15:00 JST — only **3 rows** (15:00–15:20), i.e. a block still filling up. |
| `point-16217-20261022_12.json` | The previous, complete block (18 rows). |

Captured **out of season**: `snow` is `[null, 5]` and `snow1h…snow24h` are `[0, 6]` in every row.
We still need an in-season sample — re-run the probe after Kutchan's first snow (usually
November) and keep that file too.

## open-meteo/
| File | What |
|---|---|
| `forecast-summit.json` | 7-day forecast, summit only, default model (`best_match`). Single object. |
| `forecast-all-points.json` | Summit + mid + base in one request. **Array** of 3, same order as requested. |
| `forecast-all-points-jma_seamless.json` | Same with `models=jma_seamless` (JMA MSM 5 km + GSM). |
| `historical-summit-2026-02-12.json` | Archived forecast for 12–18 Feb 2026 (two ~11 cm days) — winter data for powder-score tests. |

Units as requested: wind in m/s, snowfall in **cm**, but `snow_depth` comes back in **metres**.
