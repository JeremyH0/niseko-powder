/**
 * JST (Asia/Tokyo, UTC+9, no DST) helpers. Everything we show is in JST, and both
 * sources speak JST, so we do the arithmetic with a fixed offset instead of Intl.
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

export interface JstParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function jstParts(date: Date): JstParts {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

/** "2026-10-22" (JST calendar date). */
export function jstDate(date: Date): string {
  const p = jstParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "2026-10-22T15:20:00+09:00" */
export function jstIso(date: Date): string {
  const p = jstParts(date);
  return `${jstDate(date)}T${pad(p.hour)}:${pad(p.minute)}:00+09:00`;
}

/** JMA row key "20261022152000" (JST) → ISO with offset. */
export function jmaKeyToIso(key: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(key);
  if (!m) throw new Error(`Bad JMA key: ${key}`);
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`;
}

/** Open-Meteo local time "2026-10-22T15:00" (timezone=Asia/Tokyo) → ISO with offset. */
export function openMeteoTimeToIso(local: string): string {
  return `${local}:00+09:00`;
}

/** The JMA point-file name ("20261022_15") for the 3-hour JST block containing `date`. */
export function jmaBlockName(date: Date): string {
  const p = jstParts(date);
  return `${p.year}${pad(p.month)}${pad(p.day)}_${pad(Math.floor(p.hour / 3) * 3)}`;
}

export function minutesBetween(fromIso: string, to: Date): number {
  return (to.getTime() - new Date(fromIso).getTime()) / 60_000;
}

export const HOUR_MS = 60 * 60 * 1000;
