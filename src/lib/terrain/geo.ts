/**
 * Geometry for seeing terrain from a viewpoint on a round Earth: walking along a bearing,
 * and the angle a point appears above the horizon (curvature and refraction included).
 * Pure.
 */

export type Elevation = (lat: number, lon: number) => number;

const EARTH_R = 6_371_000;
/** Standard terrestrial refraction coefficient: lifts distant terrain slightly. */
const REFRACTION = 0.13;
const DEG = Math.PI / 180;

/** Destination point from (lat, lon), bearing (deg) and distance (m) on a sphere. */
export function destination(lat: number, lon: number, bearing: number, m: number): [number, number] {
  const d = m / EARTH_R;
  const b = bearing * DEG;
  const p1 = lat * DEG;
  const l1 = lon * DEG;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 / DEG, l2 / DEG];
}

/** Bearing (deg) and distance (m) from one point to another. */
export function bearingTo(lat1: number, lon1: number, lat2: number, lon2: number): { bearing: number; m: number } {
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const dl = (lon2 - lon1) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return { bearing: ((Math.atan2(y, x) / DEG) + 360) % 360, m: 2 * EARTH_R * Math.asin(Math.sqrt(a)) };
}

/** Elevation angle (deg) of a point h metres high, m metres away, seen from eyeM. */
export function elevationAngle(h: number, m: number, eyeM: number): number {
  const drop = ((m * m) / (2 * EARTH_R)) * (1 - REFRACTION);
  return Math.atan2(h - drop - eyeM, m) / DEG;
}
