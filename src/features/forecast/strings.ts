import { defineMessages } from '../../i18n/index.ts';

export const forecastStrings = defineMessages({
  en: {
    'h48.title': 'Next 48 hours',
    'h48.badge': 'Mountain forecast',
    'h48.summary.snow': 'About {cm} cm of snow on the summit in the next 48 hours, heaviest {when}.',
    'h48.summary.none': 'No snow forecast on the mountain in the next 48 hours.',
    'h48.summary.rain': 'Rain at the base: {mm} mm.',
    'h48.legend.snow': 'Snow, summit (cm/h)',
    'h48.legend.rain': 'Rain, base (mm/h)',
    'h48.legend.temp': 'Temperature, mid-mountain',
    'h48.legend.night': 'Night',
    'h48.table': 'Show as a table',
    'h48.col.time': 'Time (JST)',
    'h48.col.snow': 'Snow summit (cm)',
    'h48.col.rain': 'Rain base (mm)',
    'h48.when': '{day} around {time}',

    'week.title': '7-day mountain forecast',
    'week.badge': 'Summit ~1,300 m · base ~280 m',
    'week.today': 'Today',
    'week.bigSnow': 'Big snow',
    'week.summit': 'Summit',
    'week.mid': 'Mid',
    'week.base': 'Base',
    'week.rainBase': 'rain at base',
    'week.wind': 'Wind',
    'week.windy': 'Lift holds possible',
    'week.snowLabel': '{cm} cm of snow on the summit',
    'week.source': 'Model: {model}. Forecasts are estimates — mountains make their own weather.',
  },
});
