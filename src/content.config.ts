/**
 * Content schemas — the single source of truth for every portfolio fact.
 *
 * PLAN.md 1 makes content/code separation the top product requirement and 33
 * requires the build to fail clearly on invalid content. This file is how both
 * are enforced rather than merely intended: no portfolio fact may live in a
 * component, a page, or a terminal command handler.
 *
 * All content is read from ONE file, content/portfolio.yaml — each collection
 * loads its own section of it (src/lib/portfolio-loader.ts, ADR-010).
 *
 * Every object schema is STRICT. With content hand-edited in a single file, the
 * likeliest mistake is a misspelled key, and a non-strict schema would drop it
 * without a word — `feautred: true` would simply not feature the project. 33
 * asks for "a useful error instead of silently breaking the site", so unknown
 * keys fail the build and name the key.
 *
 * Field-by-field reference and authoring guide: docs/content-model.md
 *
 * API notes (verified against astro@7.2.10 on 2026-09-02):
 *   - `z` comes from 'astro/zod', not 'astro:content' (deprecated in Astro 6,
 *     slated for removal in Astro 8). It is Zod 4, so format validators are
 *     top-level: z.email() / z.url(), not z.string().email().
 *   - Entries are keyed by the `id` written on each list entry in
 *     portfolio.yaml. Astro 6 removed `slug`; the id is the URL segment.
 */
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';

import { portfolioSection } from './lib/portfolio-loader';

/* -------------------------------------------------------------------------- */
/* Shared validation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Cross-field date validation shared by `experience` and `education`.
 *
 * PLAN.md 6 and 14 require the UI to derive "2026 — Present" vs "2023 — 2026"
 * from the data. That only works if the data is coherent, so incoherence is a
 * build error rather than a rendering surprise.
 */
const dateRangeCheck = (
  value: { startDate: Date; endDate?: Date; current: boolean },
  ctx: z.RefinementCtx,
) => {
  if (value.current && value.endDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'Remove endDate when current: true, or set current: false.',
    });
  }
  if (!value.current && !value.endDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'endDate is required unless current: true.',
    });
  }
  if (value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'endDate is earlier than startDate.',
    });
  }
};

const link = z.strictObject({
  label: z.string(),
  url: z.url(),
});

/**
 * A date authored in content.
 *
 * `z.coerce.date()` alone has a nasty YAML footgun: an unquoted `2023` is
 * parsed by YAML as the *number* 2023, and `new Date(2023)` is 2023
 * milliseconds after the epoch — silently yielding 1970 instead of 2023. The
 * site would render "1970 — Present" with no error anywhere.
 *
 * The floor check turns that into a build failure with an actionable message,
 * which is precisely what 33 asks for. Year-only values are legitimate and
 * supported — quote them (`"2023"`) and they coerce to January 1st. Since
 * every rendered label derives only the year (src/lib/dates.ts), a year-only
 * input produces a year-only output with no invented precision.
 */
const contentDate = z.coerce.date().refine((d) => d.getUTCFullYear() >= 1990, {
  error:
    'Date resolves before 1990. In YAML, an unquoted year is parsed as a number — quote it as "2023" or write a full date like "2023-04-01".',
});

/* -------------------------------------------------------------------------- */
/* Profile — exactly one entry (5, 29)                                      */
/* -------------------------------------------------------------------------- */

const profile = defineCollection({
  loader: portfolioSection('profile'),
  schema: ({ image }) =>
    z.strictObject({
      name: z.string(),
      /** One line. Drives the hero and the <title>. */
      headline: z.string(),
      /** ~2 sentences. Drives meta description and Open Graph. */
      shortBio: z.string(),
      /** Markdown permitted. Drives the About section. */
      longBio: z.string(),
      location: z.string(),
      email: z.email(),
      /**
       * Local asset, validated to exist at build time and optimized on output.
       * This structurally prevents the v3 defect where the portrait was
       * hotlinked from a Google Drive URL and the OG image pointed at a signed
       * Facebook CDN URL with an expiry parameter.
       */
      avatar: image(),
      ogImage: image().optional(),
      /**
       * 29 requires view + download to be easy to find, and 29 also says the
       * résumé file is content/configuration rather than something hardcoded
       * into the UI.
       *
       * Optional deliberately: no PDF exists in the repository yet (v3 linked
       * a Google Drive file). A required field pointing at a missing asset
       * would guarantee a broken link, which 32 forbids. Optional lets the UI
       * omit the affordance cleanly until the file is supplied.
       *
       * ⚠️ PRE-LAUNCH BLOCKER — see content/README.md.
       */
      resume: z
        .strictObject({
          /** Path under public/resume/ */
          file: z.string(),
          updated: contentDate,
          label: z.string().default('Résumé'),
        })
        .optional(),
      /**
       * Drives the "#OpenToWork" treatment. v3 hardcoded that string into
       * markup; as a boolean, toggling it is a content change.
       */
      availability: z.strictObject({
        open: z.boolean(),
        message: z.string().optional(),
      }),
      socials: z.strictObject({
        github: z.url().optional(),
        linkedin: z.url().optional(),
        website: z.url().optional(),
        hashnode: z.url().optional(),
        x: z.url().optional(),
      }),
    }),
});

/* -------------------------------------------------------------------------- */
/* Experience (6, 14)                                                      */
/* -------------------------------------------------------------------------- */

const experience = defineCollection({
  loader: portfolioSection('experience'),
  schema: ({ image }) =>
    z
      .strictObject({
        company: z.string(),
        role: z.string(),
        location: z.string().optional(),
        employmentType: z.enum([
          'full-time',
          'part-time',
          'contract',
          'freelance',
          'internship',
          'hackathon',
          'self-employed',
        ]),
        startDate: contentDate,
        endDate: contentDate.optional(),
        /** 14: never hardcode the current company. This flag drives it. */
        current: z.boolean().default(false),
        logo: image().optional(),
        website: z.url().optional(),
        /** One line, for the collapsed timeline view. */
        summary: z.string(),
        responsibilities: z.array(z.string()).default([]),
        achievements: z.array(z.string()).default([]),
        technologies: z.array(z.string()).default([]),
        links: z.array(link).default([]),
        /** Manual tiebreak only. Sorting is otherwise derived from dates. */
        order: z.number().optional(),
      })
      .superRefine(dateRangeCheck),
});

/* -------------------------------------------------------------------------- */
/* Projects (7, 13)                                                        */
/* -------------------------------------------------------------------------- */

const projects = defineCollection({
  loader: portfolioSection('projects'),
  schema: ({ image }) =>
    z.strictObject({
      name: z.string(),
      /** Card and terminal list view. */
      shortDescription: z.string(),
      featured: z.boolean().default(false),
      status: z.enum(['active', 'completed', 'archived', 'experimental']),
      type: z.enum([
        'web',
        'backend',
        'library',
        'tool',
        'game',
        'experiment',
        'other',
      ]),
      startDate: contentDate.optional(),
      image: image().optional(),
      technologies: z.array(z.string()).min(1),
      links: z
        .strictObject({
          github: z.url().optional(),
          demo: z.url().optional(),
          documentation: z.url().optional(),
        })
        .default({}),

      /* Dossier sections (13). Empty arrays are omitted from the UI entirely,
       * so a thin project stays presentable and no empty headings render. */
      problem: z.string().optional(),
      highlights: z.array(z.string()).default([]),
      architecture: z.array(z.string()).default([]),
      decisions: z
        .array(
          z.strictObject({
            decision: z.string(),
            reason: z.string(),
          }),
        )
        .default([]),
      challenges: z.array(z.string()).default([]),
      lessons: z.array(z.string()).default([]),

      order: z.number().optional(),
    }),
});

/* -------------------------------------------------------------------------- */
/* Skills (8)                                                               */
/* -------------------------------------------------------------------------- */

const skills = defineCollection({
  loader: portfolioSection('skills'),
  schema: z.strictObject({
    name: z.string(),
    category: z.enum([
      'Languages',
      'Backend',
      'Frontend',
      'Databases',
      'DevOps',
      'Cloud',
      'Tools',
      'Concepts',
      'Other',
    ]),
    /**
     * 8 explicitly rejects invented percentages ("Java: 97%") as arbitrary.
     * A coarse enum resists false precision; evidence below carries the weight.
     */
    level: z.enum(['learning', 'working', 'proficient', 'advanced']),
    /** Years-of-use is derived from this at build time, never authored prose. */
    since: contentDate.optional(),
    icon: z.string().optional(),

    /**
     * Evidence, as validated references rather than free text. 33 applied to
     * relationships: renaming or deleting a referenced project fails the build
     * instead of silently orphaning the claim.
     */
    projects: z.array(reference('projects')).default([]),
    companies: z.array(reference('experience')).default([]),

    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
});

/* -------------------------------------------------------------------------- */
/* Education                                                                 */
/* -------------------------------------------------------------------------- */

const education = defineCollection({
  loader: portfolioSection('education'),
  schema: ({ image }) =>
    z
      .strictObject({
        institution: z.string(),
        degree: z.string(),
        field: z.string().optional(),
        location: z.string().optional(),
        startDate: contentDate,
        endDate: contentDate.optional(),
        current: z.boolean().default(false),
        grade: z.string().optional(),
        logo: image().optional(),
        highlights: z.array(z.string()).default([]),
      })
      .superRefine(dateRangeCheck),
});

/* -------------------------------------------------------------------------- */
/* Achievements — deliberately empty at Phase 1                              */
/* -------------------------------------------------------------------------- */

const achievements = defineCollection({
  loader: portfolioSection('achievements'),
  schema: z.strictObject({
    title: z.string(),
    issuer: z.string().optional(),
    date: contentDate,
    type: z.enum([
      'certification',
      'award',
      'recognition',
      'publication',
      'talk',
      'other',
    ]),
    credentialUrl: z.url().optional(),
    credentialId: z.string().optional(),
    summary: z.string().optional(),
  }),
});

/* -------------------------------------------------------------------------- */
/* Posts (10 "Writing", 40 future blog)                                    */
/* -------------------------------------------------------------------------- */

const posts = defineCollection({
  loader: portfolioSection('posts'),
  schema: ({ image }) =>
    z.strictObject({
      title: z.string(),
      publishDate: contentDate,
      summary: z.string(),
      /**
       * Set → renders as an outbound card (how the existing Hashnode posts are
       * represented). Absent → `body` renders locally at /writing/<id>.
       * Starting a self-hosted blog is therefore a content change, not a code
       * change.
       */
      external: z.url().optional(),
      canonical: z.url().optional(),
      tags: z.array(z.string()).default([]),
      cover: image().optional(),
      /** Excluded from production builds and the sitemap at query time. */
      draft: z.boolean().default(false),
    }),
});

export const collections = {
  profile,
  experience,
  projects,
  skills,
  education,
  achievements,
  posts,
};
