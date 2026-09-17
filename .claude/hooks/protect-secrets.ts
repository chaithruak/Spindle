import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ACCESS_LINK_RULE, CREDENTIAL_RULES } from '../../scripts/key-scan.ts';
import { record, type LogDeps } from './lib/decision-log.ts';
import { spindleHome } from './session-start.ts';

// Ahead of any edit or shell command, this stops the key files and anything
// key-shaped from being read or written, and its message names the proper route
// instead. It fails closed: anything it cannot work out is refused.
//
// It matches globs against whole path segments, never substrings against a
// command. The difference is not pedantry. `cat keys.env.example` contains the
// text `keys.env`, and a substring test would shut out the one file the spec
// points every newcomer at; `apps/api/src/environment.ts` contains `env`, and a
// looser rule would stop the server stream editing its own file. Both are pinned
// in the tests.
//
// What it guards against is a mistake, not somebody setting out to get past it.
// A path assembled from pieces at run time is not something a hook that reads one
// command can see, and saying so plainly is more useful than implying otherwise.
// The rules that close that route are the deny list and the fact that no session
// is given outbound reach.

export const SHUT_GLOBS = ['**/.env*', '**/*.env', '**/keys.env'];

// The one file that is never blocked: it holds no key, and the spec points
// everyone at it to learn the shape of the file that does.
export const NEVER_BLOCKED = ['keys.env.example'];

const PATH_FIELDS = ['file_path', 'notebook_path', 'path'];
const COMMAND_FIELDS = ['command'];
const CONTENT_FIELDS = ['content', 'new_string', 'old_string', 'prompt'];

export type ToolInput = Record<string, unknown>;

export type HookInput = {
  session_id?: string;
  cwd?: string;
  hook_event_name?: string;
  tool_name?: string;
  tool_input?: ToolInput;
};

export type Verdict = { decision: 'allow' | 'deny'; reason: string };

const ROUTE =
  'Provider keys live in one file outside the project, and only the API process reads it. ' +
  'keys.env.example shows its shape. Nothing in the repository, a test, a fixture, a ' +
  'recording or a screenshot ever holds one.';

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A small glob, covering the three shapes this guard uses: ** across segments,
// * and ? inside one.
export function globToRegExp(glob: string): RegExp {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    const character = glob[index] ?? '';
    if (character === '*') {
      if (glob[index + 1] === '*') {
        source += glob[index + 2] === '/' ? '(?:.*/)?' : '.*';
        index += glob[index + 2] === '/' ? 2 : 1;
      } else {
        source += '[^/]*';
      }
      continue;
    }
    source += character === '?' ? '[^/]' : escapeForRegExp(character);
  }
  return new RegExp(`^${source}$`);
}

const SHUT = SHUT_GLOBS.map(globToRegExp);

// One spelling for a path, so that a home folder written four different ways is
// still the same folder. Nothing here is asked to resolve a path that does not
// exist; this is about spelling, not about the filesystem.
export function normalise(value: string, env: NodeJS.ProcessEnv): string {
  const home = (env.USERPROFILE ?? env.HOME ?? '').replace(/\\/g, '/').replace(/\/+$/, '');
  let text = value
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/');
  if (home) {
    text = text
      .replace(/^~(?=\/|$)/, home)
      .replace(/\$\{?HOME\}?/g, home)
      .replace(/%USERPROFILE%/gi, home)
      .replace(/\$\{?USERPROFILE\}?/g, home);
  }
  return text.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
}

// A command split into the things that could be a path. Shell punctuation is a
// separator, and so is the `=` of an assignment, because SPINDLE_KEYS_FILE=<path>
// is how somebody would point at one without ever naming it as an argument.
export function commandTokens(command: string): string[] {
  return command
    .split(/[\s;|&()<>"'`]+/)
    .flatMap((piece) => piece.split('='))
    .map((piece) => piece.trim())
    .filter(Boolean);
}

export function isNeverBlocked(candidate: string): boolean {
  return NEVER_BLOCKED.includes(path.posix.basename(candidate));
}

export function shutsOut(candidate: string, env: NodeJS.ProcessEnv): string | undefined {
  const text = normalise(candidate, env);
  if (!text) return undefined;
  if (isNeverBlocked(text)) return undefined;

  const home = normalise(spindleHome(env), env);
  if (home && (text === home || text.startsWith(`${home}/`))) {
    return 'it is inside the Spindle home folder, which no session may read or write';
  }

  const relative = text.replace(/^[A-Za-z]:/, '').replace(/^\/+/, '');
  for (let index = 0; index < SHUT.length; index += 1) {
    const pattern = SHUT[index];
    if (pattern && pattern.test(relative)) {
      return `it matches ${SHUT_GLOBS[index]}, which holds keys`;
    }
  }
  return undefined;
}

export function keyShaped(text: string): string | undefined {
  for (const rule of CREDENTIAL_RULES) if (rule.test(text)) return rule.name;
  if (ACCESS_LINK_RULE.test(text)) return ACCESS_LINK_RULE.name;
  return undefined;
}

function stringsAt(toolInput: ToolInput, fields: string[]): string[] {
  return fields
    .map((field) => toolInput[field])
    .filter((value): value is string => typeof value === 'string');
}

export function decide(input: HookInput, env: NodeJS.ProcessEnv): Verdict {
  const toolInput = input.tool_input ?? {};

  for (const candidate of stringsAt(toolInput, PATH_FIELDS)) {
    const why = shutsOut(candidate, env);
    if (why) return { decision: 'deny', reason: `That path is shut because ${why}. ${ROUTE}` };
  }

  for (const command of stringsAt(toolInput, COMMAND_FIELDS)) {
    for (const token of commandTokens(command)) {
      const why = shutsOut(token, env);
      if (why) {
        return {
          decision: 'deny',
          reason: `That command names a path shut because ${why}. ${ROUTE}`,
        };
      }
    }
  }

  for (const text of stringsAt(toolInput, [...COMMAND_FIELDS, ...CONTENT_FIELDS])) {
    const shape = keyShaped(text);
    if (shape) {
      return { decision: 'deny', reason: `That holds something shaped like a ${shape}. ${ROUTE}` };
    }
  }

  return { decision: 'allow', reason: 'nothing key-shaped, and no shut path named' };
}

export function deps(input: HookInput): LogDeps {
  return {
    env: process.env,
    now: Date.now(),
    projectDir: process.env.CLAUDE_PROJECT_DIR ?? path.join(import.meta.dirname, '..', '..'),
    cwd: input.cwd ?? process.cwd(),
  };
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
  const verdict = decide(input, process.env);

  record(
    {
      hook: 'protect-secrets',
      tool: input.tool_name ?? 'none',
      decision: verdict.decision,
      reason: verdict.reason,
      sessionId: input.session_id,
    },
    deps(input),
  );

  if (verdict.decision === 'deny') {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: verdict.reason,
        },
      }),
    );
  }
}

// A policy refusal prints its reason and exits 0, so the session is told why. A
// guard that could not run at all exits 2, which is what makes it fail closed;
// the wrapper in .claude/settings.json turns any other non-zero into the same.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch {
    console.error('protect-secrets could not run, so the call is refused.');
    process.exit(2);
  }
}
