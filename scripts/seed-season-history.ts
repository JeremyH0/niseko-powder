/**
 * One-off: download past seasons of daily snowfall + snow depth for the location's JMA
 * station and save them as a static seed file committed to the repo.
 *
 *   node scripts/seed-season-history.ts            # last 10 complete seasons
 *   node scripts/seed-season-history.ts 2016 2025  # seasons starting 2016 … 2025
 *
 * Polite: one request every 1.5 s (~70 requests for 10 seasons). The live site then keeps
 * the current season up to date itself (src/worker/jobs/season-history.ts).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLocation } from '../src/config/locations.ts';
import { site } from '../src/config/site.ts';
import { jmaDaily } from '../src/lib/data/providers/jma-daily.ts';
import type { ProviderContext } from '../src/lib/data/providers/types.ts';
import { runProvider } from '../src/lib/data/providers/types.ts';
import { emptySeason, mergeDays, seasonMonths, seasonName, seasonStats, type SeasonHistoryFile } from '../src/lib/season.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const location = getLocation();
const station = location.station;
const OUT = join(ROOT, 'src', 'data', `season-history.${location.id}.json`);

const lastCompleteStart = (() => {
  const now = new Date();
  // A season is complete after May; from June on, the season that started last November is done.
  return now.getUTCMonth() + 1 >= 6 ? now.getUTCFullYear() - 1 : now.getUTCFullYear() - 2;
})();
const from = Number(process.argv[2] ?? lastCompleteStart - 9);
const to = Number(process.argv[3] ?? lastCompleteStart);

const ctx: ProviderContext = { fetch, now: new Date(), userAgent: site.userAgent };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const file: SeasonHistoryFile = {
  stationId: station.id,
  source: `Japan Meteorological Agency — past weather data, ${station.nameJa} (${station.nameEn}) block ${station.pastData.blockNo}`,
  fetchedAt: new Date().toISOString(),
  seasons: {},
};

for (let y = from; y <= to; y++) {
  const season = seasonName(y);
  let series = emptySeason();
  for (const { year, month } of seasonMonths(season)) {
    const days = await runProvider(jmaDaily, { ...station.pastData, year, month }, ctx);
    series = mergeDays(season, series, days);
    await sleep(1500);
  }
  file.seasons[season] = series;
  const s = seasonStats(season, series);
  console.log(
    `${season}: ${s.totalSnowfallCm} cm total, deepest ${s.maxDepth?.cm ?? '—'} cm (${s.maxDepth?.date ?? '—'}), ` +
      `biggest day ${s.biggestDay?.cm ?? '—'} cm, ${s.days20} days ≥ 20 cm`,
  );
}

await mkdir(dirname(OUT), { recursive: true });
// Compact: one season per line keeps the diff readable and the file small.
const body = [
  '{',
  `  "stationId": ${JSON.stringify(file.stationId)},`,
  `  "source": ${JSON.stringify(file.source)},`,
  `  "fetchedAt": ${JSON.stringify(file.fetchedAt)},`,
  '  "seasons": {',
  Object.entries(file.seasons)
    .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`)
    .join(',\n'),
  '  }',
  '}',
].join('\n');
await writeFile(OUT, `${body}\n`);
console.log(`\nSaved ${Object.keys(file.seasons).length} seasons to ${OUT.replace(ROOT + '/', '')}`);
