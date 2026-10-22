import { describe, expect, it } from 'vitest';
import {
  compass,
  dateFromJstDay,
  formatAge,
  formatClock,
  formatCm,
  formatFullDate,
  formatTemp,
  formatWeekday,
} from './format.ts';

describe('format', () => {
  it('shows times in JST regardless of the server timezone', () => {
    expect(formatClock('2026-10-22T06:40:00Z')).toBe('15:40');
    expect(formatFullDate('2026-10-22T15:30:00Z')).toBe('Fri 23 Oct');
    expect(formatWeekday(dateFromJstDay('2026-10-24'))).toBe('Sat');
  });

  it('formats temperatures with a real minus sign and no "−0"', () => {
    expect(formatTemp(-4.4)).toBe('−4°');
    expect(formatTemp(-0.2)).toBe('0°');
    expect(formatTemp(12.6)).toBe('13°');
    expect(formatTemp(null)).toBe('—');
  });

  it('formats snow amounts', () => {
    expect(formatCm(0)).toBe('0');
    expect(formatCm(0.4)).toBe('<1');
    expect(formatCm(20.79)).toBe('21');
    expect(formatCm(undefined)).toBe('—');
  });

  it('maps degrees to compass points', () => {
    expect(compass(0)).toBe('N');
    expect(compass(225)).toBe('SW');
    expect(compass(350)).toBe('N');
    expect(compass(null)).toBe('');
  });

  it('formats ages', () => {
    expect(formatAge(12.4)).toBe('12 min');
    expect(formatAge(185)).toBe('3 h');
    expect(formatAge(3000)).toBe('2 days');
  });
});
