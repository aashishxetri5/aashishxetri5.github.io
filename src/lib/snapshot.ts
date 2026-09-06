/**
 * Portfolio snapshot — the bridge between build-time content and the terminal.
 *
 * PLAN.md Rule 7: "Do not duplicate content between terminal mode and reader
 * mode." §10: "Both modes should consume the same content source."
 *
 * That is easy to *say* and easy to violate, because a client-side island
 * cannot call `getCollection()` — content collections only exist at build time.
 * The tempting shortcut is to hand-write portfolio facts into command handlers,
 * which would duplicate every job, project and skill into a second place that
 * silently rots.
 *
 * So this module serializes the output of the SAME query helpers reader mode
 * uses (src/lib/content.ts) into a plain JSON structure, which `/os` passes to
 * the island as props. A command handler receives data and never contains any.
 *
 * Two deliberate properties:
 *
 *   1. Date ranges are pre-derived here via formatDateRange, so §6's derivation
 *      rule keeps exactly one implementation and the client never ships date
 *      logic it would only use to re-derive the same string.
 *   2. Everything is JSON-safe. Astro serializes island props, so a Date would
 *      silently arrive as a string with a lying type. Converting explicitly
 *      makes the wire format honest.
 */
import { formatDateRange } from './dates';
import {
  getAchievements,
  getEducation,
  getExperience,
  getPosts,
  getProfile,
  getProjects,
  getSkillGroups,
} from './content';

export interface SnapshotProfile {
  name: string;
  headline: string;
  shortBio: string;
  longBio: string;
  location: string;
  email: string;
  availability: { open: boolean; message?: string };
  socials: { label: string; url: string }[];
  resume?: { href: string; label: string; updated: string };
}

export interface SnapshotExperience {
  id: string;
  company: string;
  role: string;
  location?: string;
  employmentType: string;
  range: string;
  current: boolean;
  summary: string;
  achievements: string[];
  technologies: string[];
  website?: string;
}

export interface SnapshotProject {
  id: string;
  name: string;
  shortDescription: string;
  status: string;
  type: string;
  featured: boolean;
  technologies: string[];
  href: string;
  github?: string;
  demo?: string;
}

export interface SnapshotSkill {
  name: string;
  category: string;
  level: string;
  years?: number;
  evidence: string[];
}

export interface SnapshotEducation {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  range: string;
}

export interface SnapshotAchievement {
  title: string;
  issuer?: string;
  type: string;
  year: string;
}

export interface SnapshotPost {
  id: string;
  title: string;
  summary: string;
  date: string;
  href: string;
  external: boolean;
}

export interface PortfolioSnapshot {
  profile: SnapshotProfile;
  experience: SnapshotExperience[];
  projects: SnapshotProject[];
  skills: SnapshotSkill[];
  education: SnapshotEducation[];
  achievements: SnapshotAchievement[];
  posts: SnapshotPost[];
  meta: {
    /** ISO date the site was built. Real, not decorative (§11). */
    builtAt: string;
    version: string;
  };
}

const SOCIAL_LABELS: Record<string, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  hashnode: 'Hashnode',
  website: 'Website',
  x: 'X',
};

const year = (date: Date) => String(date.getUTCFullYear());

/** Build the snapshot handed to the terminal island. */
export async function buildSnapshot(version = '4.0'): Promise<PortfolioSnapshot> {
  const [profile, experience, projects, skillGroups, education, achievements, posts] =
    await Promise.all([
      getProfile(),
      getExperience(),
      // Archived projects included: `$ projects` should be able to show history
      // even though the reader-mode grid hides it by default.
      getProjects({ includeArchived: true }),
      getSkillGroups(),
      getEducation(),
      getAchievements(),
      getPosts(),
    ]);

  const p = profile.data;

  return {
    profile: {
      name: p.name,
      headline: p.headline,
      shortBio: p.shortBio,
      longBio: p.longBio,
      location: p.location,
      email: p.email,
      availability: {
        open: p.availability.open,
        ...(p.availability.message ? { message: p.availability.message } : {}),
      },
      socials: Object.entries(p.socials)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .map(([key, url]) => ({ label: SOCIAL_LABELS[key] ?? key, url })),
      ...(p.resume
        ? {
            resume: {
              href: `/${p.resume.file}`,
              label: p.resume.label,
              updated: p.resume.updated.toISOString().slice(0, 10),
            },
          }
        : {}),
    },

    experience: experience.map((entry) => ({
      id: entry.id,
      company: entry.data.company,
      role: entry.data.role,
      ...(entry.data.location ? { location: entry.data.location } : {}),
      employmentType: entry.data.employmentType,
      range: formatDateRange(entry.data),
      current: entry.data.current,
      summary: entry.data.summary,
      achievements: entry.data.achievements,
      technologies: entry.data.technologies,
      ...(entry.data.website ? { website: entry.data.website } : {}),
    })),

    projects: projects.map((entry) => ({
      id: entry.id,
      name: entry.data.name,
      shortDescription: entry.data.shortDescription,
      status: entry.data.status,
      type: entry.data.type,
      featured: entry.data.featured,
      technologies: entry.data.technologies,
      href: `/projects/${entry.id}`,
      ...(entry.data.links.github ? { github: entry.data.links.github } : {}),
      ...(entry.data.links.demo ? { demo: entry.data.links.demo } : {}),
    })),

    // Flattened: the terminal groups by category itself when rendering, and a
    // flat list is far easier to filter for Phase 4's `skills --backend`.
    skills: skillGroups.flatMap((group) =>
      group.skills.map((skill) => ({
        name: skill.name,
        category: group.category,
        level: skill.level,
        ...(skill.years !== undefined ? { years: skill.years } : {}),
        evidence: [
          ...skill.evidence.projects.map((project) => project.name),
          ...skill.evidence.companies.map((company) => company.company),
        ],
      })),
    ),

    education: education.map((entry) => ({
      id: entry.id,
      institution: entry.data.institution,
      degree: entry.data.degree,
      ...(entry.data.field ? { field: entry.data.field } : {}),
      range: formatDateRange(entry.data),
    })),

    achievements: achievements.map((entry) => ({
      title: entry.data.title,
      ...(entry.data.issuer ? { issuer: entry.data.issuer } : {}),
      type: entry.data.type,
      year: year(entry.data.date),
    })),

    posts: posts.map((entry) => ({
      id: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      date: entry.data.publishDate.toISOString().slice(0, 10),
      href: entry.data.external ?? `/writing/${entry.id}`,
      external: entry.data.external !== undefined,
    })),

    meta: {
      builtAt: new Date().toISOString().slice(0, 10),
      version,
    },
  };
}
