/**
 * Guards the stylesheet against a silent failure: a custom property that reads its own value
 * (`--x: color-mix(…, var(--x))`) is a cycle, becomes invalid, and takes every rule using it
 * down with it. That once blanked the hero sky on every snowy day.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./global.css', import.meta.url), 'utf8');

describe('global.css', () => {
  it('has no custom property that references itself', () => {
    const cycles = [...css.matchAll(/(--[\w-]+)\s*:([^;{}]*);/g)]
      .filter(([, name, value]) => value?.includes(`var(${name})`) || value?.includes(`var(${name},`))
      .map(([decl]) => decl.trim());
    expect(cycles).toEqual([]);
  });

  it('keeps every motion keyframe behind a reduced-motion guard or opt-in class', () => {
    // Infinite animations must only be declared inside prefers-reduced-motion: no-preference.
    const infinite = [...css.matchAll(/animation:[^;]*infinite/g)].map((m) => m.index ?? 0);
    const guard = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    for (const at of infinite) expect(at).toBeGreaterThan(guard);
  });
});
