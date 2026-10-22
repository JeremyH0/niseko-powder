/**
 * The powder score: 0–100 plus a verdict and the reasons behind it.
 * Pure function of observed + forecast data and the thresholds in src/config/powder.ts.
 */
import { powderConfig, type PowderConfig } from '../../config/powder.ts';
import { nearestHour } from '../data/forecast.ts';
import type { ForecastConditions, ForecastPointData, ObservedConditions, PowderReason, PowderResult } from '../data/types.ts';
import { HOUR_MS, jstDate, minutesBetween } from '../time.ts';

export interface PowderInput {
  observed: ObservedConditions | null;
  forecast: ForecastConditions | null;
  now: Date;
  config?: PowderConfig;
}

function interpolate(steps: readonly (readonly [number, number])[], x: number): number {
  const first = steps[0];
  const last = steps.at(-1);
  if (!first || !last) return 0;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < steps.length; i++) {
    const [x1, y1] = steps[i] as readonly [number, number];
    const [x0, y0] = steps[i - 1] as readonly [number, number];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return last[1];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function windowMax(point: ForecastPointData | undefined, now: Date, hours: number, key: 'windMs' | 'gustMs'): number | null {
  if (!point) return null;
  const from = now.getTime();
  const to = from + hours * HOUR_MS;
  let max: number | null = null;
  for (const h of point.hourly) {
    const t = new Date(h.time).getTime();
    const v = h[key];
    if (t >= from && t <= to && v !== null) max = Math.max(max ?? v, v);
  }
  return max;
}

export function computePowder({ observed, forecast, now, config = powderConfig }: PowderInput): PowderResult {
  const reasons: PowderReason[] = [];
  const point = (id: string) => forecast?.points.find((p) => p.id === id);
  const summit = point('summit');
  const mid = point('mid') ?? summit;
  const base = point('base');

  // --- Observation (town)
  const obsAge = observed ? minutesBetween(observed.observedAt, now) : Infinity;
  const obsUsable = observed !== null && obsAge <= config.staleAfterMinutes;
  if (!observed) reasons.push({ code: 'no-observation', points: 0 });
  else if (!obsUsable) reasons.push({ code: 'stale-observation', points: 0, params: { minutes: Math.round(obsAge) } });

  const preSeason = observed !== null && !observed.snowDepthCm.ok;
  if (preSeason) reasons.push({ code: 'pre-season', points: 0 });

  const townCm = obsUsable && observed.newSnow.h24.ok ? (observed.newSnow.h24.value ?? 0) : 0;
  const mountainCm = mid?.past24hSnowfallCm ?? 0;
  if (!forecast) reasons.push({ code: 'no-forecast', points: 0 });

  // --- Fresh snow: the larger of what town measured and what the model says fell up the hill.
  const freshCm = round1(Math.max(townCm, mountainCm));
  const freshSource: PowderResult['freshSource'] = freshCm <= 0 ? 'none' : townCm >= mountainCm ? 'town' : 'mountain';
  let score = interpolate(config.freshSnowSteps, freshCm);
  if (townCm > 0) reasons.push({ code: 'fresh-town', points: 0, params: { cm: round1(townCm) } });
  if (mountainCm > 0) reasons.push({ code: 'fresh-mountain', points: 0, params: { cm: round1(mountainCm) } });

  // --- More snow coming
  const next24hCm = round1(Math.max(summit?.next24hSnowfallCm ?? 0, mid?.next24hSnowfallCm ?? 0));
  if (next24hCm >= 1) {
    const pts = Math.min(config.upcoming.maxPoints, next24hCm * config.upcoming.pointsPerCm);
    score += pts;
    reasons.push({ code: 'more-coming', points: Math.round(pts), params: { cm: next24hCm } });
  }

  // --- Snow quality from mid-mountain temperature
  const midTemp = nearestHour(mid, now)?.tempC ?? null;
  if (midTemp !== null && freshCm > 0) {
    if (midTemp <= config.coldBelowC) {
      score += config.coldPoints;
      reasons.push({ code: 'cold-light', points: config.coldPoints, params: { tempC: round1(midTemp) } });
    } else if (midTemp >= config.warmAboveC) {
      score += config.warmPoints;
      reasons.push({ code: 'warm-heavy', points: config.warmPoints, params: { tempC: round1(midTemp) } });
    }
  }

  // --- Wind (lift holds / wind-affected snow)
  const wind = windowMax(mid, now, 6, 'windMs');
  const gust = windowMax(summit, now, 6, 'gustMs');
  if ((wind !== null && wind >= config.holdsMs) || (gust !== null && gust >= config.holdsGustMs)) {
    score += config.holdsPoints;
    reasons.push({ code: 'wind-holds', points: config.holdsPoints, params: { ms: round1(Math.max(wind ?? 0, gust ?? 0)) } });
  } else if (wind !== null && wind >= config.breezyMs) {
    score += config.breezyPoints;
    reasons.push({ code: 'windy', points: config.breezyPoints, params: { ms: round1(wind) } });
  }

  // --- Rain
  const baseRain = base?.hourly
    .filter((h) => {
      const t = new Date(h.time).getTime();
      return t > now.getTime() - 24 * HOUR_MS && t <= now.getTime();
    })
    .reduce((a, h) => a + (h.rainMm ?? 0), 0);
  if (baseRain !== undefined && baseRain >= config.rainBaseMm) {
    score += config.rainBasePoints;
    reasons.push({ code: 'rain-base', points: config.rainBasePoints, params: { mm: round1(baseRain) } });
  }
  if (
    obsUsable &&
    observed.precip24hMm.ok &&
    (observed.precip24hMm.value ?? 0) > 0 &&
    observed.tempC.ok &&
    (observed.tempC.value ?? 0) >= config.rainTownAboveC &&
    townCm === 0
  ) {
    reasons.push({ code: 'rain-town', points: 0, params: { mm: round1(observed.precip24hMm.value ?? 0) } });
  }

  // No fresh snow means no powder, whatever the bonuses say.
  if (freshCm < 1) score = Math.min(score, config.verdicts.some - 1);
  score = Math.round(Math.min(100, Math.max(0, score)));
  const v = config.verdicts;
  const verdict = score >= v.epic ? 'epic' : score >= v.good ? 'good' : score >= v.some ? 'some' : 'none';

  // Forward-looking: the next 24 h first, then whole days after today (today's total may
  // already have fallen).
  const today = jstDate(now);
  const nextBig: { date: string; snowfallCm: number | null } | undefined =
    summit && summit.next24hSnowfallCm >= config.bigSnowCm
      ? { date: today, snowfallCm: summit.next24hSnowfallCm }
      : summit?.daily.find((d) => d.date > today && (d.snowfallCm ?? 0) >= config.bigSnowCm);

  return {
    score,
    verdict,
    freshCm,
    freshSource,
    next24hCm,
    preSeason,
    reasons,
    nextBigSnow: nextBig ? { date: nextBig.date, snowfallCm: round1(nextBig.snowfallCm ?? 0) } : null,
  };
}
