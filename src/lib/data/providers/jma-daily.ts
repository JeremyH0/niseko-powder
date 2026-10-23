/**
 * JMA past weather data (過去の気象データ, kako no kishō dēta) — daily values for one
 * month at a full weather station ("s" page). We read two columns:
 *   降雪 合計 (kōsetsu gōkei, daily snowfall total, cm)
 *   最深積雪 値 (saishin sekisetsu, deepest snow depth of the day, cm)
 *
 * It's an HTML table, not an API: we parse it defensively and match the columns by their
 * header text, so a moved column fails loudly in tests instead of silently mis-reading.
 * Used by the one-off seed script and once or twice a day by the season-history job.
 */
import { ProviderError, type Provider, type ProviderContext } from './types.ts';

const BASE = 'https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php';

export interface JmaDailyQuery {
  precNo: string;
  blockNo: string;
  year: number;
  /** 1–12 */
  month: number;
}

export interface DailySnow {
  /** JST calendar date, "2026-01-31". */
  date: string;
  snowfallCm: number | null;
  depthCm: number | null;
}

export const jmaDailyUrl = (q: JmaDailyQuery) =>
  `${BASE}?prec_no=${q.precNo}&block_no=${q.blockNo}&year=${q.year}&month=${q.month}&day=&view=`;

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .trim();

/**
 * JMA cell → number. "--" = phenomenon didn't occur (0). A trailing ")" marks a quasi-normal
 * value (kept); "]" marks insufficient data (kept — still the best value available).
 * "×", "///", "#", "" and anything else unparseable = missing.
 */
export function parseJmaValue(cell: string): number | null {
  const v = cell.trim();
  if (v === '--') return 0;
  const m = /^(-?\d+(?:\.\d+)?)[)\]]?$/.exec(v);
  return m ? Number(m[1]) : null;
}

function cells(row: string, tag: 'td'): string[] {
  return [...row.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</(?:td|th)>`, 'g'))].map((m) => stripTags(m[1] ?? ''));
}

/**
 * The header spans several rows with nested sub-columns, so header positions don't map 1:1 to
 * data cells. The snow pair is always the last group before 天気概況 (tenki gaikyō, "weather
 * summary", day + night). We check the header says so, then count from the end of each row.
 */
function assertSnowLayout(html: string): void {
  const header = html.slice(0, html.indexOf('style="text-align:right;"'));
  const order = ['雪(cm)', '天気概況', '降雪', '最深積雪'].map((label) => header.indexOf(label));
  const [snowGroup, summary, snowfall, depth] = order as [number, number, number, number];
  if (order.some((i) => i < 0) || !(snowGroup < summary && snowfall < depth)) {
    throw new ProviderError('jma-daily', 'snow columns (降雪 / 最深積雪) not found in the table header');
  }
}

export function parseDailyPage(html: string, year: number, month: number): DailySnow[] {
  assertSnowLayout(html);
  const rows = [...html.matchAll(/<tr class="mtx" style="text-align:right;">([\s\S]*?)<\/tr>/g)];
  const mm = String(month).padStart(2, '0');
  const out: DailySnow[] = [];
  for (const r of rows) {
    const c = cells(r[1] ?? '', 'td');
    const day = Number(c[0]);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    // …, 降雪 合計, 最深積雪 値, 天気概況 昼, 天気概況 夜
    out.push({
      date: `${year}-${mm}-${String(day).padStart(2, '0')}`,
      snowfallCm: parseJmaValue(c.at(-4) ?? ''),
      depthCm: parseJmaValue(c.at(-3) ?? ''),
    });
  }
  if (out.length === 0) throw new ProviderError('jma-daily', `no daily rows for ${year}-${mm}`);
  return out;
}

async function fetchRaw(q: JmaDailyQuery, ctx: ProviderContext): Promise<string> {
  const res = await ctx.fetch(jmaDailyUrl(q), { headers: { 'User-Agent': ctx.userAgent } });
  if (!res.ok) throw new ProviderError('jma-daily', `HTTP ${res.status} for ${q.year}-${q.month}`);
  return res.text();
}

export const jmaDaily: Provider<JmaDailyQuery, string, DailySnow[]> = {
  id: 'jma-daily',
  fetchRaw,
  normalize: (html, q) => parseDailyPage(html, q.year, q.month),
};
