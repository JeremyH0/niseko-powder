import type { IconName } from './Icon.astro';

/** WMO weather code → icon. */
export function weatherIcon(code: number | null | undefined): IconName {
  if (code === null || code === undefined) return 'cloud';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 0 || code === 1) return 'sun';
  if (code === 2) return 'partly';
  return 'cloud';
}
