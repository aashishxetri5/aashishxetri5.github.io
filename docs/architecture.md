# AASHISH.OS — Architecture

> Originally the Phase 0 (Discovery) deliverable, per `PLAN.md` §37; maintained
> since as the canonical Architecture Decision Log (§43).
> Status: **Phases 0–5 complete. Phase 6 (Visual Polish) awaiting approval.**
> Last updated: 2026-09-06

---

## 1. Discovery findings

### What exists today

The repository is a hand-written static site with no build step of any kind.

| Aspect | Finding |
| --- | --- |
| Framework | None. Raw `index.html` + `resources/CSS/Style.css` + `resources/JS/index.js` |
| Package manager | None. No `package.json`, no lockfile, no `node_modules` |
| Build process | None. Files are served verbatim |
| Second page | `resume.html` + `resources/CSS/resume.css`, with its own unrelated design system |
| Deployment | **GitHub Pages**, via the `<user>.github.io` repo-name convention, serving `main` at the root |
| Netlify | **Not configured.** No `netlify.toml` in the working tree or anywhere in git history |
| Custom domain | **Not configured.** No `CNAME` in the working tree or anywhere in git history |
| CI | None. No `.github/` directory |
| Local tooling | Node v24.18.0, npm 11.15.0, git 2.49.0 — modern, no constraint on stack choice |

### Discrepancy against PLAN.md

`PLAN.md` §20 asserts the current deployment is `GitHub → Netlify → Custom Domain` and instructs that this workflow be preserved. **Discovery contradicts this**: there is no Netlify configuration and no custom domain in this repository's history. The live site is plain GitHub Pages.

Resolved by decision — see [ADR-002](#adr-002--netlify-primary-with-a-github-pages-mirror).

### Navigation model of the old site

All six sections (`home`, `about`, `skills`, `projects`, `blogs`, `contact`) exist in the DOM simultaneously. Clicking a nav link toggles a `hidden` class in `resources/JS/index.js`. There is no routing, no URL change, and no history. Consequences:

- Sections are not linkable or shareable.
- Content is present in the HTML (so it is crawlable), but every section except one is `display: none`.
- The nav handler and the section markup are coupled — adding a section means editing HTML, CSS, and JS.

### What is retained

- **Project screenshots** — `resources/Images/Projects/*` (6 files). Will be re-optimized, not re-shot.
- **Portrait** — `resources/Images/MyImgs/my_image.jpg`. Becomes a local asset (see below).
- **Factual content** — the three real projects, the Hashnode post links, the Techtrix hackathon entry. Migrated into schemas as real content, *not* as placeholders.
- **Git history and tags** — `v1.0`, `2.0`, `v3.0` remain. `v3.0` marks the final state of the site described above.

### What is replaced

- All markup, all CSS, all JavaScript.
- The `hidden`-class navigation model, replaced by real routes.
- The separate `resume.html` design system, folded into one design system.
- `resources/` as a directory convention, replaced by `public/` + `content/`.

### Defects found in discovery that the rebuild must fix

1. **Hotlinked portrait.** `index.html:98` loads the profile image from a Google Drive `uc?export=view` URL. This is not a supported hosting endpoint and will break.
2. **Expiring social preview.** `og:image` and `twitter:image` (`index.html:43`, `index.html:57`) point at a signed Facebook CDN URL containing an `oe=` expiry parameter. These previews are already broken or will break.
3. **Contradictory biography.** `index.html:277` says Tribhuvan University; `resume.html:69` says ACHS college, Lalitpur. One content source will make this impossible.
4. **Stale facts.** "Age 21", "0 Years of Experience", "1 Happy Client", `Copyright © 2023`. Content written in 2023 and never revised.
5. **Two visual languages.** The main site uses Karla/Inter/Kristi with a lavender palette; the resume page uses Archivo/Lato with a teal palette. Unrelated by accident, not by design.
6. **Decorative cursor ring is unconditional.** `#circle` follows the mouse with no `prefers-reduced-motion` guard and no pointer-type check, so it is created on touch devices too.

---

## 2. Stack evaluation

`PLAN.md` §18 requires evaluation against seven criteria before finalizing. Candidates were scored against the plan's own hard requirements — chiefly §26 (minimal JavaScript, progressive enhancement), §23 (no important information JS-gated), §33 (build must fail on invalid content), and §19 (prefer the simplest sufficient architecture).

| Criterion (§18) | Astro + React islands | Next.js App Router | SvelteKit | Vite React SPA |
| --- | --- | --- | --- | --- |
| 1. Performance | **Best** — zero JS baseline; JS only on islands | Good — React runtime on every page | Very good — small runtime | Poor — everything is JS |
| 2. Maintainability | **Best** — content layer is a framework feature | Fair — content pipeline is hand-built | Good | Poor — content + routing hand-built |
| 3. Netlify compat | **Excellent** — first-party adapter | Excellent | Excellent | Good (static only) |
| 4. Developer experience | Very good | **Best** | Very good | Good |
| 5. Ecosystem maturity | Very good; React islands access the React ecosystem | **Best** | Good | Very good |
| 6. SEO | **Best** — static HTML, nothing behind hydration | Very good | Very good | **Disqualifying** — client-rendered |
| 7. Simplicity | **Best** for a content site | Fair — framework exceeds the problem | Good | Fair |

### Why the SPA is disqualified

`PLAN.md` §23 states: *"Do NOT hide important information exclusively behind JavaScript interactions."* A client-rendered SPA puts every job, project, and skill behind hydration. This is a direct violation, not a trade-off.

### Why not Next.js

Next.js is the strongest option on DX and ecosystem, and it would work. It loses on two plan-specific points:

- **Content validation is DIY.** Next has no content layer. Satisfying §33 ("the build should fail clearly if required fields are missing") means hand-writing a filesystem glob, frontmatter parsing, Zod validation, error reporting, and type generation. Contentlayer, which used to fill this gap, is effectively unmaintained.
- **§19 argues against it.** This site has no authentication, no database, and no dynamic data. It is a static content site with one interactive widget. A full application framework is more machinery than the problem needs.

### Chosen stack

| Layer | Choice | Justification |
| --- | --- | --- |
| Framework | **Astro** (latest stable, pinned at scaffold) | Static HTML by default; islands architecture matches "one interactive widget on an otherwise static site" precisely |
| Interactivity | **React**, as islands only | Terminal is genuinely stateful (history, parser, output buffer). React only where interaction is real |
| Styling | **Tailwind CSS** (latest stable) | One design system, enforced tokens, no dead CSS. Replaces two divergent hand-written stylesheets |
| Content | **Astro Content Collections** with **Zod** schemas | Satisfies §1 and §33 as a built-in framework feature rather than custom infrastructure |
| Long-form content | **MDX** | For project dossiers (§13) and posts that need embedded components |
| Animation | **CSS first.** A JS animation library only if a specific interaction demands it | §26: *"Avoid enormous animation libraries if CSS can handle the effect"* |
| 3D | **None.** Three.js is explicitly not planned | §26: do not load it globally for one page. No interaction currently justifies it |
| Unit tests | **Vitest** | Command parser, registry, date derivation, filtering (§34) |
| E2E tests | **Playwright** | The full visitor journey including mobile viewports (§34) |
| Hosting | **Netlify** primary, **GitHub Pages** mirror | See ADR-002 |

Every dependency above maps to a specific numbered requirement, per Rule 4.

### Verified toolchain (checked 2026-09-02)

Researched rather than assumed, because three plausible-sounding assumptions turned out to be wrong.

| Package | Version | Note |
| --- | --- | --- |
| `astro` | 7.2.10 | Astro 7 released 2026-06-22. **Requires Node ≥22.12.0** — local Node is 24.18.0, satisfied |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | **Not** `@astrojs/tailwind` — see below |
| `@astrojs/mdx` | 8.0.0 | Actively maintained |
| `@astrojs/sitemap` | 3.7.4 | Requires `site` set in config |
| `@astrojs/netlify` | 8.2.5 | Only needed for on-demand rendering; **not required for a static site** |
| `actions/upload-pages-artifact` | ≥ v5 | **Must not be v4** — v4 silently stopped including dotfiles, which would drop `.nojekyll` |
| `actions/deploy-pages` | v5.0.1 | GitHub's own docs still show v4/v5 inconsistently |
| `actions/configure-pages` | v6.0.0 | |

**Corrections to earlier assumptions in this document:**

1. **`@astrojs/tailwind` is deprecated and unusable here.** Its `peerDependencies` are `astro ^3 || ^4 || ^5` — Astro 6 and 7 were never declared. It was last published 2025-03-26. Critically, it was *not* flagged with `npm deprecate`, so installing it produces **no warning** — it would simply be a peer-dependency conflict. The correct path is `tailwindcss` + `@tailwindcss/vite` registered as a Vite plugin. Note also that Tailwind 4 no longer auto-detects `tailwind.config.js`; configuration is CSS-first via `@theme`.
2. **Zod is imported from `astro/zod`, and it is Zod 4.** Not `z` from `astro:content` (deprecated in Astro 6, slated for removal in Astro 8), and not Zod 3. Format validators are top-level: `z.email()`, `z.url()`. `docs/content-model.md` has been corrected accordingly.
3. **Astro 7 does not install `@astrojs/markdown-remark` by default.** Astro 7 renders Markdown through a new native pipeline. If any remark/rehype plugin is needed — likely for Markdown sanitization per §31 — that package must be installed explicitly. Flagged as a Phase 1 task rather than a surprise.

Astro 6 also removed the legacy `src/content/config.ts` location and the type-based collections API outright, with no backwards compatibility. Since this project starts fresh on Astro 7, that migration cost is zero — but it does mean most Astro content-collection tutorials written before mid-2026 are wrong in ways that matter.

---

## 3. Rendering strategy

**Static-first with selective server routes.**

- Astro builds to static HTML. Every page — hero, about, experience, each project dossier, skills, education, contact — is a real HTML file with real content in it. This satisfies §23 outright and gives §26 a zero-JS baseline.
- The terminal is a **React island**, hydrated client-side. It is an *alternative* navigation surface, never the only one.
- The optional AI `ask` endpoint (§15, Phase 7) is the single **server route**, marked `prerender = false`. It exists only on Netlify.

This yields the property §39 demands — *"Does the site remain enjoyable if JavaScript or fancy animation fails?"* — by construction: with JavaScript disabled, reader mode is fully intact and only the terminal is absent.

### Two modes, one content source

`PLAN.md` §10 and Rule 7 forbid duplicating content between terminal and reader mode. Enforced structurally:

```
                    content/  (Markdown + YAML)
                         │
                         ▼
              src/content.config.ts   ← Zod schemas, validated at build
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      Reader mode pages      Terminal command handlers
      (static Astro)         (React island)
```

Both consume the same validated collection query results. Neither mode contains portfolio prose. A command handler that wanted to hardcode a fact would have nowhere to put it.

---

## 4. Deployment architecture

Per ADR-002, Netlify is primary and GitHub Pages is a static mirror.

```
                      git push
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
     Netlify build              GitHub Actions
     (adapter enabled)          (DEPLOY_TARGET=pages)
            │                         │
            ▼                         ▼
   custom domain (primary)     aashishxetri5.github.io
   static pages + AI endpoint  static pages only
            │                         │
            └──────────┬──────────────┘
                       ▼
            canonical URL → custom domain
```

Design consequences:

- **One codebase, one build command, one env flag.** `DEPLOY_TARGET=pages` omits the Netlify adapter and the server route. There is no forked implementation.
- **The AI feature degrades on the mirror.** Its endpoint does not exist there, so the island hides the `ask` affordance. §16 and §32 already require graceful fallback when AI is unavailable, so the mirror exercises a path that must work anyway.
- **Canonical URLs always point at the custom domain**, including in the mirror's HTML, so the two deployments do not compete as duplicate content.
- **No base-path complexity.** A `<user>.github.io` user site serves from `/`, identical to the custom domain. Asset paths need no rewriting.

### Open item

`SITE_URL` will be a single config constant. The custom domain is not yet known to me and is marked `TODO` in config until supplied — a one-line change, no code edits.

---

## 5. Project structure

Adapted to Astro conventions, as §36 permits.

```
/
├── PLAN.md                     ← the constitution; living document (§43)
├── README.md
├── package.json
├── astro.config.mjs
├── tsconfig.json
├── netlify.toml
├── .github/workflows/
│   └── pages-mirror.yml        ← static mirror deploy
│
├── docs/
│   ├── architecture.md         ← this file
│   ├── content-model.md        ← schemas, field reference, authoring guide
│   ├── deployment.md           ← Netlify + Pages + domain cutover
│   ├── cms.md                  ← Phase 8 CMS evaluation and decision
│   └── contributing.md
│
├── scripts/
│   ├── validate-content.mjs    ← prebuild gate: reference integrity
│   └── lib/content-integrity.mjs
│
├── content/                    ← AUTHOR-FACING. Deliberately outside src/
│   ├── README.md               ← placeholder status + pre-launch blockers
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
│   ├── content.config.ts       ← Zod schemas: the single source of truth
│   ├── components/             ← presentational, content-agnostic
│   ├── layouts/
│   ├── pages/                  ← file-based routes
│   ├── features/
│   │   ├── terminal/           ← registry, parser, handlers, renderer
│   │   └── ai/                 ← optional; Phase 7
│   ├── lib/                    ← date derivation, filtering, formatting
│   └── styles/
│
└── tests/
    ├── unit/
    └── e2e/
```

`content/` sits at the repository root rather than under `src/content/`. Rationale in [ADR-003](#adr-003--content-lives-at-the-repository-root).

---

## 6. Cross-cutting requirements

### Content validation (§33)

Zod schemas in `src/content.config.ts` run during `astro build`. A missing required field, a bad enum value, or an incoherent date range fails the build with the file and field named. A typo cannot reach production silently.

One gap had to be closed by hand. `reference()` validates a reference's *shape* at schema level but resolves existence lazily in `getEntry()` — verified against `astro@7.2.10`, a skill pointing at a non-existent project logs an error and then **the build exits 0 anyway**. Since §33 requires failure, `scripts/validate-content.mjs` runs as `prebuild` and enforces existence itself, so `npm run build` fails before Astro starts. It also catches duplicate and missing skill `id`s, which the `file()` loader would otherwise swallow silently. Full detail in `docs/content-model.md` §10.

### Accessibility (§24, Rule 9)

Treated as a build-time constraint, not a cleanup phase:

- Reader mode is semantic HTML with a correct heading hierarchy — the zero-JS baseline is also the accessible baseline.
- The terminal is keyboard-operable by nature; focus management and an ARIA live region for output are part of its initial implementation, not a follow-up.
- The boot sequence (§12) and the cursor ring are gated on `prefers-reduced-motion`, and the ring additionally on `pointer: fine`.
- Visible focus states are a token in the design system, never removed.

### SEO (§23)

Static HTML output; per-page title and meta description derived from content; Open Graph and Twitter tags with **local** OG images (fixing defect 2); canonical URLs; `sitemap.xml` via Astro's sitemap integration; `robots.txt`; JSON-LD `Person` and `CreativeWork` structured data generated from the same content that renders the pages.

### Security (§31)

Markdown is authored by the repository owner, but it is still sanitized on render — untrusted-by-default is the cheaper habit. No secrets in client code; the AI key lives only in Netlify's environment and is read server-side. Rate limiting and prompt-injection handling are scoped to Phase 7.

### Performance (§26)

Zero-JS baseline; `astro:assets` for responsive, optimized, correctly-sized images (the current site ships a 404 KB screenshot); lazy loading below the fold; no webfont for decorative display text where a system stack suffices.

---

## 7. Phase plan

Sequence follows `PLAN.md` §37. Each phase ends with the Rule 2 cycle: explain → identify files → identify dependencies → identify risks → implement → test → summarize → update `PLAN.md`.

| Phase | Scope | Exit condition |
| --- | --- | --- |
| 0 | Discovery, stack evaluation, architecture, content model | **Complete** — this document + `content-model.md` |
| 1 | Content system: schemas, loaders, validation, placeholder data | `astro build` fails loudly on invalid content; all types load |
| 2 | Reader mode: hero, about, experience, projects, skills, education, contact, resume | Site is already genuinely useful with zero experimental features |
| 3 | AASHISH.OS shell: boot sequence, window/panel system, mode switch | Shell works; reader mode still reachable and intact |
| 4 | Terminal engine: registry, parser, handlers, history, tab completion | Commands work; fully keyboard-operable |
| 5 | Project dossiers: problem, architecture, decisions, challenges, lessons | Dossiers render entirely from content schema |
| 6 | Visual polish: micro-interactions, timeline and terminal effects | Restrained; reduced-motion honored |
| 7 | Optional AI `ask` (Netlify function, rate limited, graceful fallback) | Site fully functional with the AI disabled |
| 8 | CMS / content admin | Owner can add a job without touching source code |
| 9 | Testing: unit, component, E2E, a11y, mobile, build | Suites pass |
| 10 | Performance + SEO audit — measure before optimizing | Lighthouse reviewed and acted on |
| 11 | Deployment: Netlify + Pages mirror + custom domain | Push → build → deploy verified on both |
| 12 | Final polish against the §39 questions | All four §39 questions answered yes |

**Phase 2 is the critical milestone.** Its exit condition is that the portfolio is already good with every experimental feature removed. That guarantees the fallback §37 describes, and means the OS concept is additive rather than load-bearing.

---

## Architecture Decision Log

Format per `PLAN.md` §43. Superseded decisions are marked, never deleted.

### ADR-001 — Astro with React islands

**Decision:** Build on Astro, using React only for interactive islands. Style with Tailwind CSS. Model content with Astro Content Collections and Zod.

**Reason:** Astro's default output is static HTML with no JavaScript, which makes §26 (minimal JS) and §23 (nothing important JS-gated) the default state rather than an ongoing discipline. Content Collections provide schema-validated, type-safe content loading as a framework feature, satisfying §1 and §33 with no custom infrastructure. The islands model maps exactly onto this site's shape: static content everywhere, one genuinely interactive widget.

**Alternatives considered:** Next.js App Router — best DX and ecosystem, but ships a React runtime to every page and would require hand-building the entire content-validation layer that Astro provides natively; §19 argues against an application framework for a site with no auth, database, or dynamic data. SvelteKit — technically strong, no decisive advantage, and a smaller talent/ecosystem overlap. Vite React SPA — disqualified by §23, since client rendering puts all portfolio content behind JavaScript.

**Date:** 2026-09-02

---

### ADR-002 — Netlify primary with a GitHub Pages mirror

> ✅ **STATUS: REAFFIRMED 2026-09-02, after the credit-model finding below was put to the owner.**
>
> Research completed *after* this ADR was first approved found that Netlify's free tier moved to a **credit-based model** for accounts created on/after 2025-09-04, which a new account for this project would land on. Effect: a ceiling of roughly **20 production deploys per month**, with overage **pausing** the site rather than throttling it, and no ability to buy credits on the Free plan. Because §21's publish workflow makes every content save a production deploy, this ADR's own primary use case is what would consume the budget. `docs/cms.md` §4 documents the numbers in full; §5 there proposed superseding this ADR with GitHub Pages + Cloudflare Workers.
>
> **The owner elected to keep Netlify.** ADR-005 is therefore **rejected** — see below. The finding is retained here rather than deleted, per §43, because it defines a real operating constraint that Phases 8 and 11 must design around:
>
> - **Development is unaffected.** Branch deploys and deploy previews cost **0 credits**. Only production deploys are metered, so iterating on `portfolio-v4` is free regardless of frequency.
> - **Phase 8 must not publish per-edit.** The CMS must commit to a non-production branch, with production deploys happening on a deliberate merge — batching many content edits into one metered deploy. This is a hard requirement on the Phase 8 design, not a preference.
> - **Phase 10 must treat bandwidth as a budget.** At 20 credits/GB against a 300-credit pool, image weight competes directly with deploy headroom. This sharpens §26's optimization goals from "good practice" into a quantified constraint.
> - **Phase 11 must configure usage alerts** so an approaching limit is visible before the site pauses.

**Decision:** Netlify is the primary deployment and serves the custom domain, with serverless functions enabled. GitHub Pages continues to serve a static build of the same codebase at `aashishxetri5.github.io`. One codebase; a `DEPLOY_TARGET` env flag omits the adapter and server routes for the mirror. Canonical URLs point at the custom domain from both deployments.

**Reason:** `PLAN.md` §20 describes a Netlify workflow that does not actually exist yet — discovery found no `netlify.toml` and no `CNAME` in the working tree or in git history. Netlify is nonetheless the right primary target, because Phase 7 (AI `ask`) and Phase 8 (CMS authentication) both require server-side execution, which GitHub Pages cannot provide at all. The mirror is retained so the long-lived `aashishxetri5.github.io` URL does not break, at the cost of one workflow file. The AI feature's absence on the mirror is not a special case: §16 and §32 already require the site to work with AI unavailable.

**Alternatives considered:** GitHub Pages only — free and zero-migration, but forecloses serverless entirely, pushing Phases 7 and 8 onto a third-party host. Netlify only — simpler, but abandons the existing public URL.

**Date:** 2026-09-02

---

### ADR-003 — Content lives at the repository root

**Decision:** Author-facing content lives in `/content/`, not `/src/content/`. Astro's `glob()` loader is pointed at it via an explicit `base`.

**Reason:** §1 calls content/code separation the most important product requirement, and §21 wants a non-developer editing flow. Placing content inside `src/` frames it as source code. A root-level `content/` makes the boundary literal: `src/` is the engine, `content/` is the career. This also gives Phase 8's CMS a clean directory to target without exposing application source, and matches the structure §1 itself sketches.

**Alternatives considered:** `src/content/` — Astro's conventional location and marginally less configuration, but it blurs exactly the boundary the plan cares most about.

**Date:** 2026-09-02

---

### ADR-004 — CSS-first animation, no 3D

**Decision:** Implement animation with CSS transitions, keyframes, and view transitions. Introduce a JavaScript animation library only when a specific interaction cannot be expressed in CSS. Do not add Three.js.

**Reason:** §26 explicitly says to avoid large animation libraries where CSS suffices, and not to load Three.js globally for one page's benefit. §6's polish targets — micro-interactions, timeline reveals, terminal cursor effects, hover states — are all CSS-expressible. Rule 4 requires a reason per dependency, and none of these clear that bar yet. §10 also ranks performance above visual spectacle.

**Alternatives considered:** Adopting a motion library upfront — rejected as speculative weight. Revisit if Phase 6 finds a concrete interaction CSS cannot express.

**Date:** 2026-09-02

---

### ADR-005 — GitHub Pages primary with Cloudflare Workers — **REJECTED**

**Decision:** Rejected 2026-09-02. Netlify remains primary per ADR-002.

**Proposal was:** move to GitHub Pages via a custom Actions workflow (unmetered deploys; the 10-builds/hour soft cap is explicitly waived for custom workflows) and host the CMS OAuth broker plus the Phase 7 AI endpoint on Cloudflare Workers (100,000 requests/day free). It would also have dissolved the mirror, since a custom domain on a Pages user site makes `aashishxetri5.github.io` 301-redirect to it — a real redirect rather than the canonical-tag arrangement ADR-002 needs.

**Reason for rejection:** owner's decision. Netlify's server-side headers, redirects, and native functions were judged worth the metering constraint, and the mitigations recorded in ADR-002 (branch-based CMS commits, bandwidth budgeting, usage alerts) make the deploy ceiling manageable.

**Retained because:** §43 forbids discarding decision history, and this remains the documented fallback if the credit ceiling proves binding in practice. The full evaluation, including the tradeoffs GitHub Pages would have cost us, is in `docs/cms.md` §5. Revisiting it later is a deployment change, not an application rewrite — ADR-001's static-first output runs on either host unmodified.

**Date:** 2026-09-02

---

### ADR-007 — Sanitize Markdown via the legacy unified processor

**Decision:** Enable `rehype-sanitize` through `markdown.rehypePlugins`, accepting the `@astrojs/markdown-remark` dependency this requires and the consequent opt-out of Astro 7's default Sätteri Markdown processor.

**Reason:** §31 mandates sanitization, and the gap was verified as real rather than assumed. A Markdown body containing `<img src=x onerror="alert(1)">` and `<script>alert(2)</script>` built successfully and produced output HTML retaining both the `onerror` attribute and the inline `<script>` tag — Astro passes raw HTML in Markdown straight through. Astro 7 exposes no configuration flag to refuse raw HTML outright, which would have been the stronger control; the accepted `markdown.*` keys are `syntaxHighlight`, `shikiConfig`, `remarkPlugins`, `rehypePlugins`, `remarkRehype`, `gfm`, `smartypants`, `processor`. Using `rehypePlugins` at all requires `@astrojs/markdown-remark`, since Astro 7 no longer installs it by default. Content is repo-authored today so present risk is low, but Phase 8 adds a browser-based CMS as a second authoring path, and a control added before it is needed is worth more than one added after an incident. Verified after the fix: the probe renders inert and MDX formatting is unaffected.

**Alternatives considered:** Leaving Markdown unsanitized on the grounds that all content is repo-authored and code-reviewed — rejected because §31 is unconditional and the vulnerability is demonstrated. Keeping Sätteri and sanitizing at render time in the component layer — rejected as more fragile, since it would have to be applied identically at every render site and would silently fail wherever someone forgot. Cost is build-time only; Phase 10 measures it.

**Date:** 2026-09-03

---

### ADR-008 — Terminal and reader mode are separate routes

**Decision:** Reader mode lives at `/` and ships zero JavaScript. The AASHISH.OS shell lives at `/os` and hydrates one React island. The mode switch (§10) is a pair of plain anchors, not a client-side toggle. Both routes read the same content: `/os` serializes the output of `src/lib/content.ts` via `src/lib/snapshot.ts` and hands it to the island as props.

**Reason:** §10 asks for two experiences over one content source, and Rule 7 forbids duplicating content between them. The obvious implementation — an OS overlay on `/` — fails whichever way it is built. If the shell holds its own copy of the portfolio, Rule 7 is broken and every job, project and skill now exists twice. If instead reader mode renders only after hydration, §23 is broken: "Do NOT hide important information exclusively behind JavaScript."

Separate routes dissolve the conflict. `/` stays static HTML with a verified zero JavaScript islands, so the recruiter path and the crawler path are untouched by anything experimental. React's ~62 KB gzipped is charged only to visitors who choose the OS, which is what islands are for. The switch being an anchor rather than a handler means it survives a script failure, is linkable and shareable, and lands in browser history — the three properties v3's `display:none` navigation destroyed.

The snapshot is the part that makes Rule 7 structural rather than a promise. A client island cannot call `getCollection()`, so without it the natural move is to type facts into command handlers. Instead handlers receive data and contain none, which unit tests assert against a deliberately fake fixture: if any fact were hardcoded, the tests would surface real values.

**Alternatives considered:** Overlay on `/` — rejected above. A single route rendering both modes with CSS — same hydration problem, plus double the DOM on every page load. Client-side routing between modes — would put reader mode behind JavaScript for the sake of a transition, inverting §26's priority of performance over spectacle.

**Consequence for Phase 7:** the AI `ask` endpoint belongs to `/os`, so an AI outage cannot affect the canonical reader experience at all.

**Date:** 2026-09-06

---

---

### ADR-009 — Command side effects are declared as data, not performed by handlers

**Decision:** A command handler never touches the DOM, storage, or navigation directly. It returns a `CommandResult` that may carry a declarative `effect`, and the terminal renderer performs it.

**Reason:** Through Phase 3 every handler was accidentally pure — a function of `(input, snapshot)` returning lines — because nothing yet needed to change the world. `theme` broke that. It has to set `data-theme` on the root element and mirror the choice to `localStorage`.

Reaching for `document` inside the handler would have worked immediately and cost nothing visible. What it would have cost is the property the registry's testability rests on: that a handler can be executed in a plain unit test with no DOM, and asserted on its return value. It would also have set the precedent, so the next side-effecting command would follow it, and the boundary would be gone before anyone noticed it had eroded.

Declaring the effect as data keeps handlers pure, keeps every DOM mutation in one reviewable place, and makes `theme` testable by asserting the effect it returns rather than by mounting jsdom.

A secondary rule falls out of this: the effect *reuses* the existing theme contract — `data-theme` on the root mirrored to `localStorage['theme']`, with the key absent meaning "follow the system" — shared with `ThemeToggle.astro` and the pre-paint script in `BaseLayout.astro`. Reimplementing it in the terminal would have produced a mode that disagrees with the header button, which is the same class of duplication Rule 7 forbids for content.

**Note on `clear`:** it stays a separate boolean rather than an effect, because wiping the buffer is renderer-internal state, not a change outside the terminal. The distinction is the point: `effect` means "the world outside this component".

**Alternatives considered:** handler-performed side effects — rejected above. A general effect-dispatch system with registered handlers — more machinery than one effect type justifies, and §19 asks for the simplest thing that works; the union can grow when a second effect actually appears.

**Date:** 2026-09-06
