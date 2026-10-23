import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { jmaDailyUrl, parseDailyPage, parseJmaValue } from './jma-daily.ts';

const page = (ym: string) =>
  readFileSync(new URL(`../../../../tests/fixtures/jma-past/daily-47433-${ym}.html`, import.meta.url), 'utf8');

describe('parseJmaValue', () => {
  it.each([
    ['17', 17],
    ['0.5', 0.5],
    ['--', 0],
    ['137)', 137],
    ['12]', 12],
    ['×', null],
    ['///', null],
    ['#', null],
    ['', null],
  ])('%s → %s', (cell, value) => expect(parseJmaValue(cell)).toBe(value));
});

describe('parseDailyPage (Kutchan 47433)', () => {
  it('January 2026: 31 days, base growing from 61 to 137 cm', () => {
    const days = parseDailyPage(page('2026-01'), 2026, 1);
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: '2026-01-01', snowfallCm: 17, depthCm: 61 });
    expect(days[3]).toEqual({ date: '2026-01-04', snowfallCm: 23, depthCm: 76 });
    expect(days[28]).toEqual({ date: '2026-01-29', snowfallCm: 0, depthCm: 134 });
    expect(days[30]).toEqual({ date: '2026-01-31', snowfallCm: 13, depthCm: 137 });
  });

  it('November 2025: no snow ("--") until late in the month', () => {
    const days = parseDailyPage(page('2025-11'), 2025, 11);
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: '2025-11-01', snowfallCm: 0, depthCm: 0 });
    expect(days[27]).toEqual({ date: '2025-11-28', snowfallCm: 1, depthCm: 1 });
  });

  it('May 2026: snow gone', () => {
    const days = parseDailyPage(page('2026-05'), 2026, 5);
    expect(days.every((d) => d.depthCm === 0)).toBe(true);
  });

  it('fails loudly if the table layout changes', () => {
    expect(() => parseDailyPage('<table><tr class="mtx"><th>日</th></tr></table>', 2026, 1)).toThrow(/snow columns/);
  });

  it('builds the JMA URL', () => {
    expect(jmaDailyUrl({ precNo: '16', blockNo: '47433', year: 2026, month: 1 })).toBe(
      'https://www.data.jma.go.jp/stats/etrn/view/daily_s1.php?prec_no=16&block_no=47433&year=2026&month=1&day=&view=',
    );
  });
});
