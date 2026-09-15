import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Opens and closes every Spindle session in the desktop app, which takes no
// launch options. .claude/settings.json calls this file with the parts to run:
//
//   token  SessionStart, every source: hands the Spindle-only GitHub token to
//          the session's later Bash commands through CLAUDE_ENV_FILE
//   model  SessionStart and PostModelSwitch: warns when the model is not the
//          pin in config/claude.json
//   note   SessionStart, startup only: binds a session note saved just before
//          the session opened, then deletes the note
//   end    SessionEnd: removes this session's binding and any expired ones
//
// Runs that scripts/lib/run.ts starts carry SPINDLE_HEADLESS, and the token and
// note parts stand aside for them. Every part prints one line, never prints the
// token, and never stops a session from starting.

export const HEADLESS_MARKER = 'SPINDLE_HEADLESS';
export const NOTE_WINDOW_MS = 10 * 60 * 1000;
export const BINDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type HookInput = {
  session_id?: string;
  transcript_path?: string;
  hook_event_name?: string;
  source?: string;
  model?: unknown;
  to_model?: string;
};

export type Deps = {
  env: NodeJS.ProcessEnv;
  now: number;
  projectDir: string;
};

export type PartResult = { line: string; title?: string };

export function spindleHome(env: NodeJS.ProcessEnv): string {
  return env.SPINDLE_HOME ?? path.join(os.homedir(), '.spindle');
}

function sessionFile(env: NodeJS.ProcessEnv, sessionId: string): string {
  return path.join(spindleHome(env), 'sessions', `${sessionId}.json`);
}

function safeSessionId(input: HookInput): string | undefined {
  const id = input.session_id;
  return id && /^[A-Za-z0-9_-]+$/.test(id) ? id : undefined;
}

export function tokenPart(_input: HookInput, deps: Deps): PartResult {
  if (deps.env[HEADLESS_MARKER]) return { line: 'GitHub token: left out of this headless run.' };
  const envFile = deps.env.CLAUDE_ENV_FILE;
  if (!envFile)
    return { line: 'GitHub token: not loaded, because this session gave no CLAUDE_ENV_FILE.' };
  const tokenFile = path.join(spindleHome(deps.env), 'gh-token.txt');
  if (!existsSync(tokenFile))
    return { line: 'GitHub features are off: the Spindle token file is missing.' };
  const token = readFileSync(tokenFile, 'utf8')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!/^[A-Za-z0-9_]+$/.test(token)) {
    return { line: 'GitHub features are off: the Spindle token file does not hold one token.' };
  }
  appendFileSync(envFile, `export GH_TOKEN='${token}'\n`);
  return { line: 'GitHub token: loaded for this session.' };
}

function modelOf(input: HookInput): string | undefined {
  if (typeof input.to_model === 'string') return input.to_model;
  if (typeof input.model === 'string') return input.model;
  if (input.model && typeof input.model === 'object' && 'id' in input.model) {
    const id = (input.model as { id: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return undefined;
}

export function modelPart(input: HookInput, deps: Deps): PartResult {
  const pinFile = path.join(deps.projectDir, 'config', 'claude.json');
  if (!existsSync(pinFile))
    return { line: 'Model: config/claude.json is missing, so nothing was compared.' };
  const pin = (JSON.parse(readFileSync(pinFile, 'utf8')) as { model: string }).model;
  const model = modelOf(input);
  if (!model)
    return { line: `Model: the session did not say which model it runs; the pin is ${pin}.` };
  const bare = model.replace(/\[.*\]$/, '');
  if (bare === pin) return { line: `Model: ${model}, the pinned model.` };
  return { line: `Model warning: this session runs ${model}, but config/claude.json pins ${pin}.` };
}

type Note = { ticket?: string; release?: string; role?: string };

export function parseNote(text: string, roleNames: string[]): Note | string {
  const note: Note = {};
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = /^(ticket|release|role):\s*(.+)$/i.exec(line);
    if (!match) return 'it holds a line that is not ticket, release or role';
    const key = match[1]!.toLowerCase() as keyof Note;
    const value = match[2]!.trim();
    if (note[key] !== undefined) return `it holds more than one ${key} line`;
    note[key] = value;
  }
  if ((note.ticket === undefined) === (note.release === undefined)) {
    return 'it needs exactly one ticket or release line';
  }
  if (note.release !== undefined && !/^REL-[0-9A-Za-z.-]+ [0-9a-f]{7,40}$/.test(note.release)) {
    return 'its release line is not "REL-<version> <commit>"';
  }
  if (
    note.role !== undefined &&
    !roleNames.some((name) => name.toLowerCase() === note.role!.toLowerCase())
  ) {
    return 'its role is not one config/roles.json names';
  }
  return note;
}

function roleNames(projectDir: string): string[] {
  const file = path.join(projectDir, 'config', 'roles.json');
  if (!existsSync(file)) return [];
  const roles = JSON.parse(readFileSync(file, 'utf8')) as { roles: { id: string; name: string }[] };
  return roles.roles.flatMap((role) => [role.id, role.name]);
}

export function notePart(input: HookInput, deps: Deps): PartResult {
  if (deps.env[HEADLESS_MARKER]) return { line: 'Session note: left alone in this headless run.' };
  const noteFile = path.join(spindleHome(deps.env), 'session.txt');
  if (!existsSync(noteFile))
    return { line: 'Session note: none saved, so this session holds no ticket or release.' };
  const sessionId = safeSessionId(input);
  if (!sessionId) return { line: 'Session note: not bound, because the session id is missing.' };

  const age = deps.now - statSync(noteFile).mtimeMs;
  if (age < 0)
    return { line: 'Session note: not bound, because it was saved after this session started.' };
  if (age > NOTE_WINDOW_MS) {
    return {
      line: 'Session note: not bound, because it was saved more than 10 minutes before this session started.',
    };
  }
  const note = parseNote(readFileSync(noteFile, 'utf8'), roleNames(deps.projectDir));
  if (typeof note === 'string') return { line: `Session note: not bound, because ${note}.` };

  const binding = {
    sessionId,
    ...note,
    startedAt: new Date(deps.now).toISOString(),
    transcriptPath: input.transcript_path ?? null,
  };
  const target = sessionFile(deps.env, sessionId);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(binding, null, 2)}\n`);
  rmSync(noteFile);

  const what = note.ticket !== undefined ? `ticket ${note.ticket}` : `release ${note.release}`;
  const who = note.role ? `, role ${note.role}` : '';
  return {
    line: `Session note: bound to this session (${what}${who}).`,
    title: `Spindle · ${what}`,
  };
}

export function endPart(input: HookInput, deps: Deps): PartResult {
  const dir = path.join(spindleHome(deps.env), 'sessions');
  let removed = false;
  const sessionId = safeSessionId(input);
  if (sessionId && existsSync(sessionFile(deps.env, sessionId))) {
    rmSync(sessionFile(deps.env, sessionId));
    removed = true;
  }
  let swept = 0;
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (name.endsWith('.json') && deps.now - statSync(file).mtimeMs > BINDING_MAX_AGE_MS) {
        rmSync(file);
        swept += 1;
      }
    }
  }
  return {
    line: `Session binding: ${removed ? 'removed' : 'none held'}; ${swept} expired binding(s) swept.`,
  };
}

const PARTS: Record<string, (input: HookInput, deps: Deps) => PartResult> = {
  token: tokenPart,
  model: modelPart,
  note: notePart,
  end: endPart,
};

export function runParts(names: string[], input: HookInput, deps: Deps): PartResult[] {
  return names.map((name) => {
    const part = PARTS[name];
    if (!part) return { line: `Session hook: there is no part called "${name}".` };
    try {
      return part(input, deps);
    } catch (error) {
      return {
        line: `Session hook: the ${name} part stood aside after an error (${(error as Error).name}).`,
      };
    }
  });
}

async function readInput(): Promise<HookInput> {
  let text = '';
  for await (const chunk of process.stdin) text += String(chunk);
  try {
    return JSON.parse(text) as HookInput;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const input = await readInput();
  const deps: Deps = {
    env: process.env,
    now: Date.now(),
    projectDir: process.env.CLAUDE_PROJECT_DIR ?? path.join(import.meta.dirname, '..', '..'),
  };
  const results = runParts(process.argv.slice(2), input, deps);
  const message = results.map((result) => result.line).join('\n');
  const title = results.find((result) => result.title)?.title;
  const event = input.hook_event_name ?? 'SessionStart';

  if (event === 'SessionStart') {
    const hookSpecificOutput: Record<string, string> = {
      hookEventName: 'SessionStart',
      additionalContext: message,
    };
    if (title) hookSpecificOutput.sessionTitle = title;
    console.log(JSON.stringify({ systemMessage: message, hookSpecificOutput }));
  } else {
    console.log(JSON.stringify({ systemMessage: message }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(() => undefined);
  process.exitCode = 0;
}
