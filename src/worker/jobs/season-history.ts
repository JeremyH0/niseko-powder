/**
 * Keeps the current season's daily snowfall + snow depth in KV, from JMA's past-data pages
 * (the same source and definitions as the committed seed file).
 *
 * Runs on the hourly cron but only fetches at 01:xx and 13:xx JST (JMA publishes yesterday's
 * values overnight), or straight away when the season has no data yet. It re-reads the whole
 * current month each time, so a missed day fixes itself. 1–2 requests a day.
 */
import { LOCATIONS } from '../../config/locations.ts';
import { site } from '../../config/site.ts';
import { jmaDaily } from '../../lib/data/providers/jma-daily.ts';
import { runProvider, type ProviderContext } from '../../lib/data/providers/types.ts';
import { readSeason, writeSeason } from '../../lib/data/store.ts';
import { emptySeason, mergeDays, seasonMonths, seasonName, seasonOf } from '../../lib/season.ts';
import { jstDate, jstParts } from '../../lib/time.ts';
import type { Job, JobContext } from './types.ts';

export const FETCH_HOURS_JST = [1, 13];

/** The season to update today: the current one, or last season during the first week of June. */
export function seasonToUpdate(now: Date): string | null {
  const today = jstDate(now);
  const { month, day, year } = jstParts(now);
  if (month === 6 && day <= 7) return seasonName(year - 1);
  return seasonOf(today);
}

/** Months to (re)fetch: everything so far when empty, otherwise this month (+ last month early on). */
export function monthsToFetch(season: string, now: Date, hasData: boolean): { year: number; month: number }[] {
  const { year, month, day } = jstParts(now);
  const all = seasonMonths(season);
  const idx = all.findIndex((m) => m.year === year && m.month === month);
  const upto = idx === -1 ? all.length - 1 : idx; // June finalisation → whole season ended
  if (!hasData) return all.slice(0, upto + 1);
  const from = idx === -1 ? upto : day <= 3 ? Math.max(0, upto - 1) : upto;
  return all.slice(from, upto + 1);
}

async function updateLocation(locationId: keyof typeof LOCATIONS, { env, now }: JobContext): Promise<void> {
  const season = seasonToUpdate(now);
  if (!season) return;
  const location = LOCATIONS[locationId];
  const existing = await readSeason(env.CONDITIONS, location.id, season);
  if (existing && !FETCH_HOURS_JST.includes(jstParts(now).hour)) return;

  const ctx: ProviderContext = { fetch: (input, init) => fetch(input, init), now, userAgent: site.userAgent };
  let series = existing ?? emptySeason();
  for (const { year, month } of monthsToFetch(season, now, existing !== null)) {
    const days = await runProvider(jmaDaily, { ...location.station.pastData, year, month }, ctx);
    series = mergeDays(season, series, days);
  }
  await writeSeason(env.CONDITIONS, location.id, season, series);
  console.log(JSON.stringify({ event: 'season-history.updated', location: location.id, season }));
}

export const seasonHistory: Job = {
  id: 'season-history',
  description: 'Daily snowfall + snow depth for the current season (JMA past data) → KV',
  async run(ctx) {
    const ids = Object.keys(LOCATIONS) as (keyof typeof LOCATIONS)[];
    const results = await Promise.allSettled(ids.map((id) => updateLocation(id, ctx)));
    const errors = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []));
    if (errors.length) throw new Error(errors.join(' | '));
  },
};
