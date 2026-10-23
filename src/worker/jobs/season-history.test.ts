import { describe, expect, it } from 'vitest';
import { monthsToFetch, seasonToUpdate } from './season-history.ts';

// Times are JST written as UTC−9 h.
const jst = (iso: string) => new Date(new Date(`${iso}+09:00`).getTime());

describe('seasonToUpdate', () => {
  it('in season → the current season', () => {
    expect(seasonToUpdate(jst('2026-01-15T01:10:00'))).toBe('2025-26');
    expect(seasonToUpdate(jst('2026-11-01T01:10:00'))).toBe('2026-27');
  });
  it('first week of June → finalise last season; later → nothing', () => {
    expect(seasonToUpdate(jst('2026-06-03T01:10:00'))).toBe('2025-26');
    expect(seasonToUpdate(jst('2026-06-10T01:10:00'))).toBeNull();
    expect(seasonToUpdate(jst('2026-10-23T01:10:00'))).toBeNull();
  });
});

describe('monthsToFetch', () => {
  it('backfills the whole season so far when there is no data', () => {
    expect(monthsToFetch('2025-26', jst('2026-01-15T01:10:00'), false)).toEqual([
      { year: 2025, month: 11 },
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
    ]);
  });
  it('re-reads only this month normally, plus last month in the first days', () => {
    expect(monthsToFetch('2025-26', jst('2026-01-15T01:10:00'), true)).toEqual([{ year: 2026, month: 1 }]);
    expect(monthsToFetch('2025-26', jst('2026-02-02T01:10:00'), true)).toEqual([
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });
  it('June finalisation reads May', () => {
    expect(monthsToFetch('2025-26', jst('2026-06-02T01:10:00'), true)).toEqual([{ year: 2026, month: 5 }]);
  });
});
