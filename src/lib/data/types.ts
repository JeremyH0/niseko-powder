/**
 * The normalized contract between the Worker (data jobs) and the UI.
 * Raw JMA / Open-Meteo shapes never leave `src/lib/data/providers/`.
 *
 * DRAFT from docs/DATA_SOURCES.md — finalised in Phase 1.
 */

import type { ForecastPointId } from '../../config/locations.ts';

/** A single measured value. `ok` is false when the source flagged it as unreliable or missing. */
export interface Reading<T> {
  value: T | null;
  ok: boolean;
}

export interface ObservedConditions {
  source: 'jma-amedas';
  stationId: string;
  /** ISO timestamp with +09:00 offset, of the latest row used. */
  observedAt: string;
  /** `observedAt` older than `site.staleAfterMinutes`. */
  isStale: boolean;
  snowDepthCm: Reading<number>;
  newSnow: { h1: Reading<number>; h6: Reading<number>; h12: Reading<number>; h24: Reading<number> };
  tempC: Reading<number>;
  windMs: Reading<number>;
  windDirDeg: Reading<number>;
  gustMs: Reading<number>;
}

export interface ForecastDay {
  date: string;
  snowfallCm: number;
  tMaxC: number;
  tMinC: number;
  windMaxMs: number;
}

export interface ForecastHour {
  time: string;
  snowfallCm: number;
  tempC: number;
  windMs: number;
}

export interface ForecastConditions {
  source: 'open-meteo';
  fetchedAt: string;
  points: Array<{
    id: ForecastPointId;
    elevationM: number;
    daily: ForecastDay[];
    hourlyNext48h: ForecastHour[];
  }>;
}

export type PowderVerdict = 'epic' | 'good' | 'some' | 'none';

export interface Conditions {
  locationId: string;
  /** ISO timestamp of when the Worker built this object. */
  generatedAt: string;
  observed: ObservedConditions;
  forecast: ForecastConditions;
  powder: { score: number; verdict: PowderVerdict; headline: string; reasons: string[] };
}
