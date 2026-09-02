import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,

  integrations: [mdx()],

  // Tailwind 4 ships as a Vite plugin. The `@astrojs/tailwind` integration is
  // deprecated and its peerDependencies never declared Astro 6 or 7, so it is
  // unusable here — see docs/architecture.md "Verified toolchain".
  vite: {
    plugins: [tailwindcss()],
  },
});
