/**
 * Geometry for the hand-built 48-hour SVG chart. Pure: data in, coordinates out.
 * Snow (summit, cm/h) grows up from the baseline; rain (base, mm/h) hangs below it;
 * the mid-mountain temperature is a line, with 0 °C dashed.
 */
import { findPoint, hoursAhead } from '../../lib/data/forecast.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { jstParts } from '../../lib/time.ts';

export const CHART = {
  width: 720,
  height: 230,
  left: 8,
  right: 8,
  snowTop: 18,
  baseline: 150,
  rainBottom: 192,
  labelY: 218,
} as const;

export interface Bar {
  x: number;
  w: number;
  snowH: number;
  rainH: number;
  time: string;
  snowCm: number;
  rainMm: number;
}

export interface Next48Model {
  bars: Bar[];
  tempPath: string;
  zeroY: number | null;
  tempLabels: { x: number; y: number; text: number }[];
  ticks: { x: number; hour: number; time: string; isMidnight: boolean }[];
  nightBands: { x: number; w: number }[];
  snowScaleMax: number;
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

  const { width, left, right, snowTop, baseline, rainBottom } = CHART;
  const step = (width - left - right) / summit.length;
  const snowValues = summit.map((h) => h.snowfallCm ?? 0);
  const snowScaleMax = Math.max(1.5, ...snowValues);
  const rainScaleMax = 4;

  const bars: Bar[] = summit.map((h, i) => {
    const snowCm = h.snowfallCm ?? 0;
    const rainMm = base.get(h.time)?.rainMm ?? 0;
    return {
      x: left + i * step,
      w: Math.max(1, step - 2),
      snowH: (snowCm / snowScaleMax) * (baseline - snowTop),
      rainH: (Math.min(rainMm, rainScaleMax) / rainScaleMax) * (rainBottom - baseline - 6),
      time: h.time,
      snowCm,
      rainMm,
    };
  });

  // Temperature line (mid-mountain), scaled into the snow panel.
  const temps = summit.map((h) => mid.get(h.time)?.tempC ?? null);
  const known = temps.filter((t): t is number => t !== null);
  let tempPath = '';
  let zeroY: number | null = null;
  const tempLabels: Next48Model['tempLabels'] = [];
  if (known.length > 1) {
    const lo = Math.min(...known) - 2;
    const hi = Math.max(...known) + 2;
    const y = (t: number) => snowTop + 6 + ((hi - t) / (hi - lo)) * (baseline - snowTop - 14);
    tempPath = temps
      .map((t, i) => (t === null ? null : `${i === 0 ? 'M' : 'L'}${(left + i * step + step / 2).toFixed(1)} ${y(t).toFixed(1)}`))
      .filter(Boolean)
      .join(' ')
      .replace(/^L/, 'M');
    if (lo < 0 && hi > 0) zeroY = y(0);
    // Label the warmest and coldest points.
    const iMax = temps.indexOf(Math.max(...known));
    const iMin = temps.indexOf(Math.min(...known));
    for (const i of new Set([iMax, iMin])) {
      const t = temps[i];
      if (t !== null && t !== undefined) tempLabels.push({ x: left + i * step + step / 2, y: y(t), text: Math.round(t) });
    }
  }

  const ticks: Next48Model['ticks'] = [];
  const nightBands: Next48Model['nightBands'] = [];
  let bandStart: number | null = null;
  summit.forEach((h, i) => {
    const { hour } = jstParts(new Date(h.time));
    const x = left + i * step;
    if (hour % 6 === 0) ticks.push({ x, hour, time: h.time, isMidnight: hour === 0 });
    const night = hour >= 18 || hour < 6;
    if (night && bandStart === null) bandStart = x;
    if (!night && bandStart !== null) {
      nightBands.push({ x: bandStart, w: x - bandStart });
      bandStart = null;
    }
  });
  if (bandStart !== null) nightBands.push({ x: bandStart, w: left + summit.length * step - bandStart });

  const peakBar = bars.reduce<Bar | null>((best, b) => (b.snowCm > (best?.snowCm ?? 0) ? b : best), null);

  return {
    bars,
    tempPath,
    zeroY,
    tempLabels,
    ticks,
    nightBands,
    snowScaleMax: round1(snowScaleMax),
    totalSnowCm: round1(snowValues.reduce((a, b) => a + b, 0)),
    totalRainMm: round1(bars.reduce((a, b) => a + b.rainMm, 0)),
    peak: peakBar && peakBar.snowCm >= 0.2 ? { time: peakBar.time, cm: round1(peakBar.snowCm) } : null,
  };
}
