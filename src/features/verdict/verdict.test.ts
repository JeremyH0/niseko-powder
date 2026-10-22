import { describe, expect, it } from 'vitest';
import type { Conditions, ForecastPointData, PowderResult } from '../../lib/data/types.ts';
import { heroModel, skyPhase, weatherState } from './verdict.ts';

const NOW = new Date('2026-01-15T21:30:00Z'); // 06:30 JST

function point(id: 'summit' | 'mid' | 'base', over: Partial<ForecastPointData> = {}, hour: { snowfallCm?: number; weatherCode?: number } = {}): ForecastPointData {
  return {
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
        snowfallCm: hour.snowfallCm ?? 0,
        rainMm: 0,
        precipMm: 0,
        tempC: -5,
        windMs: 3,
        windDirDeg: 300,
        gustMs: 5,
        freezingLevelM: 0,
        weatherCode: hour.weatherCode ?? 3,
      },
    ],
    ...over,
  };
}

function conditions(powder: Partial<PowderResult>, points: ForecastPointData[] = [point('summit'), point('mid')]): Conditions {
  return {
    locationId: 'niseko',
    generatedAt: NOW.toISOString(),
    observed: null,
    forecast: { source: 'open-meteo', model: 'm', fetchedAt: NOW.toISOString(), points },
    powder: {
      score: 0,
      verdict: 'none',
      freshCm: 0,
      freshSource: 'none',
      next24hCm: 0,
      preSeason: false,
      reasons: [],
      nextBigSnow: null,
      ...powder,
    },
    sources: { jma: { ok: true, lastSuccessAt: null }, openMeteo: { ok: true, lastSuccessAt: null } },
  };
}

describe('skyPhase (JST)', () => {
  it.each([
    ['2026-01-15T21:30:00Z', 'dawn'], // 06:30
    ['2026-01-16T03:00:00Z', 'day'], // 12:00
    ['2026-01-16T07:30:00Z', 'dusk'], // 16:30
    ['2026-01-16T13:00:00Z', 'night'], // 22:00
  ])('%s → %s', (iso, phase) => expect(skyPhase(new Date(iso))).toBe(phase));
});

describe('weatherState', () => {
  it('snow when the model has snowfall now', () => {
    expect(weatherState(conditions({}, [point('summit', {}, { snowfallCm: 1.2 })]), NOW)).toBe('snow');
  });
  it('rain from the WMO code', () => {
    expect(weatherState(conditions({}, [point('summit'), point('mid', {}, { weatherCode: 63 })]), NOW)).toBe('rain');
  });
  it('clear sky', () => {
    expect(weatherState(conditions({}, [point('summit'), point('mid', {}, { weatherCode: 0 })]), NOW)).toBe('clear');
  });
});

describe('heroModel', () => {
  it('epic day → YES with fresh cm', () => {
    const m = heroModel(conditions({ verdict: 'epic', freshCm: 32, freshSource: 'town' }), NOW);
    expect(m).toMatchObject({ word: 'epic', headline: 'fresh', cm: 32, snowcap: true });
  });

  it('good day measured only by the mountain model', () => {
    const m = heroModel(conditions({ verdict: 'good', freshCm: 18, freshSource: 'mountain' }), NOW);
    expect(m).toMatchObject({ word: 'good', headline: 'freshMountain' });
  });

  it('pre-season with first snow on the summit (22 Oct 2026)', () => {
    const m = heroModel(
      conditions({ preSeason: true }, [point('summit', { past24hSnowfallCm: 23.8 }), point('mid')]),
      NOW,
    );
    expect(m).toMatchObject({ word: 'notYet', headline: 'firstSnowSummit', cm: 23.8, snowcap: true });
  });

  it('pre-season, bare summit → no snowcap', () => {
    const m = heroModel(conditions({ preSeason: true }, [point('summit', { daily: [] }), point('mid')]), NOW);
    expect(m).toMatchObject({ word: 'notYet', headline: 'preseason', snowcap: false });
  });

  it('no powder but snowing now → "Soon."', () => {
    const m = heroModel(
      conditions({ next24hCm: 9 }, [point('summit', {}, { snowfallCm: 0.8 }), point('mid', {}, { snowfallCm: 0.4 })]),
      NOW,
    );
    expect(m).toMatchObject({ word: 'soon', headline: 'snowingNow', cm: 9 });
  });

  it('no powder, big snow later in the week', () => {
    const m = heroModel(conditions({ nextBigSnow: { date: '2026-01-18', snowfallCm: 22 } }), NOW);
    expect(m).toMatchObject({ word: 'nope', headline: 'noneNext', nextDay: '2026-01-18', cm: 22 });
  });

  it('no data at all', () => {
    expect(heroModel(null, NOW)).toMatchObject({ word: 'unknown', headline: 'noData' });
  });
});
