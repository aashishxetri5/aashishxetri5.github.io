# AASHISH.OS

## Interactive Developer Portfolio - Master Blueprint

> **Purpose of this document:**
> This is the master product, UX, architecture, and implementation blueprint for building my personal developer portfolio.
>
> This document is intentionally designed as a **living implementation plan**, not a one-shot coding prompt.
>
> Claude should work through this project **phase by phase**, verify each phase before moving to the next, and keep this document updated as implementation decisions evolve.

---

# LIVE STATUS

<!-- Maintained per §43. Update at the end of every phase, per Rule 2 step 8. -->

**Current phase:** Phase 5 — Project Dossiers → **complete**
**Next phase:** Phase 6 — Visual Polish → **awaiting approval**
**Last updated:** 2026-09-06
**Working branch:** `portfolio-v4` (local only — not yet pushed)

## Completed

- [x] **Phase 0 — Discovery.** Repository inspected, existing stack and deployment determined, reusable assets identified, stack alternatives evaluated against §18, architecture proposed and approved, content model specified.
  - Deliverable: `docs/architecture.md`
  - Deliverable: `docs/content-model.md`
  - Deliverable: `docs/cms.md` (§4 content-management evaluation)

- [x] **Phase 1 — Content System.** Astro 7.2.10 + Tailwind 4.3.3 scaffolded; all seven collection schemas written with Zod 4; content loading, validation, and referential integrity working; content tree populated per Rule 3.
  - **Exit condition met:** `npm run build` exits 0 clean and exits 1 on invalid content, verified against four distinct failure modes (missing required field, incoherent `current`/`endDate`, the YAML unquoted-year trap, broken cross-collection reference).
  - 21 unit tests passing; `astro check` reports 0 errors / 0 warnings.
  - Toolchain assumptions were **verified empirically, not trusted** — see "Verified toolchain" in `docs/architecture.md`. Three would have been wrong: `@astrojs/tailwind` is deprecated and its peer deps exclude Astro 7; Zod comes from `astro/zod` and is Zod 4 (so `z.email()`, not `z.string().email()`); Astro 7 no longer installs `@astrojs/markdown-remark` by default.
  - **One documented claim turned out false and was fixed rather than quietly dropped:** `reference()` does *not* fail the build on a missing target — it logs an error and exits 0. `scripts/validate-content.mjs` now enforces it as a `prebuild` gate. See "Known issues" below.
  - Deliverable: `src/content.config.ts`, `src/lib/dates.ts`, `scripts/validate-content.mjs`, `content/**`, `content/README.md`

- [x] **Phase 2 — Reader Mode.** One design system, page shell with full SEO, all reader-mode sections, project and writing routes, 404, and Markdown sanitization.
  - **Exit condition met:** the portfolio is already genuinely useful with every experimental feature removed. This is what makes the AASHISH.OS shell additive rather than load-bearing.
  - **Ships zero JavaScript files.** Verified: `find dist -name '*.js'` returns 0. The only scripts on any page are two inline theme snippets and a JSON-LD block, so §26 and §39's "does it survive JS failing" are structural, not aspirational.
  - 9 pages built; `astro check` 0 errors / 0 warnings; 21 tests passing. Images optimized 184 kB → 17 kB.
  - §31 sanitization was verified as a **real exploitable gap**, not assumed — see ADR-007 and "Known issues" #4 below.
  - **Scope adjustment:** project pages were built in Phase 2 rather than Phase 5, because Phase 2 ships project cards and a card linking nowhere is a dead end. The dossier fields already existed in the schema from Phase 1, so rendering them cost nothing. **Phase 5 is now presentation depth** — architecture diagrams, richer decision layout — rather than plumbing.
  - Deliverable: `src/layouts/BaseLayout.astro`, `src/components/**` (12 components), `src/pages/**`, `src/lib/content.ts`, `src/styles/global.css`

- [x] **Phase 3 — AASHISH.OS Shell.** Boot sequence, window panels, system status, terminal surface, command registry, mode switch.
  - `/` reader mode verified still at **zero JavaScript**; React (~62 KB gz) confined to `/os`
  - Rule 7 enforced structurally via `src/lib/snapshot.ts`, not by discipline
  - 46 unit tests; `astro check` 0 errors / 0 warnings / 0 hints

- [x] **Phase 4 — Terminal Engine.** Central flag parsing, `project <name>`, `theme`, `github`, Tab completion, persistent history. Registry is now 16 commands and every command §9 lists exists.
  - **Gap found by audit, not memory:** checking the registry against §9's command list surfaced `project`, `theme` and `github` as missing, and flags as parsed-but-uninterpreted.
  - **`theme` forced an architectural decision.** It is the first command needing a side effect. Rather than let it touch the DOM — which would have killed the pure-handler property the registry's testability rests on, and set a precedent for the next such command — `CommandResult` gained a declarative `effect` the renderer performs. It shares the existing `data-theme` + `localStorage['theme']` contract with `ThemeToggle.astro` and the pre-paint script instead of forking it.
  - Skill category flags are **derived from content**: adding a category to the schema yields `skills --<category>` plus its completion with no code change.
  - 74 unit tests (was 46); `astro check` 0/0/0; reader mode verified still at 0 islands.
  - **Dev server verified explicitly this time** — the Phase 3 regression was dev-only because build and `astro check` both passed while `astro dev` was never started.

- [x] **Phase 5 — Project Dossiers.** §13's framed record header, architecture rendered as a connected flow diagram, decisions as a term/description table, reverse content-graph lookup, prev/next navigation, graceful thin-project path.
  - **Architecture stopped being a list.** The field is an ordered `string[]`; Phase 2 rendered boxed lines, which showed the steps but not that they were connected — the only thing a reader wants from an architecture section. Now real nodes with real connectors, pure CSS per ADR-004, markup still a plain `<ol>`.
  - **The content graph is read backwards.** Content authors skill → project; the dossier wants project → skills. Derived rather than authored twice, so they cannot disagree, and adding a skill reference enriches the project page with no edit to the project file. Mirrored into the snapshot so the terminal shows the same graph.
  - Prev/next verified across all 6 pages: linear chain, **0 broken neighbour links**, ends handled. Archived projects are in the chain deliberately — excluded from listings, but excluding them here would strand anyone arriving from a link.
  - 74 tests; `astro check` 0/0/0; reader mode still 0 islands.
  - ⚠️ **Surfaced an open content gap — see "Known issues" #5.**

## Decisions taken

| ID | Decision | Status | Where |
| --- | --- | --- | --- |
| ADR-001 | Astro + React islands + Tailwind + Content Collections (Zod) | Approved | `docs/architecture.md` |
| ADR-002 | Netlify primary, GitHub Pages static mirror, one codebase | ⚠️ **Contested** | `docs/architecture.md` |
| ADR-003 | Author-facing content lives at `/content/`, outside `src/` | Approved | `docs/architecture.md` |
| ADR-004 | CSS-first animation; no Three.js; no motion library yet | Approved | `docs/architecture.md` |
| ADR-005 | GitHub Pages primary + Cloudflare Workers | ❌ **Rejected** — retained as fallback | `docs/architecture.md` |
| ADR-006 | *Proposed:* Sveltia CMS, with Decap documented as fallback | Awaiting decision (Phase 8) | `docs/cms.md` §3 |
| ADR-007 | Sanitize Markdown via the legacy unified processor | Approved | `docs/architecture.md` |
| ADR-008 | Modes are separate routes (`/` and `/os`), not a JS toggle | Approved | `docs/architecture.md` |
| ADR-009 | Command side effects are declared as data, not performed by handlers | Approved | `docs/architecture.md` |

The canonical Architecture Decision Log lives in `docs/architecture.md`, not here. §43 asks for a decision log and §35 asks for `docs/architecture.md`; keeping ADRs in both places would guarantee drift, which defeats §43's own stated purpose of being understandable months later. This section indexes them instead.

## Corrections to this document

§43 says historical decisions must not be deleted without explanation. Recording a factual correction rather than silently editing §20:

- **§20 is inaccurate as written.** It states the current deployment is `GitHub → Netlify → Custom Domain` and instructs preserving that workflow. Discovery found no `netlify.toml`, no `CNAME`, and no `package.json` in the working tree or anywhere in git history. The live site is plain **GitHub Pages** serving `main` at `aashishxetri5.github.io`. Netlify was adopted as the target by decision (ADR-002) because Phases 7 and 8 require serverless execution — not because it already existed.

## Remaining

Phases 6–12 as specified in §37.

**Phase 6 (Visual Polish) is next:** micro-interactions, transitions, terminal cursor effects, timeline and project animations. §37 warns to keep animation restrained — "sophisticated, not like a screensaver escaped from a graphics course" — and §26 ranks performance above spectacle, so the CSS-first constraint of ADR-004 still binds.

## Known issues — introduced or discovered during implementation

1. **`reference()` does not fail the build.** Astro validates reference *shape* at schema level but resolves existence lazily in `getEntry()`. A broken reference logs `[ERROR] [content]` and the build still exits 0. Mitigated by `scripts/validate-content.mjs` as a `prebuild` gate. **Consequence: `npm run build` is the only safe build entry point — `npx astro build` bypasses the gate.** Netlify's build command must be `npm run build`.
2. **Empty collections log a misleading error.** `achievements` is deliberately empty, which makes Astro print *"does not exist or is empty. Please check your content config file for errors."* There is no config error; the build succeeds and `getCollection()` returns `[]`. Noise disappears once a real achievement exists.
3. **TypeScript is pinned to ^6, not ^7.** `@astrojs/check@0.9.10` peers `typescript@^5 || ^6`. TS 7 produces an `ERESOLVE` failure. Revisit when `@astrojs/check` supports TS 7.
5. **Project dossiers are built but empty.** Phase 5 shipped the full dossier presentation, and none of the three real projects (`pustakalaya`, `image-extractor`, `buzzwire`) has `problem`, `architecture`, `decisions`, `challenges` or `lessons` authored — so they render only the auto-derived "Skills evidenced here". The richest part of the site is complete and unused. **Not fixable by Claude:** Rule 3 forbids inventing engineering decisions, and a plausible invented rationale is worse than an absent one. Exact YAML and a worked example are in `content/README.md`; `placeholder-active-project` demonstrates the full shape.
4. ✅ **Markdown sanitization — resolved in Phase 2, and the gap was real.** A probe containing `<img src=x onerror="alert(1)">` and `<script>alert(2)</script>` built successfully and kept **both** the `onerror` attribute and the inline script in the output HTML. Now fixed via `rehype-sanitize`; see ADR-007 for the Sätteri trade-off this required.
5. **`site.config.mjs` points at the `github.io` origin, not the custom domain.** Placeholder until the domain is supplied. Affects canonical URLs, sitemap base, absolute OG image URLs, and the `Sitemap:` line in `public/robots.txt` — **that one is hardcoded and must be updated at the same time.**
6. **Netlify has an unmetered-deploy trap for content edits.** Recorded fully in ADR-002: branch deploys cost 0 credits but production deploys cost 15, so Phase 8's CMS must commit to a non-production branch and publish on a deliberate merge.

## Carried-forward defects from v3

Found during discovery. Each must be resolved by the rebuild, not reproduced. Status after Phase 1:

1. ✅ **Fixed.** Hotlinked Google Drive portrait — now a local asset at `content/profile/images/avatar.jpg`, validated to exist at build time via `image()`.
2. ✅ **Structurally prevented.** Expiring Facebook CDN OG image — the schema's `ogImage` is an `image()`, so a remote URL cannot be authored. Phase 2 wires the tag itself.
3. ⚠️ **Surfaced, not resolved.** The Tribhuvan/ACHS contradiction is now impossible to have twice over (one `education` entry feeds every surface), but the institution name is a marked placeholder — **owner must confirm** which is correct. Rule 3 forbids me guessing.
4. ✅ **Dropped.** "Age 21", "0 Years of Experience", "1 Happy Client", `© 2023` were not migrated. `age` is absent from the schema entirely.
5. ✅ **Resolved by construction.** One Tailwind design system; the separate `resume.html` stylesheet is gone.
6. ⏳ **Deferred to Phase 6.** No cursor ring exists yet. When reintroduced it must be gated on both `prefers-reduced-motion` and `pointer: fine`.

## Open questions

- **⚠️ ADR-002 is contested and blocks Phase 11 (not Phase 1).** Netlify's free tier is now credit-based for accounts created on/after 2025-09-04, capping production deploys at roughly 20/month, with overage *pausing* the site. Since §21's publish workflow makes every content save a production deploy, ADR-002's own use case would exhaust the budget. `docs/cms.md` §5 proposes ADR-005 — GitHub Pages primary via Actions, Cloudflare Workers for the two serverless needs — which also removes the mirror and upgrades the `github.io` canonical hint to a real 301. **Owner decision needed.**
- **Custom domain name not yet supplied.** Owner confirmed one exists. `SITE_URL` is a single config constant marked `TODO` until provided — canonical URLs, sitemap base, and absolute OG image URLs all read from it. One-line change, no code edits.
- **Résumé source of truth.** The v3 site had both a hosted PDF (Google Drive) and a hand-built `resume.html`. §29 wants view + download and treats the file as content. Decide in Phase 2 whether the HTML résumé page is regenerated from content or retired in favour of the PDF alone.
- **Markdown sanitization dependency.** Astro 7 no longer installs `@astrojs/markdown-remark` by default. §31 requires sanitized rendering, so a rehype sanitizer must be added explicitly in Phase 1 rather than assumed present.

## Repository housekeeping

- `PLAN.md` is currently **untracked** in git. It should be committed so the constitution is versioned alongside the code it governs.
- Branch `rebuild` (pushed to origin) is redundant now that `portfolio-v4` is the working branch. Both point at `8c4707e`. Left in place pending owner confirmation before any remote branch is deleted.
- Tag `v3.0` marks the final state of the pre-rebuild site.

---

# 0. PROJECT PHILOSOPHY

Build a personal portfolio that feels like a developer's operating system rather than a conventional portfolio website.

The central concept is:

> **AASHISH.OS: a personal operating system for exploring my work, projects, experience, skills, experiments, and writing.**

The website should be:

* technically impressive
* memorable
* fast
* accessible
* responsive
* easy to maintain
* easy to extend
* recruiter-friendly
* developer-friendly
* SEO-friendly
* deployable on Netlify's free tier
* connected to GitHub
* usable without requiring code changes for normal content updates

The unconventional UI should **never get in the way of the content**.

The visitor should be able to understand who I am and what I do within approximately 10-20 seconds.

---

# 1. MOST IMPORTANT PRODUCT REQUIREMENT

## Separate CONTENT from CODE.

The portfolio application should contain the presentation logic.

My professional information should live separately as structured content.

For example:

```text
portfolio/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── terminal/
│   └── ...
│
├── content/
│   ├── profile/
│   ├── experience/
│   ├── projects/
│   ├── skills/
│   ├── education/
│   ├── achievements/
│   └── posts/
│
├── public/
│
└── ...
```

A new job should require something like:

```text
content/experience/acme-corp.md
```

or an equivalent structured content entry.

It should NOT require editing React components, page layouts, routing logic, or application code.

---

# 2. CONTENT MANAGEMENT REQUIREMENT

The site must eventually support updating portfolio content without directly modifying application source code.

There should be a clear distinction between:

### Developer changes

Changes to:

* UI
* animations
* components
* application logic
* architecture
* styling
* terminal behavior
* features

These require code changes.

### Content changes

Changes to:

* new job
* old job
* project
* skill
* achievement
* education
* biography
* profile information
* blog/article
* social links
* résumé
* featured project

These should NOT require code changes.

---

# 3. CONTENT MANAGEMENT STRATEGY

Use a **content-driven architecture**.

Preferred initial approach:

```text
GitHub
   ↓
Structured content
   ↓
Build
   ↓
Netlify
   ↓
AASHISH.OS
```

Content can initially live in Markdown/MDX/YAML/JSON files stored separately from UI logic.

However, the architecture should be designed so that a future CMS/admin interface can be added without rewriting the frontend.

---

# 4. CMS / ADMIN DIRECTION

Eventually I want something like:

```text
/admin
```

or an external content-management interface where I can:

* add experience
* edit experience
* delete/archive experience
* add project
* edit project
* add skill
* edit profile
* publish article
* upload images
* update résumé
* change social links

without opening the source code.

Before selecting a CMS, evaluate:

* Netlify free-tier compatibility
* GitHub integration
* free tier
* authentication
* Markdown/MDX support
* media handling
* API availability
* ease of migration
* maintenance burden
* vendor lock-in
* deployment workflow
* ability to trigger Netlify builds

Do NOT introduce a database unless there is a genuine requirement for one.

Prefer the simplest architecture that satisfies the requirement.

---

# 5. RECOMMENDED CONTENT MODEL

Design content schemas before building UI.

## Profile

Example:

```yaml
name:
headline:
shortBio:
longBio:
location:
email:
avatar:
resume:
availability:
socials:
  github:
  linkedin:
  email:
  website:
```

---

# 6. EXPERIENCE MODEL

Each experience entry should support:

```yaml
company:
role:
location:
employmentType:
startDate:
endDate:
current:
logo:
website:
summary:
description:
responsibilities:
  - ...
achievements:
  - ...
technologies:
  - Java
  - Python
  - Spring Boot
links:
  - ...
```

The UI should automatically determine whether to display:

```text
2026 - Present
```

or:

```text
2023 - 2026
```

based on the content.

Do not hardcode dates into components.

---

# 7. PROJECT MODEL

Projects should support:

```yaml
id:
name:
slug:
shortDescription:
description:
featured:
status:
type:
image:
technologies:
  - Java
  - Python
  - React
github:
demo:
documentation:
highlights:
  - ...
architecture:
  - ...
challenges:
  - ...
lessons:
  - ...
```

Possible statuses:

```text
active
completed
archived
experimental
```

The frontend should automatically render appropriate UI based on the project data.

---

# 8. SKILLS MODEL

Avoid manually building skill cards into the UI.

Use structured data.

Example:

```yaml
name: Java
category: Languages
level: advanced
years:
projects:
  - project-id
```

Possible categories:

```text
Languages
Backend
Frontend
Databases
DevOps
Cloud
Tools
Concepts
Other
```

Do not over-focus on fake numerical skill percentages.

Avoid:

```text
Java: 97%
Python: 91%
```

These numbers are arbitrary and don't communicate much.

Instead show evidence:

```text
Java

Used in:
- Project A
- Project B
- Company X
```

---

# 9. TERMINAL EXPERIENCE

The primary interaction model is a terminal-inspired interface.

Example:

```text
$ help
```

returns:

```text
Available commands:

about
experience
projects
skills
education
contact
resume
blog
clear
theme
help
```

Potential commands:

```text
$ about
$ projects
$ projects --featured
$ project <name>
$ experience
$ skills
$ skills --backend
$ education
$ blog
$ contact
$ resume
$ github
$ clear
$ theme
$ help
```

Commands should be implemented through a proper command system.

Do NOT write one giant component containing hundreds of conditionals.

Use a command registry.

Example conceptual architecture:

```text
CommandRegistry
    ↓
CommandParser
    ↓
CommandHandler
    ↓
CommandResult
    ↓
TerminalRenderer
```

---

# 10. TERMINAL + VISUAL UI

The terminal should not be the only way to navigate.

Provide two experiences:

```text
[ TERMINAL MODE ]

[ READER MODE ]
```

## Terminal Mode

Experimental, interactive, developer-focused.

## Reader Mode

Clean, conventional, recruiter-friendly.

Reader mode should contain:

```text
Hero
About
Experience
Projects
Skills
Education
Achievements
Writing
Contact
Resume
```

Both modes should consume the **same content source**.

Never duplicate portfolio information between modes.

---

# 11. AASHISH.OS VISUAL LANGUAGE

The website should feel like an operating system.

Possible UI elements:

```text
AASHISH.OS
v1.0.0

● SYSTEM ONLINE

CPU
MEMORY
NETWORK
UPTIME
```

Some of these can be decorative.

Do not fake real system metrics in a misleading way.

If metrics are decorative, clearly make them part of the visual experience.

Possible interface elements:

* command terminal
* window panels
* taskbar/dock
* system status
* notifications
* file browser
* project dossiers
* modal windows
* logs
* command history
* boot sequence

---

# 12. BOOT EXPERIENCE

The landing page may have a very short boot sequence.

Example:

```text
INITIALIZING AASHISH.OS...

[OK] Loading profile
[OK] Loading projects
[OK] Loading experience
[OK] Loading skills
[OK] Connecting to reality

Welcome.
```

Requirements:

* skippable
* very short
* never block content unnecessarily
* disabled or reduced for users with reduced-motion preferences
* should not harm SEO
* should not cause slow initial rendering

The boot animation is flavor, not a loading screen.

---

# 13. PROJECT DOSSIERS

Clicking a project should open a rich project view.

Concept:

```text
┌───────────────────────────────────────────────┐
│ PROJECT // DISTRIBUTED TASK SCHEDULER         │
├───────────────────────────────────────────────┤
│                                               │
│ STATUS: ACTIVE                                │
│                                               │
│ Java · Spring Boot · Redis · Docker           │
│                                               │
│ Problem                                       │
│ --------                                      │
│ ...                                           │
│                                               │
│ Architecture                                  │
│ -----------                                   │
│ ...                                           │
│                                               │
│ Engineering Decisions                         │
│ ---------------------                         │
│ ...                                           │
│                                               │
│ [ GitHub ] [ Live Demo ] [ Documentation ]    │
└───────────────────────────────────────────────┘
```

Project pages should be content-driven.

---

# 14. EXPERIENCE AS A TIMELINE

Experience should visually resemble a system log / timeline.

Example:

```text
2026 ────────────────────────┐
                             │
                        COMPANY X
                        Software Engineer
                             │
                             ▼
2024 ────────────────────────┤
                             │
                        COMPANY Y
                        ...
                             │
                             ▼
2022 ────────────────────────┘
```

Current employment should be visually distinguishable.

Do not hardcode the current company.

Use:

```yaml
current: true
```

and let the UI determine presentation.

---

# 15. AI ASSISTANT

The AI assistant should be an optional feature.

Possible interaction:

```text
$ ask Which project best demonstrates my backend experience?
```

Response:

```text
Based on the projects in the portfolio:

1. Distributed Task Scheduler
2. ...
3. ...

The strongest match is Distributed Task Scheduler because...
```

The AI must use the portfolio's actual content.

Do not let it invent:

* companies
* projects
* technologies
* achievements
* employment dates
* responsibilities

If AI integration is added, design it as a separate service/module.

The core portfolio must work perfectly without AI.

---

# 16. AI COST AND SECURITY

Because the portfolio is hosted on Netlify's free tier:

* never expose API keys in frontend code
* never call paid AI APIs directly from the browser with secret credentials
* use server-side/edge/serverless functions if required
* cache where appropriate
* implement rate limiting
* protect against abuse
* provide graceful fallback

The portfolio must remain functional if the AI service is unavailable.

---

# 17. GITHUB INTEGRATION

Potential integrations:

* GitHub repositories
* contribution information
* repository links
* project metadata

Do not make GitHub API availability a dependency for rendering the core portfolio.

If GitHub is unavailable:

```text
Portfolio still works.
```

Cache external data where appropriate.

Avoid excessive API requests.

---

# 18. TECH STACK

Choose the stack based on:

1. performance
2. maintainability
3. Netlify compatibility
4. developer experience
5. ecosystem maturity
6. SEO
7. simplicity

Do not choose a technology merely because it is fashionable.

Potential stack:

```text
Frontend:
React / Next.js / Astro / equivalent

Styling:
Tailwind CSS or another maintainable system

Animation:
Framer Motion / Motion
CSS animations
Three.js only where justified

Content:
Markdown / MDX / structured data

Hosting:
Netlify

Repository:
GitHub
```

Claude must evaluate the alternatives before finalizing the stack.

---

# 19. IMPORTANT ARCHITECTURAL RULE

Avoid unnecessary complexity.

This is a portfolio.

It is NOT:

* a social network
* a SaaS platform
* a microservices demonstration
* a Kubernetes cluster
* a distributed database experiment

If something can be solved with:

```text
static content + build process
```

prefer that over:

```text
database + backend + API + authentication + cache
```

unless there is a strong reason otherwise.

---

# 20. NETLIFY DEPLOYMENT

Current deployment:

```text
GitHub
   ↓
Netlify
   ↓
Custom Domain
```

Preserve this workflow.

A normal code change should be:

```bash
git push
```

and Netlify should build/deploy automatically.

Content updates should ideally trigger the same deployment mechanism.

---

# 21. CONTENT UPDATE WORKFLOW

Target workflow:

## Adding a new job

1. Open content management interface.
2. Select "Experience".
3. Click "Add".
4. Fill in:

   * company
   * role
   * dates
   * description
   * achievements
   * technologies
5. Publish.
6. Netlify rebuilds.
7. Website updates.

No frontend source code changes.

---

# 22. BACKUP / PORTABILITY

Portfolio content must not become trapped inside a proprietary CMS.

Prefer content storage that can be exported into:

```text
Markdown
JSON
YAML
MDX
```

Git should remain a reliable backup.

Ideally:

```text
Content
   ↓
Git repository
   ↓
Version history
```

Every meaningful content update should be recoverable.

---

# 23. SEO

Even though the site is unconventional, search engines should see a normal semantic website.

Implement:

* meaningful HTML
* title
* meta description
* Open Graph metadata
* Twitter/X metadata where appropriate
* canonical URLs
* sitemap
* robots.txt
* structured data where appropriate
* project-specific metadata
* experience content in crawlable HTML
* semantic headings

Do NOT hide important information exclusively behind JavaScript interactions.

---

# 24. ACCESSIBILITY

Accessibility is mandatory.

Support:

* keyboard navigation
* visible focus states
* screen readers
* semantic HTML
* sufficient contrast
* reduced motion
* usable terminal without a mouse
* accessible modals
* proper ARIA only where necessary

Terminal mode should be navigable using keyboard alone.

---

# 25. RESPONSIVE DESIGN

Design for:

```text
Desktop
Laptop
Tablet
Mobile
```

Do not simply shrink the desktop UI.

On mobile:

* terminal should remain usable
* command input should work naturally
* panels should become full-screen where appropriate
* animations should be reduced
* no horizontal scrolling
* touch targets should be large enough

---

# 26. PERFORMANCE

Target:

```text
Fast initial render
Minimal JavaScript
Optimized images
Lazy loading
Code splitting
No unnecessary libraries
```

Avoid enormous animation libraries if CSS can handle the effect.

Avoid loading Three.js globally if only one page needs it.

Prefer:

```text
progressive enhancement
```

over:

```text
everything-is-JavaScript
```

---

# 27. DARK / LIGHT THEME

Primary aesthetic can be dark.

Optional light mode can exist.

Theme preference should persist.

Respect:

```text
prefers-color-scheme
```

and avoid flashy theme transitions that cause accessibility issues.

---

# 28. EASTER EGGS

Add a small number of hidden interactions.

Examples:

```text
$ sudo hire-me
$ matrix
$ coffee
$ neofetch
$ secret
```

Potential `neofetch` output:

```text
       /\_/\
      ( o.o )
       > ^ <

AASHISH.OS
-----------

Role: Software Engineer
Stack: Java / Python / ...
Status: Building things
```

Easter eggs should never interfere with normal navigation.

---

# 29. RESUME

Provide:

```text
[ View Resume ]
[ Download Resume ]
```

The resume should be easy to find.

Do not make visitors solve a puzzle to access it.

The resume file should be treated as content/configuration, not hardcoded into the UI.

---

# 30. ANALYTICS

If analytics are added:

* privacy-conscious
* lightweight
* optional
* compatible with Netlify
* no invasive tracking

Track useful events such as:

```text
project opened
resume viewed
resume downloaded
contact clicked
GitHub clicked
```

Do not over-engineer analytics.

---

# 31. SECURITY

Review:

* XSS
* unsafe HTML rendering
* Markdown sanitization
* dependency vulnerabilities
* API key exposure
* serverless endpoints
* AI prompt injection
* malicious project content
* external embeds

Never render arbitrary Markdown/HTML without sanitization.

---

# 32. ERROR HANDLING

The site should gracefully handle:

* missing project
* broken external link
* unavailable GitHub
* unavailable AI
* missing image
* malformed content
* failed build
* invalid content schema

Content validation should happen during the build process whenever possible.

A typo in a YAML field should produce a useful error instead of silently breaking the site.

---

# 33. CONTENT VALIDATION

Implement schemas for content.

For example:

```text
ExperienceSchema
ProjectSchema
SkillSchema
ProfileSchema
```

The build should fail clearly if required fields are missing.

Example:

```text
ERROR:
Experience entry "company-x" is missing required field:

startDate
```

This is preferable to discovering the problem visually after deployment.

---

# 34. TESTING

At minimum:

### Unit tests

Test:

* command parser
* command registry
* content parsing
* schema validation
* date formatting
* filtering

### Component tests

Test:

* terminal
* project cards
* project dossier
* experience timeline
* navigation

### End-to-end tests

Test:

```text
Open website
→ switch mode
→ open project
→ open experience
→ use terminal
→ open resume
→ navigate on mobile
```

---

# 35. ARCHITECTURE DOCUMENTATION

Create:

```text
docs/
```

with:

```text
architecture.md
content-model.md
deployment.md
cms.md
contributing.md
```

Someone should be able to understand how the portfolio works without reading every source file.

---

# 36. PROJECT STRUCTURE

Create a clean structure.

Example:

```text
/
├── README.md
├── PLAN.md
├── package.json
├── netlify.toml
│
├── docs/
│   ├── architecture.md
│   ├── content-model.md
│   ├── deployment.md
│   └── cms.md
│
├── content/
│   ├── profile/
│   ├── experience/
│   ├── projects/
│   ├── skills/
│   ├── education/
│   ├── achievements/
│   └── posts/
│
├── public/
│   ├── images/
│   ├── icons/
│   └── resume/
│
├── src/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── features/
│   │   ├── terminal/
│   │   ├── projects/
│   │   ├── experience/
│   │   ├── skills/
│   │   └── ai/
│   ├── content/
│   ├── lib/
│   ├── hooks/
│   └── styles/
│
└── tests/
```

This is an example, not a rigid requirement.

Claude should modify the structure if the chosen framework has a better convention.

---

# 37. DEVELOPMENT PHASES

Do NOT implement everything at once.

Build in phases.

---

## PHASE 0: DISCOVERY

Before writing code:

1. Inspect the existing repository.
2. Determine current framework.
3. Determine existing Netlify configuration.
4. Determine current domain/deployment setup.
5. Identify existing portfolio content.
6. Identify reusable assets.
7. Identify existing GitHub integration.
8. Identify constraints.
9. Propose architecture.
10. Compare possible stacks.

Deliver:

```text
docs/architecture.md
docs/content-model.md
```

Do not begin implementation until the architecture is understood.

---

# PHASE 1: CONTENT SYSTEM

Build the content layer first.

Implement:

* schemas
* content loading
* validation
* profile
* experience
* projects
* skills
* education

Create sample/placeholder data where actual information is missing.

Do NOT invent real achievements.

Use clearly marked placeholders.

---

# PHASE 2: BASIC READER MODE

Build a conventional, excellent portfolio first.

Implement:

* hero
* about
* experience
* projects
* skills
* education
* contact
* resume

At the end of this phase, the portfolio should already be useful.

This creates a reliable fallback if all experimental features are removed.

---

# PHASE 3: AASHISH.OS SHELL

Create the visual operating-system layer.

Implement:

* boot sequence
* terminal
* command prompt
* system UI
* windows/panels
* transitions
* mode switch

Do not sacrifice usability.

---

# PHASE 4: TERMINAL ENGINE

Implement a clean command architecture.

Commands:

```text
help
about
projects
project
experience
skills
education
contact
resume
clear
theme
```

Add aliases where useful.

Support command history:

```text
↑
↓
```

Support:

```text
Tab completion
```

where practical.

---

# PHASE 5: PROJECT DOSSIERS

Create the rich project experience.

Include:

* overview
* architecture
* technology
* engineering decisions
* challenges
* lessons
* links

Use the content schema.

---

# PHASE 6: VISUAL POLISH

Add:

* micro-interactions
* transitions
* terminal cursor effects
* subtle background effects
* project animations
* timeline animations
* hover interactions

Keep animation restrained.

The design should feel sophisticated, not like a screensaver escaped from a graphics course.

---

# PHASE 7: OPTIONAL AI

Only after the rest of the portfolio works.

Implement:

```text
ask
```

inside the terminal.

Add a serverless/edge API if required.

Secure API keys.

Implement rate limiting.

Add fallback behavior.

---

# PHASE 8: CMS / CONTENT ADMIN

Implement the easiest maintainable content update workflow.

Evaluate:

1. Git-based CMS
2. Netlify-compatible CMS
3. External headless CMS
4. Custom admin interface

Select the option with the lowest maintenance cost that still satisfies:

> "I can update my portfolio without touching source code."

Document the decision.

---

# PHASE 9: TESTING

Run:

* unit tests
* integration tests
* E2E tests
* accessibility checks
* mobile checks
* build checks

Fix issues before deployment.

---

# PHASE 10: PERFORMANCE + SEO

Run:

* Lighthouse
* accessibility audit
* performance audit
* SEO audit

Optimize.

Do not optimize blindly.

Measure first.

---

# PHASE 11: DEPLOYMENT

Deploy to Netlify.

Verify:

```text
GitHub push
→ Netlify build
→ deployment
→ custom domain
```

Verify:

* HTTPS
* redirects
* SPA routing if applicable
* sitemap
* robots.txt
* Open Graph
* 404 handling
* asset paths

---

# PHASE 12: FINAL POLISH

Perform a full visitor journey:

```text
Landing
↓
Understand who I am
↓
Explore projects
↓
Explore experience
↓
Try terminal
↓
View resume
↓
Contact
```

Ask:

> "Would a recruiter understand this website within 30 seconds?"

Ask:

> "Would another engineer find the implementation interesting?"

Ask:

> "Can I update my career information without editing frontend code?"

Ask:

> "Does the site remain enjoyable if JavaScript or fancy animation fails?"

---

# 38. CLAUDE'S WORKING RULES

Claude must follow these rules throughout implementation.

## Rule 1

Do not implement the entire project in one response.

Work phase-by-phase.

## Rule 2

Before starting a phase:

```text
1. Explain what will be built.
2. Identify files that will change.
3. Identify dependencies.
4. Identify risks.
5. Implement.
6. Test.
7. Summarize.
8. Update PLAN.md.
```

## Rule 3

Do not make assumptions about personal information.

If information about:

* employment
* education
* projects
* achievements
* technologies
* dates

is missing, create a placeholder and clearly mark it.

Never fabricate credentials.

## Rule 4

Prefer simple architecture.

Every new dependency must have a reason.

## Rule 5

Do not refactor unrelated parts of the application without justification.

## Rule 6

Keep content separate from presentation.

## Rule 7

Do not duplicate content between terminal mode and reader mode.

## Rule 8

Mobile is a first-class experience.

## Rule 9

Accessibility is not a final cleanup task.

## Rule 10

Performance matters more than visual spectacle.

---

# 39. DEFINITION OF DONE

The project is complete only when:

### UX

* [ ] Portfolio is immediately understandable
* [ ] Terminal mode works
* [ ] Reader mode works
* [ ] Mode switching works
* [ ] Projects are easy to explore
* [ ] Experience is easy to understand
* [ ] Resume is easy to access
* [ ] Contact is easy to access

### Content

* [ ] Content is separated from application code
* [ ] Schemas exist
* [ ] Content validation exists
* [ ] New experience can be added without editing UI code
* [ ] New project can be added without editing UI code
* [ ] Skills can be updated without editing UI code

### Technical

* [ ] Netlify deployment works
* [ ] GitHub workflow works
* [ ] Custom domain works
* [ ] Build succeeds
* [ ] Tests pass
* [ ] No exposed secrets
* [ ] No major accessibility issues
* [ ] No major performance issues

### Maintenance

A future update should look approximately like:

```text
Add content
    ↓
Validate
    ↓
Commit/publish
    ↓
Netlify builds
    ↓
Portfolio updated
```

and NOT:

```text
Find React component
    ↓
Edit JSX
    ↓
Edit styles
    ↓
Update route
    ↓
Update terminal command
    ↓
Update another component
    ↓
Hope nothing broke
```

---

# 40. FUTURE IDEAS

Do not implement these initially unless they provide real value.

Potential future features:

* personal blog
* changelog
* GitHub activity
* interactive architecture diagrams
* coding challenges
* mini games
* WebGL experiments
* real-time system visualization
* AI portfolio search
* visitor analytics
* guestbook
* RSS
* PWA
* offline mode

The architecture should allow these to be added later without rewriting the core application.

---

# 41. THE CORE PRINCIPLE

The final portfolio should communicate three things simultaneously:

```text
                    ┌──────────────┐
                    │   PERSONAL   │
                    │   IDENTITY   │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
        ENGINEERING     CREATIVITY    EVIDENCE
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    AASHISH.OS
```

The interface gets attention.

The projects provide evidence.

The engineering quality earns credibility.

---

# 42. FIRST COMMAND TO CLAUDE

When beginning work on this project, do NOT immediately write the application.

First:

```text
1. Inspect the repository.
2. Read PLAN.md completely.
3. Inspect the current framework and deployment setup.
4. Identify what already exists.
5. Identify what should be retained.
6. Identify what should be replaced.
7. Propose the final architecture.
8. Propose the content-management strategy.
9. Propose the implementation phases.
10. Ask only the questions that are genuinely blocking implementation.

Then wait for approval before beginning Phase 1.
```

---

# 43. MAINTAINING THIS PLAN

PLAN.md is a living document.

After every major phase, Claude should update:

```text
Status
Architecture decisions
Completed tasks
Remaining tasks
Known issues
Future decisions
```

Do not delete historical decisions without explaining why they changed.

Use a small decision log:

```text
## Architecture Decision Log

### ADR-001
Decision:
...

Reason:
...

Alternatives considered:
...

Date:
...
```

This makes the project understandable months later.

---

# FINAL PRODUCT VISION

The finished experience should feel like opening someone's personal development environment.

A visitor might arrive normally:

```text
AASHISH.OS

Software Engineer

I build software, explore systems,
and occasionally turn ideas into experiments.

[ Explore ]
```

Or a developer might immediately type:

```text
$ projects
```

A recruiter might simply click:

```text
[ Reader Mode ]
```

Someone curious about the implementation might discover:

```text
$ neofetch
$ architecture
$ help
```

And someone looking for the résumé should be able to find it in one click.

The site should be unusual enough to be remembered, but conventional enough to be understood.

**Build the engine once. Let the content evolve independently.**

One architectural choice I'd strongly recommend

For your particular requirement, I would not jump straight to a custom database-backed admin panel.

Start with:

Content files + schema validation + Git + Netlify deploys

and then put a Git-based CMS/admin UI over that if you want a friendly editing interface.

That gives you a very nice property:


              ┌───────────────┐
              │  Content UI   │  ← You update your job
              └───────┬───────┘
                      │
                      ▼
                 Git / Content
                      │
                      ▼
                 Netlify Build
                      │
                      ▼
                 AASHISH.OS


