import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

import { SITE_URL } from './site.config.mjs';

/**
 * Give development its own Vite dependency cache, apart from every other mode.
 *
 * Without this, `astro build` breaks the terminal in `astro dev`. The build
 * runs an internal Vite server to load content, and that server pre-bundles
 * React into node_modules/.vite/deps — the same folder the dev server reads —
 * in production mode. React 19's production JSX runtime deliberately exports
 * `jsxDEV` as undefined, so the next time the dev server renders the React
 * island it throws "TypeError: _jsxDEV is not a function" and the terminal
 * disappears. Reproduced by removing the cache, running a build, and finding it
 * recreated with the production runtime.
 *
 * Keyed on Vite's `mode` rather than the CLI command, because that internal
 * server is a `serve` in production mode: only real development uses the
 * default cache, and build, check and sync get their own.
 */
function separateNonDevCache() {
  return {
    name: 'aashish-os:separate-non-dev-cache',
    config(_config, { mode }) {
      if (mode !== 'development') return { cacheDir: 'node_modules/.vite-build' };
    },
  };
}

/**
 * Section 31: "Never render arbitrary Markdown/HTML without sanitization."
 *
 * This is not theoretical. Verified against this project on 2026-09-03: with no
 * sanitizer, a Markdown body containing
 *
 *   <img src=x onerror="alert(1)"> and <script>alert(2)</script>
 *
 * produced output HTML retaining BOTH the onerror attribute and the inline
 * script tag. Astro passes raw HTML in Markdown straight through.
 *
 * Content is repo-authored today, so the practical risk is low — but Phase 8
 * adds a browser-based CMS as a second authoring path, and a control added
 * before it is needed is worth more than one added after.
 *
 * The schema extends the default rather than replacing it, permitting only the
 * few extras this site's content legitimately uses.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Syntax highlighting and heading anchors need class names to survive.
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'class'],
    code: [...(defaultSchema.attributes?.code ?? []), 'className', 'class'],
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'class', 'style'],
    pre: [...(defaultSchema.attributes?.pre ?? []), 'className', 'class', 'style', 'tabindex'],
  },
};

export default defineConfig({
  site: SITE_URL,

  integrations: [
    // React powers exactly one island: the terminal on /os. Reader mode ships
    // zero JavaScript and must stay that way (ADR-001, section 26).
    react(),
    // Section 23. Requires `site` above, which is why it lives in one constant.
    sitemap({
      filter: (page) =>
        // The Phase 1 smoke page and the 404 must never be indexed.
        !page.includes('/404'),
    }),
  ],

  markdown: {
    rehypePlugins: [[rehypeSanitize, sanitizeSchema]],
  },

  // Tailwind 4 ships as a Vite plugin. The `@astrojs/tailwind` integration is
  // deprecated and its peerDependencies never declared Astro 6 or 7, so it is
  // unusable here — see docs/architecture.md "Verified toolchain".
  vite: {
    plugins: [tailwindcss(), separateNonDevCache()],
  },
});
