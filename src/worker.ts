/**
 * Worker entry point (wrangler.jsonc → "main").
 * - fetch:     every HTTP request is handled by Astro.
 * - scheduled: Cron Trigger → run the job registry.
 */
import { handle } from '@astrojs/cloudflare/handler';
import { jobs } from './worker/jobs/index.ts';
import { runJobs } from './worker/scheduled.ts';
import { REFRESH_HEADER, refreshIfUnlocked } from './worker/self-heal.ts';

export default {
  async fetch(request, env, ctx) {
    const response = await handle(request, env, ctx);
    if (!response.headers.has(REFRESH_HEADER)) return response;
    ctx.waitUntil(refreshIfUnlocked(env, new Date()));
    const clean = new Response(response.body, response);
    clean.headers.delete(REFRESH_HEADER);
    return clean;
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
