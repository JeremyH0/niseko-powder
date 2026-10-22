# src/worker/jobs

Scheduled work. The Worker's `scheduled()` handler (`src/worker.ts`) runs every job in
`index.ts` on each Cron Trigger (hourly, see `wrangler.jsonc`), in parallel, with failures isolated.

| Job | What |
|---|---|
| `heartbeat` | Writes the last cron run time to KV (`meta:last-cron-run`). |

Planned: `refresh-conditions` (Phase 1), `daily-snapshot` (Phase 4).

## Adding a job
1. Create `<job-name>.ts` exporting a `Job` (see `types.ts`). Use `ctx.now`, not `new Date()`.
2. Add it to the array in `index.ts`.
3. Restrict it with `crons: [...]` if it shouldn't run hourly (add that cron to `wrangler.jsonc`).
4. Free plan budget per run: **10 ms CPU** (network waits don't count), 50 outbound fetches,
   1,000 KV writes/day across the account.
