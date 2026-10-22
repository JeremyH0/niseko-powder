/** The verdict as words (for the hero, page title, share text and meta description). */
import { createTranslator, DEFAULT_LOCALE, type Locale } from '../../i18n/index.ts';
import type { Conditions } from '../../lib/data/types.ts';
import { dateFromJstDay, formatWeekdayLong } from '../../lib/format.ts';
import { jstDate } from '../../lib/time.ts';
import { verdictStrings } from './strings.ts';
import { heroModel, type HeroModel } from './verdict.ts';

export interface VerdictCopy {
  model: HeroModel;
  question: string;
  word: string;
  headline: string;
}

export function verdictCopy(c: Conditions | null, now: Date, locale: Locale = DEFAULT_LOCALE): VerdictCopy {
  const t = createTranslator(verdictStrings, locale);
  const model = heroModel(c, now);
  const day = !model.nextDay
    ? ''
    : model.nextDay === jstDate(now)
      ? t('day.next24h')
      : formatWeekdayLong(dateFromJstDay(model.nextDay));
  return {
    model,
    question: t('question'),
    word: t(`word.${model.word}`),
    headline: t(`headline.${model.headline}`, { cm: Math.round(model.cm), day }),
  };
}
