/** Display formatting. All times in JST, metric units, real minus signs. */

const MINUS = '−';

function tz(style: Intl.DateTimeFormatOptions, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Tokyo', ...style });
}

const clock = tz({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const weekdayShort = tz({ weekday: 'short' });
const weekdayLong = tz({ weekday: 'long' });
const dayMonth = tz({ day: 'numeric', month: 'short' });
const fullDate = tz({ weekday: 'short', day: 'numeric', month: 'short' });
const hourOnly = tz({ hour: '2-digit', hourCycle: 'h23' });

/** "15:40" */
export const formatClock = (d: Date | string) => clock.format(new Date(d));
/** "Thu 22 Oct" */
export const formatFullDate = (d: Date | string) => fullDate.format(new Date(d)).replace(',', '');
/** "22 Oct" */
export const formatDayMonth = (d: Date | string) => dayMonth.format(new Date(d));
/** "Thu" */
export const formatWeekday = (d: Date | string) => weekdayShort.format(new Date(d));
/** "Thursday" */
export const formatWeekdayLong = (d: Date | string) => weekdayLong.format(new Date(d));
/** "06" (JST hour) */
export const formatHour = (d: Date | string) => hourOnly.format(new Date(d));

/** A JST calendar date string ("2026-10-22") as a Date at JST noon (safe for weekday formatting). */
export const dateFromJstDay = (day: string) => new Date(`${day}T12:00:00+09:00`);

const signed = (n: number) => (n < 0 ? `${MINUS}${Math.abs(n)}` : String(n));

/** "−4°" / "12°" — whole degrees. */
export function formatTemp(c: number | null | undefined): string {
  if (c === null || c === undefined) return '—';
  const r = Math.round(c);
  return `${signed(r === 0 ? 0 : r)}°`;
}

/** Snow in cm: 0 → "0", <1 → "<1", <10 → one decimal dropped when whole, else whole. */
export function formatCm(cm: number | null | undefined): string {
  if (cm === null || cm === undefined) return '—';
  if (cm <= 0) return '0';
  if (cm < 1) return '<1';
  return String(Math.round(cm));
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined) return '—';
  return signed(Number(n.toFixed(digits)));
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

/** Degrees the wind blows FROM → "NW". */
export function compass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined) return '';
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16] as string;
}

/** Minutes → "12 min" / "3 h" / "2 days". */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))} min`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h`;
  return `${Math.round(minutes / 1440)} days`;
}
