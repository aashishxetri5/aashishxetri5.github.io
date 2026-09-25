import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import {
  PORTFOLIO_PATH,
  validatePortfolio,
} from '../../src/lib/portfolio-loader.ts';

/** Smallest document that passes structural validation. */
const valid = () => ({
  profile: { name: 'Fixture Person' },
  experience: [{ id: 'fixture-job', company: 'Fixture Corp' }],
  projects: [
    { id: 'alpha', name: 'Alpha' },
    { id: 'beta', name: 'Beta', body: 'Markdown is allowed on projects.' },
  ],
  skills: [
    { id: 'fixture-lang', name: 'Fixture Lang', projects: ['alpha'], companies: ['fixture-job'] },
  ],
  posts: [{ id: 'a-post', title: 'A Post', body: 'And on posts.' }],
});

describe('validatePortfolio', () => {
  it('accepts a well-formed document', () => {
    expect(validatePortfolio(valid())).toEqual([]);
  });

  it('accepts absent and empty optional sections', () => {
    const doc = { profile: { name: 'Only a profile' }, achievements: [] };
    expect(validatePortfolio(doc)).toEqual([]);
  });

  it('rejects an empty file', () => {
    expect(validatePortfolio(null)).toHaveLength(1);
    expect(validatePortfolio(undefined)[0]).toContain('empty');
  });

  it('requires a profile', () => {
    const { profile: _removed, ...rest } = valid();
    expect(validatePortfolio(rest).join('\n')).toContain('Missing the `profile:` section');
  });

  it('rejects a profile written as a list', () => {
    const doc = { ...valid(), profile: [{ name: 'x' }] };
    expect(validatePortfolio(doc).join('\n')).toContain('must be a set of fields');
  });

  it('names a misspelled section and suggests the right one', () => {
    const { projects, ...rest } = valid();
    const problems = validatePortfolio({ ...rest, projetcs: projects });

    expect(problems[0]).toContain('Unknown section `projetcs:`');
    expect(problems[0]).toContain('did you mean `projects:`');
  });

  it('does not bury a misspelled section under cascading reference errors', () => {
    // Skills still reference `alpha`, which is now under the misspelled key.
    const { projects, ...rest } = valid();
    const problems = validatePortfolio({ ...rest, projetcs: projects });

    expect(problems).toHaveLength(2);
    expect(problems[1]).toContain('were not checked yet');
  });

  it('requires a list section to be a list', () => {
    const doc = { ...valid(), projects: { id: 'alpha' } };
    expect(validatePortfolio(doc).join('\n')).toContain('`projects:` must be a list');
  });

  it('requires every list entry to have an id, and says which entry', () => {
    const doc = valid();
    doc.projects[1] = { name: 'Beta' } as (typeof doc.projects)[number];
    const problems = validatePortfolio(doc);

    expect(problems[0]).toContain('projects entry #2 (Beta)');
    expect(problems[0]).toContain('missing `id:`');
  });

  it('rejects ids that would make a bad URL', () => {
    const doc = valid();
    doc.projects[0]!.id = 'My Project';
    expect(validatePortfolio(doc).join('\n')).toContain('lowercase letters, numbers and dashes');
  });

  it('rejects duplicate ids within a section', () => {
    const doc = valid();
    doc.projects[1]!.id = 'alpha';
    expect(validatePortfolio(doc).join('\n')).toContain('used more than once');
  });

  it('allows the same id in different sections', () => {
    const doc = valid();
    doc.posts[0]!.id = 'alpha';
    expect(validatePortfolio(doc)).toEqual([]);
  });

  it('rejects a body where it would never be displayed', () => {
    const doc = valid();
    (doc.experience[0] as Record<string, unknown>).body = 'invisible';
    const problems = validatePortfolio(doc);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('would not be shown anywhere');
  });

  it('rejects a skill citing a project that does not exist', () => {
    const doc = valid();
    doc.skills[0]!.projects = ['alpha', 'gamma'];
    const problems = validatePortfolio(doc);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('"gamma" under `projects:`');
  });

  it('rejects a skill citing a job that does not exist', () => {
    const doc = valid();
    doc.skills[0]!.companies = ['nowhere'];
    expect(validatePortfolio(doc).join('\n')).toContain('no entry in `experience:` has that id');
  });

  it('requires skill references to be lists', () => {
    const doc = valid();
    (doc.skills[0] as Record<string, unknown>).projects = 'alpha';
    expect(validatePortfolio(doc).join('\n')).toContain('must be a list of ids');
  });

  it('reports every problem at once rather than stopping at the first', () => {
    const doc = valid();
    doc.projects[1]!.id = 'alpha'; // duplicate
    doc.posts[0]!.id = 'Bad Id'; // malformed
    expect(validatePortfolio(doc).length).toBeGreaterThanOrEqual(2);
  });
});

describe('the real content/portfolio.yaml', () => {
  // A regression guard on the owner's actual content, so `npm test` catches a
  // structural mistake without needing a full build.
  it('passes structural validation', () => {
    const doc = parse(readFileSync(PORTFOLIO_PATH, 'utf8'));
    expect(validatePortfolio(doc)).toEqual([]);
  });
});
