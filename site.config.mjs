/**
 * Single source of truth for the deployed site origin.
 *
 * Consumed by `astro.config.mjs` as `site`, which Astro then exposes to
 * application code as `Astro.site` / `import.meta.env.SITE`. Canonical URLs,
 * the sitemap base, and absolute Open Graph image URLs all derive from it, so
 * this value must never be duplicated anywhere else.
 *
 * TODO(owner): replace with the custom domain. The value below is the current
 * real origin, not a guess — swapping it is the only change required, per
 * docs/architecture.md section 4 "Open item".
 */
export const SITE_URL = 'https://aashishxetri5.github.io';
