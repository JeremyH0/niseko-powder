import { describe, expect, it } from 'vitest';
import { jmaBlockName, jmaKeyToIso, jstDate, jstIso, minutesBetween, openMeteoTimeToIso } from './time.ts';

describe('JST helpers', () => {
  it('formats a UTC instant in JST', () => {
    // 15:20 UTC = 00:20 JST next day
    const d = new Date('2026-10-22T15:20:00Z');
    expect(jstDate(d)).toBe('2026-10-23');
    expect(jstIso(d)).toBe('2026-10-23T00:20:00+09:00');
  });

  it('picks the 3-hour JMA block in JST', () => {
    expect(jmaBlockName(new Date('2026-10-22T06:20:00Z'))).toBe('20261022_15'); // 15:20 JST
    expect(jmaBlockName(new Date('2026-10-22T14:59:00Z'))).toBe('20261022_21'); // 23:59 JST
    expect(jmaBlockName(new Date('2026-10-22T15:00:00Z'))).toBe('20261023_00'); // 00:00 JST
  });

  it('converts source timestamps to ISO with offset', () => {
    expect(jmaKeyToIso('20261022152000')).toBe('2026-10-22T15:20:00+09:00');
    expect(openMeteoTimeToIso('2026-10-22T15:00')).toBe('2026-10-22T15:00:00+09:00');
    expect(() => jmaKeyToIso('2026')).toThrow();
  });

  it('measures age in minutes', () => {
    expect(minutesBetween('2026-10-22T15:20:00+09:00', new Date('2026-10-22T08:20:00Z'))).toBe(120);
  });
});
