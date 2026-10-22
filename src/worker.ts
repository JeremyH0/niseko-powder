/**
 * Worker entry point (wrangler.jsonc → "main").
 * - fetch:     every HTTP request is handled by Astro.
 * - scheduled: Cron Trigger → run the job registry.
 */
import { handle } from '@astrojs/cloudflare/handler';
import { jobs } from './worker/jobs/index.ts';
import { runJobs } from './worker/scheduled.ts';

export default {
  fetch(request, env, ctx) {
    return handle(request, env, ctx);
  },

  async scheduled(controller, env) {
    const outcomes = await runJobs(jobs, {
      env,
      cron: controller.cron,
      now: new Date(controller.scheduledTime),
    });
    const failed = outcomes.filter((o) => !o.ok);
    if (failed.length > 0) {
      // Every job has already run; throwing marks this invocation as failed in Cloudflare's logs.
      throw new Error(`${failed.length} job(s) failed: ${failed.map((o) => o.id).join(', ')}`);
    }
  },
} satisfies ExportedHandler<Env>;
