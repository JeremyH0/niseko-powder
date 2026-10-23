/**
 * Hover / touch / keyboard read-out for server-rendered SVG charts.
 * Tooltips enhance, never gate: every value is also in the chart's table view.
 *
 * Markup contract (see ChartFrame.astro):
 *   <div data-chart data-mode="cross|bars" data-vbw="720" data-top="8" data-bottom="280"
 *        data-xs="[x0, x1, …]" data-rows='[{"t":"Fri 03:00","r":[["#hex","1.2 cm","Snow"],…]},…]'>
 *     <svg viewBox="0 0 720 …">…marks with data-i="n" (bars mode)…</svg>
 *     <div class="chart-cross"></div><div class="chart-tip" hidden></div><p data-live class="sr-only"></p>
 *   </div>
 */

interface Row {
  t: string;
  r: [color: string, value: string, label: string][];
}

function init(root: HTMLElement) {
  const svg = root.querySelector('svg');
  const tip = root.querySelector<HTMLElement>('.chart-tip');
  const cross = root.querySelector<HTMLElement>('.chart-cross');
  const live = root.querySelector<HTMLElement>('[data-live]');
  if (!svg || !tip) return;

  const xs = JSON.parse(root.dataset.xs ?? '[]') as number[];
  const rows = JSON.parse(root.dataset.rows ?? '[]') as Row[];
  const vbw = Number(root.dataset.vbw ?? 720);
  const top = Number(root.dataset.top ?? 0);
  const bottom = Number(root.dataset.bottom ?? 0);
  const bars = root.dataset.mode === 'bars';
  if (!xs.length || xs.length !== rows.length) return;

  let index = -1;
  const scale = () => svg.getBoundingClientRect().width / vbw;

  function nearest(vx: number): number {
    let lo = 0;
    let hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if ((xs[mid] as number) < vx) lo = mid;
      else hi = mid;
    }
    return Math.abs((xs[lo] as number) - vx) <= Math.abs((xs[hi] as number) - vx) ? lo : hi;
  }

  function render(row: Row) {
    // Untrusted-by-default: build with textContent, never innerHTML.
    tip!.replaceChildren();
    const title = document.createElement('div');
    title.className = 'tip-title';
    title.textContent = row.t;
    tip!.appendChild(title);
    for (const [color, value, label] of row.r) {
      const line = document.createElement('div');
      line.className = 'tip-row';
      const key = document.createElement('span');
      key.className = 'tip-key';
      key.style.background = color;
      const v = document.createElement('span');
      v.className = 'tip-value';
      v.textContent = value;
      const l = document.createElement('span');
      l.className = 'tip-label';
      l.textContent = label;
      // appendChild, not append(): the Workers types shadow the DOM's append().
      line.appendChild(key);
      line.appendChild(v);
      line.appendChild(l);
      tip!.appendChild(line);
    }
  }

  function show(i: number, announce = false) {
    const row = rows[i];
    if (!row) return;
    if (bars && index !== i) {
      root.querySelectorAll('[data-i].is-active').forEach((el) => el.classList.remove('is-active'));
      root.querySelectorAll(`[data-i="${i}"]`).forEach((el) => el.classList.add('is-active'));
    }
    index = i;
    const s = scale();
    const x = (xs[i] as number) * s;
    if (cross && !bars) {
      cross.hidden = false;
      cross.style.translate = `${x}px ${top * s}px`;
      cross.style.height = `${(bottom - top) * s}px`;
    }
    render(row);
    tip!.hidden = false;
    const w = tip!.offsetWidth;
    const rootW = root.clientWidth;
    const left = x + 14 + w > rootW ? Math.max(0, x - 14 - w) : x + 14;
    tip!.style.translate = `${left}px ${Math.max(0, top * s)}px`;
    if (announce && live) live.textContent = `${row.t}: ${row.r.map(([, v, l]) => `${l} ${v}`).join(', ')}`;
  }

  function hide() {
    tip!.hidden = true;
    if (cross) cross.hidden = true;
    root.querySelectorAll('[data-i].is-active').forEach((el) => el.classList.remove('is-active'));
  }

  root.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    show(nearest((e.clientX - rect.left) / scale()));
  });
  root.addEventListener('pointerdown', (e) => {
    const rect = svg.getBoundingClientRect();
    show(nearest((e.clientX - rect.left) / scale()));
  });
  root.addEventListener('pointerleave', () => {
    if (document.activeElement !== root) hide();
  });
  root.addEventListener('focus', () => show(index >= 0 ? index : 0, true));
  root.addEventListener('blur', hide);
  root.addEventListener('keydown', (e) => {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: 1, ArrowDown: -1 };
    if (e.key in step) {
      e.preventDefault();
      show(Math.min(xs.length - 1, Math.max(0, (index < 0 ? 0 : index) + (step[e.key] as number))), true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      show(e.key === 'Home' ? 0 : xs.length - 1, true);
    } else if (e.key === 'Escape') {
      hide();
    }
  });
}

document.querySelectorAll<HTMLElement>('[data-chart]').forEach(init);
