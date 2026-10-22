export interface JobContext {
  env: Env;
  /** The cron expression that fired (from wrangler.jsonc `triggers.crons`). */
  cron: string;
  /** Scheduled time of this run. Use this instead of `new Date()` so runs are reproducible. */
  now: Date;
}

export interface Job {
  /** Stable, kebab-case. Used in logs and KV keys. */
  id: string;
  description: string;
  /** Only run on these cron expressions. Omit to run on every trigger. */
  crons?: readonly string[];
  /**
   * Do the work. Throw on failure: the runner isolates jobs, so one failing job
   * never stops the others. Never overwrite good stored data with an error.
   */
  run(ctx: JobContext): Promise<void>;
}
