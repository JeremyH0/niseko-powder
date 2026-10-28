/**
 * Ski seasons, measured in town (JMA Kutchan): 1 November → 31 May, named "2025-26".
 * Each season is two arrays indexed by day of season (0 = 1 Nov), so seasons line up
 * on the same x axis. Pure helpers; storage lives elsewhere.
 */
import type { DailySnow } from './data/providers/jma-daily.ts';

/** 1 Nov → 31 May in a leap season (30+31+31+29+31+30+31). */
export const SEASON_DAYS = 213;
export const SEASON_MONTHS = [11, 12, 1, 2, 3, 4, 5] as const;

export interface SeasonSeries {
  snowfall: (number | null)[];
  depth: (number | null)[];
}

export interface SeasonHistoryFile {
  stationId: string;
  source: string;
  fetchedAt: string;
  seasons: Record<string, SeasonSeries>;
}

export interface SeasonStats {
  totalSnowfallCm: number;
  maxDepth: { cm: number; date: string } | null;
  biggestDay: { cm: number; date: string } | null;
  days20: number;
  daysWithData: number;
}

const DAY_MS = 86_400_000;

export const seasonName = (startYear: number) => `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
export const seasonStartYear = (season: string) => Number(season.slice(0, 4));
export const seasonStart = (season: string) => `${seasonStartYear(season)}-11-01`;

/** The season a JST date belongs to, or null in the off-season (June–October). */
export function seasonOf(date: string): string | null {
  const [y, m] = date.split('-').map(Number) as [number, number];
  if (m >= 11) return seasonName(y);
  if (m <= 5) return seasonName(y - 1);
  return null;
}

/** The season in progress, or the next one to start (June–October). */
export function currentOrNextSeason(date: string): string {
  return seasonOf(date) ?? seasonName(Number(date.slice(0, 4)));
}

export function dayIndex(season: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${seasonStart(season)}T00:00:00Z`)) / DAY_MS);
}

export function dateAt(season: string, index: number): string {
  return new Date(Date.parse(`${seasonStart(season)}T00:00:00Z`) + index * DAY_MS).toISOString().slice(0, 10);
}

/** Where a JST date sits in the ski calendar: day N of the season, or days until it opens. */
export type SeasonDay = { kind: 'day'; season: string; day: number; of: number } | { kind: 'opens'; season: string; inDays: number };

export function seasonDay(date: string): SeasonDay {
  const season = seasonOf(date);
  if (season) {
    const of = dayIndex(season, `${seasonStartYear(season) + 1}-05-31`) + 1;
    return { kind: 'day', season, day: dayIndex(season, date) + 1, of };
  }
  const next = currentOrNextSeason(date);
  return { kind: 'opens', season: next, inDays: -dayIndex(next, date) };
}

/** The (year, month) pairs to fetch for a season. */
export function seasonMonths(season: string): { year: number; month: number }[] {
  const y = seasonStartYear(season);
  return SEASON_MONTHS.map((month) => ({ year: month >= 11 ? y : y + 1, month }));
}

export const emptySeason = (): SeasonSeries => ({
  snowfall: Array.from({ length: SEASON_DAYS }, () => null),
  depth: Array.from({ length: SEASON_DAYS }, () => null),
});

/** Write daily values into a season (days outside the season are ignored). Returns a copy. */
export function mergeDays(season: string, series: SeasonSeries, days: DailySnow[]): SeasonSeries {
  const next = { snowfall: [...series.snowfall], depth: [...series.depth] };
  for (const d of days) {
    const i = dayIndex(season, d.date);
    if (i < 0 || i >= SEASON_DAYS) continue;
    if (d.snowfallCm !== null) next.snowfall[i] = d.snowfallCm;
    if (d.depthCm !== null) next.depth[i] = d.depthCm;
  }
  return next;
}

/** Stats up to and including `uptoIndex` (whole season by default). */
export function seasonStats(season: string, s: SeasonSeries, uptoIndex = SEASON_DAYS - 1): SeasonStats {
  let total = 0;
  let maxDepth: SeasonStats['maxDepth'] = null;
  let biggestDay: SeasonStats['biggestDay'] = null;
  let days20 = 0;
  let daysWithData = 0;
  for (let i = 0; i <= Math.min(uptoIndex, SEASON_DAYS - 1); i++) {
    const fall = s.snowfall[i] ?? null;
    const depth = s.depth[i] ?? null;
    if (fall !== null || depth !== null) daysWithData++;
    if (fall !== null) {
      total += fall;
      if (fall >= 20) days20++;
      if (!biggestDay || fall > biggestDay.cm) biggestDay = { cm: fall, date: dateAt(season, i) };
    }
    if (depth !== null && (!maxDepth || depth > maxDepth.cm)) maxDepth = { cm: depth, date: dateAt(season, i) };
  }
  return {
    totalSnowfallCm: Math.round(total),
    maxDepth: maxDepth && maxDepth.cm > 0 ? maxDepth : null,
    biggestDay: biggestDay && biggestDay.cm > 0 ? biggestDay : null,
    days20,
    daysWithData,
  };
}

/** Per-day mean across seasons (ignoring nulls). */
export function averageSeries(seasons: SeasonSeries[], key: keyof SeasonSeries): (number | null)[] {
  return Array.from({ length: SEASON_DAYS }, (_, i) => {
    const vals = seasons.map((s) => s[key][i]).filter((v): v is number => v !== null && v !== undefined);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
}

/** Per-day min and max across seasons, for the "range of past seasons" band. */
export function rangeSeries(seasons: SeasonSeries[], key: keyof SeasonSeries): { min: number; max: number }[] {
  return Array.from({ length: SEASON_DAYS }, (_, i) => {
    const vals = seasons.map((s) => s[key][i]).filter((v): v is number => v !== null && v !== undefined);
    return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };
  });
}

/** Running total, treating missing days as 0. */
export function cumulative(values: (number | null)[], uptoIndex = values.length - 1): number {
  let sum = 0;
  for (let i = 0; i <= Math.min(uptoIndex, values.length - 1); i++) sum += values[i] ?? 0;
  return sum;
}
