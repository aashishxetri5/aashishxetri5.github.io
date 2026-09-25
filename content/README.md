# Content

**Everything on the site comes from one file: [`portfolio.yaml`](portfolio.yaml).**

Your name, bio, jobs, projects, skills, education, achievements and posts are all in it. Nothing else needs to change to update the site. Images live beside it in `images/`.

## How to edit

1. `npm run dev` and open <http://localhost:4321>
2. Edit `content/portfolio.yaml` and save — the page updates in about a second
3. Commit and push when you're happy

If you save a mistake, the page keeps showing the last good version and the terminal running `npm run dev` says what's wrong and where. Fix it, save, and it recovers.

Before pushing, `npm run build` must pass. It fails on any mistake rather than letting it reach the live site.

## The rules that matter

**Every list entry needs an `id:`** — lowercase letters, numbers and dashes, e.g. `my-project`. For projects and posts it's the URL (`/projects/my-project`). Skills refer to projects and jobs by their id.

**Quote dates.** `"2023"` or `"2023-04-01"`. Unquoted, YAML reads `2023` as a number and the build stops you.

**`body: |` is Markdown**, shown on a project's or post's own page. Everywhere else, use `summary:`.

**Misspellings are errors, not ignored.** Type `feautred: true` and the build tells you `Unrecognized key: "feautred"` on that entry. Type `projetcs:` and it asks whether you meant `projects:`.

## Common edits

**New job** — add under `experience:`. Mark the one you're in now with `current: true` (and no `endDate`); it's shown first as "2026 — Present" automatically.

```yaml
  - id: acme-corp
    company: Acme Corp
    role: Backend Engineer
    employmentType: full-time
    startDate: "2026-03-01"
    current: true
    summary: One line about what you do there.
    technologies: [Java, Spring Boot, PostgreSQL]
```

**New project** — add under `projects:`. The minimum is `id`, `name`, `shortDescription`, `status`, `type` and `technologies`. Its page, its row on the homepage and its terminal entry all appear on their own.

**Claim a skill** — add under `skills:` and list where you used it. Those projects then show the skill under "Skills evidenced here" — you only write the link once.

```yaml
  - id: spring-boot
    name: Spring Boot
    category: Backend
    level: proficient
    projects: [pustakalaya]
    companies: [acme-corp]
```

**Résumé** — put a PDF in `public/resume/`, then uncomment the `resume:` block under `profile:`. The View and Download buttons appear once it's there.

Field-by-field reference: [`docs/content-model.md`](../docs/content-model.md).

---

## Your to-do list

Everything in the file is either **REAL** (migrated from your v3 site — your own words), **CONFIRM** (real but possibly out of date), or **PLACEHOLDER** (not real). Comments in the file mark each one. Nothing invented is presented as fact.

### Before launch

- [ ] **Résumé PDF** — none exists yet, so the résumé buttons are hidden
- [ ] **Education** — v3 said *Tribhuvan University* in one place and *ACHS college, Lalitpur* in another. Confirm the institution; the dates are placeholders
- [ ] **Delete or replace every `PLACEHOLDER` entry** — two jobs, three projects, one post. They exist so every layout has something to show. Deleting them all is safe
- [ ] **Custom domain** — `site.config.mjs` still points at `aashishxetri5.github.io`

### Check these are still true

- [ ] `headline: Backend Developer` — your self-description from 2023
- [ ] `availability.open: true` — v3 said `#OpenToWork` in 2023
- [ ] `shortBio` / `longBio` — adapted from your v3 copy, stale facts removed
- [ ] The "Renaming uploaded file" post is dated Feb 3, 2022 — *after* the Feb 1 post it follows. Kept as v3 had it

### ⭐ Highest-value edit on the site

**Your three real projects have no write-up.** Pustakalaya, Image Extractor and Buzzwire show only a description and the skills list, while the project pages can show much more:

```yaml
    problem: What problem this solved, and for whom.
    architecture:            # ordered steps, drawn as a connected flow diagram
      - The browser sends ...
      - A Servlet validates ...
      - JDBC writes to MySQL ...
    decisions:
      - decision: The choice you made.
        reason: Why, and what you gave up.
    challenges:
      - Something that was genuinely hard.
    lessons:
      - What you would do differently.
```

Every field is optional and empty ones don't appear, so even one good `problem` and two `decisions` makes a page worth reading. The `placeholder-active-project` entry shows all of them filled in.

I can't write these for you — they're your engineering decisions, and a plausible-sounding invented one is worse than none.

### Left out of v3 on purpose

- **"Age 21", "0 Years of Experience", "1 Happy Client", "© 2023"** — out of date or unverifiable
- **"Fullstack Web Developer (2018–Present)"** and **"Freelancing (2023–Present)"** — unknown whether still current. Add them back under `experience:` if they are
- **Facebook link** — `socials:` supports `github`, `linkedin`, `hashnode`, `website` and `x`
- Unused v3 images — recoverable from git tag `v3.0`
