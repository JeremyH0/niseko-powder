import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jmaAmedas, type JmaRaw } from './jma-amedas.ts';
import type { ProviderContext } from './types.ts';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../../../tests/fixtures/jma/${name}`, import.meta.url), 'utf8'));

const block12 = fixture('point-16217-20261022_12.json');
const block15 = fixture('point-16217-20261022_15.json');
const now = new Date('2026-10-22T06:25:00Z'); // 15:25 JST

function ctxWith(routes: Record<string, () => Response>): ProviderContext {
  return {
    now,
    userAgent: 'test',
    fetch: (async (input: string | URL | Request) => {
      const url = String(input);
      const match = Object.entries(routes).find(([suffix]) => url.endsWith(suffix));
      if (!match) return new Response('not found', { status: 404 });
      return match[1]();
    }) as typeof fetch,
  };
}

const json = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200 });

describe('jma-amedas normalize (October fixture, off-season, raining in town)', () => {
  const raw: JmaRaw = { latestTime: '2026-10-22T15:20:00+09:00', rows: { ...block12, ...block15 } };
  const obs = jmaAmedas.normalize(raw, { stationId: '16217' }, ctxWith({}));

  it('uses the newest row for the observation time', () => {
    expect(obs.observedAt).toBe('2026-10-22T15:20:00+09:00');
    expect(obs.tempC).toEqual({ value: 4.8, ok: true });
  });

  it('finds hourly snow fields on the :00 row even when newer 10-min rows lack them', () => {
    // 15:20 row has no snow fields; 15:00 row has snow1h = [0, 6].
    expect(obs.newSnow.h1).toEqual({ value: 0, ok: false });
    expect(obs.newSnow.h24).toEqual({ value: 0, ok: false });
  });

  it('marks snow depth as unusable out of season ([null, 5])', () => {
    expect(obs.snowDepthCm).toEqual({ value: null, ok: false });
  });

  it('maps the 16-point wind direction index to degrees', () => {
    const dir = block15['20261022152000'].windDirection[0] as number;
    expect(obs.windDirDeg).toEqual({ value: (dir % 16) * 22.5, ok: true });
  });

  it('exposes town precipitation (rain detection)', () => {
    expect(obs.precip24hMm.ok).toBe(true);
    expect(obs.precip24hMm.value).toBeGreaterThan(0);
  });
});

describe('jma-amedas edge cases', () => {
  afterEach(() => vi.restoreAllMocks());

  it('treats calm (direction 0) as a valid null direction', () => {
    const raw: JmaRaw = {
      latestTime: null,
      rows: { '20260115060000': { temp: [-8.1, 0], windDirection: [0, 0], wind: [0, 0] } },
    };
    const obs = jmaAmedas.normalize(raw, { stationId: '16217' }, ctxWith({}));
    expect(obs.windDirDeg).toEqual({ value: null, ok: true });
    expect(obs.windMs).toEqual({ value: 0, ok: true });
  });

  it('reads an in-season powder morning and ignores stale fields', () => {
    const raw: JmaRaw = {
      latestTime: null,
      rows: {
        '20260115040000': { snow24h: [99, 0] }, // older than 70 min before latest → ignored
        '20260115060000': { snow: [182, 0], snow24h: [28, 0], snow12h: [21, 0], snow6h: [9, 0], snow1h: [2, 0] },
        '20260115061000': { temp: [-9.4, 0] },
      },
    };
    const obs = jmaAmedas.normalize(raw, { stationId: '16217' }, ctxWith({}));
    expect(obs.snowDepthCm).toEqual({ value: 182, ok: true });
    expect(obs.newSnow.h24).toEqual({ value: 28, ok: true });
    expect(obs.gustMs).toEqual({ value: null, ok: false });
  });

  it('treats quasi-normal (flag 1) as valid, like JMA does; doubtful (2–4) as not ok', () => {
    const raw: JmaRaw = {
      latestTime: null,
      rows: { '20260115060000': { temp: [-3.2, 1], wind: [4.1, 2], snow: [120, 4], snow24h: [8, 0] } },
    };
    const obs = jmaAmedas.normalize(raw, { stationId: '16217' }, ctxWith({}));
    expect(obs.tempC).toEqual({ value: -3.2, ok: true });
    expect(obs.windMs).toEqual({ value: 4.1, ok: false });
    expect(obs.snowDepthCm).toEqual({ value: 120, ok: false });
  });

  it('logs unknown quality flags but keeps the value as not-ok', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw: JmaRaw = { latestTime: null, rows: { '20260115060000': { temp: [-3.2, 9] } } };
    const obs = jmaAmedas.normalize(raw, { stationId: '16217' }, ctxWith({}));
    expect(obs.tempC).toEqual({ value: -3.2, ok: false });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('throws when there are no rows at all', () => {
    expect(() => jmaAmedas.normalize({ latestTime: null, rows: {} }, { stationId: '16217' }, ctxWith({}))).toThrow(
      /no rows/,
    );
  });
});

describe('jma-amedas fetchRaw', () => {
  it('fetches the current and previous 3-hour blocks from latest_time.txt', async () => {
    const raw = await jmaAmedas.fetchRaw(
      { stationId: '16217' },
      ctxWith({
        'latest_time.txt': () => new Response('2026-10-22T15:20:00+09:00'),
        '16217/20261022_15.json': json(block15),
        '16217/20261022_12.json': json(block12),
      }),
    );
    expect(Object.keys(raw.rows)).toHaveLength(21);
  });

  it('still works when latest_time.txt is down (falls back to now)', async () => {
    const raw = await jmaAmedas.fetchRaw(
      { stationId: '16217' },
      ctxWith({
        'latest_time.txt': () => new Response('', { status: 500 }),
        '16217/20261022_15.json': json(block15),
      }),
    );
    expect(Object.keys(raw.rows)).toHaveLength(3);
  });

  it('throws a ProviderError when JMA is down', async () => {
    await expect(
      jmaAmedas.fetchRaw(
        { stationId: '16217' },
        ctxWith({
          'latest_time.txt': () => new Response('', { status: 503 }),
          '.json': () => new Response('', { status: 503 }),
        }),
      ),
    ).rejects.toThrow('[jma-amedas] no observation rows available');
  });
});
