# src/config

Everything that is a *decision* rather than *logic* lives here, so tuning or extending the site is
a config change.

| File | What |
|---|---|
| `locations.ts` | Resorts, their JMA station and Open-Meteo forecast points. Add a resort here. |
| `flags.ts` | Typed feature flags. Ship unfinished features hidden. |
| `site.ts` | Site name, stale-data threshold, attributions. |

Coming in later phases: `powder.ts` (powder score thresholds, Phase 1), `links.ts`
(official lift status / webcams / avalanche / roads, Phase 2), `units.ts`.

Rules: plain data + types only, no imports from features, no `enum`/`namespace`
(scripts run these files directly with Node).
