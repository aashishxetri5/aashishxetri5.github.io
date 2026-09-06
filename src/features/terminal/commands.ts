/**
 * Command handlers.
 *
 * Every handler is a pure function of (input, context) -> CommandResult. None
 * of them contains a portfolio fact: everything is read from `ctx.snapshot`,
 * which is built from the same content queries reader mode uses (Rule 7).
 * None of them touches the DOM either — `theme` declares an effect and the
 * renderer performs it, which is what keeps this file testable in isolation.
 */
import { distance } from './execute';
import type {
  CommandContext,
  CommandDescriptor,
  CommandInput,
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

/** A titled block of bullet lines, omitted entirely when the list is empty. */
function section(title: string, items: string[], marker = '·'): TerminalLine[] {
  if (items.length === 0) return [];

  return [
    { kind: 'heading', text: title },
    ...items.map<TerminalLine>((item) => ({
      kind: 'pair',
      label: marker,
      value: item,
    })),
    blank,
  ];
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
  run: (_input, ctx) => ({
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
      text('Tab completes. Up and down recall history. Esc clears the input.', 'muted'),
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
  run: (_input, { snapshot }) => {
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
  run: (_input, { snapshot }) => ({
    lines: snapshot.profile.longBio
      .split(/\n\s*\n/)
      .flatMap((paragraph, index) =>
        index === 0 ? wrap(paragraph.trim()) : [blank, ...wrap(paragraph.trim())],
      ),
  }),
};

const projects: CommandDescriptor = {
  name: 'projects',
  usage: 'projects [--featured] [--all]',
  summary: 'List projects',
  run: ({ flags }, { snapshot }) => {
    const showAll = flags.has('all');
    const featuredOnly = flags.has('featured');

    // Archived entries stay out of the default listing, matching reader mode.
    let visible = showAll
      ? snapshot.projects
      : snapshot.projects.filter((project) => project.status !== 'archived');

    if (featuredOnly) visible = visible.filter((project) => project.featured);

    if (visible.length === 0) {
      return {
        lines: [
          text(
            featuredOnly
              ? 'No projects are marked featured.'
              : 'No projects to show.',
            'muted',
          ),
        ],
      };
    }

    const hidden = showAll
      ? 0
      : snapshot.projects.filter((project) => project.status === 'archived').length;

    const label = featuredOnly ? 'Featured projects' : 'Projects';

    return {
      lines: [
        { kind: 'heading', text: `${label} (${visible.length})` },
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
          hidden > 0
            ? `${hidden} archived hidden — "projects --all" shows them. "project <name>" opens one.`
            : 'Run "project <name>" for the full dossier.',
          'muted',
        ),
      ],
    };
  },
};

/** Resolve a project by id, then by exact name, then by fuzzy match. */
function findProject(query: string, ctx: CommandContext) {
  const needle = query.toLowerCase().trim();
  const { projects: all } = ctx.snapshot;

  const exact =
    all.find((project) => project.id.toLowerCase() === needle) ??
    all.find((project) => project.name.toLowerCase() === needle);
  if (exact) return exact;

  const partial = all.find(
    (project) =>
      project.id.toLowerCase().includes(needle) ||
      project.name.toLowerCase().includes(needle),
  );
  if (partial) return partial;

  // Last resort: nearest by edit distance, so a typo still lands.
  let best: { project: (typeof all)[number]; score: number } | undefined;
  for (const project of all) {
    const score = Math.min(
      distance(needle, project.id.toLowerCase()),
      distance(needle, project.name.toLowerCase()),
    );
    if (score <= 3 && (best === undefined || score < best.score)) {
      best = { project, score };
    }
  }

  return best?.project;
}

const project: CommandDescriptor = {
  name: 'project',
  usage: 'project <name>',
  summary: 'Open one project dossier',
  complete: (_input, ctx) => ctx.snapshot.projects.map((entry) => entry.id),
  run: ({ args }, ctx) => {
    const query = args.join(' ').trim();

    if (query.length === 0) {
      return {
        lines: [
          text('Usage: project <name>', 'error'),
          blank,
          ...ctx.snapshot.projects.map<TerminalLine>((entry) => ({
            kind: 'pair',
            label: entry.id,
            value: entry.name,
          })),
        ],
      };
    }

    const found = findProject(query, ctx);

    if (!found) {
      return {
        lines: [
          text(`No project matches "${query}".`, 'error'),
          text('Run "projects" to list them.', 'muted'),
        ],
      };
    }

    const links: TerminalLine[] = [
      ...(found.github
        ? [
            {
              kind: 'pair' as const,
              label: 'source',
              value: found.github.replace(/^https?:\/\/(www\.)?/, ''),
              href: found.github,
            },
          ]
        : []),
      ...(found.demo
        ? [
            {
              kind: 'pair' as const,
              label: 'demo',
              value: found.demo.replace(/^https?:\/\/(www\.)?/, ''),
              href: found.demo,
            },
          ]
        : []),
      ...(found.documentation
        ? [
            {
              kind: 'pair' as const,
              label: 'docs',
              value: found.documentation.replace(/^https?:\/\/(www\.)?/, ''),
              href: found.documentation,
            },
          ]
        : []),
    ];

    return {
      lines: [
        { kind: 'heading', text: found.name },
        { kind: 'pair', label: 'status', value: found.status, tone: STATUS_TONE[found.status] ?? 'muted' },
        { kind: 'pair', label: 'type', value: found.type },
        { kind: 'pair', label: 'stack', value: found.technologies.join(' · ') },
        { kind: 'pair', label: 'page', value: found.href, href: found.href },
        ...links,
        blank,
        ...wrap(found.shortDescription),
        blank,
        // Empty sections omit themselves, so a thin project reads as a short
        // page rather than a scaffold of empty headings.
        ...(found.problem ? [{ kind: 'heading' as const, text: 'Problem' }, ...wrap(found.problem), blank] : []),
        ...section('Highlights', found.highlights, '+'),
        ...section('Architecture', found.architecture, '→'),
        ...(found.decisions.length > 0
          ? [
              { kind: 'heading' as const, text: 'Engineering decisions' },
              ...found.decisions.flatMap<TerminalLine>((entry) => [
                { kind: 'pair', label: '·', value: entry.decision },
                ...wrap(entry.reason).map((line) => line),
              ]),
              blank,
            ]
          : []),
        ...section('Challenges', found.challenges, '!'),
        ...section('Lessons', found.lessons, '→'),
        // Derived by reversing skill -> project references, same as the dossier.
        ...(found.evidencedSkills.length > 0
          ? [
              { kind: 'heading' as const, text: 'Skills evidenced here' },
              text(found.evidencedSkills.join(' · '), 'muted'),
            ]
          : []),
      ],
    };
  },
};

const experience: CommandDescriptor = {
  name: 'experience',
  summary: 'Work history',
  aliases: ['work'],
  run: (_input, { snapshot }) => ({
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

/** Category flags are derived from content, never hardcoded. */
const categoriesOf = (ctx: CommandContext) => [
  ...new Set(ctx.snapshot.skills.map((skill) => skill.category)),
];

const skills: CommandDescriptor = {
  name: 'skills',
  usage: 'skills [--<category>]',
  summary: 'Skills, grouped by category',
  complete: (_input, ctx) =>
    categoriesOf(ctx).map((category) => `--${category.toLowerCase()}`),
  run: ({ flags }, ctx) => {
    const { snapshot } = ctx;
    const all = categoriesOf(ctx);

    // `skills --backend` filters; unknown flags are reported rather than
    // silently ignored, which would look like the filter did nothing.
    const requested = all.filter((category) => flags.has(category.toLowerCase()));
    const unknown = [...flags].filter(
      (flag) => !all.some((category) => category.toLowerCase() === flag),
    );

    if (unknown.length > 0 && requested.length === 0) {
      return {
        lines: [
          text(`Unknown filter: --${unknown[0]}`, 'error'),
          text(
            `Available: ${all.map((category) => `--${category.toLowerCase()}`).join(' ')}`,
            'muted',
          ),
        ],
      };
    }

    const shown = requested.length > 0 ? requested : all;

    return {
      lines: shown.flatMap<TerminalLine>((category) => [
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
  run: (_input, { snapshot }) => ({
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
  run: (_input, { snapshot }) => ({
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
  run: (_input, { snapshot }) => ({
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

const github: CommandDescriptor = {
  name: 'github',
  summary: 'Open my GitHub profile',
  run: (_input, { snapshot }) => {
    const link = snapshot.profile.socials.find(
      (social) => social.label.toLowerCase() === 'github',
    );

    // §32: never a dead link. The social list is content, so it can be absent.
    if (!link) {
      return { lines: [text('No GitHub profile is configured.', 'error')] };
    }

    return {
      lines: [text(`Opening ${link.url}...`, 'muted')],
      navigate: { href: link.url, external: true },
    };
  },
};

const resume: CommandDescriptor = {
  name: 'resume',
  summary: 'Open the resume',
  aliases: ['cv'],
  run: (_input, { snapshot }) => {
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

const THEME_VALUES = ['dark', 'light', 'system'] as const;

const theme: CommandDescriptor = {
  name: 'theme',
  usage: 'theme [dark|light|system]',
  summary: 'Switch colour theme',
  complete: () => [...THEME_VALUES],
  run: ({ args }) => {
    const requested = (args[0] ?? '').toLowerCase();

    if (requested.length === 0) {
      return {
        lines: [text('Toggling theme...', 'muted')],
        effect: { type: 'theme', value: 'toggle' },
      };
    }

    if (!THEME_VALUES.includes(requested as (typeof THEME_VALUES)[number])) {
      return {
        lines: [
          text(`Unknown theme: ${requested}`, 'error'),
          text(`Try: ${THEME_VALUES.join(', ')}`, 'muted'),
        ],
      };
    }

    return {
      lines: [
        text(
          requested === 'system'
            ? 'Following system preference.'
            : `Theme set to ${requested}.`,
          'muted',
        ),
      ],
      effect: { type: 'theme', value: requested as 'dark' | 'light' | 'system' },
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
  run: (_input, { snapshot }) => {
    const { profile, meta } = snapshot;
    const active = snapshot.projects.filter(
      (entry) => entry.status === 'active',
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
  project,
  experience,
  skills,
  education,
  writing,
  contact,
  github,
  resume,
  theme,
  clear,
  reader,
  neofetch,
];

export type { CommandContext, CommandInput };
