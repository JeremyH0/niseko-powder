import type { Job } from './types.ts';

export const HEARTBEAT_KEY = 'meta:last-cron-run';

/**
 * Records when the cron last ran. Proves the scheduled pipeline works end to end,
 * and gives later alerting (Phase 6) something to check.
 */
export const heartbeat: Job = {
  id: 'heartbeat',
  description: 'Write the time of the latest cron run to KV',
  async run({ env, now, cron }) {
    await env.CONDITIONS.put(HEARTBEAT_KEY, JSON.stringify({ ranAt: now.toISOString(), cron }));
  },
};
