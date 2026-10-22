/**
 * Fetch real responses from every data source and save them as test fixtures.
 * Also prints a short report of anything that differs from docs/DATA_SOURCES.md.
 * Existing fixture files are never overwritten (tests depend on them); new dated JMA
 * files are added as time passes.
 *
 *   npm run probe
 *
 * Runs with plain Node (>= 22.18 strips TypeScript types natively). Polite by design:
 * a handful of requests per run. Don't put this in a loop.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLocation, type ForecastPoint } from '../src/config/locations.ts';
import { site } from '../src/config/site.ts';
import { extrasUrl, primaryUrl } from '../src/lib/data/providers/open-meteo.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tests', 'fixtures');
const JMA = 'https://www.jma.go.jp/bosai/amedas';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_HISTORICAL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';

const location = getLocation('niseko');
const station = location.station;
const notes: string[] = [];

async function get(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': site.userAgent } });
  console.log(`  ${res.status} ${url}`);
  return res;
}

/** Never overwrites: tests depend on exact fixture contents. Delete a file to refresh it. */
async function save(relPath: string, body: string): Promise<void> {
  const path = join(FIXTURES, relPath);
  if (existsSync(path)) {
    console.log(`  kept existing tests/fixtures/${relPath} (delete it to refresh)`);
    return;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body.endsWith('\n') ? body : `${body}\n`);
  console.log(`  saved tests/fixtures/${relPath}`);
}

const pretty = (data: unknown) => JSON.stringify(data, null, 2);

// ---------------------------------------------------------------- JMA AMeDAS

type JmaPair = [number | null, number];
type JmaRow = Record<string, JmaPair | Record<string, number> | undefined>;

async function probeJma(): Promise<void> {
  console.log('\nJMA AMeDAS');

  const latestText = (await (await get(`${JMA}/data/latest_time.txt`)).text()).trim();
  await save('jma/latest_time.txt', latestText);
  // e.g. "2026-10-22T15:20:00+09:00" — already JST.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):00\+09:00$/.exec(latestText);
  if (!m) {
    notes.push(`latest_time.txt has an unexpected format: ${JSON.stringify(latestText)}`);
    return;
  }
  const [, y, mo, d, h] = m as unknown as [string, string, string, string, string];
  const blockHour = String(Math.floor(Number(h) / 3) * 3).padStart(2, '0');
  const fileName = `${y}${mo}${d}_${blockHour}.json`;

  // Station metadata: keep only the stations we care about (the full table is ~300 kB).
  const table = (await (await get(`${JMA}/const/amedastable.json`)).json()) as Record<string, unknown>;
  const nearby = ['16217', '16272', '16281', '16206'];
  await save('jma/amedastable-nearby.json', pretty(Object.fromEntries(nearby.map((id) => [id, table[id]]))));

  const pointRes = await get(`${JMA}/data/point/${station.id}/${fileName}`);
  if (!pointRes.ok) {
    notes.push(`Point file ${fileName} returned HTTP ${pointRes.status}.`);
    return;
  }
  const point = (await pointRes.json()) as Record<string, JmaRow>;
  await save(`jma/point-${station.id}-${fileName}`, pretty(point));

  // Also keep the previous block: the provider must sometimes stitch two files together.
  const prevStart = new Date(Date.UTC(+y, +mo - 1, +d, Number(blockHour) - 3));
  const prevName = `${prevStart.getUTCFullYear()}${String(prevStart.getUTCMonth() + 1).padStart(2, '0')}${String(prevStart.getUTCDate()).padStart(2, '0')}_${String(prevStart.getUTCHours()).padStart(2, '0')}.json`;
  const prevRes = await get(`${JMA}/data/point/${station.id}/${prevName}`);
  if (prevRes.ok) await save(`jma/point-${station.id}-${prevName}`, pretty(await prevRes.json()));

  // ---- Report
  const keys = Object.keys(point).sort();
  const lastKey = keys.at(-1) ?? '';
  console.log(`  rows: ${keys.length} (${keys[0]} … ${lastKey})`);
  if (!keys.every((k) => /^\d{14}$/.test(k))) notes.push('JMA row keys are not all YYYYMMDDHHmmss.');
  const expectedLast = `${y}${mo}${d}${h}${m[5]}00`;
  if (lastKey !== expectedLast) {
    notes.push(`Latest row in point file is ${lastKey}, latest_time.txt says ${expectedLast}.`);
  }

  const flagsByField = new Map<string, Set<string>>();
  const windDirs = new Set<number>();
  for (const row of Object.values(point)) {
    for (const [field, v] of Object.entries(row)) {
      if (!Array.isArray(v)) continue;
      const set = flagsByField.get(field) ?? new Set<string>();
      set.add(`${v[0] === null ? 'null' : 'value'}/flag ${v[1]}`);
      flagsByField.set(field, set);
      if (field === 'windDirection' && typeof v[0] === 'number') windDirs.add(v[0]);
    }
  }
  console.log('  field → (value|null)/flag combinations seen:');
  for (const [field, set] of [...flagsByField].sort()) console.log(`    ${field}: ${[...set].join(', ')}`);
  console.log(`  windDirection values seen: ${[...windDirs].sort((a, b) => a - b).join(', ')}`);
}

// ---------------------------------------------------------------- Open-Meteo

const HOURLY = [
  'snowfall',
  'snow_depth',
  'temperature_2m',
  'precipitation',
  'rain',
  'wind_speed_10m',
  'wind_gusts_10m',
  'wind_direction_10m',
  'freezing_level_height',
  'weather_code',
  'cloud_cover',
];
const DAILY = [
  'snowfall_sum',
  'precipitation_sum',
  'rain_sum',
  'temperature_2m_max',
  'temperature_2m_min',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'weather_code',
];

function forecastUrl(base: string, points: readonly ForecastPoint[], extra: Record<string, string>): string {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    elevation: points.map((p) => p.elevationM).join(','),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
    timezone: location.timezone,
    wind_speed_unit: 'ms',
    ...extra,
  });
  return `${base}?${params}`;
}

function checkVariables(label: string, body: Record<string, unknown>): void {
  const hourly = (body.hourly ?? {}) as Record<string, unknown[]>;
  const daily = (body.daily ?? {}) as Record<string, unknown[]>;
  const missing = [
    ...HOURLY.filter((v) => !(v in hourly)).map((v) => `hourly.${v}`),
    ...DAILY.filter((v) => !(v in daily)).map((v) => `daily.${v}`),
  ];
  const allNull = [
    ...HOURLY.filter((v) => hourly[v]?.every((x) => x === null)).map((v) => `hourly.${v}`),
    ...DAILY.filter((v) => daily[v]?.every((x) => x === null)).map((v) => `daily.${v}`),
  ];
  if (missing.length) notes.push(`${label}: variables missing from response: ${missing.join(', ')}`);
  if (allNull.length) notes.push(`${label}: variables that came back all-null: ${allNull.join(', ')}`);
  console.log(
    `  ${label}: elevation=${String(body.elevation)} model-grid lat/lon=${String(body.latitude)},${String(body.longitude)}` +
      ` hours=${(hourly.time ?? []).length} days=${(daily.time ?? []).length} units=${JSON.stringify(body.hourly_units)}`,
  );
}

async function probeOpenMeteo(): Promise<void> {
  console.log('\nOpen-Meteo');
  const summit = location.forecastPoints.find((p) => p.id === 'summit');
  if (!summit) throw new Error('No summit forecast point in config');

  // 1) The summit on its own (the shape for a single location).
  const single = await get(forecastUrl(OPEN_METEO, [summit], { forecast_days: '7' }));
  const singleBody = (await single.json()) as Record<string, unknown>;
  if (!single.ok) {
    notes.push(`Open-Meteo summit request failed: ${pretty(singleBody)}`);
    return;
  }
  await save('open-meteo/forecast-summit.json', pretty(singleBody));
  checkVariables('summit', singleBody);

  // 2) All points in one request — verifies multi-location support (response is an array).
  const multi = await get(forecastUrl(OPEN_METEO, location.forecastPoints, { forecast_days: '7' }));
  const multiBody = (await multi.json()) as unknown;
  await save('open-meteo/forecast-all-points.json', pretty(multiBody));
  if (Array.isArray(multiBody)) {
    console.log(`  multi-location: array of ${multiBody.length} results, same order as requested`);
    multiBody.forEach((b, i) => checkVariables(location.forecastPoints[i]?.id ?? `#${i}`, b as Record<string, unknown>));
  } else {
    notes.push('Open-Meteo multi-location request did not return an array.');
  }

  // 3) Same, with JMA's own models (MSM 5 km for ~4 days, blended with GSM after). The default
  //    `best_match` model puts all three points in one grid cell; compare before choosing.
  const jma = await get(forecastUrl(OPEN_METEO, location.forecastPoints, { forecast_days: '7', models: 'jma_seamless' }));
  const jmaBody = (await jma.json()) as unknown;
  await save('open-meteo/forecast-all-points-jma_seamless.json', pretty(jmaBody));
  if (Array.isArray(jmaBody)) {
    jmaBody.forEach((b, i) => checkVariables(`jma_seamless ${location.forecastPoints[i]?.id ?? `#${i}`}`, b as Record<string, unknown>));
  }

  // 4) Exactly what production requests (src/lib/data/providers/open-meteo.ts) — the
  //    provider tests replay these.
  const query = { points: location.forecastPoints, timezone: location.timezone };
  for (const [name, target] of [
    ['production-primary', primaryUrl(query)],
    ['production-extras', extrasUrl(query)],
  ] as const) {
    const res = await get(target);
    const body = await res.text();
    if (res.ok) await save(`open-meteo/${name}.json`, pretty(JSON.parse(body)));
    else notes.push(`Production request ${name} failed: ${body}`);
  }
  await save('open-meteo/production-captured-at.txt', new Date().toISOString());

  // 5) A real past snowstorm, so Phase 1 can test the powder score on winter data
  //    while it's still October. Historical Forecast API = archived model runs.
  const winter = await get(
    forecastUrl(OPEN_METEO_HISTORICAL, [summit], { start_date: '2026-02-12', end_date: '2026-02-18' }),
  );
  const winterBody = (await winter.json()) as Record<string, unknown>;
  if (winter.ok) {
    await save('open-meteo/historical-summit-2026-02-12.json', pretty(winterBody));
    const daily = winterBody.daily as { time: string[]; snowfall_sum: (number | null)[] };
    console.log(
      `  winter sample daily snowfall_sum (cm): ${daily.time.map((t, i) => `${t.slice(5)}=${daily.snowfall_sum[i]}`).join(' ')}`,
    );
  } else {
    notes.push(`Historical forecast request failed: ${pretty(winterBody)}`);
  }
}

// ---------------------------------------------------------------- main

await probeJma();
await probeOpenMeteo();

console.log('\nDifferences from docs/DATA_SOURCES.md:');
console.log(notes.length ? notes.map((n) => `  - ${n}`).join('\n') : '  (none detected automatically)');
