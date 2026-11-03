/**
 * What the snowfall animation should look like, from the data. Pure.
 * The canvas script only reads the numbers this produces (via data attributes).
 */
import type { Conditions } from '../../lib/data/types.ts';
import { findPoint, nearestHour } from '../../lib/data/forecast.ts';

export interface SnowfallParams {
  /** Snowfall rate now, cm/h (summit model, or the town gauge if it's snowing there). */
  rateCmH: number;
  /** Rain at the base now, mm/h (model, or the town gauge when it's above freezing). */
  rainMmH: number;
  /** Wind speed m/s and the direction it blows FROM (degrees). */
  windMs: number;
  windFromDeg: number;
  tempC: number;
  /** Heaviest hour in the next 48 h, for the "preview" button. */
  preview: { rateCmH: number; time: string } | null;
}

export function snowfallParams(c: Conditions | null, now: Date): SnowfallParams {
  const summit = findPoint(c, 'summit');
  const mid = findPoint(c, 'mid') ?? summit;
  const sHour = nearestHour(summit, now);
  const mHour = nearestHour(mid, now);

  const obs = c?.observed;
  const townRate = obs?.newSnow.h1.ok ? (obs.newSnow.h1.value ?? 0) : 0;
  const bHour = nearestHour(findPoint(c, 'base'), now);
  const townWarm = obs?.tempC.ok && (obs.tempC.value ?? 0) > 1.5;
  const townRain = townWarm && obs?.precip1hMm.ok ? (obs.precip1hMm.value ?? 0) : 0;

  let preview: SnowfallParams['preview'] = null;
  for (const h of summit?.hourly ?? []) {
    const t = new Date(h.time).getTime();
    if (t <= now.getTime() || t > now.getTime() + 48 * 3600_000) continue;
    if ((h.snowfallCm ?? 0) >= 0.3 && (h.snowfallCm ?? 0) > (preview?.rateCmH ?? 0)) {
      preview = { rateCmH: h.snowfallCm ?? 0, time: h.time };
    }
  }

  return {
    rateCmH: Math.max(sHour?.snowfallCm ?? 0, townRate),
    rainMmH: Math.max(bHour?.rainMm ?? 0, townRain),
    windMs: mHour?.windMs ?? 0,
    windFromDeg: mHour?.windDirDeg ?? 270,
    tempC: mHour?.tempC ?? -5,
    preview,
  };
}

/** How many flakes for a rate: light snow still visible, heavy dumps capped for performance. */
export function flakeCount(rateCmH: number, maxFlakes = 420): number {
  if (rateCmH <= 0.05) return 0;
  return Math.min(maxFlakes, Math.round(40 + rateCmH * 110));
}

/** How many rain streaks for a rate (mm/h): drizzle reads as drizzle, a downpour is capped. */
export function dropCount(rainMmH: number, maxDrops = 260): number {
  if (rainMmH < 0.1) return 0;
  return Math.min(maxDrops, Math.round(50 + rainMmH * 70));
}
