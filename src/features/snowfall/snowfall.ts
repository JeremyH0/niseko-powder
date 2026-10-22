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
    const r = (Math.random() * 1.8 + 0.7) * sizeBoost;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10,
      r,
      speed: 0.35 + r * 0.32 + Math.random() * 0.3,
      sway: Math.random() * 0.6 + 0.2,
      phase: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.5 + 0.45,
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
    for (const f of flakes) {
      f.y += f.speed;
      f.x += drift * (0.6 + f.r * 0.25) + Math.sin(t / 1400 + f.phase) * f.sway * 0.35;
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

const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-snowfall]');
if (canvas) start(canvas);
