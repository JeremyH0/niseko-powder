import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LOCATIONS } from '../../../config/locations.ts';
import { extrasUrl, openMeteo, primaryUrl, type OpenMeteoQuery, type OpenMeteoRaw } from './open-meteo.ts';
import type { ProviderContext } from './types.ts';

const read = (name: string) =>
  readFileSync(new URL(`../../../../tests/fixtures/open-meteo/${name}`, import.meta.url), 'utf8');

const primary = JSON.parse(read('production-primary.json'));
const extras = JSON.parse(read('production-extras.json'));
const capturedAt = new Date(read('production-captured-at.txt').trim());

const location = LOCATIONS.niseko;
const query: OpenMeteoQuery = { points: location.forecastPoints, timezone: location.timezone };

function ctx(fetchImpl: typeof fetch = () => Promise.reject(new Error('offline'))): ProviderContext {
  return { now: capturedAt, userAgent: 'test', fetch: fetchImpl };
}

describe('open-meteo normalize (production fixtures)', () => {
  const raw: OpenMeteoRaw = { primary, extras };
  const forecast = openMeteo.normalize(raw, query, ctx());

  it('returns one entry per configured point, in order', () => {
    expect(forecast.points.map((p) => p.id)).toEqual(['summit', 'mid', 'base']);
    expect(forecast.points[0]?.elevationM).toBe(1300);
  });

  it('keeps 7 days starting today (JST), dropping the past day', () => {
    for (const p of forecast.points) {
      expect(p.daily).toHaveLength(7);
      expect(p.daily[0]?.date).toBe('2026-10-22');
    }
  });

  it('keeps hourly from 24 h ago to 48 h ahead, with +09:00 timestamps', () => {
    const hours = forecast.points[0]?.hourly ?? [];
    expect(hours.length).toBe(72);
    expect(hours[0]?.time).toMatch(/\+09:00$/);
  });

  it('merges gusts and freezing level from the extras model', () => {
    const withGust = forecast.points[0]?.hourly.filter((h) => h.gustMs !== null) ?? [];
    expect(withGust.length).toBeGreaterThan(60);
    expect(forecast.points[0]?.daily[0]?.gustMaxMs).not.toBeNull();
  });

  it('computes past/next 24 h snowfall sums', () => {
    const summit = forecast.points[0];
    expect(summit?.next24hSnowfallCm).toBeGreaterThanOrEqual(0);
    expect(summit?.past24hSnowfallCm).toBeGreaterThanOrEqual(0);
    const manual = summit?.hourly
      .filter((h) => {
        const ms = new Date(h.time).getTime();
        return ms > capturedAt.getTime() && ms <= capturedAt.getTime() + 24 * 3600_000;
      })
      .reduce((a, h) => a + (h.snowfallCm ?? 0), 0);
    expect(summit?.next24hSnowfallCm).toBeCloseTo(manual ?? -1, 1);
  });

  it('summit and mid sit in different JMA model grid cells', () => {
    const [summit, mid] = forecast.points;
    expect([summit?.gridLat, summit?.gridLon]).not.toEqual([mid?.gridLat, mid?.gridLon]);
  });

  it('works without the extras (gusts become null)', () => {
    const f = openMeteo.normalize({ primary, extras: null }, query, ctx());
    expect(f.points[0]?.hourly.every((h) => h.gustMs === null)).toBe(true);
    expect(f.model).not.toMatch(/best match/);
  });

  it('rejects a response with the wrong number of points', () => {
    expect(() => openMeteo.normalize({ primary: [primary[0]], extras: null }, query, ctx())).toThrow(/expected 3/);
  });
});

describe('open-meteo fetchRaw', () => {
  afterEach(() => vi.restoreAllMocks());

  it('builds multi-location URLs with elevation, JST and m/s', () => {
    const u = new URL(primaryUrl(query));
    expect(u.searchParams.get('latitude')).toBe('42.8755,42.8672,42.859');
    expect(u.searchParams.get('elevation')).toBe('1300,820,280');
    expect(u.searchParams.get('timezone')).toBe('Asia/Tokyo');
    expect(u.searchParams.get('models')).toBe('jma_seamless');
    expect(new URL(extrasUrl(query)).searchParams.get('models')).toBeNull();
  });

  it('survives the extras request failing', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = (async (input: string | URL | Request) =>
      String(input).includes('jma_seamless')
        ? new Response(JSON.stringify(primary))
        : new Response(JSON.stringify({ error: true, reason: 'Too many requests' }), { status: 429 })) as typeof fetch;
    const raw = await openMeteo.fetchRaw(query, ctx(fetchImpl));
    expect(raw.primary).toHaveLength(3);
    expect(raw.extras).toBeNull();
  });

  it('throws with the API reason when the primary request fails', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ error: true, reason: 'Daily API request limit exceeded' }), {
        status: 429,
      })) as typeof fetch;
    await expect(openMeteo.fetchRaw(query, ctx(fetchImpl))).rejects.toThrow(
      '[open-meteo] HTTP 429: Daily API request limit exceeded',
    );
  });
});
