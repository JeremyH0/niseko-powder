import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { bearingTo, destination, elevationAngle } from './geo.ts';
import { buildMasks } from './masks.ts';
import { castRaster, encodeAlphaPng } from './raster.ts';
import { project, simplify, skylinePath } from './render.ts';
import { decodePng, sampler, terrariumHeights, TILE } from './terrarium.ts';

describe('geo', () => {
  it('destination and bearingTo agree', () => {
    const [lat, lon] = destination(42.93, 140.8, 175, 11_500);
    const back = bearingTo(42.93, 140.8, lat, lon);
    expect(back.bearing).toBeCloseTo(175, 3);
    expect(back.m).toBeCloseTo(11_500, 0);
  });

  it('far terrain sinks below the horizon with the curve of the Earth', () => {
    expect(elevationAngle(100, 1000, 100)).toBeCloseTo(0, 1);
    expect(elevationAngle(100, 50_000, 100)).toBeLessThan(-0.1);
  });
});

/** A 256 × 256 Terrarium tile with every pixel at `m` metres. */
function terrariumTile(m: number): Uint8Array {
  const v = m + 32768;
  const raw = new Uint8Array(TILE * (TILE * 3 + 1));
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) raw.set([Math.floor(v / 256), Math.floor(v) % 256, Math.round((v % 1) * 256)], y * (TILE * 3 + 1) + 1 + x * 3);
  }
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    new DataView(out.buffer).setUint32(0, body.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(body, 8);
    return out; // CRC isn't checked by the decoder
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, TILE);
  new DataView(ihdr.buffer).setUint32(4, TILE);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]);
}

describe('terrarium', () => {
  it('decodes heights from RGB', () => {
    const h = terrariumHeights(terrariumTile(1898));
    expect(h[0]).toBeCloseTo(1898, 1);
    expect(h[TILE * TILE - 1]).toBeCloseTo(1898, 1);
  });

  it('samples bilinearly and treats missing tiles as sea level', () => {
    const flat = terrariumHeights(terrariumTile(500));
    expect(sampler(12, () => flat)(42.9, 140.8)).toBeCloseTo(500, 1);
    expect(sampler(12, () => null)(42.9, 140.8)).toBe(0);
  });

  it('round-trips the alpha masks it writes', () => {
    const alpha = Uint8Array.from({ length: 12 }, (_, i) => i * 20);
    const png = decodePng(encodeAlphaPng(4, 3, alpha));
    expect(png.width).toBe(4);
    expect(png.channels).toBe(2);
  });
});

describe('render', () => {
  it('simplify keeps the ends and drops collinear points', () => {
    const line: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 5], [4, 0]];
    expect(simplify(line, 0.5)).toEqual([[0, 0], [2, 0], [3, 5], [4, 0]]);
  });

  it('skyline is a closed path along the bottom edge', () => {
    const d = skylinePath([100, 50, 100], 300, 320, 0.3);
    expect(d.startsWith('M0 320')).toBe(true);
    expect(d.endsWith('L300 320Z')).toBe(true);
  });

  it('projects the edges of the view to the edges of the picture', () => {
    const p = { azFrom: 150, azTo: 262, width: 1200, horizonY: 300, exaggeration: 1.9 };
    expect(project(p, 150, 0)).toEqual([0, 300]);
    expect(project(p, 262, 0)[0]).toBeCloseTo(1200);
    expect(project(p, 200, 5)[1]).toBeLessThan(300);
  });
});

// A synthetic volcano 10 km south of the viewer: 1,800 m cone on a 200 m plain.
const VIEW = { lat: 42.93, lon: 140.8 };
const [peakLat, peakLon] = destination(VIEW.lat, VIEW.lon, 180, 10_000);
const cone = (lat: number, lon: number) => {
  const { m } = bearingTo(peakLat, peakLon, lat, lon);
  return Math.max(200, 1800 - m * 0.4);
};

describe('raster', () => {
  const r = castRaster(cone, {
    ...VIEW,
    eyeM: 202,
    azFrom: 150,
    azTo: 210,
    maxKm: 20,
    width: 60,
    height: 40,
    horizonY: 36,
    exaggeration: 1,
    lights: [{ bearing: 120, altitude: 24 }, { bearing: 250, altitude: 16 }],
  });

  it('the skyline peaks where the summit is', () => {
    const top = [...r.top];
    const highest = top.indexOf(Math.min(...top));
    expect(highest).toBeGreaterThanOrEqual(28);
    expect(highest).toBeLessThanOrEqual(31);
  });

  it('every ground pixel knows its distance and height; sky stays empty', () => {
    expect(Number.isNaN(r.dist[0] as number)).toBe(true);
    const i = 39 * 60 + 30;
    expect(r.dist[i]).toBeGreaterThan(0);
    expect(r.elev[i]).toBeGreaterThanOrEqual(199);
  });

  it('masks: snow above the line, haze grows with distance', () => {
    const m = buildMasks(r, { peaksSnowlineM: 1000, treelineM: 1000 });
    const col = 30;
    const summitRow = Math.ceil(r.top[col] as number);
    const footRow = 39;
    expect(m['snow-peaks'][summitRow * 60 + col]).toBeGreaterThan(200);
    expect(m['snow-peaks'][footRow * 60 + col]).toBe(0);
    expect(m.haze[summitRow * 60 + col]).toBeGreaterThan(m.haze[footRow * 60 + col] as number);
  });
});
