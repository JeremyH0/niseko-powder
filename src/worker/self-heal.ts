/**
 * Safety net for the hourly cron: if a page finds no data (fresh deploy) or very old
 * data (cron broken), it sets REFRESH_HEADER and the Worker refreshes once in the
 * background. A short KV lock stops visitors from ever hammering JMA / Open-Meteo.
 */
import { DEFAULT_LOCATION_ID } from '../config/locations.ts';
import { refreshLocation } from './jobs/refresh-conditions.ts';

export const REFRESH_HEADER = 'x-np-refresh-needed';
const LOCK_KEY = 'meta:refresh-lock';
const LOCK_SECONDS = 600;

/** Conditions older than this trigger a background refresh. */
export const SELF_HEAL_AFTER_MINUTES = 180;

export async function refreshIfUnlocked(env: Env, now: Date): Promise<void> {
  if (await env.CONDITIONS.get(LOCK_KEY)) return;
  await env.CONDITIONS.put(LOCK_KEY, now.toISOString(), { expirationTtl: LOCK_SECONDS });
  try {
    await refreshLocation(DEFAULT_LOCATION_ID, { env, now });
    console.log(JSON.stringify({ event: 'self-heal.ok' }));
  } catch (err) {
    console.error(JSON.stringify({ event: 'self-heal.failed', error: String(err) }));
  }
}
