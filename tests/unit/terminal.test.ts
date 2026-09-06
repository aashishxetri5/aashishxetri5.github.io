import { describe, expect, it } from 'vitest';

import { COMMANDS } from '../../src/features/terminal/commands.ts';
import {
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
 * §34 lists "command parser" and "command registry" as required unit tests.
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
const textOf = (lines: ReturnType<typeof execute>) =>
  JSON.stringify(lines?.lines ?? []);

describe('parseInput', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(parseInput('')).toBeNull();
    expect(parseInput('   ')).toBeNull();
  });

  it('splits a command from its arguments', () => {
    expect(parseInput('projects --featured')).toEqual({
      name: 'projects',
      args: ['--featured'],
    });
  });

  it('lowercases the command but preserves argument case', () => {
    expect(parseInput('HELP Foo')).toEqual({ name: 'help', args: ['Foo'] });
  });

  it('keeps quoted arguments intact, for Phase 4 detail lookups', () => {
    expect(parseInput('project "image extractor"')).toEqual({
      name: 'project',
      args: ['image extractor'],
    });
  });

  it('collapses arbitrary whitespace between tokens', () => {
    expect(parseInput('  projects    a   b ')).toEqual({
      name: 'projects',
      args: ['a', 'b'],
    });
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
    // `neofetch` is hidden; a near-miss must not reveal it.
    expect(suggest('neofetc', COMMANDS)).toBeUndefined();
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

  it('catches a throwing handler instead of blanking the terminal (§32)', () => {
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

  it('projects hides archived entries by default, matching reader mode', () => {
    const output = textOf(execute('projects', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).not.toContain('Archived Fixture');
    expect(output).toContain('1 archived project(s) hidden');
  });

  it('skills shows evidence and says so plainly when there is none (§8)', () => {
    const output = textOf(execute('skills', ctx));
    expect(output).toContain('Live Fixture');
    expect(output).toContain('no shipped evidence yet');
    // §8 forbids invented proficiency percentages.
    expect(output).not.toMatch(/\d+%/);
  });

  it('resume degrades gracefully when no file is published (§32)', () => {
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
    // Still offers a route to the person.
    expect(textOf(result)).toContain('fixture@example.com');
  });

  it('resume navigates when a file exists', () => {
    const result = execute('resume', ctx);
    expect(result?.navigate).toEqual({
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
    // 2 projects, 1 of them active.
    expect(output).toContain('2 (1 active)');
  });
});
