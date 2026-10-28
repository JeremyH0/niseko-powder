import { describe, expect, it } from 'vitest';
import {
  SEASON_DAYS,
  seasonDay,
  averageSeries,
  cumulative,
  currentOrNextSeason,
  dateAt,
  dayIndex,
  emptySeason,
  mergeDays,
  seasonMonths,
  seasonOf,
  seasonStats,
} from './season.ts';

describe('season calendar', () => {
  it('names seasons Nov → May', () => {
    expect(seasonOf('2025-11-01')).toBe('2025-26');
    expect(seasonOf('2026-02-14')).toBe('2025-26');
    expect(seasonOf('2026-05-31')).toBe('2025-26');
    expect(seasonOf('2026-10-23')).toBeNull();
    expect(currentOrNextSeason('2026-10-23')).toBe('2026-27');
    expect(seasonOf('2099-12-01')).toBe('2099-00');
  });

  it('indexes days from 1 November, across leap years', () => {
    expect(dayIndex('2025-26', '2025-11-01')).toBe(0);
    expect(dayIndex('2025-26', '2026-01-01')).toBe(61);
    expect(dayIndex('2027-28', '2028-05-31')).toBe(SEASON_DAYS - 1); // leap season
    expect(dateAt('2025-26', 61)).toBe('2026-01-01');
  });

  it('lists the months to fetch', () => {
    expect(seasonMonths('2025-26')).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
      { year: 2026, month: 3 },
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
    ]);
  });
});

describe('season data', () => {
  const s = mergeDays('2025-26', emptySeason(), [
    { date: '2025-10-31', snowfallCm: 99, depthCm: 99 }, // outside → ignored
    { date: '2025-12-01', snowfallCm: 25, depthCm: 40 },
    { date: '2025-12-02', snowfallCm: 5, depthCm: 52 },
    { date: '2025-12-03', snowfallCm: null, depthCm: 48 },
    { date: '2026-01-10', snowfallCm: 31, depthCm: 120 },
  ]);

  it('merges days at the right index and ignores days outside the season', () => {
    expect(s.snowfall[30]).toBe(25);
    expect(s.depth.filter((v) => v !== null)).toHaveLength(4);
  });

  it('computes season stats', () => {
    expect(seasonStats('2025-26', s)).toEqual({
      totalSnowfallCm: 61,
      maxDepth: { cm: 120, date: '2026-01-10' },
      biggestDay: { cm: 31, date: '2026-01-10' },
      days20: 2,
      daysWithData: 4,
    });
    expect(seasonStats('2025-26', s, 31).totalSnowfallCm).toBe(30);
  });

  it('averages across seasons and sums to date', () => {
    const a = mergeDays('2024-25', emptySeason(), [{ date: '2024-12-01', snowfallCm: 15, depthCm: 60 }]);
    const avg = averageSeries([s, a], 'depth');
    expect(avg[30]).toBe(50);
    expect(avg[0]).toBeNull();
    expect(cumulative(s.snowfall)).toBe(61);
    expect(cumulative(s.snowfall, 30)).toBe(25);
  });

  it('empty season has no stats', () => {
    expect(seasonStats('2026-27', emptySeason())).toMatchObject({ totalSnowfallCm: 0, maxDepth: null, biggestDay: null });
  });
});

describe('seasonDay', () => {
  it('counts down to opening day in the off-season', () => {
    expect(seasonDay('2026-10-28')).toEqual({ kind: 'opens', season: '2026-27', inDays: 4 });
  });
  it('numbers the days of the season, with its real length', () => {
    expect(seasonDay('2026-11-01')).toEqual({ kind: 'day', season: '2026-27', day: 1, of: 212 });
    expect(seasonDay('2027-05-31')).toEqual({ kind: 'day', season: '2026-27', day: 212, of: 212 });
    expect(seasonDay('2027-12-25')).toMatchObject({ day: 55, of: 213 });
  });
});
