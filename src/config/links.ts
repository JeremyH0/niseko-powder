/**
 * Official pages we link out to (never scrape or embed). Checked 2026-10-22.
 * Per-location so a second resort brings its own links.
 */
export interface OfficialLink {
  id: 'lifts' | 'webcams' | 'avalanche' | 'roads';
  href: string;
  icon: 'lift' | 'camera' | 'warning' | 'road';
}

export const LINKS: Record<string, readonly OfficialLink[]> = {
  niseko: [
    { id: 'lifts', href: 'https://www.niseko.ne.jp/en/niseko-lift-status/', icon: 'lift' },
    { id: 'webcams', href: 'https://www.niseko.ne.jp/en/livecamera/', icon: 'camera' },
    { id: 'avalanche', href: 'https://niseko.nadare.info/', icon: 'warning' },
    // 北の道ナビ (Kita no Michi Navi, "Northern Roads Navi") — Hokkaido road information.
    { id: 'roads', href: 'https://northern-road.jp/navi/eng/', icon: 'road' },
  ],
};
