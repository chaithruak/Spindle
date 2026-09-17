import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  branchFrom,
  field,
  FIELD_SEPARATOR,
  formatLine,
  LOG_DIR,
  LOG_FILE,
  readBinding,
  record,
  roleLabel,
  whereFrom,
  type LogDeps,
} from './decision-log.ts';

const now = Date.parse('2026-09-17T10:00:00Z');

let scratch: string;
let home: string;
let project: string;

function deps(extra: Partial<LogDeps> = {}): LogDeps {
  return {
    env: { SPINDLE_HOME: home },
    now,
    projectDir: project,
    cwd: project,
    ...extra,
  };
}

function bind(sessionId: string, binding: Record<string, unknown>): void {
  const sessions = path.join(home, 'sessions');
  mkdirSync(sessions, { recursive: true });
  writeFileSync(path.join(sessions, `${sessionId}.json`), JSON.stringify(binding));
}

function logLines(): string[] {
  const file = path.join(project, LOG_DIR, LOG_FILE);
  return readFileSync(file, 'utf8').split('\n').filter(Boolean);
}

beforeEach(() => {
  scratch = mkdtempSync(path.join(os.tmpdir(), 'spindle-log-'));
  home = path.join(scratch, 'home');
  project = path.join(scratch, 'project');
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe('field', () => {
  it('takes the line breaks out, because they would split one entry in two', () => {
    expect(field('first\nsecond\r\nthird')).toBe('first second third');
  });

  it('never comes back empty, so a line always has the same number of fields', () => {
    expect(field('   ')).toBe('-');
  });

  it('redacts anything shaped like a provider key', () => {
    // Put together at run time, so this file holds nothing shaped like a key.
    const fake = ['sk', 'or', 'v1', 'a1b2c3d4e5f6a7b8'].join('-');
    expect(field(`refused ${fake} here`)).toBe('refused [redacted] here');
  });

  it('redacts anything shaped like a token or a bearer value', () => {
    const token = ['github', 'pat', 'A'.repeat(20)].join('_');
    const bearer = `Bearer ${'B'.repeat(24)}`;
    expect(field(token)).toBe('[redacted]');
    expect(field(bearer)).toBe('[redacted]');
  });

  it('keeps a field from carrying the separator and faking an extra one', () => {
    expect(field(`before${FIELD_SEPARATOR}after`)).not.toContain(FIELD_SEPARATOR.trim());
  });
});

describe('whereFrom', () => {
  it('calls the main checkout main', () => {
    expect(whereFrom(deps())).toBe('main');
  });

  it('names a worktree by where it sits, never by an absolute path', () => {
    const where = whereFrom(deps({ cwd: path.join(project, '.claude', 'worktrees', 'web') }));
    expect(where).toBe('.claude/worktrees/web');
    expect(where).not.toContain(project);
  });

  it('says only that somewhere else is elsewhere', () => {
    expect(whereFrom(deps({ cwd: path.join(scratch, 'somewhere-else') }))).toBe('elsewhere');
  });
});

describe('branchFrom', () => {
  it('reads the branch out of a checkout', () => {
    mkdirSync(path.join(project, '.git'), { recursive: true });
    writeFileSync(path.join(project, '.git', 'HEAD'), 'ref: refs/heads/build/kit\n');
    expect(branchFrom(project)).toBe('build/kit');
  });

  it('follows a worktree .git file to the real gitdir', () => {
    const gitDir = path.join(scratch, 'real-gitdir');
    mkdirSync(gitDir, { recursive: true });
    writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/worktree-adapters\n');
    const worktree = path.join(scratch, 'worktree');
    mkdirSync(worktree, { recursive: true });
    writeFileSync(path.join(worktree, '.git'), `gitdir: ${gitDir}\n`);
    expect(branchFrom(worktree)).toBe('worktree-adapters');
  });

  it('says detached rather than guessing', () => {
    mkdirSync(path.join(project, '.git'), { recursive: true });
    writeFileSync(path.join(project, '.git', 'HEAD'), 'a'.repeat(40));
    expect(branchFrom(project)).toBe('detached');
  });

  it('says none where there is no git at all', () => {
    expect(branchFrom(project)).toBe('none');
  });
});

describe('readBinding', () => {
  it('reads a binding a session holds', () => {
    bind('abc-123', { sessionId: 'abc-123', ticket: 'W3 build kit' });
    expect(readBinding('abc-123', deps())?.ticket).toBe('W3 build kit');
  });

  it('comes back empty-handed for a session with none', () => {
    expect(readBinding('abc-123', deps())).toBeUndefined();
  });

  it('refuses a session id that could name a file somewhere else', () => {
    expect(readBinding('../../escape', deps())).toBeUndefined();
    expect(readBinding('', deps())).toBeUndefined();
  });

  it('treats a malformed binding as no binding rather than throwing', () => {
    const sessions = path.join(home, 'sessions');
    mkdirSync(sessions, { recursive: true });
    writeFileSync(path.join(sessions, 'abc-123.json'), '{ not json');
    expect(readBinding('abc-123', deps())).toBeUndefined();
  });
});

describe('roleLabel', () => {
  it('uses the role the binding names', () => {
    expect(roleLabel({ role: 'tech-lead' }, 'build/kit')).toBe('tech-lead');
  });

  it('falls back to the stream name in a stream session', () => {
    expect(roleLabel(undefined, 'worktree-adapters')).toBe('stream adapters');
  });

  it('says none when it is neither', () => {
    expect(roleLabel(undefined, 'build/kit')).toBe('none');
  });
});

describe('formatLine', () => {
  it('writes every field the log promises, in order', () => {
    bind('abc-123', { sessionId: 'abc-123', ticket: 'W3 build kit', role: 'tech-lead' });
    mkdirSync(path.join(project, '.git'), { recursive: true });
    writeFileSync(path.join(project, '.git', 'HEAD'), 'ref: refs/heads/build/kit\n');

    const parts = formatLine(
      {
        hook: 'protect-paths',
        tool: 'Edit',
        decision: 'deny',
        reason: 'no ticket',
        sessionId: 'abc-123',
      },
      deps(),
    ).split(FIELD_SEPARATOR);

    expect(parts).toEqual([
      '2026-09-17T10:00:00.000Z',
      'protect-paths',
      'Edit',
      'deny',
      'no ticket',
      'abc-123',
      'main',
      'build/kit',
      'tech-lead',
    ]);
  });

  it('stays one line even when a reason arrives with line breaks in it', () => {
    const line = formatLine(
      {
        hook: 'protect-secrets',
        tool: 'Bash',
        decision: 'deny',
        reason: 'first\nsecond',
        sessionId: 'abc-123',
      },
      deps(),
    );
    expect(line).not.toContain('\n');
  });
});

describe('record', () => {
  it('writes one whole line, ended, so two writers cannot share one', () => {
    const entry = {
      hook: 'protect-paths',
      tool: 'Edit',
      decision: 'deny' as const,
      reason: 'no ticket',
      sessionId: 'abc-123',
    };
    expect(record(entry, deps())).toBe(true);
    expect(record({ ...entry, reason: 'still no ticket' }, deps())).toBe(true);

    const lines = logLines();
    expect(lines).toHaveLength(2);
    expect(readFileSync(path.join(project, LOG_DIR, LOG_FILE), 'utf8').endsWith('\n')).toBe(true);
    for (const line of lines) expect(line.split(FIELD_SEPARATOR)).toHaveLength(9);
  });

  it('puts the log in the main checkout even when the work is in a worktree', () => {
    record(
      {
        hook: 'protect-paths',
        tool: 'Edit',
        decision: 'deny',
        reason: 'no ticket',
        sessionId: 'abc-123',
      },
      deps({ cwd: path.join(project, '.claude', 'worktrees', 'web') }),
    );
    expect(logLines()[0]).toContain('.claude/worktrees/web');
  });

  it('says so rather than throwing when it cannot write at all', () => {
    const impossible = deps({ projectDir: path.join(scratch, 'gone', '\0', 'nowhere') });
    expect(
      record({ hook: 'protect-paths', tool: 'Edit', decision: 'deny', reason: 'x' }, impossible),
    ).toBe(false);
  });
});
