import { describe, expect, it } from 'vitest';
import history from '../../data/season-history.niseko.json';
import { emptySeason, mergeDays, type SeasonHistoryFile } from '../../lib/season.ts';
import { SEASON_CHART, linePath, seasonChartModel } from './chart.ts';
import { summarizeSeasons } from './summary.ts';

const seasons = (history as SeasonHistoryFile).seasons;

describe('summarizeSeasons', () => {
  it('off-season (23 Oct 2026): highlights last season against the 9 before it', () => {
    const s = summarizeSeasons({ today: '2026-10-23', current: '2026-27', seasons, source: '' });
    expect(s.inSeason).toBe(false);
    expect(s.focus).toBe('2025-26');
    expect(s.compare).toBe('2024-25');
    expect(s.reference).not.toContain('2025-26');
    expect(s.reference).toHaveLength(9);
    expect(s.focusStats?.totalSnowfallCm).toBe(750);
    expect(s.pctOfAverage).toBeGreaterThan(50);
    expect(s.table[0]?.season).toBe('2025-26');
  });

  it('in season: compares the current season to date', () => {
    const current = mergeDays('2026-27', emptySeason(), [
      { date: '2026-11-20', snowfallCm: 12, depthCm: 10 },
      { date: '2026-11-21', snowfallCm: 30, depthCm: 35 },
    ]);
    const s = summarizeSeasons({
      today: '2026-11-22',
      current: '2026-27',
      seasons: { ...seasons, '2026-27': current },
      source: '',
    });
    expect(s.inSeason).toBe(true);
    expect(s.focus).toBe('2026-27');
    expect(s.totalToDate).toBe(42);
    expect(s.depthNow).toBe(35);
    expect(s.lastDate).toBe('2026-11-21');
    expect(s.reference).toHaveLength(10);
    expect(s.avgTotalToDate).not.toBeNull();
  });
});

describe('season chart', () => {
  it('breaks lines at gaps', () => {
    expect(linePath([1, null, 2], (v) => v)).toMatch(/^M[\d.]+ 1\.0M[\d.]+ 2\.0$/);
  });

  it('builds a chart within bounds', () => {
    const m = seasonChartModel({
      focus: seasons['2025-26']?.depth ?? null,
      compare: seasons['2024-25']?.depth ?? null,
      average: seasons['2023-24']?.depth ?? [],
      range: Array.from({ length: 213 }, () => ({ min: 0, max: 240 })),
      season: '2025-26',
      today: null,
    });
    expect(m.yMax).toBe(250);
    expect(m.monthTicks.map((t) => t.label)).toEqual(['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']);
    expect(m.monthTicks[0]?.x).toBe(SEASON_CHART.left);
    expect(m.focusArea.endsWith('Z')).toBe(true);
    expect(m.todayX).toBeNull();
  });
});

describe('season chart area', () => {
  it('bridges a missing day instead of dropping to zero', () => {
    const m = seasonChartModel({ focus: [10, null, 12], compare: null, average: [], range: [], season: '2025-26', today: null });
    const ys = [...m.focusArea.matchAll(/L[\d.]+ ([\d.]+)/g)].map((x) => Number(x[1]));
    // Points 0..2 then the closing point at the baseline: the middle point equals the first.
    expect(ys[1]).toBe(ys[0]);
  });
});
