/** The one-sentence season summary, shared by the page and the homepage teaser. */
import { createTranslator, DEFAULT_LOCALE, type Locale } from '../../i18n/index.ts';
import { formatDayMonth } from '../../lib/format.ts';
import type { SeasonSummary } from './summary.ts';
import { seasonStrings } from './strings.ts';

export function seasonSentences(s: SeasonSummary, locale: Locale = DEFAULT_LOCALE): string[] {
  const t = createTranslator(seasonStrings, locale);
  if (!s.focus || !s.focusStats) return [t('summary.empty')];
  if (s.focus === s.current && s.inSeason) {
    const out = [t('summary.inSeason', { total: s.totalToDate, pct: s.pctOfAverage ?? '—' })];
    if (s.depthNow !== null && s.lastDate) {
      out.push(
        t('summary.depth', {
          date: formatDayMonth(`${s.lastDate}T12:00:00+09:00`),
          depth: Math.round(s.depthNow),
          avg: Math.round(s.avgDepthNow ?? 0),
        }),
      );
    }
    return out;
  }
  return [
    t('summary.offSeason', {
      next: s.current,
      last: s.focus,
      total: s.focusStats.totalSnowfallCm,
      pct: s.pctOfAverage ?? '—',
      n: s.reference.length,
    }),
  ];
}
