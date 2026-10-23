/** KV keys and typed access for stored conditions. */
import type { SeasonSeries } from '../season.ts';
import type { Conditions } from './types.ts';

export const conditionsKey = (locationId: string) => `conditions:${locationId}`;

export async function readConditions(kv: KVNamespace, locationId: string): Promise<Conditions | null> {
  try {
    return await kv.get<Conditions>(conditionsKey(locationId), 'json');
  } catch (err) {
    console.error(JSON.stringify({ event: 'kv.read-failed', locationId, error: String(err) }));
    return null;
  }
}

export async function writeConditions(kv: KVNamespace, conditions: Conditions): Promise<void> {
  await kv.put(conditionsKey(conditions.locationId), JSON.stringify(conditions));
}

// ---- Season history (current season, updated daily by the season-history job)

export const seasonKey = (locationId: string, season: string) => `history:${locationId}:${season}`;

export async function readSeason(kv: KVNamespace, locationId: string, season: string): Promise<SeasonSeries | null> {
  try {
    return await kv.get<SeasonSeries>(seasonKey(locationId, season), 'json');
  } catch (err) {
    console.error(JSON.stringify({ event: 'kv.read-failed', key: seasonKey(locationId, season), error: String(err) }));
    return null;
  }
}

export async function writeSeason(kv: KVNamespace, locationId: string, season: string, series: SeasonSeries) {
  await kv.put(seasonKey(locationId, season), JSON.stringify(series));
}
