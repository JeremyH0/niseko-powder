import { describe, expect, it } from 'vitest';
import { buildConditions } from './build-conditions.ts';
import type { ForecastConditions, ObservedConditions } from './types.ts';

const now = new Date('2026-01-15T21:30:00Z');
const later = new Date('2026-01-15T22:30:00Z');
const r = (value: number | null) => ({ value, ok: value !== null });

const obs: ObservedConditions = {
  source: 'jma-amedas',
  stationId: '16217',
  observedAt: '2026-01-16T06:20:00+09:00',
  snowDepthCm: r(150),
  newSnow: { h1: r(1), h6: r(5), h12: r(9), h24: r(14) },
  tempC: r(-7),
  windMs: r(3),
  windDirDeg: r(315),
  gustMs: r(9),
  precip1hMm: r(0.5),
  precip24hMm: r(9),
};
const fc: ForecastConditions = { source: 'open-meteo', model: 'm', fetchedAt: now.toISOString(), points: [] };

describe('buildConditions', () => {
  it('uses fresh values when both sources succeed', () => {
    const c = buildConditions({
      locationId: 'niseko',
      now,
      observed: { ok: true, value: obs },
      forecast: { ok: true, value: fc },
      previous: null,
    });
    expect(c.observed).toBe(obs);
    expect(c.sources.jma).toEqual({ ok: true, lastSuccessAt: now.toISOString() });
    expect(c.powder.freshCm).toBe(14);
  });

  it('keeps the previous good observation when JMA fails', () => {
    const first = buildConditions({
      locationId: 'niseko',
      now,
      observed: { ok: true, value: obs },
      forecast: { ok: true, value: fc },
      previous: null,
    });
    const second = buildConditions({
      locationId: 'niseko',
      now: later,
      observed: { ok: false, error: 'HTTP 503' },
      forecast: { ok: true, value: fc },
      previous: first,
    });
    expect(second.observed).toEqual(obs);
    expect(second.sources.jma).toEqual({ ok: false, lastSuccessAt: now.toISOString(), lastError: 'HTTP 503' });
    expect(second.sources.openMeteo.ok).toBe(true);
  });

  it('records the error with nothing to fall back to', () => {
    const c = buildConditions({
      locationId: 'niseko',
      now,
      observed: { ok: false, error: 'down' },
      forecast: { ok: false, error: 'down' },
      previous: null,
    });
    expect(c.observed).toBeNull();
    expect(c.forecast).toBeNull();
    expect(c.sources.openMeteo.lastSuccessAt).toBeNull();
    expect(c.powder.verdict).toBe('none');
  });
});
