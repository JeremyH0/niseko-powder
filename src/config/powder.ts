/**
 * Powder score thresholds. A transparent heuristic, not an official forecast —
 * tune these after a few weeks of real winter data. Explained on /about.
 */
import { site } from './site.ts';

export const powderConfig = {
  /** Fresh snow (cm, last 24 h) → points, linear between the steps. */
  freshSnowSteps: [
    [0, 0],
    [3, 10],
    [10, 40],
    [20, 65],
    [30, 80],
    [50, 95],
  ] as const satisfies readonly (readonly [number, number])[],
  /** More snow forecast on the mountain in the next 24 h: points per cm, capped. */
  upcoming: { pointsPerCm: 1, maxPoints: 15 },
  /** Mid-mountain temperature now (°C): cold = light and dry, warm = heavy and wet. */
  coldBelowC: -8,
  coldPoints: 5,
  warmAboveC: 0.5,
  warmPoints: -15,
  /** Mid-mountain wind over the next 6 h (m/s). Gusts at the summit also count for holds. */
  breezyMs: 10,
  breezyPoints: -8,
  holdsMs: 15,
  holdsGustMs: 22,
  holdsPoints: -20,
  /** Rain at the base over the last 24 h (mm). */
  rainBaseMm: 2,
  rainBasePoints: -10,
  /** Rain in town: precipitation in the last 24 h while the town is above this temperature. */
  rainTownAboveC: 1.5,
  /** Score → verdict. */
  verdicts: { epic: 75, good: 50, some: 25 },
  /** A "big snow" day for the next-snow callout (daily total at the summit, cm). */
  bigSnowCm: 10,
  /** Observations older than this are ignored by the score (and shown as delayed). */
  staleAfterMinutes: site.staleAfterMinutes,
} as const;

export type PowderConfig = typeof powderConfig;
