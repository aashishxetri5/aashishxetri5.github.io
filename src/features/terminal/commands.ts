/**
 * Command handlers.
 *
 * Every handler is a pure function of (args, context) -> CommandResult. None of
 * them contains a portfolio fact: everything is read from `ctx.snapshot`, which
 * is built from the same content queries reader mode uses (Rule 7).
 *
 * Phase 4 expands this file — flag parsing (`projects --featured`),
 * `project <slug>` detail views, and tab completion. The registry shape means
 * that work is additive: no UI file changes.
 */
import type {
  CommandContext,
  CommandDescriptor,
  TerminalLine,
  Tone,
} from './types';

const blank: TerminalLine = { kind: 'blank' };

const text = (value: string, tone?: Tone): TerminalLine =>
  tone ? { kind: 'text', text: value, tone } : { kind: 'text', text: value };

const pad = (index: number, width = 3) => String(index).padStart(width, '0');

/** Wrap prose to a readable measure without depending on the render width. */
function wrap(input: string, width = 76): TerminalLine[] {
  const words = input.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) current = word;
    else if (current.length + word.length + 1 <= width) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.map((line) => text(line, 'muted'));
}

const STATUS_TONE: Record<string, Tone> = {
  active: 'live',
  experimental: 'accent',
  completed: 'muted',
  archived: 'muted',
};

/* -------------------------------------------------------------------------- */

const help: CommandDescriptor = {
  name: 'help',
  summary: 'List available commands',
  aliases: ['?', 'commands'],
  run: (_args, ctx) => ({
    lines: [
      { kind: 'heading', text: 'Available commands' },
      blank,
      ...ctx.commands
        .filter((command) => !command.hidden)
        .map<TerminalLine>((command) => ({
          kind: 'pair',
          label: command.usage ?? command.name,
          value: command.summary,
        })),
      blank,
      text('Use the up and down arrows for history. Esc clears the input.', 'muted'),
    ],
  }),
};

const clear: CommandDescriptor = {
  name: 'clear',
  summary: 'Clear the screen',
  aliases: ['cls'],
  run: () => ({ lines: [], clear: true }),
};

const whoami: CommandDescriptor = {
  name: 'whoami',
  summary: 'Identity and current status',
  run: (_args, { snapshot }) => {
    const { profile } = snapshot;
    return {
      lines: [
        { kind: 'pair', label: 'name', value: profile.name },
        { kind: 'pair', label: 'role', value: profile.headline },
        { kind: 'pair', label: 'base', value: profile.location },
        {
          kind: 'pair',
          label: 'status',
          value: profile.availability.open
            ? (profile.availability.message ?? 'Open to opportunities')
            : 'Not currently looking',
          tone: profile.availability.open ? 'live' : 'muted',
        },
      ],
    };
  },
};

const about: CommandDescriptor = {
  name: 'about',
  summary: 'Longer introduction',
  run: (_args, { snapshot }) => ({
    lines: snapshot.profile.longBio
      .split(/\n\s*\n/)
      .flatMap((paragraph, index) =>
        index === 0 ? wrap(paragraph.trim()) : [blank, ...wrap(paragraph.trim())],
      ),
  }),
};

const projects: CommandDescriptor = {
  name: 'projects',
  summary: 'List projects',
  run: (_args, { snapshot }) => {
    // Archived entries are in the snapshot but stay out of the default listing,
    // matching reader mode. Phase 4 adds `--all` and `--featured`.
    const visible = snapshot.projects.filter(
      (project) => project.status !== 'archived',
    );
    const archived = snapshot.projects.length - visible.length;

    return {
      lines: [
        { kind: 'heading', text: `Projects (${visible.length})` },
        blank,
        ...visible.map<TerminalLine>((project, index) => ({
          kind: 'entry',
          index: pad(index + 1),
          title: project.name,
          meta: project.technologies.join(' · '),
          note: project.shortDescription,
          href: project.href,
          badge: project.status,
          badgeTone: STATUS_TONE[project.status] ?? 'muted',
        })),
        blank,
        text(
          archived > 0
            ? `${archived} archived project(s) hidden. Open any entry for the full dossier.`
            : 'Open any entry for the full dossier.',
          'muted',
        ),
      ],
    };
  },
};

const experience: CommandDescriptor = {
  name: 'experience',
  summary: 'Work history',
  aliases: ['work'],
  run: (_args, { snapshot }) => ({
    lines: [
      { kind: 'heading', text: 'Experience' },
      blank,
      ...snapshot.experience.map<TerminalLine>((entry) => ({
        kind: 'entry',
        index: entry.range,
        title: entry.role,
        meta: entry.company + (entry.location ? ` · ${entry.location}` : ''),
        note: entry.summary,
        ...(entry.current ? { badge: 'current', badgeTone: 'live' as Tone } : {}),
      })),
    ],
  }),
};

const skills: CommandDescriptor = {
  name: 'skills',
  summary: 'Skills, grouped by category',
  run: (_args, { snapshot }) => {
    const categories = [...new Set(snapshot.skills.map((skill) => skill.category))];

    return {
      lines: categories.flatMap<TerminalLine>((category) => [
        { kind: 'heading', text: category },
        ...snapshot.skills
          .filter((skill) => skill.category === category)
          .map<TerminalLine>((skill) => ({
            kind: 'pair',
            label: skill.name,
            // §8: evidence, never a percentage.
            value:
              skill.evidence.length > 0
                ? skill.evidence.join(' · ')
                : `${skill.level} — no shipped evidence yet`,
          })),
        blank,
      ]),
    };
  },
};

const education: CommandDescriptor = {
  name: 'education',
  summary: 'Academic background',
  run: (_args, { snapshot }) => ({
    lines: snapshot.education.map<TerminalLine>((entry) => ({
      kind: 'entry',
      index: entry.range,
      title: entry.degree,
      meta: entry.institution,
      ...(entry.field ? { note: entry.field } : {}),
    })),
  }),
};

const writing: CommandDescriptor = {
  name: 'writing',
  summary: 'Published articles',
  aliases: ['blog', 'posts'],
  run: (_args, { snapshot }) => ({
    lines: [
      { kind: 'heading', text: `Writing (${snapshot.posts.length})` },
      blank,
      ...snapshot.posts.map<TerminalLine>((post, index) => ({
        kind: 'entry',
        index: pad(index + 1),
        title: post.title,
        meta: post.date,
        note: post.summary,
        href: post.href,
        ...(post.external ? { badge: 'external', badgeTone: 'muted' as Tone } : {}),
      })),
    ],
  }),
};

const contact: CommandDescriptor = {
  name: 'contact',
  summary: 'How to reach me',
  run: (_args, { snapshot }) => ({
    lines: [
      {
        kind: 'pair',
        label: 'email',
        value: snapshot.profile.email,
        href: `mailto:${snapshot.profile.email}`,
      },
      ...snapshot.profile.socials.map<TerminalLine>((social) => ({
        kind: 'pair',
        label: social.label.toLowerCase(),
        value: social.url.replace(/^https?:\/\/(www\.)?/, ''),
        href: social.url,
      })),
    ],
  }),
};

const resume: CommandDescriptor = {
  name: 'resume',
  summary: 'Open the resume',
  aliases: ['cv'],
  run: (_args, { snapshot }) => {
    const file = snapshot.profile.resume;

    // §32: no dead links. The resume is optional content until a PDF exists.
    if (!file) {
      return {
        lines: [
          text('No resume file is published yet.', 'error'),
          text(`Ask directly: ${snapshot.profile.email}`, 'muted'),
        ],
      };
    }

    return {
      lines: [text(`Opening ${file.label} (updated ${file.updated})...`, 'muted')],
      navigate: { href: file.href, external: true },
    };
  },
};

const reader: CommandDescriptor = {
  name: 'reader',
  summary: 'Switch to reader mode',
  aliases: ['exit', 'quit'],
  run: () => ({
    lines: [text('Switching to reader mode...', 'muted')],
    navigate: { href: '/' },
  }),
};

/** §28. Hidden from `help`, built entirely from real snapshot data. */
const neofetch: CommandDescriptor = {
  name: 'neofetch',
  summary: 'System summary',
  hidden: true,
  run: (_args, { snapshot }) => {
    const { profile, meta } = snapshot;
    const active = snapshot.projects.filter(
      (project) => project.status === 'active',
    ).length;

    return {
      lines: [
        text(String.raw`   /\_/\ `, 'accent'),
        text(String.raw`  ( o.o )    AASHISH.OS`, 'accent'),
        text(String.raw`   > ^ <     ----------`, 'accent'),
        blank,
        { kind: 'pair', label: 'user', value: profile.name },
        { kind: 'pair', label: 'role', value: profile.headline },
        { kind: 'pair', label: 'host', value: profile.location },
        { kind: 'pair', label: 'kernel', value: `aashish.os ${meta.version}` },
        {
          kind: 'pair',
          label: 'projects',
          value: `${snapshot.projects.length} (${active} active)`,
        },
        { kind: 'pair', label: 'skills', value: String(snapshot.skills.length) },
        { kind: 'pair', label: 'articles', value: String(snapshot.posts.length) },
        { kind: 'pair', label: 'built', value: meta.builtAt },
      ],
    };
  },
};

/** Registration order is `help` listing order. */
export const COMMANDS: readonly CommandDescriptor[] = [
  help,
  about,
  whoami,
  projects,
  experience,
  skills,
  education,
  writing,
  contact,
  resume,
  clear,
  reader,
  neofetch,
];

export type { CommandContext };
