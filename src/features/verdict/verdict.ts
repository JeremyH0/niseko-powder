/**
 * Turns `Conditions` into what the hero shows: the big word, the headline, and the
 * atmosphere (sky phase, weather, snowcap). Pure, so every case is unit-tested.
 */
import { findPoint, nearestHour } from '../../lib/data/forecast.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { jstParts } from '../../lib/time.ts';

export type VerdictWord = 'epic' | 'good' | 'some' | 'nope' | 'notYet' | 'soon' | 'unknown';
export type HeadlineKey =
  | 'fresh'
  | 'freshMountain'
  | 'some'
  | 'firstSnowSummit'
  | 'preseason'
  | 'preseasonNext'
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
  weather: WeatherState;
  snowcap: boolean;
}

const point = (c: Conditions | null, id: string) => findPoint(c, id);

/** Rough Niseko daylight in JST (good enough for a palette; sunrise varies ~1 h over the season). */
export function skyPhase(now: Date): SkyPhase {
  const { hour } = jstParts(now);
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 16) return 'day';
  if (hour >= 16 && hour < 18) return 'dusk';
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
  const sky = skyPhase(now);
  const weather = weatherState(c, now);
  const summit = point(c, 'summit');
  const summitFresh = summit?.past24hSnowfallCm ?? 0;
  const summitTodayMax = summit?.daily[0]?.tMaxC ?? null;

  const p = c?.powder;
  const preSeason = p?.preSeason ?? false;
  const snowcap = !preSeason || summitFresh >= 1 || (summitTodayMax !== null && summitTodayMax <= 0);
  const next = p?.nextBigSnow ?? null;
  const base = { sky, weather, snowcap, nextDay: next?.date ?? null };

  if (!c || !p || (!c.observed && !c.forecast)) {
    return { ...base, word: 'unknown', headline: 'noData', cm: 0 };
  }
  if (p.verdict === 'epic' || p.verdict === 'good') {
    return { ...base, word: p.verdict, headline: p.freshSource === 'mountain' ? 'freshMountain' : 'fresh', cm: p.freshCm };
  }
  if (p.verdict === 'some') return { ...base, word: 'some', headline: 'some', cm: p.freshCm };

  if (preSeason) {
    if (summitFresh >= 5) return { ...base, word: 'notYet', headline: 'firstSnowSummit', cm: summitFresh };
    if (next) return { ...base, word: 'notYet', headline: 'preseasonNext', cm: next.snowfallCm };
    return { ...base, word: 'notYet', headline: 'preseason', cm: 0 };
  }
  if (weather === 'snow' && p.next24hCm >= 1) {
    return { ...base, word: 'soon', headline: 'snowingNow', cm: p.next24hCm };
  }
  if (next) return { ...base, word: 'nope', headline: 'noneNext', cm: next.snowfallCm };
  return { ...base, word: 'nope', headline: 'none', cm: 0 };
}
