// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// https://docs.astro.build/en/guides/integrations-guide/cloudflare/
export default defineConfig({
  // Replace with the real domain once it is chosen (used for canonical URLs / sitemap).
  site: 'https://niseko-powder.workers.dev',
  adapter: cloudflare({
    // Optimise images at build time with Sharp instead of provisioning a
    // Cloudflare Images binding at runtime (keeps us on the free plan, no extra moving parts).
    imageService: 'compile',
  }),
  // We don't need user sessions. Without this, the adapter auto-provisions a SESSION KV namespace.
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
