/**
 * Merge fresh provider results with the previous stored `Conditions`.
 * A failed source never replaces good data: we keep its last good value and record the error.
 */
import { computePowder } from '../powder/score.ts';
import type { Conditions, ForecastConditions, ObservedConditions, SourceStatus } from './types.ts';

export type SourceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface BuildInput {
  locationId: string;
  now: Date;
  observed: SourceResult<ObservedConditions>;
  forecast: SourceResult<ForecastConditions>;
  previous: Conditions | null;
}

function pick<T>(
  result: SourceResult<T>,
  previousValue: T | null,
  previousStatus: SourceStatus | undefined,
  nowIso: string,
): { value: T | null; status: SourceStatus } {
  if (result.ok) return { value: result.value, status: { ok: true, lastSuccessAt: nowIso } };
  return {
    value: previousValue,
    status: { ok: false, lastSuccessAt: previousStatus?.lastSuccessAt ?? null, lastError: result.error },
  };
}

export function buildConditions({ locationId, now, observed, forecast, previous }: BuildInput): Conditions {
  const nowIso = now.toISOString();
  const obs = pick(observed, previous?.observed ?? null, previous?.sources.jma, nowIso);
  const fc = pick(forecast, previous?.forecast ?? null, previous?.sources.openMeteo, nowIso);
  return {
    locationId,
    generatedAt: nowIso,
    observed: obs.value,
    forecast: fc.value,
    powder: computePowder({ observed: obs.value, forecast: fc.value, now }),
    sources: { jma: obs.status, openMeteo: fc.status },
  };
}
