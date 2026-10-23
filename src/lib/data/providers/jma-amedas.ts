/**
 * JMA AMeDAS — observed conditions at one station (Kutchan 16217 for Niseko).
 *
 * Data arrives in 3-hour JST point files with a row every 10 minutes. Not every field
 * is on every row: the snow fields only appear on the :00 rows. So for each field we
 * take the newest row that has it, within a max age.
 */
import { HOUR_MS, jmaBlockName, jmaKeyToIso } from '../../time.ts';
import type { ObservedConditions, Reading } from '../types.ts';
import { ProviderError, type Provider, type ProviderContext } from './types.ts';

const BASE = 'https://www.jma.go.jp/bosai/amedas';

/**
 * JMA quality flags (AQC), from JMA's own AMeDAS page code (`AQC_INFO`, checked 2026-10-23):
 * 0 normal · 1 ")" quasi-normal · 2, 3 "#" doubtful · 4 "]" insufficient data ·
 * 5 休止中 (kyūshichū, "suspended", e.g. snow out of season) · 6 "×" missing.
 * JMA itself treats 0 and 1 as valid values; so do we.
 */
const VALID_FLAGS = new Set([0, 1]);
const KNOWN_FLAGS = new Set([0, 1, 2, 3, 4, 5, 6]);

type JmaPair = [number | null, number];
type JmaRow = Record<string, unknown>;

export interface JmaQuery {
  stationId: string;
}

export interface JmaRaw {
  /** Contents of latest_time.txt, or null if it couldn't be fetched. */
  latestTime: string | null;
  /** Rows from the current and previous 3-hour files, keyed YYYYMMDDHHmmss (JST). */
  rows: Record<string, JmaRow>;
}

const isPair = (v: unknown): v is JmaPair =>
  Array.isArray(v) && v.length === 2 && (typeof v[0] === 'number' || v[0] === null) && typeof v[1] === 'number';

async function fetchText(ctx: ProviderContext, url: string): Promise<Response> {
  return ctx.fetch(url, { headers: { 'User-Agent': ctx.userAgent } });
}

async function fetchRaw({ stationId }: JmaQuery, ctx: ProviderContext): Promise<JmaRaw> {
  let latestTime: string | null = null;
  let anchor = new Date(ctx.now.getTime() - 10 * 60_000);
  try {
    const res = await fetchText(ctx, `${BASE}/data/latest_time.txt`);
    if (res.ok) {
      latestTime = (await res.text()).trim();
      const parsed = new Date(latestTime);
      if (!Number.isNaN(parsed.getTime())) anchor = parsed;
    }
  } catch {
    // Fall back to "now" — the point files are what matter.
  }

  const blocks = [jmaBlockName(anchor), jmaBlockName(new Date(anchor.getTime() - 3 * HOUR_MS))];
  const results = await Promise.allSettled(
    blocks.map(async (block) => {
      const res = await fetchText(ctx, `${BASE}/data/point/${stationId}/${block}.json`);
      if (res.status === 404) return {};
      if (!res.ok) throw new ProviderError('jma-amedas', `HTTP ${res.status} for ${block}`);
      return (await res.json()) as Record<string, JmaRow>;
    }),
  );

  const rows: Record<string, JmaRow> = {};
  for (const r of results) if (r.status === 'fulfilled') Object.assign(rows, r.value);
  if (Object.keys(rows).length === 0) {
    const reason = results.find((r) => r.status === 'rejected');
    throw new ProviderError('jma-amedas', 'no observation rows available', {
      cause: reason?.status === 'rejected' ? reason.reason : undefined,
    });
  }
  return { latestTime, rows };
}

function normalize(raw: JmaRaw, { stationId }: JmaQuery): ObservedConditions {
  const keys = Object.keys(raw.rows)
    .filter((k) => /^\d{14}$/.test(k))
    .sort();
  const latestKey = keys.at(-1);
  if (!latestKey) throw new ProviderError('jma-amedas', 'no rows to normalize');
  const latestMs = new Date(jmaKeyToIso(latestKey)).getTime();

  const unknownFlags = new Set<number>();

  /** Newest value of `field` no older than `maxAgeMin` before the latest row. */
  function pick(field: string, maxAgeMin: number): Reading<number> {
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i] as string;
      if (latestMs - new Date(jmaKeyToIso(key)).getTime() > maxAgeMin * 60_000) break;
      const v = raw.rows[key]?.[field];
      if (!isPair(v)) continue;
      const [value, flag] = v;
      if (!KNOWN_FLAGS.has(flag)) unknownFlags.add(flag);
      return { value, ok: VALID_FLAGS.has(flag) && value !== null };
    }
    return { value: null, ok: false };
  }

  const dir = pick('windDirection', 30);
  const windDirDeg: Reading<number> =
    dir.ok && dir.value !== null
      ? // JMA WDR_INFO: 0 = calm (静穏), 1 = NNE … 16 = N.
        { value: dir.value === 0 ? null : (dir.value % 16) * 22.5, ok: true }
      : { value: null, ok: false };

  const observed: ObservedConditions = {
    source: 'jma-amedas',
    stationId,
    observedAt: jmaKeyToIso(latestKey),
    // Snow fields are hourly (only on :00 rows), so allow a bit over an hour.
    snowDepthCm: pick('snow', 70),
    newSnow: {
      h1: pick('snow1h', 70),
      h6: pick('snow6h', 70),
      h12: pick('snow12h', 70),
      h24: pick('snow24h', 70),
    },
    tempC: pick('temp', 30),
    windMs: pick('wind', 30),
    windDirDeg,
    gustMs: pick('gust', 30),
    precip1hMm: pick('precipitation1h', 30),
    precip24hMm: pick('precipitation24h', 30),
  };

  if (unknownFlags.size > 0) {
    console.warn(JSON.stringify({ event: 'jma.unknown-flags', stationId, flags: [...unknownFlags] }));
  }
  return observed;
}

export const jmaAmedas: Provider<JmaQuery, JmaRaw, ObservedConditions> = {
  id: 'jma-amedas',
  fetchRaw,
  normalize,
};
