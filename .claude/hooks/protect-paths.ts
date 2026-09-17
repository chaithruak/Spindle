import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { readBinding, record, type LogDeps } from './lib/decision-log.ts';
import { globToRegExp, normalise } from './protect-secrets.ts';

// Two jobs, in one file because they answer the same question: may this session
// do this at all?
//
// First, the paths that need a change ticket. A session holds one when the
// session-start hook bound a note into the owner's bindings folder for this
// session id. No stream session holds a ticket and none is given one, so no
// stream edits infrastructure, and a stream that finds it needs one of these
// paths stops and says so rather than asking for a ticket.
//
// Second, this is the single place the deny list exists in shell form. A deny
// rule in settings matches the command it is given; it never sees what has been
// wrapped inside `sh -c`, so the same list has to be read out of the command
// text too. DENY_RULES carries, beside each rule, the exact settings entries
// that mirror it, and a rule in scripts/checks.ts holds the two equal. That is
// what stops the two copies drifting apart, which is the failure this design
// would otherwise invite.
//
// It fails closed. A binding that is missing, unreadable or malformed all mean
// the same thing — no ticket — and cost the session the protected paths and
// nothing else. A guard that cannot run at all costs it everything, which is the
// wrapper's `|| exit 2` doing its job.

export const TICKET_PATHS = [
  '.github/workflows/**',
  '.github/actions/**',
  '.github/ci/**',
  'scripts/deploy*.ts',
  '.worktreeinclude',
  '.mcp.json',
  '.claude/settings*.json',
  '.claude/hooks/**',
  '**/recordings/**',
];

export type Verdict = { decision: 'allow' | 'deny'; reason: string };

export type DenyRule = {
  name: string;
  reason: string;
  // A rule matches either anywhere in the command, or only where a program is
  // being started. `env` and `curl` are the second kind: they are ordinary words
  // that mean something only in command position.
  matches?: RegExp;
  heads?: string[];
  // The exact .claude/settings.json permissions.deny entries that mirror this
  // rule. scripts/checks.ts holds these equal to what the settings file carries.
  settings: string[];
};

const both = (rule: string): string[] => [`Bash(${rule})`, `PowerShell(${rule})`];

// The wrappers that start a fresh command inside an existing one. This is the
// whole reason the deny list is read here as well as declared in settings: a
// deny rule is shown `sh -c "curl ..."` and sees a call to `sh`.
const WRAPPERS = /\b(?:sh|bash|zsh|pwsh|powershell|cmd)\s+(?:-l?c|-Command|\/c)\b/gi;

// Every word in this command that is a program being started, including the ones
// inside a wrapper or behind a quote.
export function commandHeads(command: string): string[] {
  return command
    .replace(/["'`]/g, ' ')
    .replace(WRAPPERS, ' ; ')
    .split(/[;&|()\n]+/)
    .map((segment) => segment.trim().split(/\s+/)[0] ?? '')
    .filter(Boolean)
    .map((head) => head.replace(/^.*[\\/]/, '').toLowerCase());
}

export const DENY_RULES: DenyRule[] = [
  {
    name: 'environment dump',
    reason: 'it would print the whole environment, and the GitHub token is in it',
    heads: ['printenv', 'env', 'set'],
    matches: /Get-ChildItem\s+Env:|\bnode\s+-e\b/i,
    settings: [
      ...both('printenv*'),
      ...both('env'),
      ...both('set'),
      ...both('Get-ChildItem Env:*'),
      ...both('node -e *'),
    ],
  },
  {
    name: 'token variable',
    reason: 'it names the variable the GitHub token travels in, or the file holding a copy',
    matches: /\bGH_TOKEN\b|\bGITHUB_TOKEN\b|\bCLAUDE_ENV_FILE\b|session-env/i,
    settings: [
      ...both('*GH_TOKEN*'),
      ...both('*GITHUB_TOKEN*'),
      ...both('*CLAUDE_ENV_FILE*'),
      ...both('*session-env*'),
      'Read(~/.claude/session-env/**)',
    ],
  },
  {
    name: 'the ticket mechanism',
    reason: 'it names the session note, the bindings folder, or a variable that could move either',
    matches: /session\.txt|\bSPINDLE_HOME\b|\bSPINDLE_KEYS_FILE\b/i,
    settings: [...both('*session.txt*'), ...both('*SPINDLE_HOME*'), ...both('*SPINDLE_KEYS_FILE*')],
  },
  {
    name: 'a GitHub command that changes the repository',
    reason:
      'merging, rulesets, repository settings, sign-in and secrets are the owner it, not this',
    matches: /\bgh\s+(?:pr\s+merge|ruleset|repo\s+edit|repo\s+delete|auth|secret)\b/i,
    settings: [
      ...both('gh pr merge*'),
      ...both('gh ruleset*'),
      ...both('gh repo edit*'),
      ...both('gh repo delete*'),
      ...both('gh auth*'),
      ...both('gh secret*'),
    ],
  },
  {
    name: 'a writing gh api call',
    reason: 'gh api is allowed to read and never to write',
    matches: /\bgh\s+api\b[^\n]*(?:\s-X\b|--method\b|\s-f\b|\s-F\b|--field\b|--input\b)/i,
    settings: [
      ...both('gh api * -X *'),
      ...both('gh api * --method *'),
      ...both('gh api * -f *'),
      ...both('gh api * -F *'),
      ...both('gh api * --field *'),
      ...both('gh api * --input *'),
    ],
  },
  {
    name: 'a push that rewrites or aims at main',
    reason: 'main is protected, and a force push loses what somebody else pushed',
    matches:
      /\bgit\s+push\b[^\n]*(?:--force|--force-with-lease|\s-f\b)|\bgit\s+push\b[^\n]*\bmain\b/i,
    settings: [
      ...both('git push --force*'),
      ...both('git push * --force*'),
      ...both('git push * main*'),
      ...both('git push origin main*'),
    ],
  },
  {
    name: 'running the deploy script directly',
    reason: 'deploying goes through its own gate, never through a shell',
    matches: /scripts[\\/]deploy/i,
    settings: [...both('*scripts/deploy*'), ...both('npm run deploy*')],
  },
  {
    name: 'reaching the network',
    reason: 'no build session is given outbound reach; the owner pastes what is needed',
    heads: ['curl', 'curl.exe', 'wget', 'invoke-webrequest', 'invoke-restmethod', 'iwr', 'irm'],
    matches: /Invoke-WebRequest|Invoke-RestMethod/i,
    settings: [
      ...both('curl*'),
      ...both('wget*'),
      ...both('Invoke-WebRequest*'),
      ...both('Invoke-RestMethod*'),
    ],
  },
];

// Every settings entry the guard expects to find, which is what scripts/checks.ts
// compares against the file. Sorted, so two lists can be held equal by value.
export function expectedSettingsDeny(): string[] {
  return [...new Set(DENY_RULES.flatMap((rule) => rule.settings))].sort();
}

const TICKET = TICKET_PATHS.map(globToRegExp);

const PATH_FIELDS = ['file_path', 'notebook_path', 'path'];
const WRITING_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'];

export function needsTicket(candidate: string, projectDir: string): string | undefined {
  const text = normalise(candidate, {});
  if (!text) return undefined;
  const project = normalise(projectDir, {});
  const relative = (
    project && text.startsWith(`${project}/`) ? text.slice(project.length + 1) : text
  ).replace(/^\.\//, '');

  for (let index = 0; index < TICKET.length; index += 1) {
    const pattern = TICKET[index];
    if (pattern && pattern.test(relative)) return TICKET_PATHS[index];
  }
  return undefined;
}

export function deniedShell(command: string): DenyRule | undefined {
  const heads = commandHeads(command);
  return DENY_RULES.find(
    (rule) =>
      (rule.matches?.test(command) ?? false) ||
      (rule.heads?.some((head) => heads.includes(head)) ?? false),
  );
}

export type PathsInput = {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

export function decide(input: PathsInput, deps: LogDeps): Verdict {
  const toolInput = input.tool_input ?? {};
  const tool = input.tool_name ?? '';

  const command = toolInput.command;
  if (typeof command === 'string') {
    const rule = deniedShell(command);
    if (rule) {
      return {
        decision: 'deny',
        reason: `That is ${rule.name}: ${rule.reason}. The deny list covers it in either shell, and this guard covers it again because a deny rule never sees inside sh -c.`,
      };
    }
  }

  if (!WRITING_TOOLS.includes(tool)) {
    return { decision: 'allow', reason: 'nothing denied, and this tool writes nothing' };
  }

  for (const field of PATH_FIELDS) {
    const candidate = toolInput[field];
    if (typeof candidate !== 'string') continue;
    const glob = needsTicket(candidate, deps.projectDir);
    if (!glob) continue;

    const binding = readBinding(input.session_id, deps);
    if (binding?.ticket) {
      return { decision: 'allow', reason: `${glob} opened under ticket ${binding.ticket}` };
    }
    return {
      decision: 'deny',
      reason:
        `${glob} needs a change ticket and this session holds none. Save one line to the session ` +
        `note in the Spindle home folder and open a new session within ten minutes. If a guard has ` +
        `broken and nothing can be edited, run this from a shell outside the app: ` +
        `git -C "${deps.projectDir}" checkout -- .claude/hooks/`,
    };
  }

  return { decision: 'allow', reason: 'no path here needs a ticket' };
}

export function depsFrom(input: PathsInput): LogDeps {
  return {
    env: process.env,
    now: Date.now(),
    projectDir: process.env.CLAUDE_PROJECT_DIR ?? path.join(import.meta.dirname, '..', '..'),
    cwd: input.cwd ?? process.cwd(),
  };
}

async function readInput(): Promise<PathsInput> {
  let text = '';
  for await (const chunk of process.stdin) text += String(chunk);
  try {
    return JSON.parse(text) as PathsInput;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const input = await readInput();
  const deps = depsFrom(input);
  const verdict = decide(input, deps);

  record(
    {
      hook: 'protect-paths',
      tool: input.tool_name ?? 'none',
      decision: verdict.decision,
      reason: verdict.reason,
      sessionId: input.session_id,
    },
    deps,
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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch {
    console.error('protect-paths could not run, so the call is refused.');
    process.exit(2);
  }
}
