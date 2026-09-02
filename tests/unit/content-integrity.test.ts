import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findIntegrityProblems } from '../../scripts/lib/content-integrity.mjs';

/**
 * These tests build throwaway content trees on disk, because the checker's
 * whole job is to report what is actually on disk.
 */
let root: string | undefined;

afterEach(async () => {
  if (root) {
    await rm(root, { recursive: true, force: true });
    root = undefined;
  }
});

async function makeTree(skills: string, projectFiles: string[] = [], experienceFiles: string[] = []) {
  root = await mkdtemp(join(tmpdir(), 'content-integrity-'));

  await mkdir(join(root, 'content', 'skills'), { recursive: true });
  await mkdir(join(root, 'content', 'projects'), { recursive: true });
  await mkdir(join(root, 'content', 'experience'), { recursive: true });

  await writeFile(join(root, 'content', 'skills', 'skills.yaml'), skills, 'utf8');

  for (const name of projectFiles) {
    await writeFile(join(root, 'content', 'projects', name), '---\n---\n', 'utf8');
  }
  for (const name of experienceFiles) {
    await writeFile(join(root, 'content', 'experience', name), '---\n---\n', 'utf8');
  }

  return root;
}

describe('findIntegrityProblems', () => {
  it('reports nothing when every reference resolves', async () => {
    const dir = await makeTree(
      `- id: java
  name: Java
  projects:
    - pustakalaya
  companies:
    - techtrix-hackathon
`,
      ['pustakalaya.mdx'],
      ['techtrix-hackathon.md'],
    );

    expect(await findIntegrityProblems(dir)).toEqual([]);
  });

  it('catches a project reference that does not exist — the hole Astro leaves open', async () => {
    const dir = await makeTree(
      `- id: java
  name: Java
  projects:
    - does-not-exist
`,
      ['pustakalaya.mdx'],
    );

    const problems = await findIntegrityProblems(dir);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('does-not-exist');
    expect(problems[0]).toContain('projects');
    // The message must be actionable, so it lists what *is* available.
    expect(problems[0]).toContain('pustakalaya');
  });

  it('catches a broken company reference into the experience collection', async () => {
    const dir = await makeTree(
      `- id: php
  name: PHP
  companies:
    - never-worked-here
`,
      [],
      ['techtrix-hackathon.md'],
    );

    const problems = await findIntegrityProblems(dir);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('never-worked-here');
    expect(problems[0]).toContain('experience');
  });

  it('catches a duplicate skill id, which would otherwise silently drop a skill', async () => {
    const dir = await makeTree(
      `- id: java
  name: Java
- id: java
  name: Java Again
`,
    );

    const problems = await findIntegrityProblems(dir);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('duplicate');
    expect(problems[0]).toContain('java');
  });

  it('catches a skill with no id, which the file() loader requires', async () => {
    const dir = await makeTree(
      `- name: Nameless Skill
`,
    );

    const problems = await findIntegrityProblems(dir);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('no `id`');
  });

  it('rejects a reference field that is not a list', async () => {
    const dir = await makeTree(
      `- id: java
  name: Java
  projects: pustakalaya
`,
      ['pustakalaya.mdx'],
    );

    const problems = await findIntegrityProblems(dir);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('must be a list');
  });

  it('treats a missing skills file as valid rather than crashing', async () => {
    root = await mkdtemp(join(tmpdir(), 'content-integrity-'));
    expect(await findIntegrityProblems(root)).toEqual([]);
  });

  it('reports every problem at once rather than stopping at the first', async () => {
    const dir = await makeTree(
      `- id: a
  name: A
  projects:
    - missing-one
- id: b
  name: B
  projects:
    - missing-two
`,
    );

    expect(await findIntegrityProblems(dir)).toHaveLength(2);
  });
});
