/**
 * Build-time referential integrity for content.
 *
 * WHY THIS EXISTS
 *
 * Astro's `reference()` validates the *shape* of a reference at schema level,
 * but resolves existence lazily inside `getEntry()`. Verified empirically
 * against astro@7.2.10 on 2026-09-02: a skill pointing at a non-existent
 * project logs
 *
 *   [ERROR] [content] Invalid content reference: ...
 *
 * and then the build **exits 0 and completes successfully**. The site deploys
 * with the evidence silently missing.
 *
 * PLAN.md §33 requires the opposite: "The build should fail clearly if
 * required fields are missing… This is preferable to discovering the problem
 * visually after deployment." So this module performs the existence check
 * itself, wired into `prebuild` so that `npm run build` fails.
 *
 * It reads content files directly rather than going through Astro's runtime,
 * so it stays honest about what is on disk and does not depend on Astro
 * internals that may change between majors.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, parse as parsePath } from 'node:path';

import { parse as parseYaml } from 'yaml';

const CONTENT_DIR = 'content';

/** Collections whose entries are one-file-each Markdown/MDX. */
const MARKDOWN_COLLECTIONS = [
  'experience',
  'projects',
  'education',
  'achievements',
  'posts',
];

/**
 * Reference fields on a skill, and the collection each must resolve into.
 * Extend this map when a new cross-collection reference is added to a schema.
 */
const SKILL_REFERENCES = {
  projects: 'projects',
  companies: 'experience',
};

/**
 * Astro's glob loader derives an entry `id` from the filename. Our filenames
 * are already lowercase kebab-case, so the id is the basename — but normalize
 * anyway, so a capitalised or space-containing filename cannot produce a
 * phantom mismatch between this checker and Astro.
 */
function toEntryId(filename) {
  return parsePath(filename)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readCollectionIds(root, collection) {
  const dir = join(root, CONTENT_DIR, collection);

  let entries;
  try {
    entries = await readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') return new Set();
    throw error;
  }

  return new Set(
    entries
      .filter((name) => /\.(md|mdx)$/i.test(name))
      .map((name) => toEntryId(name)),
  );
}

async function readSkills(root) {
  const path = join(root, CONTENT_DIR, 'skills', 'skills.yaml');

  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const parsed = parseYaml(raw);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Check every cross-collection reference in the content tree.
 *
 * @param {string} [root] Repository root.
 * @returns {Promise<string[]>} Human-readable problems; empty means valid.
 */
export async function findIntegrityProblems(root = process.cwd()) {
  const problems = [];

  const ids = {};
  await Promise.all(
    MARKDOWN_COLLECTIONS.map(async (collection) => {
      ids[collection] = await readCollectionIds(root, collection);
    }),
  );

  const skills = await readSkills(root);
  const seenSkillIds = new Set();

  for (const [index, skill] of skills.entries()) {
    if (!skill || typeof skill !== 'object') {
      problems.push(`skills.yaml entry #${index + 1} is not an object.`);
      continue;
    }

    const label = skill.id ?? `skills.yaml entry #${index + 1}`;

    if (!skill.id) {
      problems.push(
        `skills.yaml entry #${index + 1} ("${skill.name ?? 'unnamed'}") has no \`id\`. ` +
          'The file() loader requires one, and other collections reference it.',
      );
    } else if (seenSkillIds.has(skill.id)) {
      // Duplicate ids silently overwrite each other in the loader, so one
      // skill would simply vanish with no warning anywhere.
      problems.push(`skills.yaml has a duplicate id: "${skill.id}".`);
    } else {
      seenSkillIds.add(skill.id);
    }

    for (const [field, targetCollection] of Object.entries(SKILL_REFERENCES)) {
      const refs = skill[field];
      if (refs === undefined) continue;

      if (!Array.isArray(refs)) {
        problems.push(
          `skills → ${label}: \`${field}\` must be a list, got ${typeof refs}.`,
        );
        continue;
      }

      for (const ref of refs) {
        if (!ids[targetCollection]?.has(ref)) {
          const available = [...(ids[targetCollection] ?? [])].sort();
          problems.push(
            `skills → ${label}: \`${field}\` references "${ref}" in collection ` +
              `"${targetCollection}", but no such entry exists.\n` +
              `    Available: ${available.length ? available.join(', ') : '(none)'}`,
          );
        }
      }
    }
  }

  return problems;
}
