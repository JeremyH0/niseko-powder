import { defineMessages } from '../../i18n/index.ts';

export const rightNowStrings = defineMessages({
  en: {
    title: 'Right now in Kutchan',
    badge: 'Town station · 176 m · not the mountain',
    intro:
      'Measured by the Japan Meteorological Agency in Kutchan town, a few kilometres from the lifts and over 1,000 m below the summit. Usually less snow and warmer than on the mountain.',
    'depth.label': 'Snow depth',
    'depth.off': 'Not measured yet this season',
    'new.label': 'New snow · 24 h',
    'new.note': '1 h {h1} · 6 h {h6} · 12 h {h12} cm',
    'new.off': 'Not measured yet this season',
    'temp.label': 'Temperature',
    'temp.note': 'Today’s gust max {gust} m/s',
    'wind.label': 'Wind',
    'wind.calm': 'Calm',
    'wind.from': 'from the {dir}',
    'precip.label': 'Rain/snow · 24 h',
    'precip.note': 'Last hour {h1} mm',
    observed: 'Observed {time} JST · {age} ago · JMA station 倶知安 (Kutchan) #{id}',
    stale: 'Town data is delayed: the latest reading is {age} old. Numbers below may be out of date.',
    none: 'No reading from the town station yet.',
  },
});
