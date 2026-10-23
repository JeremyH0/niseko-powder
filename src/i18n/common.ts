import { defineMessages } from './index.ts';

/** Strings shared across pages (layout, footer, generic labels). */
export const common = defineMessages({
  en: {
    'site.tagline': 'Is it a powder day in Niseko?',
    'site.description':
      'Is it a powder day in Niseko? Live snow depth and fresh snow from Kutchan, a 7-day mountain forecast and an honest powder score — updated every hour.',
    'a11y.skip': 'Skip to the forecast',
    'footer.about': 'A daily, honest answer to the only question that matters in a Niseko winter.',
    'footer.credits': 'Data credits',
    'footer.nonCommercial': 'Free and non-commercial. No ads, no cookies, no tracking.',
    'footer.methodology': 'How it works',
    'footer.season': 'Season tracker',
    'footer.api': 'JSON data',
    'footer.disclaimer':
      'Not an official forecast. Town readings are from Kutchan (176 m), not the mountain. Check official lift and avalanche information before you go.',
    'footer.madeIn': 'Made in Kutchan, Hokkaido.',
    'time.lastUpdated': 'Last updated {time} JST',
  },
});
