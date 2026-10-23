import { describe, expect, it } from 'vitest';
import { sunTimes } from './sun.ts';

const jst = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' });
const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return h * 60 + m;
};
const near = (actual: Date, expected: string, tol = 2) =>
  expect(Math.abs(minutes(jst(actual)) - minutes(expected))).toBeLessThanOrEqual(tol);

// Reference: National Astronomical Observatory of Japan (NAOJ) published times.
describe('sunTimes', () => {
  it('Sapporo, winter solstice: 07:03 / 16:03', () => {
    const s = sunTimes('2026-12-21', 43.0621, 141.3544);
    near(s.sunrise, '07:03');
    near(s.sunset, '16:03');
  });

  it('Sapporo, summer solstice: 03:55 / 19:18', () => {
    const s = sunTimes('2026-06-21', 43.0621, 141.3544);
    near(s.sunrise, '03:55');
    near(s.sunset, '19:18');
  });

  it('Tokyo, March equinox: 05:45 / 17:53', () => {
    const s = sunTimes('2026-03-20', 35.6895, 139.6917);
    near(s.sunrise, '05:45');
    near(s.sunset, '17:53');
  });

  it('Kutchan in December: about 9 hours of daylight', () => {
    const s = sunTimes('2026-12-21', 42.9, 140.7567);
    expect(s.dayLengthMin).toBeGreaterThan(8.8 * 60);
    expect(s.dayLengthMin).toBeLessThan(9.2 * 60);
  });
});
