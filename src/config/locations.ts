/**
 * Places we report on. v1 ships Niseko only, but everything downstream takes a
 * `LocationId` so adding another resort is mostly a new entry here.
 *
 * Coordinates checked on 2026-10-22 against JMA's station table and the
 * Open-Meteo elevation API (90 m DEM). See docs/DATA_SOURCES.md.
 */

export interface ObservationStation {
  provider: 'jma-amedas';
  /** JMA AMeDAS station ID. */
  id: string;
  nameEn: string;
  /** Japanese name, with romaji in `nameEn`. */
  nameJa: string;
  lat: number;
  lon: number;
  elevationM: number;
  /** JMA past-weather-data (過去の気象データ) page identifiers, for the season history. */
  pastData: { precNo: string; blockNo: string };
}

export type ForecastPointId = 'summit' | 'mid' | 'base';

export interface ForecastPoint {
  id: ForecastPointId;
  label: string;
  lat: number;
  lon: number;
  /** Passed to Open-Meteo so the model is downscaled to this height. */
  elevationM: number;
}

export interface Location {
  id: string;
  name: string;
  timezone: 'Asia/Tokyo';
  /** Town-level station: label its readings as "town", never "mountain". */
  station: ObservationStation;
  forecastPoints: readonly ForecastPoint[];
}

export const LOCATIONS = {
  niseko: {
    id: 'niseko',
    name: 'Niseko',
    timezone: 'Asia/Tokyo',
    station: {
      provider: 'jma-amedas',
      id: '16217',
      nameEn: 'Kutchan',
      nameJa: '倶知安',
      // 42°54.0′N 140°45.4′E
      lat: 42.9,
      lon: 140.7567,
      elevationM: 176,
      // Kutchan is a full weather station there ("s" pages), block 47433 in Shiribeshi (16).
      pastData: { precNo: '16', blockNo: '47433' },
    },
    forecastPoints: [
      // Mt. Niseko Annupuri summit (1,308 m). The DEM smooths the peak to ~1,250 m,
      // so we pass the real height explicitly.
      { id: 'summit', label: 'Summit', lat: 42.8755, lon: 140.658, elevationM: 1300 },
      // On the Hirafu side, midway up the summit → village line (DEM ≈ 820 m).
      { id: 'mid', label: 'Mid-mountain', lat: 42.8672, lon: 140.6795, elevationM: 820 },
      // Grand Hirafu base area (DEM ≈ 277 m).
      { id: 'base', label: 'Base (Hirafu)', lat: 42.859, lon: 140.701, elevationM: 280 },
    ],
  },
} as const satisfies Record<string, Location>;

export type LocationId = keyof typeof LOCATIONS;

export const DEFAULT_LOCATION_ID: LocationId = 'niseko';

export function getLocation(id: LocationId = DEFAULT_LOCATION_ID): Location {
  return LOCATIONS[id];
}
