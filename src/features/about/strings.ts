import { defineMessages } from '../../i18n/index.ts';

export const aboutStrings = defineMessages({
  en: {
    title: 'How it works',
    description: 'Where the Niseko Powder data comes from, how the powder score is calculated, and its limits.',
    back: '← Back to today’s answer',
    lead: 'One question, answered honestly every morning: is it a powder day in Niseko? Here is exactly how we answer it.',

    'sources.title': 'Where the numbers come from',
    'sources.jma':
      'Measured: the Japan Meteorological Agency (JMA) AMeDAS station in Kutchan town — {name} (#{id}), {elevation} m above sea level. Snow depth and new snow are measured every hour; temperature, wind and precipitation every 10 minutes.',
    'sources.jmaCaveat':
      'Kutchan is a town, not the mountain: it is usually warmer and gets less snow than the slopes, and it can rain in town while it snows up top. We always label these numbers “town”.',
    'sources.om':
      'Forecast: Open-Meteo, using JMA’s own high-resolution models (MSM 5 km, then GSM) for snow, temperature and wind, and Open-Meteo’s best-match models for gusts and freezing level. We ask for three points on the mountain:',
    'sources.point': '{label}: {lat}, {lon} at {elevation} m',
    'sources.refresh':
      'A Cloudflare Worker fetches both sources once an hour and stores the result. Your visit never calls JMA or Open-Meteo directly. If a source is down we keep showing the last good data and say how old it is.',

    'score.title': 'The powder score',
    'score.intro':
      'A transparent rule of thumb from 0 to 100 — not an official forecast. It starts from fresh snow and is adjusted for quality and conditions:',
    'score.fresh':
      'Fresh snow in the last 24 h: the larger of what Kutchan measured and what the model says fell at mid-mountain. 3 cm ≈ 10 points, 10 cm ≈ 40, 20 cm ≈ 65, 30 cm ≈ 80, 50 cm+ ≈ 95.',
    'score.more': 'More snow forecast in the next 24 h: +1 point per cm, up to +{max}.',
    'score.cold': 'Cold and light (mid-mountain ≤ {cold}°C): +{coldPts}. Warm and heavy (≥ {warm}°C): {warmPts}.',
    'score.wind':
      'Wind over the next 6 h: breezy (≥ {breezy} m/s mid-mountain) {breezyPts}; lift holds likely (≥ {holds} m/s, or summit gusts ≥ {gust} m/s) {holdsPts}.',
    'score.rain': 'Rain at the base in the last 24 h (≥ {mm} mm): {pts}.',
    'score.cap': 'No fresh snow means no powder: without at least 1 cm the score can’t reach “Kinda.”',
    'score.verdicts': 'Verdicts: {epic}+ “YES!”, {good}+ “Yes.”, {some}+ “Kinda.”, below that “Nope.”',
    'score.tune': 'These thresholds will be tuned against real winter mornings. Disagree? That’s half the fun.',

    'limits.title': 'Honest limits',
    'limits.1': 'Forecasts are model estimates. Mountains make their own weather, and Niseko’s famous snow often comes in bands models miss.',
    'limits.2': 'Out of season, JMA doesn’t measure snow depth in Kutchan, so those numbers show as “not measured”.',
    'limits.3': 'Nothing here is about safety. For lifts, gates and avalanche conditions, always check the official sources.',

    'privacy.title': 'Privacy & credits',
    'privacy.text':
      'Free and non-commercial: no ads, no cookies, no tracking. Observations: Japan Meteorological Agency. Forecast data: Open-Meteo.com (CC BY 4.0). Raw data for your own projects: /api/conditions.json.',
  },
});
