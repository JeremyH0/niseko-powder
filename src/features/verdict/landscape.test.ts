import { describe, expect, it } from 'vitest';
import { LAND, fbm, landscape, rng } from './landscape.ts';

const ys = (d: string) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => Number(m[2]));

describe('noise', () => {
  it('is deterministic for a seed and bounded', () => {
    expect(rng(1)()).toBe(rng(1)());
    const n = fbm(5);
    for (let x = 0; x < 50; x += 0.37) {
      expect(Math.abs(n(x))).toBeLessThanOrEqual(1);
    }
  });
});

describe('landscape', () => {
  const a = landscape({ snowline: 'peaks', light: 'left' });

  it('renders identically every time (no layout jitter between requests)', () => {
    expect(landscape({ snowline: 'peaks', light: 'left' })).toEqual(a);
  });

  it('Yōtei is the highest summit, Annupuri peaks near its real position', () => {
    expect(Math.min(...ys(a.yotei.body))).toBeLessThan(Math.min(...ys(a.range.body)));
    expect(a.range.summit[0]).toBeGreaterThan(280);
    expect(a.range.summit[0]).toBeLessThan(400);
  });

  it('stays inside the viewBox', () => {
    for (const d of [a.distant, a.yotei.body, a.range.body, a.forest.ground, a.front]) {
      for (const y of ys(d)) expect(y).toBeLessThanOrEqual(LAND.height + 10);
    }
  });

  it('snowline is data-driven: none → no snow, full → more snow than peaks', () => {
    const none = landscape({ snowline: 'none' });
    const full = landscape({ snowline: 'full' });
    expect(none.yotei.snow).toBe('');
    expect(none.range.snow).toBe('');
    expect(full.range.snow.length).toBeGreaterThan(a.range.snow.length);
    expect(Math.max(...ys(full.range.snow))).toBeGreaterThan(Math.max(...ys(a.range.snow)));
  });

  it('shadow faces flip with the light', () => {
    expect(a.yotei.shadow).not.toBe('');
    expect(landscape({ light: 'right' }).yotei.shadow).not.toBe(a.yotei.shadow);
  });

  it('draws a forest edge', () => {
    expect((a.forest.trees.match(/Z/g) ?? []).length).toBeGreaterThan(150);
  });
});
