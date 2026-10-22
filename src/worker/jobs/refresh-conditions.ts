import { LOCATIONS } from '../../config/locations.ts';
import { site } from '../../config/site.ts';
import { buildConditions, type SourceResult } from '../../lib/data/build-conditions.ts';
import { jmaAmedas } from '../../lib/data/providers/jma-amedas.ts';
import { openMeteo } from '../../lib/data/providers/open-meteo.ts';
import { runProvider, type ProviderContext } from '../../lib/data/providers/types.ts';
import { readConditions, writeConditions } from '../../lib/data/store.ts';
import type { Job, JobContext } from './types.ts';

async function settle<T>(promise: Promise<T>): Promise<SourceResult<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function refreshLocation(locationId: keyof typeof LOCATIONS, { env, now }: Pick<JobContext, 'env' | 'now'>) {
  const location = LOCATIONS[locationId];
  const ctx: ProviderContext = { fetch: (input, init) => fetch(input, init), now, userAgent: site.userAgent };

  const [observed, forecast, previous] = await Promise.all([
    settle(runProvider(jmaAmedas, { stationId: location.station.id }, ctx)),
    settle(runProvider(openMeteo, { points: location.forecastPoints, timezone: location.timezone }, ctx)),
    readConditions(env.CONDITIONS, location.id),
  ]);

  const conditions = buildConditions({ locationId: location.id, now, observed, forecast, previous });
  await writeConditions(env.CONDITIONS, conditions);

  const failures = [observed, forecast].filter((r) => !r.ok).map((r) => (r.ok ? '' : r.error));
  if (failures.length) throw new Error(`${location.id}: ${failures.join('; ')} (kept previous data)`);
  return conditions;
}

/** Fetch every source for every location and store normalized `Conditions` in KV. */
export const refreshConditions: Job = {
  id: 'refresh-conditions',
  description: 'Fetch JMA + Open-Meteo, compute the powder score, write Conditions to KV',
  async run(ctx) {
    const ids = Object.keys(LOCATIONS) as (keyof typeof LOCATIONS)[];
    const results = await Promise.allSettled(ids.map((id) => refreshLocation(id, ctx)));
    const errors = results.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []));
    if (errors.length) throw new Error(errors.join(' | '));
  },
};
