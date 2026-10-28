import { defineMessages } from '../../i18n/index.ts';

export const outlookStrings = defineMessages({
  en: {
    title: 'At a glance',
    habit: 'Updated hourly from JMA and the mountain forecast — your morning check.',
    'fresh.label': 'Fresh · last 24 h',
    'fresh.town': 'Measured in Kutchan',
    'fresh.mountain': 'Mountain model · summit {summit} cm',
    'fresh.none': 'Summit {summit} cm',
    'next24.label': 'Next 24 h',
    'next24.note': 'Summit & mid-mountain',
    'big.label': 'Next big snow',
    'big.none': 'None',
    'big.noneNote': 'Nothing ≥ {cm} cm in 7 days',
    'big.note': '~{cm} cm on the summit',
    'big.next24': 'Next 24 h',
    'big.tomorrow': 'tomorrow',
    'big.inDays': 'in {n} days',
    'town.label': 'Town now',
    'town.note.rain': 'Raining in Kutchan',
    'town.note.snow': 'Snowing in Kutchan',
    'town.note.dry': 'Kutchan · 176 m',
  },
});
