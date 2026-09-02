/**
 * Content queries.
 *
 * Every read of the content layer goes through here, so pages and components
 * contain presentation only — no filtering rules, no sort order, no reference
 * resolution. That is what keeps Rule 7 true: reader mode and (later) terminal
 * mode call the same functions rather than each re-deriving the same views.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

import { compareByRecency, yearsSince } from './dates';

export type ProfileEntry = CollectionEntry<'profile'>;
export type ExperienceEntry = CollectionEntry<'experience'>;
export type ProjectEntry = CollectionEntry<'projects'>;
export type SkillEntry = CollectionEntry<'skills'>;
export type EducationEntry = CollectionEntry<'education'>;
export type AchievementEntry = CollectionEntry<'achievements'>;
export type PostEntry = CollectionEntry<'posts'>;

export type SkillCategory = SkillEntry['data']['category'];
export type ProjectStatus = ProjectEntry['data']['status'];

/**
 * Display order for skill categories. Deliberately not alphabetical — this
 * leads with what the owner is hired for and trails with supporting detail.
 */
const CATEGORY_ORDER: readonly SkillCategory[] = [
  'Languages',
  'Backend',
  'Databases',
  'Frontend',
  'DevOps',
  'Cloud',
  'Tools',
  'Concepts',
  'Other',
];

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The single profile entry.
 *
 * Throws rather than returning undefined: the profile drives the site title,
 * meta description and hero, so its absence is a build-stopping content error,
 * not a state any page should try to render around (§33).
 */
export async function getProfile(): Promise<ProfileEntry> {
  const entries = await getCollection('profile');

  if (entries.length === 0) {
    throw new Error(
      'No profile found. Expected exactly one file in content/profile/ — see content/README.md.',
    );
  }
  if (entries.length > 1) {
    throw new Error(
      `Expected exactly one profile, found ${entries.length}: ${entries
        .map((e) => e.id)
        .join(', ')}. The profile drives site-wide metadata and cannot be ambiguous.`,
    );
  }

  return entries[0]!;
}

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

/** All roles, current first, then most recent (§14). */
export async function getExperience(): Promise<ExperienceEntry[]> {
  const entries = await getCollection('experience');
  return entries.sort((a, b) => compareByRecency(a.data, b.data));
}

/* -------------------------------------------------------------------------- */
/* Projects                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Projects for listing surfaces.
 *
 * Archived projects are excluded by default — they are evidence of history, not
 * of current focus — and reachable via `includeArchived`, which is what
 * `$ projects --all` will use in Phase 4.
 */
export async function getProjects(
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<ProjectEntry[]> {
  const entries = await getCollection('projects');

  return entries
    .filter((entry) => includeArchived || entry.data.status !== 'archived')
    .sort((a, b) => {
      // Featured first, then explicit order, then newest, then name — so the
      // grid is stable and never depends on filesystem ordering.
      if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;

      const byOrder = (a.data.order ?? 0) - (b.data.order ?? 0);
      if (byOrder !== 0) return byOrder;

      const byDate =
        (b.data.startDate?.getTime() ?? 0) - (a.data.startDate?.getTime() ?? 0);
      if (byDate !== 0) return byDate;

      return a.data.name.localeCompare(b.data.name);
    });
}

export async function getFeaturedProjects(): Promise<ProjectEntry[]> {
  const projects = await getProjects();
  return projects.filter((project) => project.data.featured);
}

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

export interface SkillEvidence {
  projects: { id: string; name: string }[];
  companies: { id: string; company: string }[];
}

export interface ResolvedSkill {
  id: string;
  name: string;
  category: SkillCategory;
  level: SkillEntry['data']['level'];
  icon?: string | undefined;
  featured: boolean;
  /** Whole years derived from `since`, absent when `since` is not authored. */
  years?: number | undefined;
  evidence: SkillEvidence;
  hasEvidence: boolean;
}

export interface SkillGroup {
  category: SkillCategory;
  skills: ResolvedSkill[];
}

/**
 * Resolve a skill's reference lists into real entries.
 *
 * §8 wants evidence rather than invented percentages: "Java / Used in: Project
 * A, Project B, Company X". Resolution happens here so no component ever has
 * to know that evidence is stored as references.
 *
 * Unresolvable references are dropped rather than crashing the render — but
 * they cannot reach production, because scripts/validate-content.mjs fails the
 * build on them first. This is belt-and-braces for `astro dev`, where the
 * prebuild gate has not run.
 */
async function resolveSkill(skill: SkillEntry, now: Date): Promise<ResolvedSkill> {
  const [projects, companies] = await Promise.all([
    Promise.all(skill.data.projects.map((ref) => getEntry(ref))),
    Promise.all(skill.data.companies.map((ref) => getEntry(ref))),
  ]);

  const evidence: SkillEvidence = {
    projects: projects
      .filter((entry): entry is ProjectEntry => entry !== undefined)
      .map((entry) => ({ id: entry.id, name: entry.data.name })),
    companies: companies
      .filter((entry): entry is ExperienceEntry => entry !== undefined)
      .map((entry) => ({ id: entry.id, company: entry.data.company })),
  };

  return {
    id: skill.id,
    name: skill.data.name,
    category: skill.data.category,
    level: skill.data.level,
    icon: skill.data.icon,
    featured: skill.data.featured,
    years: skill.data.since ? yearsSince(skill.data.since, now) : undefined,
    evidence,
    hasEvidence:
      evidence.projects.length > 0 || evidence.companies.length > 0,
  };
}

/**
 * Skills grouped into categories, in CATEGORY_ORDER, with evidence resolved.
 * Empty categories are omitted entirely rather than rendering a bare heading.
 *
 * `now` is injectable purely so derived year counts are testable.
 */
export async function getSkillGroups(now: Date = new Date()): Promise<SkillGroup[]> {
  const skills = await getCollection('skills');
  const resolved = await Promise.all(
    skills.map((skill) => resolveSkill(skill, now)),
  );

  return CATEGORY_ORDER.map((category) => ({
    category,
    skills: resolved
      .filter((skill) => skill.category === category)
      .sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        // Evidence-backed skills lead, since evidence is the whole point (§8).
        if (a.hasEvidence !== b.hasEvidence) return a.hasEvidence ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
  })).filter((group) => group.skills.length > 0);
}

/* -------------------------------------------------------------------------- */
/* Education, achievements, writing                                           */
/* -------------------------------------------------------------------------- */

export async function getEducation(): Promise<EducationEntry[]> {
  const entries = await getCollection('education');
  return entries.sort((a, b) => compareByRecency(a.data, b.data));
}

/** Newest first. May legitimately be empty — callers must omit their section. */
export async function getAchievements(): Promise<AchievementEntry[]> {
  const entries = await getCollection('achievements');
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Published posts only, newest first. Drafts never reach a production build. */
export async function getPosts(): Promise<PostEntry[]> {
  const entries = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? data.draft === false : true,
  );
  return entries.sort(
    (a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime(),
  );
}

/** Posts whose body lives here rather than on an external site. */
export async function getLocalPosts(): Promise<PostEntry[]> {
  const posts = await getPosts();
  return posts.filter((post) => post.data.external === undefined);
}
