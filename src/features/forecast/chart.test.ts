import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../../config/locations.ts';
import { openMeteo } from '../../lib/data/providers/open-meteo.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { H48, W7, columnPath, next48Model, niceMax, sevenDayColumns } from './chart.ts';

const read = (n: string) => readFileSync(new URL(`../../../tests/fixtures/open-meteo/${n}`, import.meta.url), 'utf8');
const now = new Date(read('production-captured-at.txt').trim());
const loc = LOCATIONS.niseko;
const forecast = openMeteo.normalize(
  { primary: JSON.parse(read('production-primary.json')), extras: JSON.parse(read('production-extras.json')) },
  { points: loc.forecastPoints, timezone: loc.timezone },
  { now, userAgent: 't', fetch },
);
const conditions = { forecast } as Conditions;

describe('helpers', () => {
  it('niceMax rounds up to clean axis values', () => {
    expect(niceMax(0, 1)).toBe(1);
    expect(niceMax(1.3, 1)).toBe(2);
    expect(niceMax(21, 10)).toBe(25);
    expect(niceMax(130, 10)).toBe(150);
  });

  it('columnPath: rounded data-end, square baseline, clamps radius on short bars', () => {
    expect(columnPath(0, 10, 50, 100)).toMatch(/^M0\.0 100\.0V54\.0Q/);
    expect(columnPath(0, 10, 99, 100)).toMatch(/V100\.0Z$/);
    expect(columnPath(0, 10, 100, 100)).toBe('');
  });
});

describe('next48Model (small multiples)', () => {
  const m = next48Model(conditions, now);

  it('builds 48 hours inside the plot, bars ≤ 24 wide with a gap', () => {
    expect(m?.hours).toHaveLength(48);
    const step = (H48.width - H48.left - H48.right) / 48;
    const first = m?.hours[0];
    expect(first?.cx).toBeCloseTo(H48.left + step / 2, 5);
    expect(m?.hours.at(-1)?.cx).toBeLessThan(H48.width - H48.right);
  });

  it('each panel has its own scale (no dual axis)', () => {
    expect(m?.snowMax).toBeGreaterThanOrEqual(1);
    expect(m?.rainMax).toBeGreaterThanOrEqual(1);
    expect(m!.tempMin).toBeLessThanOrEqual(0); // scale always includes 0 °C
    expect(m!.tempMax).toBeGreaterThanOrEqual(0);
  });

  it('temperature path inside its panel, freezing line drawn', () => {
    const ys = [...(m?.tempPath ?? '').matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((x) => Number(x[1]));
    expect(ys.length).toBeGreaterThan(40);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(H48.temp.top);
    expect(Math.max(...ys)).toBeLessThanOrEqual(H48.temp.top + H48.temp.h);
    expect(m?.zeroY).not.toBeNull();
  });

  it('ticks every 6 h (JST), totals match the hours', () => {
    expect(m?.ticks.every((t) => t.hour % 6 === 0)).toBe(true);
    const sum = (m?.hours ?? []).reduce((a, h) => a + h.snowCm, 0);
    expect(m?.totalSnowCm).toBeCloseTo(sum, 1);
  });

  it('returns null without a forecast', () => {
    expect(next48Model(null, now)).toBeNull();
  });
});

describe('sevenDayColumns', () => {
  it('scales columns to a clean max and keeps empty days flat', () => {
    const { cols, max } = sevenDayColumns([
      { date: '2026-01-15', snowfallCm: 0 },
      { date: '2026-01-16', snowfallCm: 22 },
      { date: '2026-01-17', snowfallCm: null },
    ]);
    expect(max).toBe(25);
    expect(cols[0]?.path).toBe('');
    expect(cols[1]?.path.startsWith(`M${(cols[1]!.cx - W7.barW / 2).toFixed(1)}`)).toBe(true);
    expect(cols[2]?.summitCm).toBe(0);
  });
});

describe('temperature labels', () => {
  it('never sit below the temperature panel', () => {
    const m = next48Model(conditions, now);
    for (const l of m?.tempLabels ?? []) {
      const textY = l.below ? l.y + 17 : l.y - 9;
      expect(textY).toBeLessThanOrEqual(H48.temp.top + H48.temp.h);
    }
  });
});
