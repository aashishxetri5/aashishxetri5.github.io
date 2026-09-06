#!/usr/bin/env node
/**
 * Pre-build gate. Runs as `prebuild`, so `npm run build` fails before Astro
 * ever starts.
 *
 * Astro's own schema validation covers types, enums, required fields and
 * cross-field refinements — it fails the build correctly. These checks close
 * the holes it leaves:
 *
 *   1. Reference EXISTENCE. Astro validates the shape of a `reference()` but
 *      resolves it lazily, so a broken reference logs an error and still exits
 *      0. See scripts/lib/content-integrity.mjs.
 *   2. CMS / schema agreement. Nothing links config.yml to content.config.ts,
 *      so they can drift apart silently. See scripts/lib/cms-drift.mjs.
 */
import { findCmsDrift } from './lib/cms-drift.mjs';
import { findIntegrityProblems } from './lib/content-integrity.mjs';

const checks = [
  {
    label: 'referential integrity',
    run: findIntegrityProblems,
    fix: 'Fix the content above, or update the reference map in scripts/lib/content-integrity.mjs if a schema changed.',
  },
  {
    label: 'CMS / schema agreement',
    run: findCmsDrift,
    fix: 'The admin config and the content schemas have diverged. Update public/admin/config.yml to match src/content.config.ts (or vice versa).',
  },
];

let failed = false;

for (const check of checks) {
  let problems;

  try {
    problems = await check.run();
  } catch (error) {
    // A check that cannot run is a failure, not a pass. Swallowing this would
    // turn the gate into decoration.
    failed = true;
    console.error(`\n[content] ${check.label} check could not run\n`);
    console.error(`  ✗ ${error instanceof Error ? error.message : error}\n`);
    continue;
  }

  if (problems.length === 0) {
    console.log(`[content] ${check.label} OK`);
    continue;
  }

  failed = true;
  console.error(`\n[content] ${check.label} check FAILED\n`);
  for (const problem of problems) {
    console.error(`  ✗ ${problem}`);
  }
  console.error(`\n${problems.length} problem(s). ${check.fix}\n`);
}

process.exit(failed ? 1 : 0);
