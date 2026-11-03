/**
 * Client-side snowfall (and rain) over the hero. Reads its parameters from data attributes
 * rendered by the server (see intensity.ts), so it never fetches anything.
 *
 * Snow is drawn like a camera sees it: tiny crisp flakes far away, soft ones in the middle,
 * and a few large out-of-focus flakes close to the lens. Flakes are pre-rendered sprites
 * (one radial gradient each), so a frame is just drawImage calls. Motion is wind drift with
 * gusts plus a little turbulence per flake, scaled by real time so it's the same at 60 or
 * 120 Hz.
 * - off with prefers-reduced-motion
 * - paused when the hero is off-screen or the tab is hidden
 */
import { dropCount, flakeCount } from './intensity.ts';

interface Flake {
  x: number;
  y: number;
  /** Depth 0 (far) → 1 (at the lens): drives size, speed, drift, blur and opacity together. */
  z: number;
  size: number;
  speed: number;
  sway: number;
  freq: number;
  phase: number;
  alpha: number;
  sprite: HTMLCanvasElement;
}

interface Drop {
  x: number;
  y: number;
  z: number;
  len: number;
  speed: number;
  alpha: number;
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** A round flake sprite: `soft` is the out-of-focus (bokeh) version. */
function sprite(soft: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const s = 64;
  c.width = c.height = s;
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  if (soft) {
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.55, 'rgba(255,255,255,0.4)');
    grad.addColorStop(0.8, 'rgba(255,255,255,0.12)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

function start(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = canvas.dataset;
  const baseRate = Number(data.rate ?? 0);
  const rainRate = Number(data.rain ?? 0);
  const windMs = Number(data.wind ?? 0);
  const windFrom = (Number(data.windFrom ?? 270) * Math.PI) / 180;
  const temp = Number(data.temp ?? -5);
  // Wind blows FROM windFrom, so flakes drift the opposite way; east = right on screen.
  // Units: px per frame at 60 Hz.
  const drift = -Math.sin(windFrom) * Math.min(windMs, 20) * 0.13;
  // Colder = smaller, drier flakes; near freezing = big wet clumps.
  const sizeBoost = temp > -2 ? 1.35 : temp < -10 ? 0.85 : 1;
  const crisp = sprite(false);
  const bokeh = sprite(true);

  let rate = baseRate;
  let flakes: Flake[] = [];
  let drops: Drop[] = [];
  let width = 0;
  let height = 0;
  let running = false;
  let visible = true;
  let raf = 0;
  let last = 0;

  const makeFlake = (anywhere: boolean): Flake => {
    // Mostly far flakes, some mid, a rare few right at the lens.
    const z = Math.random() ** 1.7;
    const near = z > 0.93;
    const size = (near ? 14 + Math.random() * 16 : 1.6 + z * 5.5) * sizeBoost;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -size,
      z,
      size,
      speed: 0.35 + z * 1.5 + Math.random() * 0.25 + (near ? 1.2 : 0),
      sway: 0.3 + Math.random() * 0.9,
      freq: 0.0006 + Math.random() * 0.0012,
      phase: Math.random() * Math.PI * 2,
      alpha: near ? 0.35 + Math.random() * 0.2 : 0.35 + z * 0.6,
      sprite: near || z > 0.7 ? bokeh : crisp,
    };
  };

  const makeDrop = (anywhere: boolean): Drop => {
    const z = Math.random();
    return {
      x: Math.random() * (width + 200) - 100,
      y: anywhere ? Math.random() * height : -30,
      z,
      len: 10 + z * 18,
      speed: 11 + z * 9,
      alpha: 0.12 + z * 0.22,
    };
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fewer particles on small screens.
    const scale = Math.min(1, width / 1200 + 0.35);
    flakes = Array.from({ length: Math.round(flakeCount(rate) * scale) }, () => makeFlake(true));
    drops = rate > 0 ? [] : Array.from({ length: Math.round(dropCount(rainRate) * scale) }, () => makeDrop(true));
  };

  const frame = (t: number) => {
    // Real time, in 60 Hz frames; clamped so a hiccup doesn't teleport everything.
    const k = last ? Math.min(3, (t - last) / 16.667) : 1;
    last = t;
    ctx.clearRect(0, 0, width, height);
    // Wind comes in gusts, not as a constant push.
    const gust = 1 + 0.5 * Math.sin(t / 3100) * Math.sin(t / 1730 + 1);

    for (const f of flakes) {
      f.y += f.speed * k;
      f.x += (drift * gust * (0.3 + f.z * 1.1) + Math.sin(t * f.freq + f.phase) * f.sway * 0.4) * k;
      if (f.y > height + f.size) Object.assign(f, makeFlake(false));
      if (f.x > width + f.size) f.x = -f.size;
      if (f.x < -f.size) f.x = width + f.size;
      ctx.globalAlpha = f.alpha;
      ctx.drawImage(f.sprite, f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
    }

    if (drops.length) {
      // Rain: thin streaks slanted by the wind.
      const slant = drift * gust * 0.12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#dce6f2';
      for (const d of drops) {
        d.y += d.speed * k;
        d.x += d.speed * slant * k;
        if (d.y > height + d.len) Object.assign(d, makeDrop(false));
        ctx.globalAlpha = d.alpha;
        ctx.lineWidth = 0.6 + d.z * 0.8;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - slant * d.len, d.y - d.len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const shouldRun = visible && !document.hidden && flakes.length + drops.length > 0 && !reduceMotion.matches;
    if (shouldRun && !running) {
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(raf);
      if (reduceMotion.matches) ctx.clearRect(0, 0, width, height);
    }
  };

  const setRate = (next: number) => {
    rate = next;
    resize();
    sync();
  };

  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    sync();
  }).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => setRate(rate), 200);
  });

  // "Preview the next snowfall" button.
  const button = document.querySelector<HTMLButtonElement>('[data-snow-preview]');
  const previewRate = Number(button?.dataset.rate ?? 0);
  if (button && previewRate > 0 && !reduceMotion.matches) {
    const status = document.querySelector<HTMLElement>('[data-snow-status]');
    button.hidden = false;
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      const label = on ? button.dataset.stopLabel : button.dataset.startLabel;
      const text = button.querySelector('[data-label]');
      if (text && label) text.textContent = label;
      if (status) status.textContent = on ? (button.dataset.previewText ?? '') : '';
      setRate(on ? Math.max(previewRate, 1.5) : baseRate);
    });
  }

  setRate(rate);
}

// Start after first paint and load, so the canvas never competes with the answer.
const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-snowfall]');
const boot = () => requestAnimationFrame(() => canvas && start(canvas));
if (document.readyState === 'complete') boot();
else window.addEventListener('load', boot, { once: true });
