/**
 * Which season to highlight and how it compares. Pure.
 * In season: the current season so far vs the same date in past seasons.
 * Off-season (June–October): last season vs the seasons before it.
 */
import {
  averageSeries,
  cumulative,
  dateAt,
  dayIndex,
  rangeSeries,
  seasonOf,
  seasonStats,
  type SeasonSeries,
  type SeasonStats,
} from '../../lib/season.ts';
import type { SeasonData } from './load.ts';

export interface SeasonSummary {
  current: string;
  inSeason: boolean;
  /** The bold line: the current season if it has data, otherwise the latest complete one. */
  focus: string | null;
  /** The season before `focus`, drawn thin. */
  compare: string | null;
  /** Complete seasons used for the average and range (never includes `focus`). */
  reference: string[];
  /** Last day of `focus` with data (index), or null. */
  lastIndex: number | null;
  lastDate: string | null;
  focusStats: SeasonStats | null;
  /** Snowfall to `lastIndex`: focus vs the average of reference seasons. */
  totalToDate: number;
  avgTotalToDate: number | null;
  pctOfAverage: number | null;
  depthNow: number | null;
  avgDepthNow: number | null;
  avgDepth: (number | null)[];
  range: { min: number; max: number }[];
  /** All seasons, newest first. */
  table: { season: string; stats: SeasonStats; complete: boolean }[];
}

const hasData = (s: SeasonSeries | undefined) => !!s && s.depth.some((v) => v !== null);

function lastDataIndex(s: SeasonSeries): number | null {
  for (let i = s.depth.length - 1; i >= 0; i--) if (s.depth[i] !== null || s.snowfall[i] !== null) return i;
  return null;
}

export function summarizeSeasons(data: SeasonData): SeasonSummary {
  const { seasons, current, today } = data;
  const inSeason = seasonOf(today) === current;
  const names = Object.keys(seasons).sort();
  const complete = names.filter((n) => n < current && hasData(seasons[n]));

  const focus = hasData(seasons[current]) ? current : (complete.at(-1) ?? null);
  const focusSeries = focus ? seasons[focus] : undefined;
  const reference = complete.filter((n) => n !== focus).slice(-10);
  const refSeries = reference.map((n) => seasons[n]).filter((s): s is SeasonSeries => !!s);
  const compareName = focus ? (names.filter((n) => n < focus && hasData(seasons[n])).at(-1) ?? null) : null;

  const lastIndex = focusSeries ? lastDataIndex(focusSeries) : null;
  // For a finished season compare whole seasons; in season, compare up to the latest day.
  const upto = focus === current && inSeason && lastIndex !== null ? Math.min(lastIndex, dayIndex(current, today)) : null;
  const focusStats = focus && focusSeries ? seasonStats(focus, focusSeries, upto ?? undefined) : null;

  const totalToDate = focusSeries ? cumulative(focusSeries.snowfall, upto ?? undefined) : 0;
  const avgTotalToDate = refSeries.length
    ? refSeries.reduce((a, s) => a + cumulative(s.snowfall, upto ?? undefined), 0) / refSeries.length
    : null;
  const avgDepth = averageSeries(refSeries, 'depth');
  const depthIdx = upto ?? null;

  return {
    current,
    inSeason,
    focus,
    compare: compareName,
    reference,
    lastIndex,
    lastDate: focus && lastIndex !== null ? dateAt(focus, lastIndex) : null,
    focusStats,
    totalToDate: Math.round(totalToDate),
    avgTotalToDate: avgTotalToDate === null ? null : Math.round(avgTotalToDate),
    pctOfAverage: avgTotalToDate ? Math.round((totalToDate / avgTotalToDate) * 100) : null,
    depthNow: depthIdx !== null && focusSeries ? (focusSeries.depth[depthIdx] ?? null) : null,
    avgDepthNow: depthIdx !== null ? (avgDepth[depthIdx] ?? null) : null,
    avgDepth,
    range: rangeSeries(refSeries, 'depth'),
    table: names
      .filter((n) => hasData(seasons[n]))
      .reverse()
      .map((n) => ({ season: n, stats: seasonStats(n, seasons[n] as SeasonSeries), complete: n < current })),
  };
}
