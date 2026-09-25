import { describe, expect, it } from 'vitest';

import { COMMANDS } from '../../src/features/terminal/commands.ts';
import {
  complete,
  execute,
  parseInput,
  resolveCommand,
  suggest,
} from '../../src/features/terminal/execute.ts';
import type {
  CommandContext,
  CommandDescriptor,
} from '../../src/features/terminal/types.ts';
import type { PortfolioSnapshot } from '../../src/lib/snapshot.ts';

/**
 * 34 lists "command parser" and "command registry" as required unit tests.
 *
 * The fixture is deliberately fake. Its whole purpose is to prove the commands
 * read from the snapshot rather than containing portfolio facts (Rule 7) — if
 * anything were hardcoded, these assertions would surface the real values
 * instead of the fixture's.
 */
const snapshot: PortfolioSnapshot = {
  profile: {
    name: 'Fixture Person',
    headline: 'Fixture Role',
    shortBio: 'Short fixture bio.',
    longBio: 'First fixture paragraph.\n\nSecond fixture paragraph.',
    location: 'Fixture City',
    email: 'fixture@example.com',
    availability: { open: true, message: 'Fixture availability' },
    socials: [{ label: 'GitHub', url: 'https://github.com/fixture' }],
    resume: { href: '/resume/fixture.pdf', label: 'CV', updated: '2026-01-01' },
  },
  experience: [
    {
      id: 'fixture-role',
      company: 'Fixture Corp',
      role: 'Fixture Engineer',
      employmentType: 'full-time',
      range: '2026 — Present',
      current: true,
      summary: 'Fixture summary.',
      achievements: [],
      technologies: ['Fixture Lang'],
    },
  ],
  projects: [
    {
      id: 'live-one',
      name: 'Live Fixture',
      shortDescription: 'A visible fixture project.',
      status: 'active',
      type: 'backend',
      featured: true,
      technologies: ['Fixture Lang'],
      href: '/projects/live-one',
      github: 'https://github.com/fixture/live-one',
      problem: 'A fixture problem statement.',
      highlights: ['Fixture highlight.'],
      architecture: ['Fixture architecture note.'],
      decisions: [{ decision: 'Fixture decision.', reason: 'Fixture reason.' }],
      challenges: ['Fixture challenge.'],
      lessons: ['Fixture lesson.'],
      evidencedSkills: ['Fixture Lang'],
    },
    {
      id: 'lively-two',
      name: 'Lively Fixture',
      shortDescription: 'A second visible fixture project.',
      status: 'completed',
      type: 'tool',
      featured: false,
      technologies: ['Fixture Lang'],
      href: '/projects/lively-two',
      highlights: [],
      architecture: [],
      decisions: [],
      challenges: [],
      lessons: [],
      evidencedSkills: [],
    },
    {
      id: 'old-one',
      name: 'Archived Fixture',
      shortDescription: 'A hidden fixture project.',
      status: 'archived',
      type: 'tool',
      featured: false,
      technologies: ['Fixture Lang'],
      href: '/projects/old-one',
      highlights: [],
      architecture: [],
      decisions: [],
      challenges: [],
      lessons: [],
      evidencedSkills: [],
    },
  ],
  skills: [
    {
      name: 'Fixture Lang',
      category: 'Languages',
      level: 'advanced',
      evidence: ['Live Fixture'],
    },
    { name: 'Unproven Skill', category: 'Tools', level: 'learning', evidence: [] },
  ],
  education: [
    {
      id: 'fixture-degree',
      institution: 'Fixture University',
      degree: 'Fixture Degree',
      range: '2020 — 2024',
    },
  ],
  achievements: [],
  posts: [
    {
      id: 'fixture-post',
      title: 'Fixture Post',
      summary: 'A fixture article.',
      date: '2026-02-01',
      href: 'https://example.com/fixture',
      external: true,
    },
  ],
  meta: { builtAt: '2026-09-06', version: '9.9' },
};

const ctx: CommandContext = { snapshot, commands: COMMANDS };

/** Flatten a result's lines into searchable text. */
const textOf = (result: ReturnType<typeof execute>) =>
  JSON.stringify(result?.lines ?? []);

describe('parseInput', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('   ')).toBeNull();
  });

  it('separates flags from positional arguments', () => {
    const parsed = parseInput('projects --featured');
    expect(parsed?.name).toBe('projects');
    expect(parsed?.args).toEqual([]);
    expect([...(parsed?.flags ?? [])]).toEqual(['featured']);
  });

  it('keeps positionals and flags apart regardless of order', () => {
    const parsed = parseInput('project --all pustakalaya');
    expect(parsed?.args).toEqual(['pustakalaya']);
    expect(parsed?.flags.has('all')).toBe(true);
  });

  it('lowercases the command and flags but preserves argument case', () => {
    const parsed = parseInput('HELP --Loud Foo');
    expect(parsed?.name).toBe('help');
    expect(parsed?.args).toEqual(['Foo']);
    expect(parsed?.flags.has('loud')).toBe(true);
  });

  it('treats a bare -- as a positional, not a flag', () => {
    expect(parseInput('projects --')?.args).toEqual(['--']);
  });

  it('keeps quoted arguments intact', () => {
    const parsed = parseInput('project "image extractor"');
    expect(parsed?.args).toEqual(['image extractor']);
  });

  it('collapses arbitrary whitespace between tokens', () => {
    expect(parseInput('  projects    a   b ')?.args).toEqual(['a', 'b']);
  });
});

describe('resolveCommand', () => {
  it('finds a command by its canonical name', () => {
    expect(resolveCommand('projects', COMMANDS)?.name).toBe('projects');
  });

  it('finds a command by alias', () => {
    expect(resolveCommand('work', COMMANDS)?.name).toBe('experience');
    expect(resolveCommand('cls', COMMANDS)?.name).toBe('clear');
    expect(resolveCommand('blog', COMMANDS)?.name).toBe('writing');
  });

  it('returns undefined for an unknown name', () => {
    expect(resolveCommand('definitely-not-a-command', COMMANDS)).toBeUndefined();
  });

  it('has no duplicate names or aliases across the registry', () => {
    const seen = new Set<string>();
    for (const command of COMMANDS) {
      for (const token of [command.name, ...(command.aliases ?? [])]) {
        expect(seen.has(token), `duplicate registry token: ${token}`).toBe(false);
        seen.add(token);
      }
    }
  });

  it('gives every command a summary, and usage wherever it takes arguments', () => {
    for (const command of COMMANDS) {
      expect(command.summary.length, `${command.name} has no summary`).toBeGreaterThan(0);
      // A command that can complete arguments must document that it takes them.
      if (command.complete) {
        expect(command.usage, `${command.name} completes args but has no usage`).toBeDefined();
      }
    }
  });
});

describe('suggest', () => {
  it('offers the nearest command for a small typo', () => {
    expect(suggest('projekts', COMMANDS)).toBe('projects');
    expect(suggest('hlep', COMMANDS)).toBe('help');
  });

  it('offers nothing when the input is not close to anything', () => {
    expect(suggest('xyzzy', COMMANDS)).toBeUndefined();
  });

  it('never suggests a hidden command, which would spoil the easter egg', () => {
    expect(suggest('neofetc', COMMANDS)).toBeUndefined();
  });
});

describe('complete (Tab)', () => {
  it('completes a unique command name and adds a trailing space', () => {
    const result = complete('who', ctx);
    expect(result.candidates).toEqual(['whoami']);
    expect(result.value).toBe('whoami ');
  });

  it('fills only the common prefix when several commands match', () => {
    const result = complete('pro', ctx);
    expect(result.candidates).toEqual(['project', 'projects']);
    // "project" is the longest unambiguous prefix, and no space is added.
    expect(result.value).toBe('project');
  });

  it('never completes to a hidden command', () => {
    expect(complete('neo', ctx).candidates).toEqual([]);
  });

  it('leaves the line untouched when nothing matches', () => {
    expect(complete('zzz', ctx)).toEqual({ candidates: [], value: 'zzz' });
  });

  it('completes a unique project id and adds a trailing space', () => {
    const result = complete('project old', ctx);
    expect(result.candidates).toEqual(['old-one']);
    expect(result.value).toBe('project old-one ');
  });

  it('fills only the common prefix when project ids are ambiguous', () => {
    // "live" prefixes both live-one and lively-two.
    const result = complete('project live', ctx);
    expect(result.candidates).toEqual(['live-one', 'lively-two']);
    expect(result.value).toBe('project live');
  });

  it('offers every project id after a trailing space', () => {
    const result = complete('project ', ctx);
    expect(result.candidates).toEqual(['live-one', 'lively-two', 'old-one']);
  });

  it('completes theme values', () => {
    expect(complete('theme d', ctx).value).toBe('theme dark ');
  });

  it('completes skill category flags derived from content', () => {
    const result = complete('skills --', ctx);
    expect(result.candidates).toEqual(['--languages', '--tools']);
  });

  it('returns nothing for a command with no argument completer', () => {
    expect(complete('about ', ctx).candidates).toEqual([]);
  });
});

describe('execute', () => {
  it('returns null for empty input rather than erroring', () => {
    expect(execute('', ctx)).toBeNull();
  });

  it('reports unknown commands with a suggestion', () => {
    const result = execute('projekts', ctx);
    expect(textOf(result)).toContain('command not found');
    expect(textOf(result)).toContain('projects');
  });

  it('sets the clear flag and emits no lines for `clear`', () => {
    const result = execute('clear', ctx);
    expect(result?.clear).toBe(true);
    expect(result?.lines).toEqual([]);
  });

  it('lists every non-hidden command in `help`, and no hidden ones', () => {
    const output = textOf(execute('help', ctx));
    for (const command of COMMANDS) {
      if (command.hidden) expect(output).not.toContain(`"${command.name}"`);
      else expect(output).toContain(command.name);
    }
  });

  it('catches a throwing handler instead of blanking the terminal (32)', () => {
    const exploding: CommandDescriptor = {
      name: 'boom',
      summary: 'throws',
      run: () => {
        throw new Error('handler exploded');
      },
    };

    const result = execute('boom', { snapshot, commands: [exploding] });
    expect(textOf(result)).toContain('command failed');
    expect(textOf(result)).toContain('handler exploded');
  });
});

describe('flags', () => {
  it('projects hides archived entries by default, matching reader mode', () => {
    const output = textOf(execute('projects', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).not.toContain('Archived Fixture');
  });

  it('projects --all reveals archived entries', () => {
    const output = textOf(execute('projects --all', ctx));
    expect(output).toContain('Archived Fixture');
  });

  it('projects --featured narrows to featured entries only', () => {
    const output = textOf(execute('projects --featured', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).not.toContain('Lively Fixture');
  });

  it('skills --<category> filters by a category derived from content', () => {
    const output = textOf(execute('skills --tools', ctx));
    expect(output).toContain('Unproven Skill');
    expect(output).not.toContain('Fixture Lang');
  });

  it('reports an unknown skill filter instead of silently showing everything', () => {
    const output = textOf(execute('skills --nonsense', ctx));
    expect(output).toContain('Unknown filter');
    // The failure must not look like a filter that matched nothing.
    expect(output).not.toContain('Unproven Skill');
  });
});

describe('project <name>', () => {
  it('resolves by exact id', () => {
    const output = textOf(execute('project live-one', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).toContain('A fixture problem statement.');
  });

  it('resolves by name, case-insensitively', () => {
    expect(textOf(execute('project "live fixture"', ctx))).toContain('Live Fixture');
  });

  it('resolves a near-miss via edit distance', () => {
    expect(textOf(execute('project liveone', ctx))).toContain('Live Fixture');
  });

  it('omits dossier sections that have no content', () => {
    // lively-two has empty highlight/architecture/lesson arrays.
    const output = textOf(execute('project lively-two', ctx));
    expect(output).toContain('Lively Fixture');
    expect(output).not.toContain('Highlights');
    expect(output).not.toContain('Architecture');
  });

  it('lists the options when called with no argument', () => {
    const output = textOf(execute('project', ctx));
    expect(output).toContain('Usage: project <name>');
    expect(output).toContain('live-one');
  });

  it('reports a genuine miss rather than guessing wildly', () => {
    const output = textOf(execute('project qqqqqqqqqq', ctx));
    expect(output).toContain('No project matches');
  });
});

describe('theme', () => {
  it('declares a toggle effect with no argument, and touches no DOM', () => {
    const result = execute('theme', ctx);
    expect(result?.effect).toEqual({ type: 'theme', value: 'toggle' });
  });

  it('declares an explicit effect for each supported value', () => {
    expect(execute('theme dark', ctx)?.effect).toEqual({ type: 'theme', value: 'dark' });
    expect(execute('theme light', ctx)?.effect).toEqual({ type: 'theme', value: 'light' });
    expect(execute('theme system', ctx)?.effect).toEqual({ type: 'theme', value: 'system' });
  });

  it('rejects an unknown value without emitting an effect', () => {
    const result = execute('theme neon', ctx);
    expect(result?.effect).toBeUndefined();
    expect(textOf(result)).toContain('Unknown theme');
  });
});

describe('commands read from the snapshot, not from themselves (Rule 7)', () => {
  it('whoami reflects fixture identity', () => {
    const output = textOf(execute('whoami', ctx));
    expect(output).toContain('Fixture Person');
    expect(output).toContain('Fixture Role');
    expect(output).toContain('Fixture City');
  });

  it('experience reflects the fixture role and derived range', () => {
    const output = textOf(execute('experience', ctx));
    expect(output).toContain('Fixture Engineer');
    expect(output).toContain('Fixture Corp');
    // Range comes pre-derived from the snapshot, not recomputed client-side.
    expect(output).toContain('2026 — Present');
  });

  it('skills shows evidence and says so plainly when there is none (8)', () => {
    const output = textOf(execute('skills', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).toContain('no shipped evidence yet');
    // 8 forbids invented proficiency percentages.
    expect(output).not.toMatch(/\d+%/);
  });

  it('github navigates to the profile from content', () => {
    expect(execute('github', ctx)?.navigate).toEqual({
      href: 'https://github.com/fixture',
      external: true,
    });
  });

  it('github degrades when no profile is configured (32)', () => {
    const without: PortfolioSnapshot = {
      ...snapshot,
      profile: { ...snapshot.profile, socials: [] },
    };
    const result = execute('github', { snapshot: without, commands: COMMANDS });
    expect(result?.navigate).toBeUndefined();
    expect(textOf(result)).toContain('No GitHub profile is configured');
  });

  it('resume degrades gracefully when no file is published (32)', () => {
    const withoutResume: PortfolioSnapshot = {
      ...snapshot,
      profile: { ...snapshot.profile, resume: undefined },
    };
    const result = execute('resume', {
      snapshot: withoutResume,
      commands: COMMANDS,
    });

    expect(result?.navigate).toBeUndefined();
    expect(textOf(result)).toContain('No resume file is published yet');
    expect(textOf(result)).toContain('fixture@example.com');
  });

  it('resume navigates when a file exists', () => {
    expect(execute('resume', ctx)?.navigate).toEqual({
      href: '/resume/fixture.pdf',
      external: true,
    });
  });

  it('reader navigates back to zero-JS reader mode', () => {
    expect(execute('exit', ctx)?.navigate).toEqual({ href: '/' });
  });

  it('neofetch reports real derived counts', () => {
    const output = textOf(execute('neofetch', ctx));
    expect(output).toContain('Fixture Person');
    expect(output).toContain('aashish.os 9.9');
    // 3 projects, 1 of them active.
    expect(output).toContain('3 (1 active)');
  });
});
