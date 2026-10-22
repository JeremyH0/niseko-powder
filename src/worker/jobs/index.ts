import { heartbeat } from './heartbeat.ts';
import { refreshConditions } from './refresh-conditions.ts';
import type { Job } from './types.ts';

/**
 * Every scheduled job, in one list. To add a job: create a file in this folder
 * exporting a `Job`, then add it here.
 */
export const jobs: readonly Job[] = [heartbeat, refreshConditions];
