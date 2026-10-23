import { describe, expect, it } from 'vitest';
import { depthFeel, stakeMax } from './depth.ts';

describe('depthFeel', () => {
  it.each([
    [0, 'none'],
    [0.9, 'none'],
    [3, 'dusting'],
    [8, 'ankle'],
    [22, 'boot'],
    [35, 'knee'],
    [64, 'deep'],
  ])('%s cm → %s', (cm, feel) => expect(depthFeel(cm)).toBe(feel));

  it('stake grows for monster days', () => {
    expect(stakeMax(20)).toBe(60);
    expect(stakeMax(74)).toBe(80);
  });
});
