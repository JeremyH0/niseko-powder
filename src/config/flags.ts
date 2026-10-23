/**
 * Feature flags. Ship half-finished features hidden, flip to `true` when ready.
 * Keep the list short: delete a flag once its feature is permanently on.
 */
export const flags = {
  /** Season tracker teaser on the homepage (the /season page itself is always on). */
  seasonTracker: true,
  /** Imperial units toggle (backlog). */
  imperialToggle: false,
  /** Live snowfall canvas (Phase 3). */
  snowfallCanvas: false,
} as const satisfies Record<string, boolean>;

export type FlagName = keyof typeof flags;

export function isEnabled(flag: FlagName): boolean {
  return flags[flag];
}
