/**
 * The normalized contract between the Worker (data jobs) and the UI.
 * Raw JMA / Open-Meteo shapes never leave `src/lib/data/providers/`.
 * Stored as JSON in KV under `conditions:<locationId>`.
 */

import type { ForecastPointId } from '../../config/locations.ts';

/** A single measured value. `ok` is false when the source flagged it as unreliable or missing. */
export interface Reading<T> {
  value: T | null;
  ok: boolean;
}

/** Observed at the town station (JMA AMeDAS). Never present these as mountain values. */
export interface ObservedConditions {
  source: 'jma-amedas';
  stationId: string;
  /** ISO timestamp with +09:00 offset, of the latest row used. */
  observedAt: string;
  /** Snow on the ground, cm. Not measured outside the snow season. */
  snowDepthCm: Reading<number>;
  /** New snowfall over the trailing window, cm. */
  newSnow: { h1: Reading<number>; h6: Reading<number>; h12: Reading<number>; h24: Reading<number> };
  tempC: Reading<number>;
  windMs: Reading<number>;
  /** Degrees the wind blows FROM (0 = N). `null` with ok=true means calm. */
  windDirDeg: Reading<number>;
  /** Today's (JST) max gust so far. */
  gustMs: Reading<number>;
  precip1hMm: Reading<number>;
  precip24hMm: Reading<number>;
}

export interface ForecastHour {
  /** ISO with +09:00, start of the hour. */
  time: string;
  snowfallCm: number | null;
  rainMm: number | null;
  precipMm: number | null;
  tempC: number | null;
  windMs: number | null;
  windDirDeg: number | null;
  gustMs: number | null;
  freezingLevelM: number | null;
  weatherCode: number | null;
}

export interface ForecastDay {
  /** JST calendar date, "2026-10-22". */
  date: string;
  snowfallCm: number | null;
  rainMm: number | null;
  precipMm: number | null;
  tMaxC: number | null;
  tMinC: number | null;
  windMaxMs: number | null;
  gustMaxMs: number | null;
  weatherCode: number | null;
}

export interface ForecastPointData {
  id: ForecastPointId;
  elevationM: number;
  /** Centre of the model grid cell actually used. */
  gridLat: number;
  gridLon: number;
  /** Modelled snowfall over the last 24 h / next 24 h, cm. */
  past24hSnowfallCm: number;
  next24hSnowfallCm: number;
  /** Today + 6 days. */
  daily: ForecastDay[];
  /** From 24 h ago to 48 h ahead. */
  hourly: ForecastHour[];
}

export interface ForecastConditions {
  source: 'open-meteo';
  /** Human-readable model description, shown on /about. */
  model: string;
  fetchedAt: string;
  points: ForecastPointData[];
}

export type PowderVerdict = 'epic' | 'good' | 'some' | 'none';

export type PowderReasonCode =
  | 'fresh-town'
  | 'fresh-mountain'
  | 'more-coming'
  | 'cold-light'
  | 'warm-heavy'
  | 'windy'
  | 'wind-holds'
  | 'rain-base'
  | 'rain-town'
  | 'stale-observation'
  | 'no-observation'
  | 'no-forecast';

export interface PowderReason {
  code: PowderReasonCode;
  /** Positive = helped the score, negative = hurt it, 0 = information only. */
  points: number;
  params?: Record<string, number>;
}

export interface PowderResult {
  score: number;
  verdict: PowderVerdict;
  /** Best estimate of fresh snow in the last 24 h, cm (max of town measurement and mountain model). */
  freshCm: number;
  freshSource: 'town' | 'mountain' | 'none';
  /** Mountain model, next 24 h, cm. */
  next24hCm: number;
  /** Snow depth isn't being measured in town yet (or any more). */
  preSeason: boolean;
  reasons: PowderReason[];
  /** First day from today with a big snowfall on the mountain. */
  nextBigSnow: { date: string; snowfallCm: number } | null;
}

export interface SourceStatus {
  ok: boolean;
  /** Last successful fetch (ISO). */
  lastSuccessAt: string | null;
  lastError?: string;
}

export interface Conditions {
  locationId: string;
  /** ISO timestamp of when the Worker built this object. */
  generatedAt: string;
  observed: ObservedConditions | null;
  forecast: ForecastConditions | null;
  powder: PowderResult;
  sources: { jma: SourceStatus; openMeteo: SourceStatus };
}
