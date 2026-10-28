/**
 * What the live ticker says: short label/value pairs read straight from Conditions.
 * Pure. Readings that are missing or flagged by JMA are left out, never shown as zero.
 */
import { findPoint, nearestHour } from '../../lib/data/forecast.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { compass, dateFromJstDay, formatCm, formatNumber, formatTemp, formatWeekday } from '../../lib/format.ts';

export type TickerKey = 'score' | 'fresh' | 'next24' | 'summitTemp' | 'freezing' | 'wind' | 'townTemp' | 'townDepth' | 'bigSnow';

export interface TickerItem {
  /** Also names the label message (`item.<key>`), translated by the component. */
  key: TickerKey;
  value: string;
}

export function tickerItems(c: Conditions | null, now: Date): TickerItem[] {
  if (!c) return [];
  const items: TickerItem[] = [];
  const push = (key: TickerKey, value: string | null) => {
    if (value !== null) items.push({ key, value });
  };
  const p = c.powder;
  const summit = nearestHour(findPoint(c, 'summit'), now);
  const mid = nearestHour(findPoint(c, 'mid'), now);
  const obs = c.observed;

  push('score', `${p.score}/100`);
  push('fresh', `${formatCm(p.freshCm)} cm`);
  push('next24', `${p.next24hCm >= 0.5 ? '+' : ''}${formatCm(p.next24hCm)} cm`);
  push('summitTemp', summit?.tempC != null ? `${formatTemp(summit.tempC)}C` : null);
  push('freezing', summit?.freezingLevelM != null ? `${formatNumber(Math.round(summit.freezingLevelM / 50) * 50)} m` : null);
  push(
    'wind',
    mid?.windMs != null ? `${formatNumber(mid.windMs)} m/s${mid.windDirDeg != null ? ` ${compass(mid.windDirDeg)}` : ''}` : null,
  );
  push('townTemp', obs?.tempC.ok ? `${formatTemp(obs.tempC.value)}C` : null);
  push('townDepth', obs?.snowDepthCm.ok ? `${formatCm(obs.snowDepthCm.value)} cm` : null);
  push(
    'bigSnow',
    p.nextBigSnow ? `${formatWeekday(dateFromJstDay(p.nextBigSnow.date))} · ~${formatCm(p.nextBigSnow.snowfallCm)} cm` : null,
  );
  return items;
}
