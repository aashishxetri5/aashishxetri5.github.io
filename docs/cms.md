# AASHISH.OS — Content Management Evaluation

> Deliverable for `PLAN.md` §4 (evaluate before selecting) and §37 Phase 8.
> Status: **Implemented in Phase 8 (2026-09-06). Sveltia CMS at `/admin`. The §5 proposal to supersede ADR-002 was rejected — Netlify stands.**
> All facts verified against primary sources on 2026-09-02. Version numbers and pricing in this space move fast; re-verify before Phase 8 implementation.

---

## 1. The requirement

From §39, the bar is one sentence:

> *"I can update my portfolio without touching source code."*

§4 wants `/admin` on my own site. §22 requires content to stay exportable as Markdown/JSON/YAML/MDX with git as a reliable backup — no proprietary trap. §19 says prefer the simplest architecture that works.

Note that **Phase 1 already satisfies a weaker version of this**: content lives in `content/*.md`, so updating a job is editing one Markdown file, never a component. A CMS adds a *friendlier editing surface* over that same git-backed content. It is a convenience layer, not the mechanism. That framing matters — it means the CMS choice is reversible and low-stakes, and it must never become the only way to publish.

---

## 2. Two external constraints discovered

Both were found during research and neither was anticipated in `PLAN.md`.

### 2.1 GitHub's client-side PKCE for SPAs is on hold

The feature that would let a purely static CMS perform OAuth with no server at all is not available. Sveltia's documentation, verbatim:

> *"We're waiting for GitHub to support client-side PKCE authentication for single-page apps… GitHub has put the project on hold… We can't release this feature until GitHub provides this support."*
> — <https://sveltiacms.app/en/docs/backends/github>

**Consequence:** every GitHub-backed CMS today needs one of — an OAuth broker you host, a personal access token, or a third-party hosted auth service. There is no zero-infrastructure option. This applies to all candidates equally, so it does not discriminate between them; it just sets a floor.

### 2.2 Netlify Identity's deprecation was reversed — but Git Gateway's was not

This is the subtle one, and getting it backwards would lead to a bad decision.

| Service | Status |
| --- | --- |
| **Netlify Identity** | **Alive.** Deprecation reversed |
| **Git Gateway** | **Still deprecated.** No reversal |

Netlify, verbatim: *"Update, February 19, 2026: Netlify Identity will continue as a supported authentication option on Netlify."* (<https://www.netlify.com/blog/auth0-extension-identity-changes/>)

But Git Gateway, verbatim: *"Git Gateway is deprecated… While we will keep fixing any major security issues that arise, we will no longer fix bugs in the functionality of Git Gateway."* (<https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/>)

The classic Decap setup is Identity (login) **plus** Git Gateway (the component that actually commits to the repository). **The half that survived is the half most easily replaced; the deprecated half is the one doing the work.** Decap's maintainer conceded in Feb 2025 that *"Decap is basically married to Netlify Identity, and as maintainers, we are aware that a divorce is long overdue"* — on a *"non-funded open-source project"* with no timeline (<https://github.com/decaporg/decap-cms/discussions/7419>).

**Conclusion:** treat Identity + Git Gateway as working-but-frozen. Do not build on it.

---

## 3. Options evaluated

Against §4's criteria. Release dates are as of 2026-09-02.

| CMS | Latest release | Auth today | Server needed | Cost | Content in repo | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| **Sveltia** | `0.205.0` — **today** | GitHub OAuth via broker, **or PAT (no server)** | Broker or PAT only | Free, MIT | Plain MD/YAML | **Recommended** |
| **Decap** | `3.16.0` — 2026-08-31 | Identity+Git Gateway (frozen), broker, or DecapBridge | Broker unless hosted auth | Free, MIT | Plain MD/YAML | Viable fallback |
| **Pages CMS** | `2.1.8` — 2026-06-08 | GitHub App via hosted `app.pagescms.org` | No (hosted) | Free, MIT | Plain MD/YAML | Conflicts with `/admin` |
| **Keystatic** | `0.6.9` — experimental | GitHub App + OAuth | **Yes — needs SSR adapter** | Free | Plain MD/YAML | **Disqualified** |
| **TinaCMS** | `24.0.3` — 2026-08-24 | TinaCloud or self-host | **Yes — plus a database** | 2 users/1 project, then $24/mo | GraphQL-mediated | **Rejected** |
| **CloudCannon** | SaaS | Managed | Hosted | **$55/mo, no free tier** | Plain MD/YAML | **Excluded on cost** |

Repository health, via the GitHub API today: Decap 19,336★ / 589 open issues; Pages CMS 3,962★ / 66; Sveltia 2,778★ / 59; Keystatic 2,341★ / 180. All MIT, none archived.

### Notes that changed the ranking

- **Decap is not stagnant** — a common misconception worth correcting. Releases run monthly or faster: 3.10 (Jan) → 3.11 (Mar) → 3.12.x (Apr) → 3.13/3.14 (Jun) → 3.15.x (Jul) → 3.16.0 (Aug 31). **Its risk is the auth lineage, not code velocity.**
- **Sveltia is explicitly beta**, self-described: *"there might still be breaking changes before the stable 1.0 release."* No 1.0 date published. It also does not support nested collections, and requires HTTPS or localhost.
- **Sveltia deliberately will never support Git Gateway or the Netlify Identity Widget**, citing the deprecation. Given §2.2, that is a correct architectural call, not a missing feature.
- **The beta risk is cheap to reverse.** Sveltia's config is Decap-compatible — migration is literally swapping the script tag from `decap-cms@^3.0.0/dist/decap-cms.js` to `@sveltia/cms/dist/sveltia-cms.js`, reusing the same `config.yml`. A one-line rollback is an acceptable price for the most actively maintained option in the category.
- **Keystatic is disqualified on architecture, not preference.** Its GitHub mode requires server-side routes to read and write the repository, which means an SSR adapter — that breaks a purely static deploy outright. Compounding: `0.6.x` with a README saying *"Things are experimental at the moment,"* an unanswered maintenance question (<https://github.com/Thinkmill/keystatic/discussions/1467>), open unfixed OAuth bugs (<https://github.com/Thinkmill/keystatic/issues/1497>), and a documentation site that returned `302 → Cloudflare Access` when probed. See §6.
- **TinaCMS self-hosting means operating a database (Redis/KV or MongoDB), an auth provider, and a GraphQL API function.** That is precisely the `database + backend + API + authentication + cache` shape §19 tells us to avoid. The hosted alternative is a 2-user free tier and the vendor lock-in §22 warns against.
- **A self-hosted OAuth broker is effectively free.** Cloudflare Workers' free plan allows 100,000 requests/day at 10 ms CPU per invocation. Sveltia ships a purpose-built worker, `sveltia-cms-auth`, and its maintainer confirms GitHub Pages hosting works: *"Both Netlify/Decap CMS and Sveltia CMS can be hosted anywhere."*
- **DecapBridge** exists as a managed-auth escape hatch for Decap: free for 3 sites / 10 collaborators, $9/mo unlimited, $199 lifetime, with content staying in your repo. Worth knowing if the broker route proves annoying.

### Recommendation

**Sveltia CMS**, with **Decap as the documented fallback**.

Rationale: most actively maintained option in the category; MIT and free; content stays as plain Markdown and YAML in git, so §22 holds absolutely; the `/admin` surface is static files, so it satisfies §4's "on my own site" requirement and works on any host; it avoids the deprecated Git Gateway path by design; and the beta risk is neutralized by a one-line downgrade path to Decap.

---

## 4. The finding that undercuts ADR-002

Netlify moved to **credit-based plans** for all accounts created **on or after 2025-09-04**. Pre-existing accounts remain on legacy plans. Since no Netlify account exists for this project yet, a new one **would land on the credit model**. The familiar "300 build minutes / 100 GB bandwidth" figures are legacy-only and do not apply.

Current Free plan: **$0, 300 credits/month, hard limit.**

| Item | Cost | Free-plan ceiling if spent only here |
| --- | --- | --- |
| **Production deploy** | **15 credits** | **≈20 deploys/month** |
| Deploy previews / branch deploys | **0 credits** | unlimited |
| Bandwidth | 20 credits/GB | 15 GB/month |
| Web requests | 2 credits/10k | 1.5M |
| Compute (functions) | 10 credits/GB-hour | — |

Build minutes are **no longer metered at all**.

**Why this specifically breaks the plan:** §21's target workflow is *publish → Netlify rebuilds → website updates*. With any git-based CMS, **every content save is a commit, and every commit to production is a 15-credit production deploy.** Roughly twenty content edits exhausts the entire monthly budget with nothing left for bandwidth. ADR-002's own primary use case is what consumes it.

Three aggravating details:

- **Exceeding the allowance pauses the site**, it does not throttle it: *"all projects owned by that team enter a paused state until the start of the next billing cycle."* Visitors get a `Site not available` page, **and all deploys stop, including previews.**
- **Free cannot buy add-on credits or enable auto-recharge**, and credits do not roll over. There is no way to spend your way out of an outage.
- On **2026-04-14** Netlify **doubled** bandwidth (10→20 credits/GB) and compute (5→10 credits/GB-hour) rates **without raising the 300-credit allowance** — an effective ~50% capacity cut, ten months before this evaluation.

In fairness to ADR-002: **development would be fine**, because branch deploys and deploy previews cost 0 credits. The ceiling only bites on production deploys. But that is exactly where content publishing lands.

---

## 5. Proposed ADR-005 — supersede ADR-002

**Proposal:** GitHub Pages becomes the primary deployment, served via a custom GitHub Actions workflow. Cloudflare Workers hosts the two pieces of server-side code this project will ever need: the CMS OAuth broker (Phase 8) and the AI `ask` endpoint (Phase 7). Netlify is dropped.

### Why this is better, not merely cheaper

- **No deploy metering of any kind.** GitHub Actions minutes are free for public repositories, and the 10-builds-per-hour soft limit is *explicitly waived* for custom workflows: *"This limit does not apply if you build and publish your site with a custom GitHub Actions workflow."* A CMS that publishes forty times in a month is a non-event.
- **The mirror architecture dissolves, and the SEO gets better.** ADR-002 needed two deployments plus canonical tags to stop them competing as duplicate content. Setting a custom domain on a Pages user site makes `aashishxetri5.github.io` **301-redirect** to the custom domain instead — a real redirect beats a canonical hint, and it is one deployment rather than two. The URL you have had since 2022 keeps working, with less machinery.
- **Serverless gets cheaper and less coupled.** Cloudflare Workers' free tier is 100,000 requests/day. Netlify Free functions are capped at 1024 MB memory and consume the same 300-credit pool as the site itself — meaning an AI endpoint could contribute to pausing the *whole site*. Workers keeps compute failures isolated from content delivery.
- **It sidesteps the Netlify Identity / Git Gateway lineage entirely** rather than depending on a frozen component.
- **No `base` path configuration.** A `<user>.github.io` user site serves from `/`, identical to a custom domain.

### Tradeoffs accepted knowingly

| Loss | Assessment |
| --- | --- |
| No server-side redirects or custom headers | Real cost. CSP must be a `<meta>` tag; GitHub staff confirm *"a meta tag unfortunately is the only way."* Acceptable for a content portfolio |
| `Cache-Control: max-age=600` imposed and untunable | Mitigated by Astro's content-hashed asset filenames |
| No SPA fallback routing | Irrelevant — this is a statically-generated multi-page site by design (ADR-001) |
| 1 GB site limit, 10-minute deploy timeout | Vastly beyond this project's needs |
| Public repository required for free Pages | Already public |

**Escape hatch if headers ever become a hard requirement:** front GitHub Pages with Cloudflare and set headers there. That is a DNS change, not a migration.

### Operational notes for Phase 11

- **Under the Actions source, `CNAME` files are ignored.** The custom domain must be set in repository Settings → Pages.
- **The `github-pages` deployment environment is protected to the default branch by default.** Deploying from `portfolio-v4` requires amending that protection rule, or waiting to merge. Note that the *branch* restriction itself is long gone — since 2020, *"the source branch can be any branch in your repository."* GitHub's own 404-troubleshooting page still claims otherwise; that page is stale and contradicts the authoritative docs.
- **Do not switch the Pages source to "GitHub Actions" until cutover.** `main` currently serves the live v3 site directly from the branch root. Switching the source early would take the live site down mid-rebuild. Leave it on branch-deploy until Phase 11.
- **Pin `actions/upload-pages-artifact` to ≥ v5.** v4.0.0 silently stopped including dotfiles, which would drop `.nojekyll` and `.well-known/`.

### What this costs us relative to ADR-002

Nothing that §20 actually needs. §20's stated intent is `git push → automatic build → deploy → custom domain`, and this preserves that exactly — the CI provider changes, the workflow does not. §20's factual claim that Netlify is already wired up was already established as untrue during discovery.

---

## 6. Facts I could not verify

Recorded honestly, per Rule 3's spirit. None of these change the recommendation, but they are the soft spots.

- **The original Netlify Identity deprecation date.** The blog post was silently edited rather than dated-append; it now says only *"Earlier, we announced plans to deprecate…"*. Search results suggested 2025-02-28; no primary source confirmed it.
- **Any end-of-life date for Git Gateway.** Deprecation is stated plainly; no sunset date is published and Netlify names no replacement for the git-commit function.
- **Whether the Feb 2026 Identity reversal has an official forum or changelog thread.** The clearest consolidated write-up is a *community* post that itself notes *"Netlify staff have not created a forum thread."* The edited blog post is the only primary source.
- **A reported Netlify "operational credits" defect.** Multiple Free-plan forum threads from Jul–Sep 2026 report deploys blocked with *"Skipped due to account credit usage exceeded"* while the dashboard still showed credits available. The term appears **nowhere** in Netlify's billing documentation, there is no public acknowledgement or fix, and reports inconsistently cite "30/30" versus "30/300". I could not establish what it is. If real, it makes the Free tier less predictable than even §4 describes — which strengthens §5, but I am not counting it as evidence.
- **Whether `keystatic.com` is globally gated.** Both `/` and `/docs/github-mode` returned `302 → Cloudflare Access` from Nepal. I could not determine whether this is intentional, geo-scoped, or a misconfiguration, and found no third-party outage reports. Keystatic's disqualification rests on its SSR requirement, which is independently verified, not on this.
- **Netlify's synchronous function timeout** — the directly-fetched configuration page says 60 s; a search-derived summary said 30 s. I trust 60 s but flag the conflict.
- **Netlify Edge Function invocation caps and Blob storage quotas on credit-based Free** — not published; docs defer to the billing dashboard.
- **Whether GitHub Pages' 100 GB/month bandwidth and 10-builds-per-hour soft limits are ever hard-enforced.**
- **An official GitHub statement that `_redirects` is unsupported.** For *headers* there is a named staff answer. For `_redirects` there are only community posts plus an indirect docs line recommending DNS-level redirects. The feature's absence is well-established; an explicit official denial is not.
- **That setting a custom domain on a user site produces a 301 redirect from `<user>.github.io`.** This is the documented and widely-observed behavior and §5 leans on it, but I did not verify it against a primary source. **Verify at Phase 11 cutover** before relying on it for SEO continuity.

---

## 7. Implementation (Phase 8, 2026-09-06)

### What shipped

| Piece | Location |
| --- | --- |
| Admin shell | `public/admin/index.html` — Sveltia CMS pinned at `0.206.1` |
| Collection config | `public/admin/config.yml` — all seven collections |
| Drift guard | `scripts/lib/cms-drift.mjs`, run by the `prebuild` gate |

Re-verified at implementation time rather than trusted from the Phase 0 research: `@sveltia/cms@0.206.1` resolves on unpkg and jsDelivr, published four days after the 0.205.0 the evaluation recorded — the release-cadence claim holds. The bundle is **2040 KB against Decap's 4925 KB**, which was not part of the original evaluation and reinforces the ranking rather than changing it.

### The version is pinned, deliberately

This is an admin tool with write access to the repository, and Sveltia is pre-1.0 with an explicit warning about breaking changes before then. A floating range means it can change between one editing session and the next with no signal. Upgrading is a one-line edit; rolling back is the same edit.

### Editorial workflow is not optional

`publish_mode: editorial_workflow` is enforced by the build gate, not left to convention.

ADR-002 kept Netlify, whose credit-based free tier allows roughly **20 production deploys per month** and *pauses the site* on overage rather than throttling. Without editorial workflow, every content save is a direct commit to the deploy branch — a 15-credit production deploy. Around twenty edits would exhaust the month and take the site down.

With it, each edit becomes a pull request. Branch deploys and deploy previews cost **0 credits**, so drafting is free and one production deploy is spent on a deliberate merge. The build fails if this setting is ever removed, because the consequence of removing it is an outage rather than a style regression.

### Drift is a build failure

Nothing in the toolchain links `config.yml` to `content.config.ts` — different languages, no shared types. So they can diverge silently, in two directions with different symptoms:

- **Schema field missing from the CMS:** the editor keeps working and looking authoritative while quietly being unable to edit that field.
- **CMS field missing from the schema:** the editor writes frontmatter that fails the build, discovered at deploy time rather than while editing.

`cms-drift.mjs` compares top-level fields both ways and fails `npm run build`. Verified against all three failure modes — schema-only field, CMS-only field, and removed `publish_mode` — each producing a specific, actionable error.

Nested object shapes are deliberately not compared: Astro's schema already validates them at build time, and checking them here would mean reimplementing the Zod type language in a regex.

The scanner also self-checks. Two collections yielding identical field lists throws, because that indicates a mis-parse rather than real duplication — which is exactly the bug that occurred during implementation, when a schema formatted with whitespace between `z` and `.object({` caused one collection to be attributed another collection's fields. It produced forty confident and wrong errors; the guard turns that into one honest one.

### Owner setup still required

The CMS cannot authenticate until one of these exists. None of it can be done from the repository.

**Option A — GitHub OAuth via a broker (recommended for ongoing use).** GitHub has put client-side PKCE for SPAs on hold (§2.1), so a static CMS cannot complete OAuth alone. Deploy the `sveltia-cms-auth` worker on Cloudflare Workers (free tier: 100,000 requests/day), register a GitHub OAuth app pointing at it, and add `base_url` to the `backend` block in `config.yml`.

**Option B — personal access token (fastest to start).** Sveltia supports signing in with a fine-grained PAT scoped to this repository only. No infrastructure at all. Suitable for a single owner; the token lives in browser storage, so treat it as a credential and scope it narrowly.

**Option C — Netlify Identity.** Available again since the February 2026 reversal (§2.2), but it pairs with **Git Gateway, which remains deprecated** — and Git Gateway is the half that actually commits. Working, frozen, and not worth building on.

### Branch cutover

`backend.branch` is `portfolio-v4`, so the CMS is usable now against the rebuild branch. **It must change to `main` at Phase 11 cutover**, or edits will land on a branch nothing deploys. Tracked as an explicit step in PLAN.md rather than left as a comment to notice.

### What this does not change

The CMS is a convenience layer. Content is still plain Markdown and YAML in git, still editable in any text editor, still validated by the same build gate whichever way it was written. §22 portability is satisfied by the storage format, not by the editor — which is why swapping Sveltia for Decap remains a one-line change, and why deleting `/admin` entirely would cost nothing but convenience.
