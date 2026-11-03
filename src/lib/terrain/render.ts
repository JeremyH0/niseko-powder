/**
 * The vector side of the hero landscape: the skyline as one SVG path (simplified so the
 * page stays light) and where the named summits sit. Same projection as raster.ts. Pure.
 */
const DEG = Math.PI / 180;

export interface Projection {
  azFrom: number;
  azTo: number;
  width: number;
  horizonY: number;
  exaggeration: number;
}

export interface PanoramaScene {
  width: number;
  height: number;
  /** Closed path: the skyline down to the bottom edge. */
  skyline: string;
  peaks: { id: string; x: number; y: number; km: number }[];
}

type Pt = [number, number];
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Ramer–Douglas–Peucker. */
export function simplify(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop() as [number, number];
    const [ax, ay] = points[a] as Pt;
    const [bx, by] = points[b] as Pt;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let worst = -1;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i] as Pt;
      const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Skyline from per-column tops (pixel centres), closed along the bottom edge. */
export function skylinePath(top: ArrayLike<number>, width: number, height: number, tolerance: number): string {
  const n = top.length;
  const pts: Pt[] = Array.from({ length: n }, (_, i) => [((i + 0.5) * width) / n, Math.min(top[i] as number, height)]);
  pts.unshift([0, (pts[0] as Pt)[1]]);
  pts.push([width, (pts[pts.length - 1] as Pt)[1]]);
  const line = simplify(pts, tolerance);
  return `M0 ${height}${line.map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('')}L${width} ${height}Z`;
}

/** Where a point at `bearing`, `angle` degrees up, lands in the picture. */
export function project(p: Projection, bearing: number, angle: number): Pt {
  const focal = p.width / ((p.azTo - p.azFrom) * DEG);
  return [((bearing - p.azFrom) / (p.azTo - p.azFrom)) * p.width, p.horizonY - Math.tan(angle * DEG) * focal * p.exaggeration];
}
