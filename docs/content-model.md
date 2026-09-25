# AASHISH.OS — Content Model

> Phase 0 (Discovery) deliverable, per `PLAN.md` section 37.
> Status: **Specified — implemented in Phase 1.**
> Last updated: 2026-09-02

This document is the contract between content and code. `PLAN.md` section 1 calls their separation the single most important product requirement; these schemas are how that separation is enforced rather than merely intended.

---

## 1. Principles

1. **Content is data, not markup.** No portfolio fact may live in a component, a page, or a terminal command handler.
2. **Schemas are the single source of truth.** `src/content.config.ts` defines every field. Reader mode and terminal mode both read from it (section 10, Rule 7).
3. **The build fails on bad content.** A missing, malformed or misspelled field is a build error naming the entry and field, never a visual surprise after deploy (section 33).
4. **Presentation is derived, never authored.** Date ranges, status badges, sort order, and section visibility are computed from data. `PLAN.md` section 6 and section 14 forbid hardcoding them.
5. **Content stays portable.** One plain YAML file in git, with Markdown for long-form bodies. No proprietary format, so section 22 holds.
6. **Placeholders are labelled as placeholders.** Per Rule 3, nothing invented is ever presentable as fact.

---

## 2. Collection overview

All content lives in **one file, `content/portfolio.yaml`** (ADR-010), with one section per collection. Images sit beside it in `content/images/`.

| Section | Shape | Long-form `body:` | Cardinality |
| --- | --- | --- | --- |
| `profile` | one set of fields | — | exactly one |
| `experience` | list | — | many |
| `projects` | list | Markdown, shown on `/projects/<id>` | many |
| `skills` | list | — | many |
| `education` | list | — | many |
| `achievements` | list | — | many (currently none) |
| `posts` | list | Markdown, shown on `/writing/<id>` when not `external` | many |

Each Astro collection loads its own section through `src/lib/portfolio-loader.ts`. Every list entry carries an explicit `id` — the URL segment for projects and posts, and what skill evidence refers to.

`body:` is accepted only where a page displays it. Anywhere else it is rejected, because a field that is shown nowhere is a trap for the person editing the file.

---

## 2a. API and version notes

Verified against the current toolchain on 2026-09-02. These are easy to get wrong from memory, so they are recorded here rather than rediscovered during Phase 1.

- **Zod is imported from `astro/zod`**, not from `astro:content`. Astro 6 deprecated the `astro:content` re-export and `astro:schema`; both still work in Astro 7 but are marked for removal in Astro 8.
- **Astro bundles Zod 4**, not Zod 3. Format validators moved to the top level: `z.email()` and `z.url()`, not `z.string().email()` / `z.string().url()`. Custom issue messages use `{ error: ... }`, not `{ message: ... }`. The schema code in this document reflects Zod 4.
- **Entries are keyed by `id`, not `slug`.** Astro 6 removed the `slug` property. Each list entry in `portfolio.yaml` states its own `id`, which is why the `projects` schema has no `slug` field — the id *is* the slug, which keeps one fewer thing to get out of sync.
- **Every schema object is strict** (`z.strictObject`). The code excerpts below show `z.object` for readability; in `src/content.config.ts` an unknown key is a build error, so a misspelled field fails instead of silently disappearing.
- **Retrieval API:** `getEntry()` and `getCollection()`. `getEntryBySlug()` and `getDataEntryById()` were removed in Astro 6.
- **Rendering API:** `render(entry)` imported from `astro:content`, not `entry.render()`.
- **The `image()` helper** requires the schema to be declared as a function receiving context: `schema: ({ image }) => z.object({ ... })`. Collections using `image()` — `profile`, `experience`, `projects`, `education`, `posts` — must use that form.
- **`reference()`** is imported from `astro:content` and validates against the target collection at build time.

---

## 3. Profile

Single entry. Covers `PLAN.md` section 5, plus section 29's requirement that the résumé be treated as content rather than hardcoded into the UI.

```ts
const profile = z.object({
  name:         z.string(),
  headline:     z.string(),          // one line, used in hero + <title>
  shortBio:     z.string(),          // ~2 sentences, used in meta description + OG
  longBio:      z.string(),          // markdown-in-yaml, used in About
  location:     z.string(),
  email:        z.email(),
  avatar:       image(),             // local asset; optimized by astro:assets
  ogImage:      image().optional(),  // falls back to avatar
  resume: z.object({
    file:       z.string(),          // path under public/resume/
    updated:    z.coerce.date(),
    label:      z.string().default('Résumé'),
  }),
  availability: z.object({
    open:       z.boolean(),
    message:    z.string().optional(),   // e.g. "Open to backend roles"
  }),
  socials: z.object({
    github:     z.url().optional(),
    linkedin:   z.url().optional(),
    website:    z.url().optional(),
    hashnode:   z.url().optional(),
    x:          z.url().optional(),
  }),
})
```

Notes:

- `avatar` uses Astro's `image()` helper, so the asset is validated to exist at build time and optimized on output. This structurally prevents the current site's hotlinked-Google-Drive portrait (`index.html:98`) and expiring Facebook CDN OG image (`index.html:43`) from recurring.
- `availability.open` drives the `#OpenToWork` treatment. The old site hardcoded that string into markup; here it is a boolean, so toggling it is a content change.
- `resume.updated` lets the UI display recency without anyone hand-editing a date in a component.

---

## 4. Experience

Covers section 6 and section 14. The current-role determination is the important part.

```ts
const experience = z.object({
  company:        z.string(),
  role:           z.string(),
  location:       z.string().optional(),
  employmentType: z.enum(['full-time','part-time','contract','freelance','internship','hackathon','self-employed']),
  startDate:      z.coerce.date(),
  endDate:        z.coerce.date().optional(),
  current:        z.boolean().default(false),
  logo:           image().optional(),
  website:        z.url().optional(),
  summary:        z.string(),                    // one line, timeline collapsed view
  responsibilities: z.array(z.string()).default([]),
  achievements:     z.array(z.string()).default([]),
  technologies:     z.array(z.string()).default([]),
  links: z.array(z.object({
    label: z.string(),
    url:   z.url(),
  })).default([]),
  order:          z.number().optional(),          // manual tiebreak only
})
.superRefine((v, ctx) => {
  if (v.current && v.endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'],
      message: 'Remove endDate when current: true, or set current: false.' })
  }
  if (!v.current && !v.endDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'],
      message: 'endDate is required unless current: true.' })
  }
  if (v.endDate && v.endDate < v.startDate) {
    ctx.addIssue({ code: 'custom', path: ['endDate'],
      message: 'endDate is earlier than startDate.' })
  }
})
```

There is no long-form `description` field for a role: `summary`, `responsibilities` and `achievements` carry it, because the timeline is the only place a role is shown and it displays those three.

### Derived date display

`PLAN.md` section 6 requires the UI to choose the label from the data, and section 14 forbids hardcoding the current company. A single helper in `src/lib/dates.ts` owns this and is unit-tested (section 34):

| Data | Rendered |
| --- | --- |
| `current: true`, start 2026-03 | `2026 — Present` |
| start 2023-01, end 2026-02 | `2023 — 2026` |
| start 2023-04, end 2023-09 | `2023` |

Sort order is `current` first, then `startDate` descending, then `order`. No component contains a company name.

---

## 5. Projects

Covers section 7 and section 13. The dossier sections are content fields, so a dossier's depth is an authoring decision, not a code change.

```ts
const projects = z.object({
  name:             z.string(),
  shortDescription: z.string(),              // card + terminal list view
  featured:         z.boolean().default(false),
  status:           z.enum(['active','completed','archived','experimental']),
  type:             z.enum(['web','backend','library','tool','game','experiment','other']),
  startDate:        z.coerce.date().optional(),
  image:            image().optional(),
  technologies:     z.array(z.string()).min(1),
  links: z.object({
    github:        z.url().optional(),
    demo:          z.url().optional(),
    documentation: z.url().optional(),
  }).default({}),
  problem:      z.string().optional(),               // section 13 "Problem"
  highlights:   z.array(z.string()).default([]),
  architecture: z.array(z.string()).default([]),     // section 13 "Architecture"
  decisions:    z.array(z.object({                   // section 13 "Engineering Decisions"
    decision: z.string(),
    reason:   z.string(),
  })).default([]),
  challenges:   z.array(z.string()).default([]),
  lessons:      z.array(z.string()).default([]),
  order:        z.number().optional(),
})
```

Rendering rules, all derived:

- Dossier sections with empty arrays are **omitted entirely** — no empty headings. A thin project stays presentable.
- `status` maps to a badge via a lookup table in the design system, so adding a status means touching one map, not every card.
- `featured: true` drives both the reader-mode featured grid and `$ projects --featured` (section 9). One flag, both modes.
- `archived` projects are excluded from default listings and reachable via `$ projects --all`.

---

## 6. Skills

Covers section 8, which is emphatic about what *not* to do: no invented percentages. `Java: 97%` communicates nothing. Evidence does.

```ts
const skills = z.object({
  name:     z.string(),
  category: z.enum(['Languages','Backend','Frontend','Databases','DevOps','Cloud','Tools','Concepts','Other']),
  level:    z.enum(['learning','working','proficient','advanced']),
  since:    z.coerce.date().optional(),          // years-of-use is derived, not typed
  icon:     z.string().optional(),               // icon-set identifier
  // Evidence — validated references, not free text:
  projects:   z.array(reference('projects')).default([]),
  companies:  z.array(reference('experience')).default([]),
  featured:   z.boolean().default(false),
  order:      z.number().optional(),
})
```

Two things this buys:

- **Referential integrity at build time — but not from `reference()` alone.** This was verified empirically rather than assumed, and the assumption was wrong. `reference()` validates the *shape* of a reference at schema level, but resolves existence lazily inside `getEntry()`. Against `astro@7.2.10`, a skill pointing at a non-existent project logs `[ERROR] [content] Invalid content reference: …` and then **the build completes and exits 0**, deploying a site with the evidence silently missing. Since section 33 requires the opposite, existence is enforced by the portfolio loader, which rejects a skill pointing at a missing id before any collection is populated — in `astro dev` as well as in builds. See section 10.
- **Evidence rendering comes free.** The UI resolves the references and renders section 8's prescribed shape:

  ```
  Java
  Used in: Pustakalaya · Image Extractor
  ```

  No skill card is authored by hand (section 8: *"Avoid manually building skill cards into the UI"*). Categories become sections by grouping the collection; `$ skills --backend` filters the same data.

`level` is a coarse four-value enum rather than a number precisely because it resists false precision. `since` exists so "used for N years" can be computed at build rather than becoming stale prose.

---

## 7. Education

```ts
const education = z.object({
  institution: z.string(),
  degree:      z.string(),
  field:       z.string().optional(),
  location:    z.string().optional(),
  startDate:   z.coerce.date(),
  endDate:     z.coerce.date().optional(),
  current:     z.boolean().default(false),
  grade:       z.string().optional(),
  logo:        image().optional(),
  highlights:  z.array(z.string()).default([]),
})
```

Shares the date-derivation helper and the same `current`/`endDate` refinement as `experience`.

**This collection resolves discovery defect 3.** The old site contradicted itself — `index.html:277` said Tribhuvan University, `resume.html:69` said ACHS college, Lalitpur. With one entry feeding every surface, the two cannot diverge again. (The underlying fact is likely that ACHS is a Tribhuvan-affiliated college, but that is yours to state, not mine to assume — Rule 3.)

---

## 8. Achievements

```ts
const achievements = z.object({
  title:       z.string(),
  issuer:      z.string().optional(),
  date:        z.coerce.date(),
  type:        z.enum(['certification','award','recognition','publication','talk','other']),
  credentialUrl: z.url().optional(),
  credentialId:  z.string().optional(),
  summary:     z.string().optional(),
})
```

Empty is a valid state: if the collection has no entries, the reader-mode section and the terminal command both omit themselves rather than rendering an empty heading. The old `resume.html:165` shipped a permanently empty `certifications` div; derived visibility prevents that class of bug.

---

## 9. Posts

Reader mode has a "Writing" section (section 10). Existing posts live on Hashnode, and section 40 lists a self-hosted blog as a possible future. One schema covers both, so migrating later is a content change:

```ts
const posts = z.object({
  title:       z.string(),
  publishDate: z.coerce.date(),
  summary:     z.string(),
  external:    z.url().optional(),   // set → link out; absent → render body
  canonical:   z.url().optional(),
  tags:        z.array(z.string()).default([]),
  cover:       image().optional(),
  draft:       z.boolean().default(false),
})
```

- `external` set → the entry renders as an outbound card. This is how the three Hashnode posts are represented today.
- `external` absent → `body` renders as a local post at `/writing/<id>`. No code change required to start blogging here.
- `draft: true` is excluded from production builds and from the sitemap.

---

## 10. Validation behavior

Schemas execute during `astro build`. Example of the failure mode section 33 asks for:

```
[InvalidContentEntryDataError] experience → cloud-tech data does not match collection schema.

  endDate: endDate is required unless current: true.
  role: Required
```

The build stops. Nothing deploys. Compare with the current site's failure mode: a wrong value renders silently and is discovered by a visitor.

Three layers:

1. **Schema** — types, enums, required fields, URL and email formats. Astro fails the build. ✅ verified.
2. **Refinements** — cross-field logic (`current` vs `endDate`, date ordering, and the year-quoting guard below). Astro fails the build. ✅ verified.
3. **The whole file** — checked by `src/lib/portfolio-loader.ts` before any collection loads: unknown section names, missing or malformed ids, duplicate ids, `body` where it is shown nowhere, and skill references to ids that do not exist. **Astro does *not* fail the build on a missing reference** (see section 6), which is why this layer exists. ✅ verified against nine deliberate mistakes.

Layer 3 reports every problem in one pass rather than stopping at the first, and runs in `astro dev` too — a broken save keeps the last good content on screen and prints the problems in the terminal. Its logic is a pure function, `validatePortfolio`, unit-tested in `tests/unit/portfolio-loader.test.ts`, which also checks the real `portfolio.yaml`.

Example of layer 3 failing:

```
content/portfolio.yaml has 1 problem(s):

  ✗ skills entry #1 (java) lists "pustakalya" under `projects:`, but no entry in `projects:` has that id. Did you mean "pustakalaya"?
```

A wrong reference is usually a near-miss, so the likely fix is named in the error. When nothing is close, the valid ids are listed instead.

If the file's structure is broken — a misspelled section name, say — reference checks are skipped until it is fixed. Otherwise one mistake would be reported once per skill that points into the section that "disappeared".

### The YAML year footgun

`z.coerce.date()` has a trap worth knowing about. In YAML an unquoted `2023` is a **number**, and `new Date(2023)` means 2023 *milliseconds* after the epoch — so the site would render `1970 — Present` with no error anywhere. The `contentDate` helper adds a floor check that turns this into a build failure with an actionable message:

```
startDate: Date resolves before 1990. In YAML, an unquoted year is parsed as a
number — quote it as "2023" or write a full date like "2023-04-01".
```

Year-only values are fully supported — just quote them. Since every rendered label derives only the year, a year-only input yields a year-only output with no invented precision. The TechTrix hackathon entry uses exactly this, because the v3 site gave only "2023".

Additionally, `astro check` runs in CI, so a component reading a field that no longer exists in the schema is a type error rather than a runtime `undefined`.

### Known cosmetic noise

An intentionally empty collection (currently `achievements`) makes Astro log `No files found matching …` and `The collection "achievements" does not exist or is empty. Please check your content config file for errors.` The build succeeds and `getCollection()` correctly returns `[]`. The message is misleading — there is no config error — but the empty collection is deliberate, since section 8's derived-visibility requirement needs an empty case to prove the section omits itself rather than rendering a bare heading. The noise disappears once a real achievement is added.

---

## 11. Authoring workflows

Every workflow is an edit to `content/portfolio.yaml`. With `npm run dev` running, a save shows up in about a second.

### Adding a job (section 21)

Add an entry under `experience:`:

```yaml
  - id: acme-corp
    company: Acme Corp
    role: Backend Engineer
    location: Kathmandu, Nepal
    employmentType: full-time
    startDate: "2026-03-01"
    current: true
    summary: Building payment infrastructure on Spring Boot.
    responsibilities:
      - Designed and shipped the reconciliation service.
    achievements:
      - Cut settlement latency from hours to minutes.
    technologies: [Java, Spring Boot, PostgreSQL, Docker]
```

Then `git push`. The timeline gains an entry, it is marked current and sorted to the top, `2026 — Present` is derived, the technology chips render, and `$ experience` in the terminal includes it.

**Files edited: one. Components edited: zero.** This is the section 39 maintenance criterion.

### Adding a project

Add an entry under `projects:` with at minimum `id`, `name`, `shortDescription`, `status`, `type`, and one technology. The row on the homepage, the page at `/projects/<id>`, the sitemap entry and `$ projects` all follow. To feature it, set `featured: true`. For a full project page, add `problem`, `architecture`, `decisions`, `challenges` and `lessons` — the `placeholder-active-project` entry shows each.

### Claiming a skill with evidence

```yaml
  - id: spring-boot
    name: Spring Boot
    category: Backend
    level: proficient
    since: "2023"
    projects: [pustakalaya]   # ← build fails if no project has this id
    companies: [acme-corp]
```

### Updating the résumé

Drop the new PDF in `public/resume/`, then set `profile.resume.file` and `resume.updated`. Both the "View" and "Download" affordances (section 29) point at the config value, so neither is hardcoded.

---

## 12. Placeholder policy

Phase 1 ships placeholder content per Rule 3 and the approved decision. Rules:

- Placeholder entries are unmistakable — `company: "PLACEHOLDER — Example Corp"` — never a plausible-looking invented employer.
- **Real content is used where real content exists.** The three genuine projects (Pustakalaya, Image Extractor, Buzzwire), the three Hashnode posts, and the 2023 Techtrix hackathon are migrated as fact, since they came from the owner's own site.
- Facts known to be stale are **not** carried over as fact: "age 21", "0 Years of Experience", "1 Happy Client", and `© 2023` are dropped rather than migrated. Age is omitted from the schema entirely — it is not useful signal and it goes stale annually.
- The placeholder set is chosen to exercise every UI state at least once: a current role and a past role, each project status, an empty achievements collection, an external post and a local post.
- A `content/README.md` states plainly which entries are placeholders and must be replaced before launch.

---

## 13. Deliberate omissions

| Omitted | Why |
| --- | --- |
| Numeric skill percentages | Section 8 rejects them as arbitrary |
| `age` | Goes stale yearly; weak signal. The old site's "21" is now wrong |
| "Years of experience" counter | Section 8's evidence principle applies; derive from `experience` if ever wanted |
| "Happy clients" counter | Unverifiable vanity metric; the old site's value was 1 |
| Free-text `technologies` on skills | Would defeat `reference()` integrity checking |
| A database | Section 19 and section 4 both say not without genuine need. There is none |
