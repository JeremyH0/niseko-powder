/**
 * Client-side snowfall canvas. Reads its parameters from data attributes rendered by
 * the server (see intensity.ts), so it never fetches anything.
 * - off with prefers-reduced-motion
 * - paused when the hero is off-screen or the tab is hidden
 */
import { flakeCount } from './intensity.ts';

interface Flake {
  x: number;
  y: number;
  /** Depth 0 (far) → 1 (near): drives size, speed, drift and opacity together. */
  z: number;
  r: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
}

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function start(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = canvas.dataset;
  const baseRate = Number(data.rate ?? 0);
  const windMs = Number(data.wind ?? 0);
  const windFrom = (Number(data.windFrom ?? 270) * Math.PI) / 180;
  const temp = Number(data.temp ?? -5);
  // Wind blows FROM windFrom, so flakes drift the opposite way; east = right on screen.
  const drift = -Math.sin(windFrom) * Math.min(windMs, 20) * 0.12;
  // Colder = smaller, drier flakes; near freezing = big wet clumps.
  const sizeBoost = temp > -2 ? 1.5 : temp < -10 ? 0.8 : 1;

  let rate = baseRate;
  let flakes: Flake[] = [];
  let width = 0;
  let height = 0;
  let running = false;
  let visible = true;
  let raf = 0;

  const makeFlake = (anywhere: boolean): Flake => {
    const z = Math.random() ** 1.6; // more far flakes than near ones
    const r = (0.6 + z * 2.4) * sizeBoost;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10,
      z,
      r,
      speed: 0.25 + z * 1.15 + Math.random() * 0.2,
      sway: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.3 + z * 0.6,
    };
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fewer flakes on small screens.
    const target = Math.round(flakeCount(rate) * Math.min(1, width / 1200 + 0.35));
    flakes = Array.from({ length: target }, () => makeFlake(true));
  };

  const frame = (t: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    // Wind comes in gusts, not as a constant push.
    const gust = 1 + 0.45 * Math.sin(t / 3100) * Math.sin(t / 1730);
    for (const f of flakes) {
      f.y += f.speed;
      f.x += drift * gust * (0.35 + f.z) + Math.sin(t / 1400 + f.phase) * f.sway * 0.35;
      if (f.y > height + 8) Object.assign(f, makeFlake(false));
      if (f.x > width + 8) f.x = -8;
      if (f.x < -8) f.x = width + 8;
      ctx.globalAlpha = f.alpha;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };

  const sync = () => {
    const shouldRun = visible && !document.hidden && flakes.length > 0 && !reduceMotion.matches;
    if (shouldRun && !running) {
      running = true;
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
