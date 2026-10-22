import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../config/locations.ts';
import type { ForecastConditions, ForecastPointData, ObservedConditions, Reading } from '../data/types.ts';
import { openMeteo } from '../data/providers/open-meteo.ts';
import { computePowder } from './score.ts';

const NOW = new Date('2026-01-15T21:30:00Z'); // 06:30 JST
const r = (value: number | null, ok = true): Reading<number> => ({ value, ok });

function observed(over: Partial<ObservedConditions> = {}): ObservedConditions {
  return {
    source: 'jma-amedas',
    stationId: '16217',
    observedAt: '2026-01-16T06:20:00+09:00',
    snowDepthCm: r(150),
    newSnow: { h1: r(0), h6: r(0), h12: r(0), h24: r(0) },
    tempC: r(-6),
    windMs: r(2),
    windDirDeg: r(315),
    gustMs: r(6),
    precip1hMm: r(0),
    precip24hMm: r(0),
    ...over,
  };
}

/** A flat 72-hour series around NOW, with optional per-hour overrides. */
function point(id: 'summit' | 'mid' | 'base', opts: Partial<ForecastPointData> & { tempC?: number; windMs?: number; gustMs?: number; rainMm?: number } = {}): ForecastPointData {
  const hourly = Array.from({ length: 72 }, (_, i) => {
    const t = new Date(NOW.getTime() + (i - 23) * 3600_000);
    return {
      time: t.toISOString(),
      snowfallCm: 0,
      rainMm: opts.rainMm ?? 0,
      precipMm: 0,
      tempC: opts.tempC ?? -10,
      windMs: opts.windMs ?? 4,
      windDirDeg: 300,
      gustMs: opts.gustMs ?? 8,
      freezingLevelM: 0,
      weatherCode: 73,
    };
  });
  return {
    id,
    elevationM: id === 'summit' ? 1300 : id === 'mid' ? 820 : 280,
    gridLat: 0,
    gridLon: 0,
    past24hSnowfallCm: 0,
    next24hSnowfallCm: 0,
    daily: [],
    hourly,
    ...opts,
  };
}

function forecast(points: ForecastPointData[]): ForecastConditions {
  return { source: 'open-meteo', model: 'test', fetchedAt: NOW.toISOString(), points };
}

const calm = () => forecast([point('summit'), point('mid'), point('base')]);

describe('computePowder', () => {
  it('no new snow → "none", score below the "some" threshold', () => {
    const p = computePowder({ observed: observed(), forecast: calm(), now: NOW });
    expect(p.verdict).toBe('none');
    expect(p.freshCm).toBe(0);
    expect(p.freshSource).toBe('none');
  });

  it('huge dump, cold and calm → epic', () => {
    const p = computePowder({
      observed: observed({ newSnow: { h1: r(3), h6: r(15), h12: r(25), h24: r(35) } }),
      forecast: forecast([point('summit'), point('mid', { past24hSnowfallCm: 30 }), point('base')]),
      now: NOW,
    });
    expect(p.verdict).toBe('epic');
    expect(p.freshCm).toBe(35);
    expect(p.freshSource).toBe('town');
    expect(p.reasons.map((x) => x.code)).toEqual(expect.arrayContaining(['fresh-town', 'fresh-mountain', 'cold-light']));
  });

  it('uses the mountain model when town got little (rain in town, snow up high)', () => {
    const p = computePowder({
      observed: observed({ newSnow: { h1: r(0), h6: r(0), h12: r(0), h24: r(2) } }),
      forecast: forecast([point('summit'), point('mid', { past24hSnowfallCm: 18 }), point('base')]),
      now: NOW,
    });
    expect(p.freshCm).toBe(18);
    expect(p.freshSource).toBe('mountain');
    expect(p.verdict).toBe('good');
  });

  it('strong wind → lift-hold penalty drops the verdict', () => {
    const fresh = { newSnow: { h1: r(2), h6: r(10), h12: r(18), h24: r(25) } };
    const calmScore = computePowder({ observed: observed(fresh), forecast: calm(), now: NOW });
    const windy = computePowder({
      observed: observed(fresh),
      forecast: forecast([point('summit', { gustMs: 26 }), point('mid', { windMs: 16 }), point('base')]),
      now: NOW,
    });
    expect(windy.score).toBe(calmScore.score - 20);
    expect(windy.reasons.find((x) => x.code === 'wind-holds')).toBeDefined();
  });

  it('rain at the base and warm mid-mountain → heavy-snow and rain penalties', () => {
    const p = computePowder({
      observed: observed({ newSnow: { h1: r(0), h6: r(4), h12: r(8), h24: r(12) } }),
      forecast: forecast([point('summit'), point('mid', { tempC: 1.5 }), point('base', { rainMm: 0.5 })]),
      now: NOW,
    });
    const codes = p.reasons.map((x) => x.code);
    expect(codes).toContain('warm-heavy');
    expect(codes).toContain('rain-base');
  });

  it('ignores a stale town observation and says so', () => {
    const p = computePowder({
      observed: observed({
        observedAt: '2026-01-16T02:00:00+09:00', // 4.5 h old
        newSnow: { h1: r(0), h6: r(0), h12: r(0), h24: r(40) },
      }),
      forecast: calm(),
      now: NOW,
    });
    expect(p.freshCm).toBe(0);
    expect(p.reasons[0]).toMatchObject({ code: 'stale-observation', params: { minutes: 270 } });
  });

  it('off-season: snow depth not measured → preSeason flag', () => {
    const p = computePowder({
      observed: observed({ snowDepthCm: r(null, false), newSnow: { h1: r(0, false), h6: r(0, false), h12: r(0, false), h24: r(0, false) } }),
      forecast: calm(),
      now: NOW,
    });
    expect(p.preSeason).toBe(true);
    expect(p.verdict).toBe('none');
  });

  it('copes with no data at all', () => {
    const p = computePowder({ observed: null, forecast: null, now: NOW });
    expect(p.verdict).toBe('none');
    expect(p.reasons.map((x) => x.code)).toEqual(['no-observation', 'no-forecast']);
    expect(p.nextBigSnow).toBeNull();
  });

  it('next big snow: the next 24 h first, then later days', () => {
    const daily = [
      { date: '2026-01-16', snowfallCm: 30 },
      { date: '2026-01-18', snowfallCm: 14 },
    ].map((d) => ({ ...d, rainMm: 0, precipMm: 0, tMaxC: -5, tMinC: -10, windMaxMs: 5, gustMaxMs: 9, weatherCode: 73 }));
    const soon = computePowder({
      observed: observed(),
      forecast: forecast([point('summit', { next24hSnowfallCm: 12, daily }), point('mid'), point('base')]),
      now: NOW,
    });
    expect(soon.nextBigSnow).toEqual({ date: '2026-01-16', snowfallCm: 12 });
    const later = computePowder({
      observed: observed(),
      forecast: forecast([point('summit', { next24hSnowfallCm: 2, daily }), point('mid'), point('base')]),
      now: NOW,
    });
    expect(later.nextBigSnow).toEqual({ date: '2026-01-18', snowfallCm: 14 });
  });

  it('more snow coming adds a capped bonus but cannot make a powder day on its own', () => {
    const p = computePowder({
      observed: observed(),
      forecast: forecast([point('summit', { next24hSnowfallCm: 40 }), point('mid'), point('base')]),
      now: NOW,
    });
    expect(p.verdict).toBe('none');
    expect(p.reasons.find((x) => x.code === 'more-coming')?.points).toBe(15);
  });
});

describe('computePowder on real data (22 Oct 2026: rain in Kutchan, first snow on the summit)', () => {
  const read = (n: string) =>
    readFileSync(new URL(`../../../tests/fixtures/open-meteo/${n}`, import.meta.url), 'utf8');
  const now = new Date(read('production-captured-at.txt').trim());
  const loc = LOCATIONS.niseko;
  const fc = openMeteo.normalize(
    { primary: JSON.parse(read('production-primary.json')), extras: JSON.parse(read('production-extras.json')) },
    { points: loc.forecastPoints, timezone: loc.timezone },
    { now, userAgent: 't', fetch },
  );

  it('flags pre-season, finds the next big snow day on the summit', () => {
    const p = computePowder({
      observed: observed({
        observedAt: '2026-10-22T15:40:00+09:00',
        snowDepthCm: r(null, false),
        newSnow: { h1: r(0, false), h6: r(0, false), h12: r(0, false), h24: r(0, false) },
        tempC: r(4.8),
        precip24hMm: r(44.5),
      }),
      forecast: fc,
      now,
    });
    expect(p.preSeason).toBe(true);
    // ~21 cm fell on the summit today, but it's already down — nothing big in the next 7 days.
    expect(p.nextBigSnow).toBeNull();
    expect(p.reasons.map((x) => x.code)).toContain('rain-town');
  });
});
