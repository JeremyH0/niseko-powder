/** KV keys and typed access for stored conditions. */
import type { Conditions } from './types.ts';

export const conditionsKey = (locationId: string) => `conditions:${locationId}`;

export async function readConditions(kv: KVNamespace, locationId: string): Promise<Conditions | null> {
  try {
    return await kv.get<Conditions>(conditionsKey(locationId), 'json');
  } catch (err) {
    console.error(JSON.stringify({ event: 'kv.read-failed', locationId, error: String(err) }));
    return null;
  }
}

export async function writeConditions(kv: KVNamespace, conditions: Conditions): Promise<void> {
  await kv.put(conditionsKey(conditions.locationId), JSON.stringify(conditions));
}
