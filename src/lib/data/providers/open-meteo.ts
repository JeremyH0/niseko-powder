/**
 * Open-Meteo — mountain forecast for every forecast point of a location.
 *
 * Two requests per run (both multi-location):
 * - primary: `jma_seamless` (JMA MSM 5 km, then GSM) — snowfall, temperature, wind.
 *   It resolves the summit and mid-mountain into different grid cells.
 * - extras: default `best_match` — gusts and freezing level, which JMA models don't provide.
 *   Optional: if it fails we still publish the forecast, without those two.
 *
 * Free tier is non-commercial only, and must never be called from the browser.
 */
import type { ForecastPoint } from '../../../config/locations.ts';
import { HOUR_MS, jstDate, openMeteoTimeToIso } from '../../time.ts';
import type { ForecastConditions, ForecastDay, ForecastHour, ForecastPointData } from '../types.ts';
import { ProviderError, type Provider, type ProviderContext } from './types.ts';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export const PRIMARY_MODEL = 'jma_seamless';
const PRIMARY_HOURLY = [
  'snowfall',
  'rain',
  'precipitation',
  'temperature_2m',
  'wind_speed_10m',
  'wind_direction_10m',
  'weather_code',
];
const PRIMARY_DAILY = [
  'snowfall_sum',
  'rain_sum',
  'precipitation_sum',
  'temperature_2m_max',
  'temperature_2m_min',
  'wind_speed_10m_max',
  'weather_code',
];
const EXTRA_HOURLY = ['wind_gusts_10m', 'freezing_level_height'];
const EXTRA_DAILY = ['wind_gusts_10m_max'];

export interface OpenMeteoQuery {
  points: readonly ForecastPoint[];
  timezone: string;
}

type Series = (number | null)[];
interface OmBlock {
  time: string[];
  [variable: string]: Series | string[];
}
interface OmResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  hourly?: OmBlock;
  daily?: OmBlock;
}

export interface OpenMeteoRaw {
  primary: OmResponse[];
  extras: OmResponse[] | null;
}

function url(query: OpenMeteoQuery, hourly: string[], daily: string[], model?: string): string {
  const params = new URLSearchParams({
    latitude: query.points.map((p) => p.lat).join(','),
    longitude: query.points.map((p) => p.lon).join(','),
    elevation: query.points.map((p) => p.elevationM).join(','),
    hourly: hourly.join(','),
    daily: daily.join(','),
    timezone: query.timezone,
    wind_speed_unit: 'ms',
    past_days: '1',
    forecast_days: '7',
  });
  if (model) params.set('models', model);
  return `${ENDPOINT}?${params}`;
}

export const primaryUrl = (q: OpenMeteoQuery) => url(q, PRIMARY_HOURLY, PRIMARY_DAILY, PRIMARY_MODEL);
export const extrasUrl = (q: OpenMeteoQuery) => url(q, EXTRA_HOURLY, EXTRA_DAILY);

/** A single location comes back as an object, several as an array. */
const toArray = (body: unknown): OmResponse[] => (Array.isArray(body) ? body : [body]) as OmResponse[];

async function getJson(ctx: ProviderContext, target: string): Promise<unknown> {
  const res = await ctx.fetch(target, { headers: { 'User-Agent': ctx.userAgent } });
  const body = (await res.json().catch(() => null)) as { reason?: string } | null;
  if (!res.ok) throw new ProviderError('open-meteo', `HTTP ${res.status}: ${body?.reason ?? 'no reason given'}`);
  return body;
}

async function fetchRaw(query: OpenMeteoQuery, ctx: ProviderContext): Promise<OpenMeteoRaw> {
  const [primary, extras] = await Promise.allSettled([
    getJson(ctx, primaryUrl(query)),
    getJson(ctx, extrasUrl(query)),
  ]);
  if (primary.status === 'rejected') throw primary.reason;
  if (extras.status === 'rejected') {
    console.warn(JSON.stringify({ event: 'open-meteo.extras-failed', error: String(extras.reason) }));
  }
  return { primary: toArray(primary.value), extras: extras.status === 'fulfilled' ? toArray(extras.value) : null };
}

const num = (block: OmBlock | undefined, variable: string, i: number | undefined): number | null => {
  if (!block || i === undefined) return null;
  const v = (block[variable] as Series | undefined)?.[i];
  return typeof v === 'number' ? v : null;
};

const sum = (values: (number | null)[]) => Math.round(values.reduce<number>((a, v) => a + (v ?? 0), 0) * 10) / 10;

function normalizePoint(
  point: ForecastPoint,
  primary: OmResponse,
  extras: OmResponse | undefined,
  now: Date,
): ForecastPointData {
  const h = primary.hourly;
  const d = primary.daily;
  if (!h?.time || !d?.time) throw new ProviderError('open-meteo', `missing hourly/daily for ${point.id}`);

  const extraHourIndex = new Map(extras?.hourly?.time.map((t, i) => [t, i]));
  const extraDayIndex = new Map(extras?.daily?.time.map((t, i) => [t, i]));

  const nowMs = now.getTime();
  const allHours: (ForecastHour & { ms: number })[] = h.time.map((local, i) => {
    const time = openMeteoTimeToIso(local);
    const xi = extraHourIndex.get(local);
    return {
      ms: new Date(time).getTime(),
      time,
      snowfallCm: num(h, 'snowfall', i),
      rainMm: num(h, 'rain', i),
      precipMm: num(h, 'precipitation', i),
      tempC: num(h, 'temperature_2m', i),
      windMs: num(h, 'wind_speed_10m', i),
      windDirDeg: num(h, 'wind_direction_10m', i),
      gustMs: num(extras?.hourly, 'wind_gusts_10m', xi),
      freezingLevelM: num(extras?.hourly, 'freezing_level_height', xi),
      weatherCode: num(h, 'weather_code', i),
    };
  });

  // Open-Meteo hourly sums cover the hour *ending* at the timestamp.
  const past = allHours.filter((x) => x.ms > nowMs - 24 * HOUR_MS && x.ms <= nowMs);
  const next = allHours.filter((x) => x.ms > nowMs && x.ms <= nowMs + 24 * HOUR_MS);
  const hourly = allHours
    .filter((x) => x.ms > nowMs - 24 * HOUR_MS && x.ms <= nowMs + 48 * HOUR_MS)
    .map(({ ms: _ms, ...rest }) => rest);

  const today = jstDate(now);
  const daily: ForecastDay[] = d.time
    .map((date, i) => {
      const xi = extraDayIndex.get(date);
      return {
        date,
        snowfallCm: num(d, 'snowfall_sum', i),
        rainMm: num(d, 'rain_sum', i),
        precipMm: num(d, 'precipitation_sum', i),
        tMaxC: num(d, 'temperature_2m_max', i),
        tMinC: num(d, 'temperature_2m_min', i),
        windMaxMs: num(d, 'wind_speed_10m_max', i),
        gustMaxMs: num(extras?.daily, 'wind_gusts_10m_max', xi),
        weatherCode: num(d, 'weather_code', i),
      };
    })
    .filter((day) => day.date >= today)
    .slice(0, 7);

  return {
    id: point.id,
    elevationM: point.elevationM,
    gridLat: primary.latitude,
    gridLon: primary.longitude,
    past24hSnowfallCm: sum(past.map((x) => x.snowfallCm)),
    next24hSnowfallCm: sum(next.map((x) => x.snowfallCm)),
    daily,
    hourly,
  };
}

function normalize(raw: OpenMeteoRaw, query: OpenMeteoQuery, ctx: ProviderContext): ForecastConditions {
  if (raw.primary.length !== query.points.length) {
    throw new ProviderError('open-meteo', `expected ${query.points.length} results, got ${raw.primary.length}`);
  }
  return {
    source: 'open-meteo',
    model: raw.extras
      ? 'JMA MSM/GSM (jma_seamless) via Open-Meteo; gusts & freezing level from Open-Meteo best match'
      : 'JMA MSM/GSM (jma_seamless) via Open-Meteo',
    fetchedAt: ctx.now.toISOString(),
    points: query.points.map((point, i) => normalizePoint(point, raw.primary[i] as OmResponse, raw.extras?.[i], ctx.now)),
  };
}

export const openMeteo: Provider<OpenMeteoQuery, OpenMeteoRaw, ForecastConditions> = {
  id: 'open-meteo',
  fetchRaw,
  normalize,
};
