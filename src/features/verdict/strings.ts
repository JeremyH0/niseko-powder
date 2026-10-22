import { defineMessages } from '../../i18n/index.ts';

export const verdictStrings = defineMessages({
  en: {
    question: 'Is it a powder day in Niseko?',
    'word.epic': 'YES!',
    'word.good': 'Yes.',
    'word.some': 'Kinda.',
    'word.nope': 'Nope.',
    'word.soon': 'Soon.',
    'word.unknown': 'Hmm.',

    'headline.fresh': '{cm} cm of fresh snow in the last 24 hours.',
    'headline.freshMountain': 'About {cm} cm fell up the mountain in the last 24 hours.',
    'headline.some': 'Just {cm} cm fresh — a fun top-up, not a deep day.',
    'headline.summitSnow': 'Not a powder day — but the summit caught about {cm} cm in the last 24 hours.',
    'headline.snowingNow': 'It’s snowing up there right now — about {cm} cm more in the next 24 hours.',
    'headline.noneNext': 'No new snow — groomer day. Next real snow looks like {day} (~{cm} cm up top).',
    'headline.none': 'No new snow, and nothing big in the next 7 days. Groomer life.',
    'headline.noData': 'Our data sources aren’t answering right now. Check back in a few minutes.',

    'score.label': 'Powder score',
    'score.of': 'out of 100',
    'score.how': 'How is this scored?',

    'reason.fresh-town': 'Kutchan measured {cm} cm',
    'reason.fresh-mountain': 'Mountain model: ~{cm} cm fell',
    'reason.more-coming': '+{cm} cm more in 24 h',
    'reason.cold-light': 'Cold & light ({temp} mid-mountain)',
    'reason.warm-heavy': 'Warm & heavy ({temp} mid-mountain)',
    'reason.windy': 'Breezy: {ms} m/s',
    'reason.wind-holds': 'Wind holds likely: {ms} m/s',
    'reason.rain-base': 'Rain at the base ({mm} mm)',
    'reason.rain-town': 'Raining in town ({mm} mm / 24 h)',
    'reason.stale-observation': 'Town data delayed ({age})',
    'reason.no-observation': 'No town data right now',
    'reason.no-forecast': 'No forecast right now',

    updated: 'Updated {time} JST',
    delayed: 'Data delayed · {age}',
    'today.label': 'Today in Niseko',
    'mountain.annupuri': 'Annupuri 1,308 m',
    'mountain.yotei': 'Yōtei 1,898 m',
    'day.next24h': 'in the next 24 h',
  },
});
