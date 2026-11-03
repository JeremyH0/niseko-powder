/**
 * Texture masks for the hero landscape, from the per-pixel raster: snow cover (by real
 * altitude, slope and a forest line), shadow (by how each slope faces the sun) and haze
 * (by real distance). Each is 0…1 per pixel; the page tints them with the sky's colours,
 * so one set of masks serves every time of day. Pure.
 */
import type { Raster } from './raster.ts';

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Value noise on a ground grid of `cellM` metres, so patterns stay put on the terrain. */
export function groundNoise(seed: number, cellM: number) {
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  return (lat: number, lon: number) => {
    const gx = (lon * 111_320 * Math.cos((lat * Math.PI) / 180)) / cellM;
    const gy = (lat * 110_540) / cellM;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx = gx - x0;
    const fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx;
    const b = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}

export interface MaskOptions {
  peaksSnowlineM: number;
  treelineM: number;
}

export type MaskName = 'haze' | 'snow-peaks' | 'snow-full' | 'shade-left' | 'shade-right';

export function buildMasks(r: Raster, o: MaskOptions): Record<MaskName, Uint8Array> {
  const n = r.width * r.height;
  const out = {
    haze: new Uint8Array(n),
    'snow-peaks': new Uint8Array(n),
    'snow-full': new Uint8Array(n),
    'shade-left': new Uint8Array(n),
    'shade-right': new Uint8Array(n),
  } satisfies Record<MaskName, Uint8Array>;
  const broad = groundNoise(7, 420);
  const fine = groundNoise(13, 90);
  const grain = groundNoise(29, 35);
  const byte = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255);

  for (let i = 0; i < n; i++) {
    const km = r.dist[i] as number;
    if (Number.isNaN(km)) continue;
    const h = r.elev[i] as number;
    const slope = r.slope[i] as number;
    // Gullies hold snow lower down; ribs lose it sooner (±1 roughly spans the range here).
    const gully = Math.max(-1, Math.min(1, (r.curv[i] as number) * 9000));
    const lat = r.lat[i] as number;
    const lon = r.lon[i] as number;
    const b = broad(lat, lon);
    const f = fine(lat, lon);
    const g = grain(lat, lon);

    // Air between us and the ground: exponential with distance, thicker in the valleys.
    out.haze[i] = byte(1 - Math.exp(-km / 17) + (1 - smooth(250, 750, h)) * 0.12);

    // Snow clings to gentle ground and gullies; cliffs and wind-scoured ribs stay darker.
    const steep = smooth(0.7, 1.25, slope);
    const line = o.peaksSnowlineM + (b - 0.5) * 220 + (f - 0.5) * 80 - gully * 160;
    out['snow-peaks'][i] = byte(smooth(-40, 60, h - line) * (1 - steep * 0.6));

    // Deep winter: white above the forest; below it, trees speckle through the snow.
    const tree = 1 - smooth(-80, 80, h - (o.treelineM + (b - 0.5) * 200 - gully * 120));
    // Tree detail fades with distance: far forest reads as an even grey, not stripes.
    const detail = smooth(16, 3, km);
    const forest = tree * (0.24 + (0.2 * smooth(0.35, 0.8, f) + 0.12 * g) * detail);
    const fields = smooth(0.08, 0.02, slope) * smooth(450, 300, h);
    out['snow-full'][i] = byte((1 - forest * (1 - fields)) * (1 - steep * 0.45));

    // Shade: slopes turned from the sun; a little grain so it reads as texture, not airbrush.
    const lit = (k: number) => (r.light[k] as Float32Array)[i] as number;
    out['shade-left'][i] = byte(smooth(0.62, 0.02, lit(0) + (g - 0.5) * 0.08));
    out['shade-right'][i] = byte(smooth(0.62, 0.02, lit(1) + (g - 0.5) * 0.08));
  }

  // Soften the 30 m elevation grid (it shows as ripples at grazing angles). Terrain-only, so
  // the empty sky never bleeds into the edge.
  const ground = (i: number) => (Number.isNaN(r.dist[i] as number) ? 0 : 1);
  for (const name of ['snow-full', 'snow-peaks', 'shade-left', 'shade-right'] as const) {
    out[name] = blurTerrain(out[name], r.width, r.height, ground, 1);
    // Shade carries the grid ripples; snow edges should stay crisp.
    if (name.startsWith('shade')) out[name] = blurTerrain(out[name], r.width, r.height, ground, 1);
  }

  // 86 levels, not 256: invisible under the tint, and the PNGs compress far better.
  for (const mask of Object.values(out)) for (let i = 0; i < n; i++) mask[i] = Math.round((mask[i] as number) / 3) * 3;

  // Bleed the top terrain row up two pixels: the vector skyline clips the edge, so the
  // texture must not stop short of it.
  for (const mask of Object.values(out)) {
    for (let x = 0; x < r.width; x++) {
      const top = Math.max(0, Math.floor(r.top[x] as number));
      let y = top;
      while (y < r.height && Number.isNaN(r.dist[y * r.width + x] as number)) y++;
      if (y >= r.height) continue;
      for (let k = Math.max(0, y - 3); k < y; k++) mask[k * r.width + x] = mask[y * r.width + x] as number;
    }
  }
  return out;
}

/** Box blur over terrain pixels only (normalised by how many neighbours are terrain). */
function blurTerrain(src: Uint8Array, w: number, h: number, ground: (i: number) => number, r: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!ground(i)) continue;
      let sum = 0;
      let n = 0;
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (!ground(j)) continue;
          sum += src[j] as number;
          n++;
        }
      }
      out[i] = Math.round(sum / n);
    }
  }
  return out;
}
