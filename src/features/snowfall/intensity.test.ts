import { describe, expect, it } from 'vitest';
import type { Conditions } from '../../lib/data/types.ts';
import { flakeCount, snowfallParams } from './intensity.ts';

const NOW = new Date('2026-01-15T21:00:00Z');
const hour = (offsetH: number, snowfallCm: number) => ({
  time: new Date(NOW.getTime() + offsetH * 3600_000).toISOString(),
  snowfallCm,
  rainMm: 0,
  precipMm: 0,
  tempC: -9,
  windMs: 7,
  windDirDeg: 290,
  gustMs: 10,
  freezingLevelM: 0,
  weatherCode: 73,
});

const c = {
  forecast: {
    points: [
      {
        id: 'summit',
        hourly: [hour(-1, 0.2), hour(0, 1.4), hour(5, 2.6), hour(30, 3.1), hour(60, 9)],
      },
    ],
  },
  observed: null,
} as unknown as Conditions;

describe('snowfallParams', () => {
  it('uses the current hour and finds the heaviest hour in the next 48 h', () => {
    const p = snowfallParams(c, NOW);
    expect(p.rateCmH).toBe(1.4);
    expect(p.windMs).toBe(7);
    expect(p.windFromDeg).toBe(290);
    expect(p.preview?.rateCmH).toBe(3.1); // the 9 cm/h hour is beyond 48 h
  });

  it('is calm and empty without data', () => {
    expect(snowfallParams(null, NOW)).toMatchObject({ rateCmH: 0, preview: null });
  });
});

describe('flakeCount', () => {
  it('no snow → no flakes; heavier → more, capped', () => {
    expect(flakeCount(0)).toBe(0);
    expect(flakeCount(0.5)).toBeGreaterThan(50);
    expect(flakeCount(3)).toBeGreaterThan(flakeCount(1));
    expect(flakeCount(20)).toBe(420);
  });
});
