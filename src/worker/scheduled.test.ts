import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Job, JobContext } from './jobs/types.ts';
import { runJobs } from './scheduled.ts';

const ctx: JobContext = {
  env: {} as Env,
  cron: '10 * * * *',
  now: new Date('2026-10-22T06:10:00Z'),
};

function job(id: string, run: Job['run'], crons?: string[]): Job {
  return { id, description: id, run, crons };
}

describe('runJobs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('runs every job and reports success', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const a = vi.fn(async () => {});
    const b = vi.fn(async () => {});
    const outcomes = await runJobs([job('a', a), job('b', b)], ctx);
    expect(a).toHaveBeenCalledWith(ctx);
    expect(b).toHaveBeenCalledOnce();
    expect(outcomes.map((o) => [o.id, o.ok])).toEqual([
      ['a', true],
      ['b', true],
    ]);
  });

  it('isolates a failing job from the others', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn(async () => {});
    const outcomes = await runJobs(
      [
        job('broken', async () => {
          throw new Error('JMA is down');
        }),
        job('fine', ok),
      ],
      ctx,
    );
    expect(ok).toHaveBeenCalledOnce();
    expect(outcomes).toEqual([
      expect.objectContaining({ id: 'broken', ok: false, error: 'JMA is down' }),
      expect.objectContaining({ id: 'fine', ok: true }),
    ]);
  });

  it('skips jobs restricted to other crons', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const daily = vi.fn(async () => {});
    const outcomes = await runJobs([job('daily', daily, ['0 15 * * *'])], ctx);
    expect(daily).not.toHaveBeenCalled();
    expect(outcomes).toEqual([]);
  });
});
