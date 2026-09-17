import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { editedFile, isInside, tidy } from './format-on-edit.ts';

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(path.join(os.tmpdir(), 'spindle-format-'));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('editedFile', () => {
  it('finds the file an edit touched', () => {
    expect(editedFile({ tool_name: 'Edit', tool_input: { file_path: 'a.ts' } })).toBe('a.ts');
    expect(editedFile({ tool_name: 'Write', tool_input: { file_path: 'b.ts' } })).toBe('b.ts');
    expect(
      editedFile({ tool_name: 'NotebookEdit', tool_input: { notebook_path: 'c.ipynb' } }),
    ).toBe('c.ipynb');
  });

  it('stands aside for a tool that edits nothing', () => {
    expect(editedFile({ tool_name: 'Bash', tool_input: { command: 'npm test' } })).toBeUndefined();
    expect(editedFile({ tool_name: 'Read', tool_input: { file_path: 'a.ts' } })).toBeUndefined();
  });

  it('stands aside rather than guessing at an input it cannot read', () => {
    expect(editedFile({})).toBeUndefined();
    expect(editedFile({ tool_name: 'Edit', tool_input: { file_path: '   ' } })).toBeUndefined();
  });
});

describe('isInside', () => {
  it('formats a file in the project and leaves anything outside it alone', () => {
    expect(isInside(path.join(scratch, 'src', 'a.ts'), scratch)).toBe(true);
    expect(isInside(path.join(os.tmpdir(), 'elsewhere', 'a.ts'), scratch)).toBe(false);
    expect(isInside(scratch, scratch)).toBe(false);
  });
});

describe('tidy', () => {
  it('formats the one file it is given', async () => {
    writeFileSync(path.join(scratch, '.prettierignore'), '');
    const file = path.join(scratch, 'messy.ts');
    writeFileSync(file, 'export const a   =    1\n');

    const said = await tidy(file, scratch);

    expect(readFileSync(file, 'utf8')).toBe('export const a = 1;\n');
    expect(said).toContain('formatted');
  });

  it('still formats when ESLint cannot run, rather than losing both', async () => {
    // This scratch folder carries no ESLint config, so the lint pass cannot run.
    writeFileSync(path.join(scratch, '.prettierignore'), '');
    const file = path.join(scratch, 'messy.ts');
    writeFileSync(file, 'export const a   =    1\n');

    const said = await tidy(file, scratch);

    expect(readFileSync(file, 'utf8')).toBe('export const a = 1;\n');
    expect(said).toContain('lint stood aside');
  });

  it('leaves a file Prettier is told to ignore', async () => {
    writeFileSync(path.join(scratch, '.prettierignore'), 'skipme.ts\n');
    const file = path.join(scratch, 'skipme.ts');
    writeFileSync(file, 'export const a   =    1\n');

    const said = await tidy(file, scratch);

    expect(readFileSync(file, 'utf8')).toBe('export const a   =    1\n');
    expect(said).toContain('left');
  });

  it('leaves a file Prettier has no parser for', async () => {
    writeFileSync(path.join(scratch, '.prettierignore'), '');
    const file = path.join(scratch, 'notes.bin');
    writeFileSync(file, 'not a language\n');

    expect(await tidy(file, scratch)).toContain('no parser');
    expect(readFileSync(file, 'utf8')).toBe('not a language\n');
  });

  it('throws rather than reporting success when it cannot read the file at all', async () => {
    writeFileSync(path.join(scratch, '.prettierignore'), '');
    mkdirSync(path.join(scratch, 'gone'), { recursive: true });
    await expect(tidy(path.join(scratch, 'gone', 'missing.ts'), scratch)).rejects.toThrow();
  });
});
