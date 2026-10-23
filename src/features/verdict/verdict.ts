/**
 * Turns `Conditions` into what the hero shows: the big word, the headline, and the
 * atmosphere (sky phase, weather, snowcap). Pure, so every case is unit-tested.
 */
import { findPoint, nearestHour } from '../../lib/data/forecast.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { DEFAULT_LOCATION_ID, LOCATIONS, type LocationId } from '../../config/locations.ts';
import { sunTimes } from '../../lib/sun.ts';
import { jstDate } from '../../lib/time.ts';

export type VerdictWord = 'epic' | 'good' | 'some' | 'nope' | 'soon' | 'unknown';
export type HeadlineKey =
  | 'fresh'
  | 'freshMountain'
  | 'some'
  | 'summitSnow'
  | 'snowingNow'
  | 'noneNext'
  | 'none'
  | 'noData';

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';
export type WeatherState = 'snow' | 'rain' | 'cloud' | 'clear';

export interface HeroModel {
  word: VerdictWord;
  headline: HeadlineKey;
  /** Raw values for the headline; the component formats them. */
  cm: number;
  nextDay: string | null;
  sky: SkyPhase;
  /** ISO times for today at the location. */
  sunrise: string;
  sunset: string;
  weather: WeatherState;
  snowcap: boolean;
}

const point = (c: Conditions | null, id: string) => findPoint(c, id);

/** Sky palette from the real sunrise/sunset at the location (twilight ≈ 40–50 min either side). */
export function skyPhase(now: Date, lat: number, lon: number): SkyPhase {
  const { sunrise, sunset } = sunTimes(jstDate(now), lat, lon);
  const t = now.getTime();
  const min = 60_000;
  if (t >= sunrise.getTime() - 40 * min && t < sunrise.getTime() + 50 * min) return 'dawn';
  if (t >= sunset.getTime() - 50 * min && t < sunset.getTime() + 40 * min) return 'dusk';
  if (t > sunrise.getTime() && t < sunset.getTime()) return 'day';
  return 'night';
}

/** WMO weather code at mid-mountain now, nudged by what the town station measures. */
export function weatherState(c: Conditions | null, now: Date): WeatherState {
  const hour = nearestHour(point(c, 'mid') ?? point(c, 'summit'), now);
  const summitHour = nearestHour(point(c, 'summit'), now);
  if ((summitHour?.snowfallCm ?? 0) >= 0.2 || (hour?.snowfallCm ?? 0) >= 0.1) return 'snow';
  const code = hour?.weatherCode ?? null;
  if (code !== null) {
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
    if (code >= 2) return 'cloud';
    return 'clear';
  }
  const obs = c?.observed;
  if (obs?.precip1hMm.ok && (obs.precip1hMm.value ?? 0) > 0) return (obs.tempC.value ?? 0) > 1 ? 'rain' : 'snow';
  return 'cloud';
}

export function heroModel(c: Conditions | null, now: Date): HeroModel {
  const loc = LOCATIONS[(c?.locationId as LocationId) ?? DEFAULT_LOCATION_ID] ?? LOCATIONS[DEFAULT_LOCATION_ID];
  const { lat, lon } = loc.station;
  const sky = skyPhase(now, lat, lon);
  const sun = sunTimes(jstDate(now), lat, lon);
  const weather = weatherState(c, now);
  const summit = point(c, 'summit');
  const summitFresh = summit?.past24hSnowfallCm ?? 0;
  const summitTodayMin = summit?.daily[0]?.tMinC ?? null;

  const p = c?.powder;
  const preSeason = p?.preSeason ?? false;
  // Early season: show a cap once the summit has had snow and it's cold enough up there to stay.
  const snowcap = !preSeason || summitFresh >= 1 || (summitTodayMin !== null && summitTodayMin <= 0);
  const next = p?.nextBigSnow ?? null;
  const base = {
    sky,
    sunrise: sun.sunrise.toISOString(),
    sunset: sun.sunset.toISOString(),
    weather,
    snowcap,
    nextDay: next?.date ?? null,
  };

  if (!c || !p || (!c.observed && !c.forecast)) {
    return { ...base, word: 'unknown', headline: 'noData', cm: 0 };
  }
  if (p.verdict === 'epic' || p.verdict === 'good') {
    return { ...base, word: p.verdict, headline: p.freshSource === 'mountain' ? 'freshMountain' : 'fresh', cm: p.freshCm };
  }
  if (p.verdict === 'some') return { ...base, word: 'some', headline: 'some', cm: p.freshCm };

  if (weather === 'snow' && p.next24hCm >= 1) {
    return { ...base, word: 'soon', headline: 'snowingNow', cm: p.next24hCm };
  }
  // Not a powder day, but the summit caught something worth mentioning.
  if (summitFresh >= 5) return { ...base, word: 'nope', headline: 'summitSnow', cm: summitFresh };
  if (next) return { ...base, word: 'nope', headline: 'noneNext', cm: next.snowfallCm };
  return { ...base, word: 'nope', headline: 'none', cm: 0 };
}
