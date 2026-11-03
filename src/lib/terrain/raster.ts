/**
 * Per-pixel view of the terrain for the hero's texture masks: for every pixel of the
 * panorama, which ground point it shows, how far away it is, how high, how steep, and how
 * it faces each light. The same cylindrical projection as render.ts, so the masks line up
 * with the vector skyline exactly. Pure (the elevation lookup is passed in).
 */
import { deflateSync } from 'node:zlib';
import { destination, elevationAngle, type Elevation } from './geo.ts';

export interface RasterOptions {
  lat: number;
  lon: number;
  eyeM: number;
  azFrom: number;
  azTo: number;
  maxKm: number;
  width: number;
  height: number;
  horizonY: number;
  exaggeration: number;
  /** Sun positions to shade for: bearing and altitude, degrees. */
  lights: readonly { bearing: number; altitude: number }[];
}

export interface Raster {
  width: number;
  height: number;
  /** Skyline per column, in pixels from the top (fractional). */
  top: Float32Array;
  /** Per pixel, row-major. Sky pixels: dist = NaN. */
  dist: Float32Array;
  elev: Float32Array;
  /** Slope, 0 = flat, 1 = 45°. */
  slope: Float32Array;
  /** Curvature (Laplacian, 1/m): positive in gullies and hollows. */
  curv: Float32Array;
  /** Lambert term (n · sun) per light, −1…1. */
  light: Float32Array[];
  /** Ground position, for location-stable noise. */
  lat: Float32Array;
  lon: Float32Array;
}

const DEG = Math.PI / 180;

export function castRaster(elevation: Elevation, o: RasterOptions): Raster {
  const { width: W, height: H } = o;
  const focal = W / ((o.azTo - o.azFrom) * DEG);
  const yOf = (angle: number) => o.horizonY - Math.tan(angle * DEG) * focal * o.exaggeration;
  const n = W * H;
  const r: Raster = {
    width: W,
    height: H,
    top: new Float32Array(W),
    dist: new Float32Array(n).fill(Number.NaN),
    elev: new Float32Array(n),
    slope: new Float32Array(n),
    curv: new Float32Array(n),
    light: o.lights.map(() => new Float32Array(n)),
    lat: new Float32Array(n),
    lon: new Float32Array(n),
  };
  const suns = o.lights.map((l) => [
    Math.sin(l.bearing * DEG) * Math.cos(l.altitude * DEG),
    Math.cos(l.bearing * DEG) * Math.cos(l.altitude * DEG),
    Math.sin(l.altitude * DEG),
  ]);
  // Normals and curvature from central differences over a few DEM cells, so the 30 m grid
  // doesn't show through as facets.
  const STEP = 110;

  for (let x = 0; x < W; x++) {
    const az = o.azFrom + ((o.azTo - o.azFrom) * (x + 0.5)) / W;
    let max = -90;
    // Pixel rows are filled bottom-up as the ray rises. Rows between two visible ground
    // points get values interpolated between them, so steep faces don't streak.
    let row = H - 1;
    let prevY = H + 0.5;
    let prev: number[] | null = null;
    for (let m = 120; m <= o.maxKm * 1000; m += Math.max(15, m * 0.0016)) {
      const [lat, lon] = destination(o.lat, o.lon, az, m);
      const h = elevation(lat, lon);
      const angle = elevationAngle(h, m, o.eyeM);
      if (angle <= max) continue;
      max = angle;
      const y = yOf(angle);
      if (y >= row + 0.5) {
        prev = null;
        continue;
      }
      const at = (b: number, d: number) => destination(lat, lon, b, d);
      const e = elevation(...at(90, STEP));
      const w = elevation(...at(270, STEP));
      const nn = elevation(...at(0, STEP));
      const s = elevation(...at(180, STEP));
      const dzdx = (e - w) / (2 * STEP);
      const dzdy = (nn - s) / (2 * STEP);
      const len = Math.hypot(dzdx, dzdy, 1);
      const nx = -dzdx / len;
      const ny = -dzdy / len;
      const nz = 1 / len;
      const cur = [
        m / 1000,
        h,
        Math.hypot(dzdx, dzdy),
        // Positive in hollows and gullies, negative on ribs.
        (e + w + nn + s - 4 * h) / (STEP * STEP),
        lat,
        lon,
        ...suns.map((v) => nx * (v[0] as number) + ny * (v[1] as number) + nz * (v[2] as number)),
      ];
      for (; row >= 0 && row + 0.5 >= y; row--) {
        const t = prev ? (prevY - (row + 0.5)) / (prevY - y) : 1;
        const v = prev ? cur.map((c, k) => (prev as number[])[k] as number + (c - ((prev as number[])[k] as number)) * Math.min(1, Math.max(0, t))) : cur;
        const i = row * W + x;
        r.dist[i] = v[0] as number;
        r.elev[i] = v[1] as number;
        r.slope[i] = v[2] as number;
        r.curv[i] = v[3] as number;
        r.lat[i] = v[4] as number;
        r.lon[i] = v[5] as number;
        for (let k = 0; k < o.lights.length; k++) (r.light[k] as Float32Array)[i] = v[6 + k] as number;
      }
      prev = cur;
      prevY = y;
    }
    r.top[x] = yOf(max);
  }
  return r;
}

// ---------------------------------------------------------------- PNG out


const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf: Uint8Array): number {
  let c = -1;
  for (const b of buf) c = (CRC[(c ^ b) & 0xff] as number) ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, body.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(body, 8);
  v.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/**
 * PNG whose alpha channel is the mask (grey+alpha, grey fixed at 0): CSS masks read alpha.
 * Sub filter on both channels; these masks are smooth, so it compresses well.
 */
export function encodeAlphaPng(width: number, height: number, alpha: Uint8Array): Uint8Array {
  const stride = width * 2 + 1;
  const raw = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 1;
    for (let x = 0; x < width; x++) {
      const v = alpha[y * width + x] as number;
      const left = x ? (alpha[y * width + x - 1] as number) : 0;
      raw[y * stride + 2 + x * 2] = (v - left) & 0xff;
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 4; // grey + alpha
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ];
  return Buffer.concat(parts);
}
