/** Geometry for the season snow-depth chart (hand-built SVG). Pure. */
import { SEASON_DAYS, dayIndex, seasonStartYear } from '../../lib/season.ts';

export const SEASON_CHART = { width: 720, height: 300, left: 40, right: 10, top: 14, bottom: 30 } as const;

export interface SeasonChartModel {
  yMax: number;
  yTicks: { y: number; value: number }[];
  monthTicks: { x: number; label: string }[];
  rangePath: string;
  averagePath: string;
  comparePath: string;
  focusPath: string;
  focusArea: string;
  todayX: number | null;
}

const { width, height, left, right, top, bottom } = SEASON_CHART;
const plotW = width - left - right;
const plotH = height - top - bottom;
export const xAt = (i: number) => left + (i / (SEASON_DAYS - 1)) * plotW;

/** Line path through non-null points, breaking at gaps. */
export function linePath(values: (number | null)[], y: (v: number) => number): string {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v === null || v === undefined) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${xAt(i).toFixed(1)} ${y(v).toFixed(1)}`;
    pen = true;
  });
  return d;
}

export function seasonChartModel(input: {
  focus: (number | null)[] | null;
  compare: (number | null)[] | null;
  average: (number | null)[];
  range: { min: number; max: number }[];
  /** Season whose calendar the month ticks follow, and today's date if in season. */
  season: string;
  today: string | null;
}): SeasonChartModel {
  const peaks = [
    ...input.range.map((r) => r.max),
    ...(input.focus ?? []).map((v) => v ?? 0),
    ...(input.compare ?? []).map((v) => v ?? 0),
  ];
  const yMax = Math.max(100, Math.ceil(Math.max(...peaks) / 50) * 50);
  const y = (v: number) => top + plotH - (v / yMax) * plotH;

  const yTicks = Array.from({ length: Math.floor(yMax / 50) + 1 }, (_, k) => ({ y: y(k * 50), value: k * 50 }));

  const startYear = seasonStartYear(input.season);
  const months: [number, number, string][] = [
    [startYear, 11, 'Nov'],
    [startYear, 12, 'Dec'],
    [startYear + 1, 1, 'Jan'],
    [startYear + 1, 2, 'Feb'],
    [startYear + 1, 3, 'Mar'],
    [startYear + 1, 4, 'Apr'],
    [startYear + 1, 5, 'May'],
  ];
  const monthTicks = months.map(([yy, mm, label]) => ({
    x: xAt(dayIndex(input.season, `${yy}-${String(mm).padStart(2, '0')}-01`)),
    label,
  }));

  const upper = input.range.map((r, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)} ${y(r.max).toFixed(1)}`).join('');
  const lower = input.range
    .map((r, i) => ({ i, r }))
    .reverse()
    .map(({ i, r }) => `L${xAt(i).toFixed(1)} ${y(r.min).toFixed(1)}`)
    .join('');
  const focusPath = input.focus ? linePath(input.focus, y) : '';
  let focusArea = '';
  if (input.focus) {
    const last = input.focus.reduce<number>((acc, v, i) => (v !== null ? i : acc), -1);
    if (last >= 0) {
      // Bridge single missing days with the last known value (the line itself still breaks).
      let carry = 0;
      const pts = input.focus.slice(0, last + 1).map((v, i) => {
        carry = v ?? carry;
        return `L${xAt(i).toFixed(1)} ${y(carry).toFixed(1)}`;
      });
      focusArea = `M${xAt(0).toFixed(1)} ${y(0).toFixed(1)}${pts.join('')}L${xAt(last).toFixed(1)} ${y(0).toFixed(1)}Z`;
    }
  }
  const todayIdx = input.today ? dayIndex(input.season, input.today) : null;

  return {
    yMax,
    yTicks,
    monthTicks,
    rangePath: input.range.length ? `${upper}${lower}Z` : '',
    averagePath: linePath(input.average, y),
    comparePath: input.compare ? linePath(input.compare, y) : '',
    focusPath,
    focusArea,
    todayX: todayIdx !== null && todayIdx >= 0 && todayIdx < SEASON_DAYS ? xAt(todayIdx) : null,
  };
}
