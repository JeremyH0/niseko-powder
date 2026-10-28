import { describe, expect, it } from 'vitest';
import type { Conditions, ForecastPointData } from '../../lib/data/types.ts';
import { tickerItems } from './items.ts';

const NOW = new Date('2026-01-15T00:00:00Z'); // 09:00 JST

const point = (id: 'summit' | 'mid', hour: Partial<ForecastPointData['hourly'][number]>): ForecastPointData => ({
  id,
  elevationM: 0,
  gridLat: 0,
  gridLon: 0,
  past24hSnowfallCm: 0,
  next24hSnowfallCm: 0,
  daily: [],
  hourly: [
    {
      time: NOW.toISOString(),
      snowfallCm: 0,
      rainMm: 0,
      precipMm: 0,
      tempC: -8.4,
      windMs: 6.2,
      windDirDeg: 292,
      gustMs: 10,
      freezingLevelM: 830,
      weatherCode: 71,
      ...hour,
    },
  ],
});

const reading = (value: number | null, ok = true) => ({ value, ok });

function conditions(over: Partial<Conditions> = {}): Conditions {
  return {
    locationId: 'niseko',
    generatedAt: NOW.toISOString(),
    observed: {
      source: 'jma-amedas',
      stationId: '16217',
      observedAt: NOW.toISOString(),
      snowDepthCm: reading(null, false),
      newSnow: { h1: reading(0), h6: reading(0), h12: reading(0), h24: reading(0) },
      tempC: reading(-3.2),
      windMs: reading(2),
      windDirDeg: reading(270),
      gustMs: reading(5),
      precip1hMm: reading(0),
      precip24hMm: reading(0),
    },
    forecast: { source: 'open-meteo', model: 'jma_seamless', fetchedAt: NOW.toISOString(), points: [point('summit', {}), point('mid', {})] },
    powder: {
      score: 64,
      verdict: 'good',
      freshCm: 18.4,
      freshSource: 'mountain',
      next24hCm: 6,
      preSeason: false,
      reasons: [],
      nextBigSnow: { date: '2026-01-17', snowfallCm: 22 },
    },
    sources: { jma: { ok: true, lastSuccessAt: null }, openMeteo: { ok: true, lastSuccessAt: null } },
    ...over,
  };
}

describe('tickerItems', () => {
  it('reads score, snow, temperatures, freezing level and wind', () => {
    const byKey = Object.fromEntries(tickerItems(conditions(), NOW).map((i) => [i.key, i.value]));
    expect(byKey).toMatchObject({
      score: '64/100',
      fresh: '18 cm',
      next24: '+6 cm',
      summitTemp: '−8°C',
      freezing: '850 m',
      wind: '6 m/s WNW',
      townTemp: '−3°C',
      bigSnow: 'Sat · ~22 cm',
    });
  });

  it('leaves out readings JMA did not validate instead of showing zero', () => {
    const keys = tickerItems(conditions(), NOW).map((i) => i.key);
    expect(keys).not.toContain('townDepth');
  });

  it('is empty without data', () => {
    expect(tickerItems(null, NOW)).toEqual([]);
  });
});
