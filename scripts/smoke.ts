/**
 * Smoke test against a running site (local or deployed):
 *
 *   npm run smoke                                   # http://localhost:4321
 *   npm run smoke -- https://niseko-powder.<you>.workers.dev
 *
 * Checks the homepage renders the answer server-side (no JavaScript needed),
 * the API returns conditions, and the static pages exist.
 */
export {};

const base = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
}

const home = await fetch(`${base}/`);
const html = await home.text();
check('homepage responds 200', home.status === 200, String(home.status));
check('answer is in the HTML', /Is it a powder day in Niseko\?/.test(html) && /<h1/.test(html));
check(
  'verdict word rendered',
  /(YES!|Yes\.|Kinda\.|Nope\.|Not yet\.|Soon\.|Hmm\.)/.test(html),
);
check('JMA attribution', html.includes('Japan Meteorological Agency'));
check('Open-Meteo attribution', html.includes('Open-Meteo.com'));
check('town vs mountain labelled', html.includes('not the mountain'));

const api = await fetch(`${base}/api/conditions.json`);
const data = (await api.json().catch(() => null)) as { powder?: { verdict?: string }; generatedAt?: string } | null;
check('API returns conditions', api.status === 200 && !!data?.powder?.verdict, `${api.status} ${data?.generatedAt ?? ''}`);
if (data?.generatedAt) {
  const ageMin = (Date.now() - new Date(data.generatedAt).getTime()) / 60_000;
  check('data is fresh (< 2 h)', ageMin < 120, `${Math.round(ageMin)} min old`);
}

const season = await fetch(`${base}/season`);
const seasonHtml = await season.text();
check('season tracker renders', season.status === 200 && seasonHtml.includes('Season tracker') && seasonHtml.includes('<svg'));

for (const path of ['/about', '/manifest.webmanifest', '/robots.txt']) {
  const res = await fetch(`${base}${path}`);
  check(`${path} responds 200`, res.status === 200, String(res.status));
}
const missing = await fetch(`${base}/definitely-not-a-page`);
check('unknown page → 404', missing.status === 404, String(missing.status));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll good.');
process.exit(failed ? 1 : 0);
