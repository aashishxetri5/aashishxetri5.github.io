/**
 * CMS / schema drift detection.
 *
 * The failure mode this exists to prevent: someone adds a field to
 * src/content.config.ts and forgets public/admin/config.yml. The CMS keeps
 * working, keeps looking authoritative, and quietly cannot edit the new field —
 * so the owner concludes the field does not exist, or edits around it. The
 * reverse is worse: a CMS field with no schema behind it writes frontmatter that
 * fails the build, and the error surfaces at deploy time rather than while
 * editing.
 *
 * Neither is caught by types, tests or review, because the two files are in
 * different languages and nothing links them. So this compares them directly
 * and fails the build on any disagreement.
 *
 * Only TOP-LEVEL fields are compared. Nested object shapes (socials, links,
 * decisions) are checked by Astro's schema at build time anyway, and comparing
 * them here would mean reimplementing Zod's type language in a regex — the
 * cure being worse than the disease.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse as parseYaml } from 'yaml';

const SCHEMA_FILE = 'src/content.config.ts';
const CMS_CONFIG = 'public/admin/config.yml';

/**
 * Where each collection's editable fields live in the CMS config.
 *
 * Not derivable: a `files` collection nests fields one level deeper than a
 * `folder` one, and `skills` is a single YAML file holding an array, so its
 * real fields are those of the list widget inside it.
 */
const FIELD_PATHS = {
  profile: (entry) => entry.files?.[0]?.fields,
  experience: (entry) => entry.fields,
  projects: (entry) => entry.fields,
  skills: (entry) => entry.files?.[0]?.fields?.[0]?.fields,
  education: (entry) => entry.fields,
  achievements: (entry) => entry.fields,
  posts: (entry) => entry.fields,
};

/**
 * Fields that legitimately exist on one side only, with the reason. Anything
 * not listed here is drift.
 */
const CMS_ONLY = {
  // The Markdown body is the document itself, not a frontmatter field, so it
  // has no counterpart in the Zod object.
  body: 'the Markdown body is the document, not a frontmatter field',
  // Astro derives a skill's entry id from the `id` property of the array item,
  // so it is required in the file but never declared in the schema.
  id: 'Astro derives the entry id from this; it is not a schema field',
};

const SCHEMA_ONLY = {};

/**
 * Extract top-level keys of each collection's `z.object({ ... })`.
 *
 * A real TypeScript parse would be more robust, but it would mean importing the
 * module — which pulls in `astro:content`, a virtual module that only exists
 * inside an Astro build. A scanner that understands comments, strings and brace
 * depth is enough, and it stays honest by refusing to guess: an unparseable
 * collection is reported rather than skipped.
 */
function extractSchemaFields(source) {
  const collections = {};
  const declaration = /const\s+(\w+)\s*=\s*defineCollection\(\{/g;

  let match;
  while ((match = declaration.exec(source)) !== null) {
    const name = match[1];

    /*
     * Matched as a pattern rather than a literal string, because several
     * schemas are formatted across lines, putting whitespace between `z` and
     * `.object({` when a `.superRefine()` follows. A literal indexOf('z.object({') silently skips
     * those and locks on to the NEXT collection's object instead — which does
     * not error, it just attributes one collection's fields to another. That
     * bug is invisible until the field lists are compared.
     */
    const opener = /z\s*\.\s*object\s*\(\s*\{/g;
    opener.lastIndex = match.index;
    const objectMatch = opener.exec(source);
    if (objectMatch === null) continue;

    const fields = [];
    let depth = 1; // the regex consumed the opening brace
    let index = objectMatch.index + objectMatch[0].length;
    let lineStart = true;

    while (index < source.length) {
      const char = source[index];
      const next = source[index + 1];

      // Skip comments wholesale.
      if (char === '/' && next === '/') {
        index = source.indexOf('\n', index);
        if (index === -1) break;
        continue;
      }
      if (char === '/' && next === '*') {
        index = source.indexOf('*/', index);
        if (index === -1) break;
        index += 2;
        continue;
      }
      // Skip string literals, which can contain braces and colons.
      if (char === "'" || char === '"' || char === '`') {
        const quote = char;
        index += 1;
        while (index < source.length) {
          if (source[index] === '\\') index += 2;
          else if (source[index] === quote) break;
          else index += 1;
        }
        index += 1;
        continue;
      }

      if (char === '{') {
        depth += 1;
        index += 1;
        lineStart = true;
        continue;
      }
      if (char === '}') {
        depth -= 1;
        index += 1;
        if (depth === 0) break;
        continue;
      }

      // At depth 1 a bare `identifier:` is a top-level field of the schema.
      if (depth === 1 && lineStart && /[A-Za-z_]/.test(char)) {
        const rest = source.slice(index);
        const key = /^([A-Za-z_]\w*)\s*:/.exec(rest);
        if (key) {
          fields.push(key[1]);
          index += key[0].length;
          lineStart = false;
          continue;
        }
      }

      if (char === '\n' || char === ',') lineStart = true;
      else if (char.trim() !== '') lineStart = false;

      index += 1;
    }

    if (fields.length > 0) collections[name] = fields;
  }

  /*
   * Structural sanity check on the scanner itself.
   *
   * Two collections sharing an identical field list is possible in principle
   * and vanishingly unlikely in practice — it is far more likely the scanner
   * attributed one collection's object to another, which is exactly the failure
   * the regex above fixes. Detecting it here means a future formatting change
   * that breaks the scanner reports itself, instead of producing forty
   * confident and wrong drift errors.
   */
  const seen = new Map();
  for (const [name, fields] of Object.entries(collections)) {
    const key = [...fields].sort().join(',');
    const previous = seen.get(key);
    if (previous) {
      throw new Error(
        `schema scanner produced identical fields for "${previous}" and "${name}" — ` +
          'it has almost certainly mis-parsed src/content.config.ts rather than found real duplication.',
      );
    }
    seen.set(key, name);
  }

  return collections;
}

/** Field names declared in the CMS config, per collection. */
function extractCmsFields(config) {
  const collections = {};

  for (const entry of config.collections ?? []) {
    const resolve = FIELD_PATHS[entry.name];
    if (!resolve) {
      collections[entry.name] = null; // unknown collection — reported below
      continue;
    }
    const fields = resolve(entry);
    collections[entry.name] = Array.isArray(fields)
      ? fields.map((field) => field.name)
      : null;
  }

  return collections;
}

export async function findCmsDrift(root = process.cwd()) {
  const problems = [];

  const [source, rawConfig] = await Promise.all([
    readFile(path.join(root, SCHEMA_FILE), 'utf8'),
    readFile(path.join(root, CMS_CONFIG), 'utf8'),
  ]);

  const config = parseYaml(rawConfig);
  const schema = extractSchemaFields(source);
  const cms = extractCmsFields(config);

  // Editorial workflow is an architectural requirement (ADR-002), not a
  // preference: without it every content save is a metered production deploy
  // against a ~20/month ceiling that pauses the site when exhausted.
  if (config.publish_mode !== 'editorial_workflow') {
    problems.push(
      'config.yml: publish_mode must be "editorial_workflow" — see ADR-002. ' +
        'Direct commits would make every content save a production deploy.',
    );
  }

  if (!config.backend?.branch) {
    problems.push('config.yml: backend.branch is missing.');
  }

  for (const [name, schemaFields] of Object.entries(schema)) {
    const cmsFields = cms[name];

    if (cmsFields === undefined) {
      problems.push(
        `collection "${name}" exists in ${SCHEMA_FILE} but has no collection in ${CMS_CONFIG}.`,
      );
      continue;
    }
    if (cmsFields === null) {
      problems.push(
        `collection "${name}" is in ${CMS_CONFIG} but its fields could not be located — check FIELD_PATHS in this file.`,
      );
      continue;
    }

    for (const field of schemaFields) {
      if (!cmsFields.includes(field) && !(field in SCHEMA_ONLY)) {
        problems.push(
          `${name}.${field} is in the schema but NOT editable in the CMS — add it to ${CMS_CONFIG}.`,
        );
      }
    }

    for (const field of cmsFields) {
      if (!schemaFields.includes(field) && !(field in CMS_ONLY)) {
        problems.push(
          `${name}.${field} is in the CMS but NOT in the schema — it would write frontmatter that fails the build.`,
        );
      }
    }
  }

  for (const name of Object.keys(cms)) {
    if (!(name in schema)) {
      problems.push(
        `collection "${name}" is in ${CMS_CONFIG} but not in ${SCHEMA_FILE}.`,
      );
    }
  }

  return problems;
}
