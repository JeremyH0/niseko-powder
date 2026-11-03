/**
 * Elevation tiles in the "Terrarium" format (AWS Terrain Tiles, public SRTM / GMTED data):
 * 256 × 256 RGB PNGs where metres = R·256 + G + B/256 − 32768.
 * Build-time only (scripts/build-panorama.ts); nothing here ships to the browser.
 */
import { inflateSync } from 'node:zlib';

export const TILE = 256;

/** Minimal PNG decoder: 8-bit grey, grey+alpha, RGB or RGBA, not interlaced (Terrarium tiles are RGB). */
export function decodePng(buf: Uint8Array): { width: number; height: number; channels: number; data: Uint8Array } {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat: Uint8Array[] = [];
  while (pos < buf.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...buf.subarray(pos + 4, pos + 8));
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      const b = new DataView(body.buffer, body.byteOffset, body.byteLength);
      width = b.getUint32(0);
      height = b.getUint32(4);
      const depth = body[8];
      const colour = body[9];
      const perColour: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };
      if (depth !== 8 || colour === undefined || !perColour[colour] || body[12] !== 0) throw new Error('Unsupported PNG');
      channels = perColour[colour] as number;
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const data = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? (data[y * stride + x - channels] as number) : 0;
      const b = y > 0 ? (data[(y - 1) * stride + x] as number) : 0;
      const c = x >= channels && y > 0 ? (data[(y - 1) * stride + x - channels] as number) : 0;
      let v = line[x] as number;
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      data[y * stride + x] = v & 0xff;
    }
  }
  return { width, height, channels, data };
}

/** Metres for every pixel of a Terrarium tile, row-major. */
export function terrariumHeights(png: Uint8Array): Float32Array {
  const { width, height, channels, data } = decodePng(png);
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i++) {
    const o = i * channels;
    out[i] = (data[o] as number) * 256 + (data[o + 1] as number) + (data[o + 2] as number) / 256 - 32768;
  }
  return out;
}

/** Web-Mercator position (fractional tile units) of a point at zoom z. */
export function tileXY(lat: number, lon: number, z: number): [number, number] {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n];
}

/**
 * A bilinear elevation sampler over tiles you have already loaded.
 * `tile(x, y)` returns the heights of one tile, or null if it is not available.
 */
export function sampler(z: number, tile: (x: number, y: number) => Float32Array | null) {
  const px = (x: number, y: number): number => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    const t = tile(tx, ty);
    if (!t) return 0;
    return t[(y - ty * TILE) * TILE + (x - tx * TILE)] as number;
  };
  return (lat: number, lon: number): number => {
    const [fx, fy] = tileXY(lat, lon, z);
    const x = fx * TILE - 0.5;
    const y = fy * TILE - 0.5;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const dx = x - x0;
    const dy = y - y0;
    const top = px(x0, y0) * (1 - dx) + px(x0 + 1, y0) * dx;
    const bottom = px(x0, y0 + 1) * (1 - dx) + px(x0 + 1, y0 + 1) * dx;
    return Math.max(0, top * (1 - dy) + bottom * dy);
  };
}
