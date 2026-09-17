import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { spindleHome } from '../session-start.ts';

// The one log every guard hook writes into, and the only place that can say why
// a guard refused. The owner's isolation file denies the session every route to
// its own binding, so when protect-paths refuses an edit nobody in the session
// can go and look at what it read. This file is that answer.
//
// Four sessions append to one file from separate Node processes on Windows: the
// kit's and one per stream. A half-written log is worse than none, because it
// looks complete. So an entry is one whole line, written with one appendFileSync
// call, and every field is stripped of the line breaks that would split it.
//
// The log lives in the main checkout whichever session writes it, because the
// desktop app throws a worktree's ignored files away when that session is
// archived. Git ignores .claude/logs/, and a copy reaches the evidence folder
// only after the scrub.
//
// It holds nothing about a person. It sits outside data/<environment>/, so the
// compliance policy's retention never reaches it and the right answer is that it
// never holds anything to retain: no key, no token, no cookie value, no
// Authorization value, no chat text and no email address. It holds no absolute
// path either, so the scrub has no personal path to find.

export const LOG_DIR = path.join('.claude', 'logs');
export const LOG_FILE = 'decisions.log';

// A printable separator, built from its code rather than typed, because writing
// a character through a tool call is how invisible ones get into this repository.
export const FIELD_SEPARATOR = ` ${String.fromCharCode(0xb7)} `;

export type Decision = 'allow' | 'deny' | 'aside';

export type Binding = {
  sessionId?: string;
  ticket?: string;
  release?: string;
  role?: string;
  startedAt?: string;
};

export type Entry = {
  hook: string;
  tool: string;
  decision: Decision;
  reason: string;
  sessionId?: string;
};

export type LogDeps = {
  env: NodeJS.ProcessEnv;
  now: number;
  projectDir: string;
  cwd: string;
};

// Anything shaped like a credential, so a reason a hook composed carelessly
// cannot carry one into a file that gets committed as evidence. The rules are
// the value shapes scripts/key-scan.ts already knows, kept deliberately loose
// here: this is a last fence, not the first one.
const CREDENTIAL_SHAPES = [
  /sk-or-v1-[0-9a-f]{8,}/gi,
  /nvapi-[A-Za-z0-9_-]{8,}/gi,
  /sk-ant-[A-Za-z0-9_-]{8,}/gi,
  /gh[opsu]_[A-Za-z0-9]{8,}/g,
  /github_pat_[A-Za-z0-9_]{8,}/g,
  /(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
];

// One field of one line. Line breaks are what would split an entry in two and
// make a partial line look like a whole one, so they go first.
export function field(value: string): string {
  let text = value.replace(/[\r\n\t]+/g, ' ').trim();
  for (const shape of CREDENTIAL_SHAPES) text = text.replace(shape, '[redacted]');
  return text.replace(FIELD_SEPARATOR.trim(), '-').slice(0, 300) || '-';
}

// Where the work is happening, never as an absolute path. The main checkout says
// so; a worktree says which one it is. Anywhere else says nothing but that it is
// elsewhere, rather than printing a path nobody asked for.
export function whereFrom(deps: LogDeps): string {
  const project = path.resolve(deps.projectDir);
  const here = path.resolve(deps.cwd);
  if (here === project) return 'main';
  const inside = path.relative(project, here);
  if (inside && !inside.startsWith('..') && !path.isAbsolute(inside)) {
    return inside.split(/[\\/]/).join('/');
  }
  return 'elsewhere';
}

// The branch, read from the git files rather than by starting git, because a
// guard runs before every tool call and must not cost a process each time. In a
// worktree, .git is a file naming the real gitdir.
export function branchFrom(cwd: string): string {
  try {
    const dotGit = path.join(cwd, '.git');
    if (!existsSync(dotGit)) return 'none';
    let gitDir = dotGit;
    if (statSync(dotGit).isFile()) {
      const pointer = readFileSync(dotGit, 'utf8').trim();
      const named = /^gitdir:\s*(.+)$/.exec(pointer)?.[1];
      if (!named) return 'none';
      gitDir = path.isAbsolute(named) ? named : path.resolve(cwd, named);
    }
    const head = readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head)?.[1];
    return ref ?? 'detached';
  } catch {
    return 'none';
  }
}

// A byte-order mark, built from its code and never written as an escape. Writing
// the escape through a tool call is how the character itself lands in a file,
// which CLAUDE.md warns about and which happened once while this file was being
// written. ESLint's irregular-whitespace error is what caught it.
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

function stripByteOrderMark(text: string): string {
  return text.startsWith(BYTE_ORDER_MARK) ? text.slice(BYTE_ORDER_MARK.length) : text;
}

// The session's binding, which says what it is authorised to do. Missing,
// unreadable or malformed all mean the same thing to a guard — no ticket — so
// they all come back undefined rather than throwing into a hook that must not
// crash. protect-paths.ts reads this too, which is why it lives here.
export function readBinding(sessionId: string | undefined, deps: LogDeps): Binding | undefined {
  if (!sessionId || !/^[A-Za-z0-9_-]+$/.test(sessionId)) return undefined;
  try {
    const file = path.join(spindleHome(deps.env), 'sessions', `${sessionId}.json`);
    if (!existsSync(file)) return undefined;
    const parsed: unknown = JSON.parse(stripByteOrderMark(readFileSync(file, 'utf8')));
    if (!parsed || typeof parsed !== 'object') return undefined;
    return parsed as Binding;
  } catch {
    return undefined;
  }
}

// What to call this session in the log. The binding's role if it has one; else
// the stream name, which is the only thing a stream session has; else nothing.
export function roleLabel(binding: Binding | undefined, branch: string): string {
  if (binding?.role) return binding.role;
  const stream = /^worktree-(.+)$/.exec(branch)?.[1];
  if (stream) return `stream ${stream}`;
  return 'none';
}

export function formatLine(entry: Entry, deps: LogDeps): string {
  const branch = branchFrom(deps.cwd);
  const binding = readBinding(entry.sessionId, deps);
  return [
    new Date(deps.now).toISOString(),
    entry.hook,
    entry.tool,
    entry.decision,
    entry.reason,
    entry.sessionId ?? 'none',
    whereFrom(deps),
    branch,
    roleLabel(binding, branch),
  ]
    .map(field)
    .join(FIELD_SEPARATOR);
}

// Writing the log is never allowed to stop a tool call. A guard that cannot say
// why it refused still refuses; a guard that cannot say why it allowed still
// allows. The return value says whether the line landed, so a test can tell.
export function record(entry: Entry, deps: LogDeps): boolean {
  try {
    const directory = path.join(deps.projectDir, LOG_DIR);
    mkdirSync(directory, { recursive: true });
    appendFileSync(path.join(directory, LOG_FILE), `${formatLine(entry, deps)}\n`);
    return true;
  } catch {
    return false;
  }
}
