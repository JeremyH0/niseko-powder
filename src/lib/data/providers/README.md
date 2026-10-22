# src/lib/data/providers

One file per external source, each implementing `Provider` from `types.ts`.

Planned:
- `jma-amedas.ts` — observed conditions at Kutchan (Phase 1)
- `open-meteo.ts` — mountain forecast for summit / mid / base (Phase 1)

## Adding a provider
1. Save a real response to `tests/fixtures/<provider>/` (extend `scripts/probe-data.ts`).
2. Create `<name>.ts` exporting a `Provider<Query, Raw, Result>`. Keep raw types private to the file.
3. Write `<name>.test.ts` that runs `normalize` on the fixture, plus edge cases (nulls, bad flags,
   empty responses, HTTP errors via a fake `ctx.fetch`).
4. Wire it into a job in `src/worker/jobs/`. Never call providers from the browser.
