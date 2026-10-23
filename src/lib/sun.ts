/**
 * Sunrise and sunset from the standard sunrise equation (NOAA/Meeus simplification),
 * accurate to about a minute at Niseko's latitude. Pure; no network.
 */

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const DAY_MS = 86_400_000;

const toJulian = (ms: number) => ms / DAY_MS + 2440587.5;
const fromJulian = (jd: number) => new Date((jd - 2440587.5) * DAY_MS);

export interface SunTimes {
  sunrise: Date;
  sunset: Date;
  /** Daylight length in minutes. */
  dayLengthMin: number;
}

/**
 * @param date JST calendar date "2026-12-21"
 * @param lat degrees north, @param lon degrees east
 */
export function sunTimes(date: string, lat: number, lon: number): SunTimes {
  // Solar noon of that local date is what we solve around: start from JST noon.
  const noon = Date.parse(`${date}T12:00:00+09:00`);
  const n = Math.round(toJulian(noon) - J2000 + 0.0008);
  const jStar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = J2000 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  // −0.833° = refraction + the sun's radius: the moment the top edge touches the horizon.
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  const h = (Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD) / 360;
  const sunrise = fromJulian(transit - h);
  const sunset = fromJulian(transit + h);
  return { sunrise, sunset, dayLengthMin: Math.round((sunset.getTime() - sunrise.getTime()) / 60_000) };
}
