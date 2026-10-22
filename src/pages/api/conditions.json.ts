import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { DEFAULT_LOCATION_ID } from '../../config/locations.ts';
import { readConditions } from '../../lib/data/store.ts';

export const prerender = false;

/** Latest normalized conditions, straight from KV. Refreshed hourly by the cron. */
export const GET: APIRoute = async () => {
  const conditions = await readConditions(env.CONDITIONS, DEFAULT_LOCATION_ID);
  if (!conditions) {
    return Response.json(
      { error: 'No data yet — the first refresh runs within the hour.' },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '600' } },
    );
  }
  return Response.json(conditions, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
