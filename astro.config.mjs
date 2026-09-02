import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { SITE_URL } from './site.config.mjs';

export default defineConfig({
  site: SITE_URL,

  integrations: [
    mdx(),
    // §23. Requires `site` above, which is why it lives in one constant.
    sitemap({
      filter: (page) =>
        // The Phase 1 smoke page and the 404 must never be indexed.
        !page.includes('/404'),
    }),
  ],

  // Tailwind 4 ships as a Vite plugin. The `@astrojs/tailwind` integration is
  // deprecated and its peerDependencies never declared Astro 6 or 7, so it is
  // unusable here — see docs/architecture.md "Verified toolchain".
  vite: {
    plugins: [tailwindcss()],
  },
});
