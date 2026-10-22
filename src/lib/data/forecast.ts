/** Small shared helpers for reading `ForecastConditions`. */
import type { Conditions, ForecastHour, ForecastPointData } from './types.ts';

export function findPoint(c: Conditions | null | undefined, id: string): ForecastPointData | undefined {
  return c?.forecast?.points.find((p) => p.id === id);
}

/** The forecast hour closest to `now` — the model's "current conditions". */
export function nearestHour(p: ForecastPointData | undefined, now: Date): ForecastHour | undefined {
  if (!p) return undefined;
  let best: ForecastHour | undefined;
  let bestDiff = Infinity;
  for (const h of p.hourly) {
    const diff = Math.abs(new Date(h.time).getTime() - now.getTime());
    if (diff < bestDiff) {
      best = h;
      bestDiff = diff;
    }
  }
  return best;
}

/** Hours strictly after `now` and up to `hours` ahead. */
export function hoursAhead(p: ForecastPointData | undefined, now: Date, hours: number): ForecastHour[] {
  if (!p) return [];
  const from = now.getTime();
  const to = from + hours * 3600_000;
  return p.hourly.filter((h) => {
    const t = new Date(h.time).getTime();
    return t > from && t <= to;
  });
}
