/**
 * Geometry for the forecast charts (hand-built SVG). Pure: data in, coordinates out.
 *
 * 48 hours = small multiples on one shared time axis (never a dual-axis chart):
 *   snow at the summit (cm/h) · rain at the base (mm/h) · temperature mid-mountain (°C)
 * 7 days = one column per day (summit snowfall), value on the cap.
 */
import { findPoint, hoursAhead } from '../../lib/data/forecast.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { jstParts } from '../../lib/time.ts';

export const H48 = {
  width: 720,
  left: 34,
  right: 8,
  snow: { top: 26, h: 104 },
  rain: { top: 160, h: 34 },
  temp: { top: 226, h: 60 },
  axisY: 306,
  height: 314,
} as const;

/** A column with a 4px rounded data-end and a square baseline. */
export function columnPath(x: number, w: number, yTop: number, yBase: number, radius = 4): string {
  const h = yBase - yTop;
  if (h <= 0) return '';
  const r = Math.min(radius, w / 2, h);
  return (
    `M${x.toFixed(1)} ${yBase.toFixed(1)}V${(yTop + r).toFixed(1)}` +
    `Q${x.toFixed(1)} ${yTop.toFixed(1)} ${(x + r).toFixed(1)} ${yTop.toFixed(1)}` +
    `H${(x + w - r).toFixed(1)}Q${(x + w).toFixed(1)} ${yTop.toFixed(1)} ${(x + w).toFixed(1)} ${(yTop + r).toFixed(1)}` +
    `V${yBase.toFixed(1)}Z`
  );
}

/** Round a maximum up to a clean axis value. */
export function niceMax(v: number, min: number): number {
  const m = Math.max(min, v);
  const steps = [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
  return steps.find((s) => s >= m) ?? Math.ceil(m / 50) * 50;
}

export interface HourMark {
  time: string;
  /** Centre x of the hour slot. */
  cx: number;
  snowCm: number;
  rainMm: number;
  tempC: number | null;
  snowPath: string;
  rainPath: string;
}

export interface Next48Model {
  hours: HourMark[];
  snowMax: number;
  rainMax: number;
  tempMin: number;
  tempMax: number;
  tempPath: string;
  zeroY: number | null;
  tempLabels: { x: number; y: number; value: number; below: boolean }[];
  ticks: { x: number; hour: number; time: string; isMidnight: boolean }[];
  nightBands: { x: number; w: number }[];
  totalSnowCm: number;
  totalRainMm: number;
  peak: { time: string; cm: number } | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function next48Model(c: Conditions | null, now: Date): Next48Model | null {
  const summit = hoursAhead(findPoint(c, 'summit'), now, 48);
  if (summit.length === 0) return null;
  const base = new Map(hoursAhead(findPoint(c, 'base'), now, 48).map((h) => [h.time, h]));
  const mid = new Map(hoursAhead(findPoint(c, 'mid'), now, 48).map((h) => [h.time, h]));

  const { width, left, right, snow, rain, temp } = H48;
  const step = (width - left - right) / summit.length;
  const barW = Math.min(24, step - 2); // 2px surface gap between neighbours
  const snowVals = summit.map((h) => h.snowfallCm ?? 0);
  const rainVals = summit.map((h) => base.get(h.time)?.rainMm ?? 0);
  const snowMax = niceMax(Math.max(...snowVals), 1);
  const rainMax = niceMax(Math.max(...rainVals), 1);

  const temps = summit.map((h) => mid.get(h.time)?.tempC ?? null);
  const known = temps.filter((t): t is number => t !== null);
  const tempMin = known.length ? Math.floor(Math.min(...known, 0) - 1) : -5;
  const tempMax = known.length ? Math.ceil(Math.max(...known, 0) + 1) : 5;
  const ty = (t: number) => temp.top + ((tempMax - t) / (tempMax - tempMin)) * temp.h;

  const hours: HourMark[] = summit.map((h, i) => {
    const x = left + i * step + (step - barW) / 2;
    const s = snowVals[i] ?? 0;
    const r = rainVals[i] ?? 0;
    const snowBase = snow.top + snow.h;
    const rainBase = rain.top + rain.h;
    return {
      time: h.time,
      cx: left + i * step + step / 2,
      snowCm: s,
      rainMm: r,
      tempC: temps[i] ?? null,
      snowPath: s > 0 ? columnPath(x, barW, snowBase - Math.max(1.5, (s / snowMax) * snow.h), snowBase) : '',
      rainPath: r > 0 ? columnPath(x, barW, rainBase - Math.max(1.5, (Math.min(r, rainMax) / rainMax) * rain.h), rainBase) : '',
    };
  });

  let tempPath = '';
  let pen = false;
  hours.forEach((h) => {
    if (h.tempC === null) {
      pen = false;
      return;
    }
    tempPath += `${pen ? 'L' : 'M'}${h.cx.toFixed(1)} ${ty(h.tempC).toFixed(1)}`;
    pen = true;
  });

  // Label only the extremes (selective direct labels).
  const tempLabels: Next48Model['tempLabels'] = [];
  if (known.length) {
    const hi = Math.max(...known);
    const lo = Math.min(...known);
    const iHi = temps.indexOf(hi);
    const iLo = temps.indexOf(lo);
    // A label below its point only if it stays inside the panel (never on the time axis).
    const at = (i: number, v: number, wantBelow: boolean) => {
      const y = ty(v);
      return { x: hours[i]?.cx ?? 0, y, value: Math.round(v), below: wantBelow && y + 17 <= temp.top + temp.h - 2 };
    };
    tempLabels.push(at(iHi, hi, false));
    if (iLo !== iHi && Math.round(lo) !== Math.round(hi)) tempLabels.push(at(iLo, lo, true));
  }

  const ticks: Next48Model['ticks'] = [];
  const nightBands: Next48Model['nightBands'] = [];
  let bandStart: number | null = null;
  summit.forEach((h, i) => {
    const { hour } = jstParts(new Date(h.time));
    const x = left + i * step;
    if (hour % 6 === 0) ticks.push({ x: x + step / 2, hour, time: h.time, isMidnight: hour === 0 });
    const night = hour >= 18 || hour < 6;
    if (night && bandStart === null) bandStart = x;
    if (!night && bandStart !== null) {
      nightBands.push({ x: bandStart, w: x - bandStart });
      bandStart = null;
    }
  });
  if (bandStart !== null) nightBands.push({ x: bandStart, w: left + summit.length * step - bandStart });

  const peakIdx = snowVals.reduce((best, v, i) => (v > (snowVals[best] ?? 0) ? i : best), 0);
  const peakVal = snowVals[peakIdx] ?? 0;

  return {
    hours,
    snowMax,
    rainMax,
    tempMin,
    tempMax,
    tempPath,
    zeroY: tempMin < 0 && tempMax > 0 ? ty(0) : null,
    tempLabels,
    ticks,
    nightBands,
    totalSnowCm: round1(snowVals.reduce((a, b) => a + b, 0)),
    totalRainMm: round1(rainVals.reduce((a, b) => a + b, 0)),
    peak: peakVal >= 0.2 ? { time: summit[peakIdx]?.time ?? '', cm: round1(peakVal) } : null,
  };
}

// ---------------------------------------------------------------- 7 days

export const W7 = { width: 700, top: 34, base: 176, height: 182, barW: 24 } as const;

export interface DayColumn {
  date: string;
  cx: number;
  summitCm: number;
  path: string;
  /** Where the value label sits (above the cap). */
  labelY: number;
}

export function sevenDayColumns(days: { date: string; snowfallCm: number | null }[]): { cols: DayColumn[]; max: number } {
  const { width, top, base, barW } = W7;
  const max = niceMax(Math.max(0, ...days.map((d) => d.snowfallCm ?? 0)), 10);
  const slot = width / Math.max(1, days.length);
  const cols = days.map((d, i) => {
    const v = d.snowfallCm ?? 0;
    const cx = slot * i + slot / 2;
    const yTop = v > 0 ? base - Math.max(3, (v / max) * (base - top)) : base;
    return { date: d.date, cx, summitCm: v, path: v > 0 ? columnPath(cx - barW / 2, barW, yTop, base) : '', labelY: yTop - 8 };
  });
  return { cols, max };
}
