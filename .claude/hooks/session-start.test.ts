import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  BINDING_MAX_AGE_MS,
  NOTE_WINDOW_MS,
  endPart,
  modelPart,
  notePart,
  runParts,
  tokenPart,
  type Deps,
} from './session-start.ts';

let scratch: string;
let home: string;
let project: string;
let envFile: string;
const now = Date.parse('2026-09-15T10:00:00Z');
const input = { session_id: 'abc-123', transcript_path: 'transcript.jsonl', source: 'startup' };
// Put together at run time, so this file holds nothing shaped like a token.
const fakeToken = ['github', 'pat', 'X'.repeat(30)].join('_');

function deps(extra: NodeJS.ProcessEnv = {}): Deps {
  return {
    env: { SPINDLE_HOME: home, CLAUDE_ENV_FILE: envFile, ...extra },
    now,
    projectDir: project,
  };
}

function saveNote(text: string, savedAt: number): string {
  const file = path.join(home, 'session.txt');
  writeFileSync(file, text);
  utimesSync(file, savedAt / 1000, savedAt / 1000);
  return file;
}

beforeEach(() => {
  scratch = mkdtempSync(path.join(os.tmpdir(), 'spindle-hook-'));
  home = path.join(scratch, 'home');
  project = path.join(scratch, 'project');
  mkdirSync(home, { recursive: true });
  mkdirSync(path.join(project, 'config'), { recursive: true });
  writeFileSync(
    path.join(project, 'config', 'claude.json'),
    JSON.stringify({ model: 'claude-opus-5' }),
  );
  writeFileSync(
    path.join(project, 'config', 'roles.json'),
    JSON.stringify({ roles: [{ id: 'tech-lead', name: 'Linda' }] }),
  );
  envFile = path.join(scratch, 'env.sh');
  writeFileSync(envFile, '');
});

afterEach(() => rmSync(scratch, { recursive: true, force: true }));

describe('token', () => {
  it('appends the token to CLAUDE_ENV_FILE and prints only that it loaded', () => {
    writeFileSync(path.join(home, 'gh-token.txt'), `\uFEFF${fakeToken}\r\n`);
    const result = tokenPart(input, deps());
    expect(readFileSync(envFile, 'utf8')).toBe(`export GH_TOKEN='${fakeToken}'\n`);
    expect(result.line).toBe('GitHub token: loaded for this session.');
    expect(result.line).not.toContain(fakeToken);
  });

  it('says GitHub features are off when the token file is missing', () => {
    expect(tokenPart(input, deps()).line).toMatch(/GitHub features are off/);
    expect(readFileSync(envFile, 'utf8')).toBe('');
  });

  it('writes no token line in a headless run', () => {
    writeFileSync(path.join(home, 'gh-token.txt'), fakeToken);
    expect(tokenPart(input, deps({ SPINDLE_HEADLESS: '1' })).line).toMatch(/headless/);
    expect(readFileSync(envFile, 'utf8')).toBe('');
  });
});

describe('note', () => {
  it('binds a note saved inside the window, then deletes it and titles the session', () => {
    const note = saveNote('ticket: SPIN-12 tidy the header\nrole: Linda\n', now - 60_000);
    const result = notePart(input, deps());
    expect(existsSync(note)).toBe(false);
    const binding = JSON.parse(readFileSync(path.join(home, 'sessions', 'abc-123.json'), 'utf8'));
    expect(binding).toEqual({
      sessionId: 'abc-123',
      ticket: 'SPIN-12 tidy the header',
      role: 'Linda',
      startedAt: new Date(now).toISOString(),
      transcriptPath: 'transcript.jsonl',
    });
    expect(result.title).toBe('Spindle · ticket SPIN-12 tidy the header');
  });

  it('binds a release note', () => {
    saveNote('release: REL-1.4.0 3f2c9ab\n', now - 1_000);
    expect(notePart(input, deps()).title).toBe('Spindle · release REL-1.4.0 3f2c9ab');
  });

  it('tolerates a byte-order mark', () => {
    saveNote('\uFEFFticket: SPIN-7\r\n', now - 1_000);
    expect(notePart(input, deps()).line).toMatch(/bound to this session/);
  });

  it('refuses a note saved before the window, and leaves it in place', () => {
    const note = saveNote('ticket: SPIN-12\n', now - NOTE_WINDOW_MS - 1_000);
    expect(notePart(input, deps()).line).toMatch(/more than 10 minutes/);
    expect(existsSync(note)).toBe(true);
    expect(existsSync(path.join(home, 'sessions'))).toBe(false);
  });

  it('refuses a note saved after the session started', () => {
    saveNote('ticket: SPIN-12\n', now + 5_000);
    expect(notePart(input, deps()).line).toMatch(/after this session started/);
  });

  it('refuses a malformed note', () => {
    saveNote('ticket: SPIN-1\nrelease: REL-1.0.0 abcdef1\n', now - 1_000);
    expect(notePart(input, deps()).line).toMatch(/exactly one ticket or release/);
    saveNote('ticket: SPIN-1\nrole: Somebody\n', now - 1_000);
    expect(notePart(input, deps()).line).toMatch(/role is not one/);
  });

  it('leaves the note alone in a headless run', () => {
    const note = saveNote('ticket: SPIN-12\n', now - 1_000);
    expect(notePart(input, deps({ SPINDLE_HEADLESS: '1' })).line).toMatch(/headless/);
    expect(existsSync(note)).toBe(true);
  });
});

describe('end', () => {
  it("removes this session's binding and sweeps only the expired ones", () => {
    const sessions = path.join(home, 'sessions');
    mkdirSync(sessions, { recursive: true });
    const own = path.join(sessions, 'abc-123.json');
    const fresh = path.join(sessions, 'other-fresh.json');
    const stale = path.join(sessions, 'other-stale.json');
    for (const file of [own, fresh, stale]) writeFileSync(file, '{}');
    const old = (now - BINDING_MAX_AGE_MS - 60_000) / 1000;
    utimesSync(stale, old, old);
    const recent = (now - 60_000) / 1000;
    utimesSync(fresh, recent, recent);

    expect(endPart(input, deps()).line).toBe(
      'Session binding: removed; 1 expired binding(s) swept.',
    );
    expect(existsSync(own)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
    expect(existsSync(stale)).toBe(false);
  });
});

describe('model', () => {
  it('stays quiet about the pinned model and warns about any other', () => {
    expect(modelPart({ model: 'claude-opus-5' }, deps()).line).toBe(
      'Model: claude-opus-5, the pinned model.',
    );
    expect(modelPart({ to_model: 'claude-sonnet-5' }, deps()).line).toMatch(/^Model warning/);
  });
});

describe('runParts', () => {
  it('turns a failing part into one line instead of breaking the session start', () => {
    rmSync(path.join(project, 'config', 'claude.json'));
    writeFileSync(path.join(project, 'config', 'claude.json'), 'not json');
    const [result] = runParts(['model'], input, deps());
    expect(result?.line).toMatch(/stood aside after an error/);
  });
});
