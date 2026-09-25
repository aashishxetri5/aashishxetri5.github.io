/**
 * Loads all portfolio content from ONE file: content/portfolio.yaml.
 *
 * Why one file: the owner is the only editor, and is a developer. For that
 * person the simplest content workflow is "open one file, change it, save" —
 * not seven directories, and not a CMS (evaluated in Phase 8 and removed by
 * owner decision, ADR-010).
 *
 * The file is split into sections — profile, experience, projects, skills,
 * education, achievements, posts — and each Astro collection gets a loader that
 * reads its own section. Every page, query helper and schema downstream is
 * unchanged; only where the data comes from moved.
 *
 * The whole file is validated before any collection is populated, so a mistake
 * produces one clear list of problems instead of a half-loaded site:
 *
 *   - a misspelled section name (`projetcs:`) would otherwise make every project
 *     silently vanish, so unknown sections are errors with a suggestion
 *   - every list entry needs an `id`, unique within its section — it is the URL
 *     slug for projects and posts, and what skills refer to
 *   - skill evidence (`projects:` / `companies:`) must point at ids that exist
 *
 * Field-level mistakes (a missing required field, a typo'd key, a bad date) are
 * then caught by the Zod schemas in src/content.config.ts, which are strict.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Loader } from 'astro/loaders';
import { parse } from 'yaml';

/** Relative to the project root. The one file the owner edits. */
export const PORTFOLIO_PATH = 'content/portfolio.yaml';

/** `single` sections hold one set of fields; `list` sections hold entries. */
export const SECTIONS = {
  profile: 'single',
  experience: 'list',
  projects: 'list',
  skills: 'list',
  education: 'list',
  achievements: 'list',
  posts: 'list',
} as const;

export type SectionName = keyof typeof SECTIONS;

/**
 * Sections whose `body` is Markdown rendered on the entry's own page. Anywhere
 * else, `body` would be displayed nowhere — so it is rejected rather than
 * accepted and silently ignored, which is the trap an editor would fall into.
 */
export const BODY_SECTIONS: readonly SectionName[] = ['projects', 'posts'];

/** Skill fields that point at entries in other sections. */
const SKILL_REFERENCES = { projects: 'projects', companies: 'experience' } as const;

/** Ids become URL segments, so they are restricted to URL-safe slugs. */
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** "projects entry #3 (Buzzwire)" — position plus whatever name it has. */
function describe(section: string, index: number, entry: unknown): string {
  const position = `${section} entry #${index + 1}`;
  if (!isFields(entry)) return position;

  const label = ['id', 'name', 'title', 'company', 'institution']
    .map((key) => entry[key])
    .find((value): value is string => typeof value === 'string');

  return label ? `${position} (${label})` : position;
}

/** Closest known name for a typo, by shared prefix then length difference. */
function nearest(input: string, options: readonly string[]): string | undefined {
  const target = input.toLowerCase();
  let best: { option: string; score: number } | undefined;

  for (const option of options) {
    let shared = 0;
    while (shared < Math.min(option.length, target.length) && option[shared] === target[shared]) {
      shared += 1;
    }
    // Needs a meaningful overlap to count as a suggestion at all.
    if (shared < 3) continue;
    const score = shared - Math.abs(option.length - target.length);
    if (best === undefined || score > best.score) best = { option, score };
  }

  return best?.option;
}

/**
 * Structural validation of the whole file. Returns every problem found rather
 * than stopping at the first, so one save-and-build shows the full list.
 *
 * Pure and dependency-free so it can be unit tested without Astro.
 */
export function validatePortfolio(doc: unknown): string[] {
  if (!isFields(doc)) {
    return ['The file is empty, or is not made of `section:` blocks like `profile:` and `projects:`.'];
  }

  const problems: string[] = [];
  const known = Object.keys(SECTIONS);

  for (const key of Object.keys(doc)) {
    if (known.includes(key)) continue;
    const hint = nearest(key, known);
    problems.push(
      `Unknown section \`${key}:\`${hint ? ` — did you mean \`${hint}:\`?` : '.'} ` +
        `Sections are: ${known.join(', ')}.`,
    );
  }

  if (doc.profile === undefined || doc.profile === null) {
    problems.push('Missing the `profile:` section. The site needs it for your name and metadata.');
  } else if (!isFields(doc.profile)) {
    problems.push('`profile:` must be a set of fields (name, headline, ...), not a list.');
  }

  const ids: Record<string, Set<string>> = {};

  /*
   * Set when a problem means some ids were never collected — a misspelled
   * section, or an entry without an id. Checking references against an
   * incomplete id list reports every skill that points into it, burying the
   * one real mistake under consequences of it. So reference checking waits
   * until the structure is sound.
   */
  let idsIncomplete = problems.length > 0;

  for (const [section, kind] of Object.entries(SECTIONS)) {
    if (kind !== 'list') continue;

    const seen = new Set<string>();
    ids[section] = seen;

    const value = doc[section];
    // An absent or empty section is valid — the site simply omits it.
    if (value === undefined || value === null) continue;

    if (!Array.isArray(value)) {
      problems.push(`\`${section}:\` must be a list, with each entry starting with "- ".`);
      idsIncomplete = true;
      continue;
    }

    value.forEach((entry, index) => {
      const label = describe(section, index, entry);

      if (!isFields(entry)) {
        problems.push(`${label} is not a set of fields.`);
        idsIncomplete = true;
        return;
      }

      const { id } = entry;
      if (typeof id !== 'string' || id.trim().length === 0) {
        problems.push(`${label} is missing \`id:\` — a short lowercase name like "my-project".`);
        idsIncomplete = true;
        return;
      }

      if (!ID_PATTERN.test(id)) {
        problems.push(
          `${label}: id "${id}" must use only lowercase letters, numbers and dashes, like "my-project".`,
        );
      }

      if (seen.has(id)) {
        problems.push(`${label}: id "${id}" is used more than once in \`${section}:\`. Ids must be unique.`);
      }
      seen.add(id);

      if ('body' in entry && !BODY_SECTIONS.includes(section as SectionName)) {
        problems.push(
          `${label}: \`body:\` would not be shown anywhere for ${section}. ` +
            `Only ${BODY_SECTIONS.join(' and ')} display a body — use \`summary:\` instead.`,
        );
      }
    });
  }

  if (idsIncomplete) {
    problems.push('Skill references were not checked yet — fix the problems above first.');
    return problems;
  }

  const skills = Array.isArray(doc.skills) ? doc.skills : [];

  skills.forEach((skill, index) => {
    if (!isFields(skill)) return;

    for (const [field, target] of Object.entries(SKILL_REFERENCES)) {
      const refs = skill[field];
      if (refs === undefined || refs === null) continue;

      if (!Array.isArray(refs)) {
        problems.push(`${describe('skills', index, skill)}: \`${field}:\` must be a list of ids.`);
        continue;
      }

      const known = [...(ids[target] ?? [])];

      for (const ref of refs) {
        if (ids[target]?.has(String(ref))) continue;

        // A wrong reference is usually a near-miss, so name the likely fix.
        const hint = nearest(String(ref), known);
        problems.push(
          `${describe('skills', index, skill)} lists "${String(ref)}" under \`${field}:\`, ` +
            `but no entry in \`${target}:\` has that id.` +
            (hint ? ` Did you mean "${hint}"?` : ` Ids there: ${known.join(', ') || '(none)'}.`),
        );
      }
    }
  });

  return problems;
}

/** Read, parse and validate the file. Throws one readable error on failure. */
export async function readPortfolio(root: URL): Promise<{ doc: Fields; filePath: string }> {
  const filePath = fileURLToPath(new URL(PORTFOLIO_PATH, root));

  let text: string;
  try {
    text = await readFile(filePath, 'utf8');
  } catch {
    throw new Error(`Cannot read ${PORTFOLIO_PATH}. All portfolio content lives in that one file.`);
  }

  let doc: unknown;
  try {
    doc = parse(text);
  } catch (error) {
    // The yaml library's message already carries the line and column.
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${PORTFOLIO_PATH} is not valid YAML.\n\n${detail}`);
  }

  const problems = validatePortfolio(doc);
  if (problems.length > 0) {
    throw new Error(
      `${PORTFOLIO_PATH} has ${problems.length} problem(s):\n\n` +
        problems.map((problem) => `  ✗ ${problem}`).join('\n') +
        '\n',
    );
  }

  return { doc: doc as Fields, filePath };
}

/**
 * An Astro content loader for one section of the portfolio file.
 *
 * Entries are parsed with the collection's schema via `parseData`, given the
 * file's path so `image()` fields resolve relative to portfolio.yaml. For
 * sections in BODY_SECTIONS, `body` is rendered with `renderMarkdown`, which
 * runs the site's configured Markdown pipeline — including the rehype
 * sanitizer from astro.config.mjs (section 31, ADR-007) — so `render(entry)` keeps
 * working on project and post pages exactly as it did with Markdown files.
 */
export function portfolioSection(section: SectionName): Loader {
  return {
    name: `portfolio-${section}`,

    async load({ config, store, parseData, renderMarkdown, watcher, logger }) {
      const sync = async () => {
        const { doc, filePath } = await readPortfolio(config.root);
        const raw = doc[section];

        const entries: { id: string; fields: Fields }[] =
          SECTIONS[section] === 'single'
            ? [{ id: section, fields: raw as Fields }]
            : ((raw ?? []) as Fields[]).map(({ id, ...fields }) => ({
                id: id as string,
                fields,
              }));

        const hasBody = BODY_SECTIONS.includes(section);

        // Parse everything before touching the store, so a mistake made while
        // `astro dev` is running leaves the last good content on screen rather
        // than an emptied section.
        const parsed = await Promise.all(
          entries.map(async ({ id, fields }) => {
            const { body, ...rest } = fields;
            const data = await parseData({ id, data: hasBody ? rest : fields, filePath });
            const text = hasBody && typeof body === 'string' ? body : undefined;

            return {
              id,
              data,
              ...(text === undefined ? {} : { body: text, rendered: await renderMarkdown(text) }),
            };
          }),
        );

        store.clear();
        for (const entry of parsed) {
          store.set({ ...entry, filePath: PORTFOLIO_PATH });
        }
      };

      await sync();

      // Dev server: re-read the file on save. Errors are logged, not thrown,
      // so a half-finished edit does not kill the running server.
      const absolute = path.resolve(fileURLToPath(new URL(PORTFOLIO_PATH, config.root)));
      watcher?.add(absolute);
      watcher?.on('change', async (changed) => {
        if (path.resolve(changed) !== absolute) return;
        try {
          await sync();
        } catch (error) {
          logger.error(error instanceof Error ? error.message : String(error));
        }
      });
    },
  };
}
