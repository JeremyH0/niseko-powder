/** Site-wide constants. Brand name is a working title until Jeremy picks one. */
export const site = {
  name: 'Niseko Powder',
  defaultLocale: 'en',
  timezone: 'Asia/Tokyo',
  /** Readings older than this are shown with a "data delayed" banner. */
  staleAfterMinutes: 120,
  /** Sent with every outgoing data request so providers can see who we are. */
  userAgent: 'niseko-powder/0.1 (+non-commercial hobby site; contact via GitHub)',
} as const;

/** Required credits. Rendered in the footer on every page. */
export const attributions = [
  {
    id: 'jma',
    text: 'Source: Japan Meteorological Agency (JMA)',
    href: 'https://www.jma.go.jp/',
  },
  {
    id: 'open-meteo',
    text: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    href: 'https://open-meteo.com/',
  },
] as const;
