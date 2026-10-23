import { defineMessages } from '../../i18n/index.ts';

export const seasonStrings = defineMessages({
  en: {
    title: 'Season tracker',
    description:
      'Niseko snow season tracker: snow depth and snowfall in Kutchan this season versus the last ten winters, from Japan Meteorological Agency records.',
    back: '← Today’s answer',
    badge: 'Kutchan town · 176 m',
    intro:
      'Snow on the ground in Kutchan, day by day, against the last ten winters. The mountain gets far more — but the town record is the longest honest one we have.',

    'summary.inSeason': 'So far this season Kutchan has had {total} cm of snow — {pct}% of the 10-year average for this date.',
    'summary.depth': 'Snow depth on {date}: {depth} cm (10-year average: {avg} cm).',
    'summary.offSeason':
      'The {next} season starts on 1 November. Last season ({last}) Kutchan had {total} cm of snow — {pct}% of the average of the {n} winters before it.',
    'summary.empty': 'No season data yet.',

    'chart.title': 'Snow depth in Kutchan (cm)',
    'chart.hint': 'Use the left and right arrow keys to read each day.',
    'legend.focus': '{season}',
    'legend.compare': '{season}',
    'legend.average': 'Average of {n} winters',
    'legend.range': 'Range of past winters',
    'legend.today': 'Today',

    'stats.title': '{season} in numbers',
    'stats.total': 'Total snowfall',
    'stats.deepest': 'Deepest snow',
    'stats.biggest': 'Biggest day',
    'stats.days20': 'Days with 20 cm+',
    'stats.on': 'on {date}',

    'table.title': 'Every winter since {first}',
    'table.season': 'Season',
    'table.total': 'Snowfall',
    'table.deepest': 'Deepest',
    'table.biggest': 'Biggest day',
    'table.days20': '20 cm+ days',
    'table.best': 'Snowiest',
    'table.soFar': 'so far',
    'table.average': 'Average',

    source: 'Source: {source}. Daily values; the current season is updated every morning.',

    'teaser.title': 'This season',
    'teaser.cta': 'Open the season tracker',
    'teaser.chartLabel': 'Snow depth this season compared with the 10-year average',
  },
});
