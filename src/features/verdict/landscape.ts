/**
 * The hero landscape, generated: Yōtei's volcanic cone and the Niseko Annupuri range,
 * with natural ridgelines (seeded noise, so every render is identical), lit and shadowed
 * faces, a data-driven snowline that follows the gullies, and a conifer forest edge.
 * Pure: returns SVG path strings for a 1200 × 320 viewBox.
 */

export const LAND = { width: 1200, height: 320, step: 4 } as const;

export type Snowline = 'none' | 'peaks' | 'full';
export type Light = 'left' | 'right';

// ---------------------------------------------------------------- noise

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1-D fractal value noise in [-1, 1]. */
export function fbm(seed: number, octaves = 4) {
  const r = rng(seed);
  const lattice = Array.from({ length: 512 }, () => r() * 2 - 1);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = lattice[((i % 512) + 512) % 512] as number;
    const b = lattice[(((i + 1) % 512) + 512) % 512] as number;
    return a + (b - a) * smooth(f);
  };
  return (x: number) => {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += value(x * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm;
  };
}

// ---------------------------------------------------------------- helpers

const xs = Array.from({ length: Math.floor((LAND.width + 40) / LAND.step) + 1 }, (_, i) => -20 + i * LAND.step);
const f1 = (n: number) => n.toFixed(1);

function closedPath(points: [number, number][], bottom = LAND.height): string {
  if (!points.length) return '';
  const [first] = points;
  const last = points[points.length - 1] as [number, number];
  return `M${f1(first![0])} ${bottom}${points.map(([x, y]) => `L${f1(x)} ${f1(y)}`).join('')}L${f1(last[0])} ${bottom}Z`;
}

/** Fill between an upper line and a lower line wherever upper < lower. */
function bandPath(upper: (x: number) => number, lower: (x: number) => number, from: number, to: number): string {
  let d = '';
  let run: [number, number, number][] = [];
  const flush = () => {
    if (run.length > 1) {
      const top = run.map(([x, u]) => `L${f1(x)} ${f1(u)}`).join('').replace(/^L/, 'M');
      const bottom = [...run].reverse().map(([x, , l]) => `L${f1(x)} ${f1(l)}`).join('');
      d += `${top}${bottom}Z`;
    }
    run = [];
  };
  for (let x = from; x <= to; x += LAND.step) {
    const u = upper(x);
    const l = lower(x);
    if (u < l - 0.5) run.push([x, u, l]);
    else flush();
  }
  flush();
  return d;
}

/**
 * Shadow facets: from each local summit, down the lee side to the next valley.
 * `light` is where the sun comes from; the opposite flank of every peak is shaded.
 */
function facets(
  ridge: (x: number) => number,
  smooth: (x: number) => number,
  from: number,
  to: number,
  light: Light,
): string {
  const idx = xs.filter((x) => x >= from && x <= to);
  const sm = idx.map(smooth);
  // Summits of the *smoothed* ridge, so surface noise can't create stripes.
  const W = 8;
  const peaks: number[] = [];
  for (let i = W; i < idx.length - W; i++) {
    const y = sm[i] as number;
    let isPeak = true;
    for (let k = -W; k <= W && isPeak; k++) if (k !== 0 && (sm[i + k] as number) < y) isPeak = false;
    if (isPeak && (peaks.length === 0 || i - (peaks[peaks.length - 1] as number) > W)) peaks.push(i);
  }
  const dir = light === 'left' ? 1 : -1;
  let d = '';
  for (const p of peaks) {
    // Walk down the lee side (on the smooth ridge) until it climbs again.
    let i = p;
    while (i + dir > 0 && i + dir < idx.length - 1 && (sm[i + dir] as number) >= (sm[i] as number) - 0.15) i += dir;
    if (Math.abs(i - p) < 4) continue;
    const px = idx[p] as number;
    const vx = idx[i] as number;
    const outline: string[] = [];
    for (let k = p; k !== i + dir; k += dir) outline.push(`L${f1(idx[k] as number)} ${f1(ridge(idx[k] as number))}`);
    // Terminator: a diagonal from the summit to a point partway along the base — a wedge, like
    // light on a cone. The valley edge slants outward like a spur instead of dropping vertically.
    const footX = px + (vx - px) * 0.42;
    const spurX = vx + dir * Math.min(36, Math.abs(vx - px) * 0.4);
    d += `M${f1(px)} ${f1(ridge(px))}${outline.join('')}L${f1(spurX)} ${LAND.height}L${f1(footX)} ${LAND.height}Z`;
  }
  return d;
}

// ---------------------------------------------------------------- the scene

export interface Landscape {
  distant: string;
  yotei: { body: string; shadow: string; snow: string; summit: [number, number] };
  range: { body: string; shadow: string; snow: string; summit: [number, number] };
  forest: { ground: string; trees: string };
  front: string;
}

const SNOWLINE_Y: Record<Snowline, number | null> = { none: null, peaks: 128, full: 262 };

export function landscape({ snowline = 'peaks', light = 'left' }: { snowline?: Snowline; light?: Light } = {}): Landscape {
  const nDistant = fbm(11);
  const nYotei = fbm(23, 3);
  const nRange = fbm(37, 5);
  const nGully = fbm(51, 3);
  const nForest = fbm(73, 3);
  const r = rng(97);

  // Faint hills on the far horizon.
  const distant = (x: number) => 206 + nDistant(x / 140) * 16 + Math.sin(x / 260) * 6;

  // Yōtei: concave stratovolcano flanks (steep near the top, spreading at the base), small crater rim.
  const Y = { cx: 930, top: 58, base: 300, R: 400 };
  const yoteiSmooth = (x: number) => {
    const d = Math.abs(x - Y.cx);
    if (d > Y.R) return LAND.height + 10;
    if (d < 12) return Y.top + 1.5; // crater rim
    return Y.top + (Y.base - Y.top) * ((d - 12) / (Y.R - 12)) ** 0.62;
  };
  const yotei = (x: number) => {
    const d = Math.abs(x - Y.cx);
    if (d > Y.R) return LAND.height + 10;
    const t = Math.max(0, (d - 12) / (Y.R - 12));
    return yoteiSmooth(x) + nYotei(x / 22) * 3.5 * t + (d < 12 ? nYotei(x / 6) * 1.2 : 0);
  };

  // Annupuri range: named summits as soft peaks, plus natural detail.
  // Old volcanic domes: broad and rounded, not Alpine needles.
  const peaks = [
    { x: 30, h: 104, w: 82 }, // Iwaonupuri side
    { x: 138, h: 138, w: 92 }, // Nitonupuri
    { x: 232, h: 128, w: 82 }, // Chisenupuri
    { x: 345, h: 184, w: 140 }, // Niseko Annupuri, 1,308 m (Yōtei, 1,898 m, must stay taller)
    { x: 488, h: 118, w: 122 }, // Hirafu-side shoulder
    { x: 625, h: 62, w: 132 },
  ];
  const envelope = (x: number) => Math.max(...peaks.map((p) => p.h * Math.exp(-(((x - p.x) / p.w) ** 2))));
  const rangeSmooth = (x: number) => 300 - 34 - envelope(x);
  const range = (x: number) => rangeSmooth(x) - nRange(x / 46) * 6 * (0.35 + envelope(x) / 184);

  // Snowline with gullies: snow reaches further down in the creases.
  const snowY = SNOWLINE_Y[snowline];
  const snowEdge = (base: number) => (x: number) => base + nGully(x / 9) * 14 + Math.max(0, nGully(x / 3.5)) * 22;

  const yPts = xs.filter((x) => Math.abs(x - Y.cx) <= Y.R).map((x) => [x, yotei(x)] as [number, number]);
  const rPts = xs.filter((x) => x <= 760).map((x) => [x, Math.min(range(x), 300)] as [number, number]);

  const yoteiSnow = snowY === null ? '' : bandPath(yotei, (x) => Math.min(snowEdge(snowY - 18)(x), 300), Y.cx - Y.R, Y.cx + Y.R);
  const rangeSnow = snowY === null ? '' : bandPath(range, (x) => Math.min(snowEdge(snowY)(x), 300), -20, 760);

  // Forest edge: a low ridge with firs along its crest.
  const forestRidge = (x: number) => 262 + nForest(x / 90) * 10 + Math.sin(x / 170) * 5;
  let trees = '';
  for (let x = -16; x < LAND.width + 16; x += 5 + r() * 7) {
    const base = forestRidge(x) + 2;
    const h = 9 + r() * 15;
    const w = h * (0.34 + r() * 0.12);
    // Two-tier fir silhouette.
    trees += `M${f1(x - w / 2)} ${f1(base)}L${f1(x)} ${f1(base - h)}L${f1(x + w / 2)} ${f1(base)}Z`;
    trees += `M${f1(x - w * 0.36)} ${f1(base - h * 0.42)}L${f1(x)} ${f1(base - h * 1.12)}L${f1(x + w * 0.36)} ${f1(base - h * 0.42)}Z`;
  }

  const front = (x: number) => 288 + Math.sin(x / 210) * 5 + Math.sin(x / 77) * 2;

  const rangeSummitX = rPts.reduce((best, p) => (p[1] < best[1] ? p : best), [0, 999] as [number, number]);

  return {
    distant: closedPath(xs.map((x) => [x, distant(x)])),
    yotei: {
      body: closedPath(yPts),
      shadow: facets(yotei, yoteiSmooth, Y.cx - Y.R, Y.cx + Y.R, light),
      snow: yoteiSnow,
      summit: [Y.cx, Y.top],
    },
    range: {
      body: closedPath(rPts),
      shadow: facets(range, rangeSmooth, -20, 760, light),
      snow: rangeSnow,
      summit: rangeSummitX,
    },
    forest: { ground: closedPath(xs.map((x) => [x, forestRidge(x)])), trees },
    front: closedPath(xs.map((x) => [x, front(x)])),
  };
}
