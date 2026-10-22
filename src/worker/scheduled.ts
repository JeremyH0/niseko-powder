import type { Job, JobContext } from './jobs/types.ts';

export interface JobOutcome {
  id: string;
  ok: boolean;
  ms: number;
  error?: string;
}

/** Run every job due for this cron, in parallel, isolating failures. */
export async function runJobs(jobs: readonly Job[], ctx: JobContext): Promise<JobOutcome[]> {
  const due = jobs.filter((job) => !job.crons || job.crons.includes(ctx.cron));

  return Promise.all(
    due.map(async (job): Promise<JobOutcome> => {
      const started = Date.now();
      try {
        await job.run(ctx);
        const outcome = { id: job.id, ok: true, ms: Date.now() - started };
        console.log(JSON.stringify({ event: 'job.ok', ...outcome }));
        return outcome;
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const outcome = { id: job.id, ok: false, ms: Date.now() - started, error };
        console.error(JSON.stringify({ event: 'job.failed', ...outcome }));
        return outcome;
      }
    }),
  );
}
