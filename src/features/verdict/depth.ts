/**
 * How deep fresh snow would feel, for the powder stake. Body landmarks for an adult:
 * ankle ≈ 10 cm, ski-boot top ≈ 30 cm, knee ≈ 50 cm. Approximate on purpose — fresh snow
 * settles and skis float — and labelled that way in the UI.
 */
export type DepthFeel = 'none' | 'dusting' | 'ankle' | 'boot' | 'knee' | 'deep';

export const LANDMARKS = [
  { cm: 10, key: 'ankle' },
  { cm: 30, key: 'boot' },
  { cm: 50, key: 'knee' },
] as const;

export function depthFeel(cm: number): DepthFeel {
  if (cm < 1) return 'none';
  if (cm < 5) return 'dusting';
  if (cm < 15) return 'ankle';
  if (cm < 30) return 'boot';
  if (cm < 50) return 'knee';
  return 'deep';
}

/** Stake scale: 60 cm, or taller on a monster day so the fill never overflows. */
export const stakeMax = (cm: number) => Math.max(60, Math.ceil(cm / 10) * 10);
