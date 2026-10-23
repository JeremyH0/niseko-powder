/** Seasons = the committed seed file + the current/previous season kept in KV by the daily job. */
import nisekoHistory from '../../data/season-history.niseko.json';
import { readSeason } from '../../lib/data/store.ts';
import {
  currentOrNextSeason,
  seasonName,
  seasonStartYear,
  type SeasonHistoryFile,
  type SeasonSeries,
} from '../../lib/season.ts';
import { jstDate } from '../../lib/time.ts';

const BUNDLED: Record<string, SeasonHistoryFile> = {
  niseko: nisekoHistory as SeasonHistoryFile,
};

export interface SeasonData {
  today: string;
  current: string;
  seasons: Record<string, SeasonSeries>;
  source: string;
}

export async function loadSeasons(kv: KVNamespace, locationId: string, now: Date): Promise<SeasonData> {
  const today = jstDate(now);
  const current = currentOrNextSeason(today);
  const bundled = BUNDLED[locationId];
  const seasons: Record<string, SeasonSeries> = { ...(bundled?.seasons ?? {}) };

  // The live season (and last season, until it's added to the seed file) come from KV.
  const previous = seasonName(seasonStartYear(current) - 1);
  const missing = [current, previous].filter((k) => !seasons[k]);
  const fromKv = await Promise.all(missing.map((k) => readSeason(kv, locationId, k)));
  missing.forEach((k, i) => {
    const v = fromKv[i];
    if (v) seasons[k] = v;
  });

  return { today, current, seasons, source: bundled?.source ?? '' };
}
