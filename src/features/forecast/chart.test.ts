import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../config/locations.ts';
import { openMeteo } from '../../lib/data/providers/open-meteo.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { CHART, next48Model } from './chart.ts';

const read = (n: string) => readFileSync(new URL(`../../../tests/fixtures/open-meteo/${n}`, import.meta.url), 'utf8');
const now = new Date(read('production-captured-at.txt').trim());
const loc = LOCATIONS.niseko;
const forecast = openMeteo.normalize(
  { primary: JSON.parse(read('production-primary.json')), extras: JSON.parse(read('production-extras.json')) },
  { points: loc.forecastPoints, timezone: loc.timezone },
  { now, userAgent: 't', fetch },
);
const conditions = { forecast } as Conditions;

describe('next48Model', () => {
  const m = next48Model(conditions, now);

  it('builds 48 hourly bars inside the chart', () => {
    expect(m?.bars).toHaveLength(48);
    for (const b of m?.bars ?? []) {
      expect(b.x).toBeGreaterThanOrEqual(CHART.left);
      expect(b.x + b.w).toBeLessThanOrEqual(CHART.width);
      expect(b.snowH).toBeGreaterThanOrEqual(0);
      expect(b.snowH).toBeLessThanOrEqual(CHART.baseline - CHART.snowTop + 0.001);
    }
  });

  it('draws a temperature path and the 0 °C line when it crosses freezing', () => {
    expect(m?.tempPath.startsWith('M')).toBe(true);
    expect(m?.tempLabels.length).toBeGreaterThan(0);
  });

  it('marks ticks every 6 h (JST) and night bands', () => {
    expect(m?.ticks.every((t) => t.hour % 6 === 0)).toBe(true);
    expect(m?.nightBands.length).toBeGreaterThan(0);
  });

  it('totals match the bars', () => {
    const sum = (m?.bars ?? []).reduce((a, b) => a + b.snowCm, 0);
    expect(m?.totalSnowCm).toBeCloseTo(sum, 1);
  });

  it('returns null without a forecast', () => {
    expect(next48Model(null, now)).toBeNull();
  });
});
