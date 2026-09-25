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

<!-- Maintained per section 43. Update at the end of every phase, per Rule 2 step 8. -->

**Current phase:** Phases 0–6 complete. Phase 7 deferred. Phase 8 replaced by single-file content (ADR-010).
**Next phase:** Phase 9 — Testing → **awaiting approval**
**Last updated:** 2026-09-25
**Working branch:** `portfolio-v4` (tracks `origin/portfolio-v4`)

## How content works now

**All portfolio content is in one file: `content/portfolio.yaml`.** Edit it, save, and `npm run dev` shows the change in about a second. There is no CMS and no admin page. Editing guide and owner to-do list: `content/README.md`.

## Completed

- [x] **Phase 0 — Discovery.** Repository inspected, stack alternatives evaluated against section 18, architecture and content model approved.
  - Deliverables: `docs/architecture.md`, `docs/content-model.md`
- [x] **Phase 1 — Content System.** Astro 7 + Tailwind 4, seven Zod 4 schemas, content validation. Toolchain assumptions verified rather than trusted — three would have been wrong (see "Verified toolchain" in `docs/architecture.md`).
- [x] **Phase 2 — Reader Mode.** One design system, full SEO, every reader-mode section, project and writing pages, 404, Markdown sanitization. Ships **zero JavaScript**. The sanitization gap was verified as real and exploitable before it was fixed (ADR-007).
- [x] **Phase 3 — AASHISH.OS Shell.** Boot sequence, panels, system status, terminal surface, command registry, mode switch. React confined to `/os`; `/` still zero JS (ADR-008).
- [x] **Phase 4 — Terminal Engine.** Flag parsing, `project <name>`, `theme`, `github`, Tab completion, persistent history; 16 commands. Command side effects are declared as data (ADR-009).
- [x] **Phase 5 — Project Dossiers.** Framed record header, architecture as a connected flow diagram, decision table, reverse skill lookup, prev/next navigation.
- [x] **Phase 6 — Visual Polish.** CSS-only view transitions (no router, so still no JavaScript files), micro-interactions, and a reveal-on-scroll for every section. Stylesheet 7.6 KB gzipped.
  - **Reveal on scroll reworked 2026-09-25** at the owner's request. The original scroll-linked version faded content in proportion to scroll position and left it half-transparent when scrolling stopped (measured: 54% opacity with the heading 80% down the screen). Sections and rows now animate in once when they enter view, via a small inline script; with JavaScript off or reduced motion on, everything is simply visible. See ADR-004.
- [x] **Content consolidation (replaces Phase 8).** Everything moved into `content/portfolio.yaml` (ADR-010), verified to render identically: of 10 pages, 6 byte-identical and 4 differing only in reworded placeholder copy. Schemas made strict, so a misspelled field is a build error; nine kinds of editing mistake tested, all caught with a message naming what and where. Works in `astro dev`: a broken save keeps the last good content on screen.

## Not done, by choice

- [ ] **Phase 7 — Optional AI.** Section 15 makes it optional and requires the site to work without it. Deferred.
- [ ] ~~**Phase 8 — CMS.**~~ Built with Sveltia, then **removed by owner decision** (ADR-006 → superseded by ADR-010). Section 21's requirement — update the portfolio without touching source code — is met by editing `content/portfolio.yaml`.

## Decisions taken

| ID | Decision | Status |
| --- | --- | --- |
| ADR-001 | Astro + React islands + Tailwind + Content Collections (Zod) | Approved |
| ADR-002 | Netlify primary, GitHub Pages mirror, one codebase | Reaffirmed after the credit-model finding |
| ADR-003 | Author-facing content lives at `/content/`, outside `src/` | Approved |
| ADR-004 | CSS-first animation; no Three.js; no motion library | Approved |
| ADR-005 | GitHub Pages primary + Cloudflare Workers | Rejected — kept as the fallback |
| ADR-006 | Sveltia CMS at `/admin` | **Superseded by ADR-010** |
| ADR-007 | Sanitize Markdown via the unified processor | Approved |
| ADR-008 | Modes are separate routes (`/` and `/os`), not a JS toggle | Approved |
| ADR-009 | Command side effects are declared as data | Approved |
| ADR-010 | All content in one hand-edited file; no CMS | Approved |

The full decision log, with reasons and alternatives, is in `docs/architecture.md`. It is not duplicated here, because two copies would drift.

## Departures from the plan below

Section 43 says decisions must not be changed without explanation. The plan text below is left as the owner wrote it; these are the places the build now differs from it:

- **Section 20 was inaccurate.** It said the site already deployed via Netlify to a custom domain. There was no `netlify.toml`, `CNAME` or `package.json` anywhere in history; the site was plain GitHub Pages. Netlify is the target by decision (ADR-002), not by inheritance.
- **Sections 2, 4, 21, 35 and 36 describe a CMS, an `/admin` page and a `docs/cms.md`.** The owner replaced all of that with single-file editing (ADR-010).

## Remaining

Phases 9–12 per section 37.

**Phase 9 (Testing) is next.** Unit tests exist (86). Component and end-to-end tests do not — Playwright is named in the stack but never installed, so the full visitor journey in section 34 has never been exercised in a browser.

## Deployment checklist (Phase 11)

Things that are correct now and become wrong at deployment:

1. **`site.config.mjs` → `SITE_URL`** is the github.io origin. Change it to the custom domain; canonical URLs, the sitemap and absolute link-preview images all derive from it.
2. **`public/robots.txt`** hardcodes the sitemap origin — update it alongside `SITE_URL`.
3. **Configure Netlify usage alerts** before the credit ceiling is reached, not after the site pauses (ADR-002).

## Known issues

1. **Project write-ups are empty.** Pustakalaya, Image Extractor and Buzzwire have no `problem`, `architecture`, `decisions`, `challenges` or `lessons`, so their pages show only a description and the derived skills. Not fixable by Claude: Rule 3 forbids inventing engineering decisions. Instructions are in `content/README.md`.
2. **Empty collections log a misleading warning.** `achievements` is empty, so Astro prints *"does not exist or is empty. Please check your content config file"*. There is no config error; it disappears once an achievement is added.
3. **TypeScript is pinned to ^6.** `@astrojs/check@0.9.10` peers `typescript@^5 || ^6`; TS 7 fails to resolve. Revisit when `@astrojs/check` supports it.
4. **`astro check` is slow under load** — 73 s on a busy machine against ~20 s normally. Not a hang; give it time.

## Carried-forward defects from v3

1. ✅ **Fixed.** Hotlinked Google Drive portrait — now `content/images/avatar.jpg`, checked to exist at build time.
2. ✅ **Prevented.** Expiring Facebook CDN link-preview image — the image field only accepts local files.
3. ⚠️ **Needs the owner.** Tribhuvan vs ACHS contradiction — one education entry now feeds every page, but the institution name is a marked placeholder until confirmed.
4. ✅ **Dropped.** "Age 21", "0 Years of Experience", "1 Happy Client", "© 2023".
5. ✅ **Resolved.** One design system; the separate résumé stylesheet is gone.
6. ✅ **Not reintroduced.** v3's cursor ring had no reduced-motion or pointer guard. The only cursor effect now, the hero highlight, is gated on both.

## Open questions

- **Custom domain name not yet supplied.** `SITE_URL` is a single constant; changing it is a one-line edit.
- **Résumé.** No PDF in the repository yet, so the résumé buttons are hidden. Add one to `public/resume/` and uncomment the `resume:` block in `content/portfolio.yaml`.

## Repository housekeeping

- Branch `rebuild` (on origin) is redundant now that `portfolio-v4` is the working branch. Left in place until the owner confirms it can be deleted.
- Tag `v3.0` marks the final state of the pre-rebuild site.

### Stale items removed from this block on 2026-09-25

Recorded so the removals are not silent: "ADR-002 is contested" (it was reaffirmed); "PLAN.md is untracked" (it is committed); "Markdown sanitization dependency" (resolved in Phase 2); "local only — not yet pushed" (the branch tracks origin); a duplicated "Phase 7 is next" paragraph; and the `reference()` issue, now handled by the content loader.

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


