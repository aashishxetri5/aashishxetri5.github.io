#!/usr/bin/env node
/**
 * Content integrity gate. Runs as `prebuild`, so `npm run build` fails before
 * Astro ever starts if a cross-collection reference is broken.
 *
 * Astro's own schema validation already covers types, enums, required fields
 * and cross-field refinements — it fails the build correctly. This closes the
 * one hole it leaves: reference *existence*. See scripts/lib/content-integrity.mjs.
 */
import { findIntegrityProblems } from './lib/content-integrity.mjs';

const problems = await findIntegrityProblems();

if (problems.length === 0) {
  console.log('[content] referential integrity OK');
  process.exit(0);
}

console.error('\n[content] Referential integrity check FAILED\n');
for (const problem of problems) {
  console.error(`  ✗ ${problem}`);
}
console.error(
  `\n${problems.length} problem(s). Fix the content above, or update the reference map in scripts/lib/content-integrity.mjs if a schema changed.\n`,
);
process.exit(1);
