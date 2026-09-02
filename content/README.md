# Content

This directory holds every portfolio fact. Nothing here is application code, and no fact lives outside here — that is `PLAN.md` §1, enforced by the schemas in `src/content.config.ts`.

**Authoring guide and full field reference:** `docs/content-model.md`

---

## ⚠️ Status of what's currently in here

Phase 1 populated this tree per `PLAN.md` Rule 3: real content where real content exists, unmistakable placeholders where it does not. **Nothing invented is presented as fact.**

### Pre-launch blockers

| # | Item | Action |
| --- | --- | --- |
| 1 | **No résumé PDF.** v3 linked a Google Drive file; nothing is in the repo | Drop a PDF into `public/resume/`, then add the `resume:` block to `profile.yaml` (the commented example is already there). §29 wants view + download easy to find |
| 2 | **Education institution is unconfirmed** | v3 contradicted itself — see below |
| 3 | **Three placeholder experience/project entries** | Replace or delete |
| 4 | **Custom domain not set** | Owner has one; `site.config.mjs` currently points at the `github.io` origin |

### Files that are entirely placeholder

Delete or replace all of these. Each is named `placeholder-*` and says so in its own frontmatter, so none can be mistaken for fact.

- `experience/placeholder-current-role.md` — exercises the `current: true` state and the derived `2026 — Present` label
- `experience/placeholder-past-role.md` — exercises a closed date range
- `projects/placeholder-active-project.mdx` — exercises the full §13 dossier at maximum depth
- `projects/placeholder-experimental.mdx` — exercises a *minimal* project, proving thin entries stay presentable
- `projects/placeholder-archived.mdx` — exercises `archived`, which is excluded from default listings
- `posts/placeholder-local-post.mdx` — exercises a locally-rendered post rather than an outbound link

They exist so every UI state has something to render before your real content arrives. Deleting them all is safe.

### Real content, migrated from the v3 site

These are your own words and your own facts, carried over:

- `projects/pustakalaya.mdx`, `projects/image-extractor.mdx`, `projects/buzzwire.mdx`
- `posts/*.mdx` — the three Hashnode posts
- `experience/techtrix-hackathon.md`
- `skills/skills.yaml` — every entry, from the v3 skills section and résumé page
- `profile/profile.yaml` — name, location, email, socials, avatar image

### Needs your confirmation

- **`profile.yaml` → `headline`** — currently "Backend Developer", your own v3 self-description from 2023. Still accurate?
- **`profile.yaml` → `availability.open`** — v3 said `#OpenToWork` in 2023.
- **`profile.yaml` → `shortBio` / `longBio`** — adapted from your v3 copy with stale facts removed.
- **`education/undergraduate.md`** — v3 contradicted itself: `index.html` said *Tribhuvan University*, `resume.html` said *ACHS college, Lalitpur*. These are probably compatible (ACHS is TU-affiliated) but Rule 3 forbids me resolving it by assumption. **The dates are placeholders** — v3 said "currently pursuing" in 2023 and gave no years.
- **`posts/renaming-uploaded-file-with-java-servlet.mdx`** — v3 dated this Feb 3, 2022, i.e. *after* the Feb 1 post it follows on from. Kept as published; correct if v3 was wrong.

### Deliberately dropped from v3

Not migrated, and not by oversight:

- **"Age 21", "0 Years of Experience", "1 Happy Client", `© 2023`** — stale or unverifiable. Age is not in the schema at all: it goes stale annually and is weak signal.
- **"Fullstack Web Developer / Self Learning / 2018–Present"** and **"Freelancing / Self Employed / 2023–Present"** — whether these are still current in 2026 is unknown, and guessing would violate Rule 3. Re-add them yourself if they still apply.
- **Facebook profile link** — the `socials` schema covers GitHub, LinkedIn, website, Hashnode and X. Add a field if you want Facebook back.
- **`resources/Images/OtherImgs/*`** and the three `*View.*` project screenshots — unused. Recoverable from tag `v3.0` or the `main` branch if ever wanted.

### Deliberately empty

`achievements/` has no entries. This is intentional: §8's derived-visibility rule needs an empty collection to prove the section omits itself rather than rendering a bare heading — the exact bug v3 shipped, where `resume.html` had a permanently empty certifications block. Astro logs a harmless warning about it; see `docs/content-model.md` §10.

---

## Quick reference

```
content/
├── profile/profile.yaml        exactly one entry
├── experience/*.md             one file per role
├── projects/*.mdx              one file per project (+ images/)
├── skills/skills.yaml          one array, each entry needs an `id`
├── education/*.md              one file per qualification
├── achievements/               currently empty
└── posts/*.mdx                 external link or local body
```

**Always quote dates.** In YAML an unquoted `2023` is the *number* 2023, which resolves to 1970. Write `"2023"` or `"2023-04-01"`. The build catches this, but quoting avoids the round trip.

**Check your work before pushing:**

```bash
npm run validate:content   # cross-collection references
npm run build              # full schema validation; runs the above first
```

Both must pass. A typo in a field name or a broken reference fails the build rather than reaching the site.
