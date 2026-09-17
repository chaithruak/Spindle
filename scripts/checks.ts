import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { git, hasHistory, listFiles, readText, ROOT } from './lib/repo.ts';
import { isAvailable, run } from './lib/run.ts';

// The repository's own rules, run by `npm run checks` and by the pipeline.
// Each rule prints one line; any failure makes the whole run fail.

export const EXAMPLE_NOTE =
  "Example: replace this with your company's own. See docs/make-it-yours.md.";

// JSON has nowhere to put the note, so its example files are named here.
export const EXAMPLE_JSON = [
  '.claude-plugin/marketplace.json',
  'plugins/house-policies/.claude-plugin/plugin.json',
  'config/environments.json',
  'config/roles.json',
];

// Spindle's own files that a company would still edit.
export const ADAPT_FILES = [
  'README.md',
  'LICENSE',
  'NOTICE',
  'SECURITY.md',
  'CLAUDE.md',
  'keys.env.example',
  '.mcp.json',
  'config/claude.json',
  '.claude/settings.json',
  '.claude/hooks/session-start.ts',
  '.claude/hooks/protect-secrets.ts',
  '.claude/hooks/protect-paths.ts',
  '.claude/hooks/format-on-edit.ts',
  '.claude/hooks/lib/decision-log.ts',
  'docs/claude-mistakes.md',
  '.github/workflows/pipeline.yml',
  '.github/workflows/write-spec.yml',
  '.github/pull_request_template.md',
  'scripts/key-scan.ts',
  'docs/repository-settings.md',
];

// What each workflow may be triggered by and allowed to do. A trigger is
// matched whole, except that naming `inputs` matches the input names alone, so
// a policy does not have to repeat every description a dispatch input carries.
type WorkflowPolicy = {
  triggers: Record<string, { branches?: string[]; inputs?: string[] } | null>;
  permissions: Record<string, string>;
  jobs: Record<string, Record<string, string> | null>;
  callsClaude: boolean;
};

export const WORKFLOW_POLICY: Record<string, WorkflowPolicy> = {
  'pipeline.yml': {
    triggers: { pull_request: null, push: { branches: ['main'] } },
    permissions: { contents: 'read' },
    jobs: {
      pipeline: null,
      'no-keys-smoke': { contents: 'read', statuses: 'write' },
    },
    callsClaude: false,
  },
  'write-spec.yml': {
    triggers: { workflow_dispatch: { inputs: ['intent'] } },
    permissions: { contents: 'write' },
    jobs: { 'write-spec': null },
    callsClaude: true,
  },
};

type Outcome = { status: 'ok' | 'fail' | 'skip'; detail: string; problems?: string[] };
type Context = { files: string[]; fromGit: boolean; history: boolean };
type Rule = {
  name: string;
  needsGit?: boolean;
  run: (context: Context) => Promise<Outcome> | Outcome;
};

const ok = (detail = ''): Outcome => ({ status: 'ok', detail });
const fail = (detail: string, problems: string[] = []): Outcome => ({
  status: 'fail',
  detail,
  problems,
});
const skip = (detail: string): Outcome => ({ status: 'skip', detail });

function read(file: string): string | undefined {
  const full = path.join(ROOT, file);
  return existsSync(full) ? readFileSync(full, 'utf8') : undefined;
}

function readJson<T>(file: string): T {
  const text = read(file);
  if (text === undefined) throw new Error(`${file} is missing`);
  return JSON.parse(text) as T;
}

function sameSet(a: Iterable<string>, b: Iterable<string>): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${stableJson(inner)}`).join(',')}}`;
}

// The first meaningful line after any frontmatter or shebang, with comment marks taken off.
export function carriesExampleNote(text: string): boolean {
  let lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (end > 0) lines = lines.slice(end + 1);
  }
  if (lines[0]?.startsWith('#!')) lines = lines.slice(1);
  const first = lines.find((line) => line.trim() !== '');
  if (first === undefined) return false;
  const bare = first
    .trim()
    .replace(/^(?:#|\/\/|<!--|>)\s*/, '')
    .replace(/\s*-->$/, '');
  return bare === EXAMPLE_NOTE;
}

type GuideRow = { section: string; file: string };

// Every table row in the guide whose first cell is a path in backticks.
export function guideRows(guide: string): GuideRow[] {
  const rows: GuideRow[] = [];
  let section = '';
  for (const line of guide.split('\n')) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) section = heading[1]!.trim();
    const row = /^\|\s*`([^`]+)`\s*\|/.exec(line);
    if (row) rows.push({ section, file: row[1]!.trim() });
  }
  return rows;
}

type Roles = { roles: { id: string; name: string; owns: string[] }[] };

function normalisePath(file: string): string {
  return file.trim().replace(/^\//, '');
}

function ownershipFromRoles(roles: Roles): Map<string, Set<string>> {
  const owners = new Map<string, Set<string>>();
  for (const role of roles.roles) {
    for (const owned of role.owns) {
      const key = normalisePath(owned);
      owners.set(key, (owners.get(key) ?? new Set()).add(role.id));
    }
  }
  return owners;
}

// CODEOWNERS names one account on every line, so the role each path belongs
// to is written in a `# role:` comment above the lines it covers.
export function ownershipFromCodeowners(text: string): Map<string, Set<string>> {
  const owners = new Map<string, Set<string>>();
  let current: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const role = /^#\s*role:\s*(.+)$/.exec(line);
    if (role) {
      current = role[1]!
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (line === '') {
      current = [];
    } else if (!line.startsWith('#')) {
      const [pattern] = line.split(/\s+/);
      if (pattern) owners.set(normalisePath(pattern), new Set(current));
    }
  }
  return owners;
}

function describeOwnership(map: Map<string, Set<string>>, file: string): string {
  return [...(map.get(file) ?? [])].sort().join(', ') || 'nobody';
}

const rules: Rule[] = [
  {
    name: 'CLAUDE.md is 120 lines or shorter',
    run: () => {
      const text = read('CLAUDE.md');
      if (text === undefined) return fail('CLAUDE.md is missing');
      const count = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
      return count <= 120 ? ok(`${count} lines`) : fail(`${count} lines`);
    },
  },
  {
    name: 'No key file is tracked',
    needsGit: true,
    run: ({ files }) => {
      const keyFile = [
        /(^|\/)\.env($|\.)/,
        /\.env$/,
        /(^|\/)CLAUDE\.local\.md$/,
        /^\.claude\/settings\.local\.json$/,
        /(^|\/)gh-token\.txt$/,
        /(^|\/)private-patterns\.txt$/,
        /\.(pem|key|p12|pfx)$/,
        /(^|\/)id_(rsa|ecdsa|ed25519)(\.|$)/,
      ];
      const found = files.filter(
        (file) => file !== 'keys.env.example' && keyFile.some((pattern) => pattern.test(file)),
      );
      return found.length === 0 ? ok() : fail(`${found.length} key file(s)`, found);
    },
  },
  {
    name: 'No tracked file matches an ignore rule',
    needsGit: true,
    run: async () => {
      const listed =
        (await git(['ls-files', '-z', '--cached', '--ignored', '--exclude-standard'])) ?? '';
      const found = listed.split('\0').filter(Boolean);
      return found.length === 0 ? ok() : fail(`${found.length} file(s)`, found);
    },
  },
  {
    name: 'Programs start the way Windows needs',
    run: async () => {
      const tools = isAvailable('claude')
        ? (['node', 'npm', 'claude'] as const)
        : (['node', 'npm'] as const);
      const problems: string[] = [];
      for (const tool of tools) {
        try {
          const result = await run(tool, ['--version'], { cwd: ROOT });
          if (result.code !== 0) problems.push(`${tool} --version exited ${result.code}`);
        } catch (error) {
          problems.push(`${tool} could not be started: ${(error as Error).message}`);
        }
      }
      const note =
        tools.length === 2
          ? 'claude not found, so only node and npm were started'
          : 'node, npm and claude started';
      return problems.length === 0 ? ok(`${note} (${process.platform})`) : fail(note, problems);
    },
  },
  {
    name: 'Workflows match their policy',
    run: () => {
      const dir = path.join(ROOT, '.github', 'workflows');
      const present = existsSync(dir)
        ? readdirSync(dir).filter((file) => /\.ya?ml$/.test(file))
        : [];
      const problems: string[] = [];
      for (const file of present) {
        const policy = WORKFLOW_POLICY[file];
        if (!policy) {
          problems.push(`${file} has no policy in scripts/checks.ts`);
          continue;
        }
        const text = readFileSync(path.join(dir, file), 'utf8');
        const workflow = parseYaml(text) as {
          on?: Record<string, { branches?: string[] } | null>;
          permissions?: Record<string, string>;
          jobs?: Record<string, { permissions?: Record<string, string> }>;
        };
        const triggers = workflow.on ?? {};
        if (!sameSet(Object.keys(triggers), Object.keys(policy.triggers))) {
          problems.push(`${file} triggers on ${Object.keys(triggers).join(', ')}`);
        }
        for (const [event, expected] of Object.entries(policy.triggers)) {
          const actual = triggers[event] ?? null;
          if (expected?.inputs) {
            const named = Object.keys(
              (actual as { inputs?: Record<string, unknown> } | null)?.inputs ?? {},
            );
            if (!sameSet(named, expected.inputs)) {
              problems.push(
                `${file}: the ${event} trigger takes ${named.join(', ') || 'no inputs'}, not ${expected.inputs.join(', ')}`,
              );
            }
            continue;
          }
          if (stableJson(actual) !== stableJson(expected)) {
            problems.push(`${file}: the ${event} trigger is not ${stableJson(expected)}`);
          }
        }
        if (stableJson(workflow.permissions) !== stableJson(policy.permissions)) {
          problems.push(`${file}: workflow permissions are not ${stableJson(policy.permissions)}`);
        }
        const jobs = workflow.jobs ?? {};
        if (!sameSet(Object.keys(jobs), Object.keys(policy.jobs))) {
          problems.push(`${file} has jobs ${Object.keys(jobs).join(', ')}`);
        }
        for (const [job, expected] of Object.entries(policy.jobs)) {
          if (stableJson(jobs[job]?.permissions ?? null) !== stableJson(expected)) {
            problems.push(`${file}: job ${job} permissions are not ${stableJson(expected)}`);
          }
        }
        const callsClaude =
          /claude-code-action|@anthropic-ai\/claude-code/.test(text) ||
          /^\s*(?:-\s*)?run:.*(?:^|[\s;&|(])(?:npx\s+)?claude(?:\s|$)/m.test(text);
        if (callsClaude !== policy.callsClaude) {
          problems.push(
            `${file} ${callsClaude ? 'calls' : 'does not call'} Claude, against its policy`,
          );
        }
        if (callsClaude && !sameSet(Object.keys(triggers), ['workflow_dispatch'])) {
          problems.push(`${file} calls Claude but does not wait for the Run button`);
        }
      }
      for (const file of Object.keys(WORKFLOW_POLICY)) {
        if (!present.includes(file)) problems.push(`${file} has a policy but no file`);
      }
      return problems.length === 0
        ? ok(`${present.length} workflow(s)`)
        : fail('policy mismatch', problems);
    },
  },
  {
    name: 'Every example and adapt file is in the guide, and every file the guide lists exists',
    run: ({ files }) => {
      const guide = read('docs/make-it-yours.md');
      if (guide === undefined) return fail('docs/make-it-yours.md is missing');
      const listed = new Set(guideRows(guide).map((row) => row.file));
      const examples = files.filter((file) => {
        const text = readText(file);
        return text !== undefined && carriesExampleNote(text);
      });
      const problems: string[] = [];
      for (const file of [...new Set([...examples, ...EXAMPLE_JSON, ...ADAPT_FILES])]) {
        if (!existsSync(path.join(ROOT, file)))
          problems.push(`${file} is named in scripts/checks.ts but missing`);
        if (!listed.has(file)) problems.push(`${file} has no row in docs/make-it-yours.md`);
      }
      for (const file of listed) {
        if (!existsSync(path.join(ROOT, file)))
          problems.push(`${file} is listed in the guide but does not exist`);
      }
      return problems.length === 0
        ? ok(`${examples.length} marked, ${EXAMPLE_JSON.length} JSON, ${ADAPT_FILES.length} adapt`)
        : fail('guide out of step', problems);
    },
  },
  {
    name: 'The account name appears only in the files "Your account" names',
    run: async ({ files }) => {
      let account = process.env.GITHUB_REPOSITORY_OWNER;
      if (!account) {
        const remote = await git(['remote', 'get-url', 'origin']);
        account = remote ? /github\.com[:/]([^/]+)\//.exec(remote.trim())?.[1] : undefined;
      }
      if (!account)
        return skip('no git remote and no GITHUB_REPOSITORY_OWNER, so the account name is unknown');
      const guide = read('docs/make-it-yours.md') ?? '';
      const allowed = new Set(
        guideRows(guide)
          .filter((row) => /your account/i.test(row.section))
          .map((row) => row.file),
      );
      const needle = account.toLowerCase();
      const found = files.filter((file) => {
        if (allowed.has(file)) return false;
        return readText(file)?.toLowerCase().includes(needle) ?? false;
      });
      return found.length === 0
        ? ok(`${allowed.size} file(s) allowed`)
        : fail(`${found.length} other file(s) name the account`, found);
    },
  },
  {
    name: 'config/roles.json agrees with CODEOWNERS and the table of signers',
    run: () => {
      const roles = readJson<Roles>('config/roles.json');
      const fromRoles = ownershipFromRoles(roles);
      const problems: string[] = [];

      const codeowners = read('.github/CODEOWNERS');
      if (codeowners === undefined) return fail('.github/CODEOWNERS is missing');
      const fromCodeowners = ownershipFromCodeowners(codeowners);
      for (const file of new Set([...fromRoles.keys(), ...fromCodeowners.keys()])) {
        if (!sameSet(fromRoles.get(file) ?? [], fromCodeowners.get(file) ?? [])) {
          problems.push(
            `${file}: roles.json says ${describeOwnership(fromRoles, file)}, CODEOWNERS says ${describeOwnership(fromCodeowners, file)}`,
          );
        }
      }

      const howWeWork = read('docs/how-we-work.md');
      if (howWeWork === undefined) return fail('docs/how-we-work.md is missing');
      const idByName = new Map(roles.roles.map((role) => [role.name.toLowerCase(), role.id]));
      const signed = new Set<string>();
      let inTable = false;
      for (const line of howWeWork.split('\n')) {
        if (/^\|.*\bSigned by\b.*\|$/.test(line)) {
          inTable = true;
          continue;
        }
        if (!inTable) continue;
        if (!line.startsWith('|')) {
          inTable = false;
          continue;
        }
        const cells = line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());
        const file = /`([^`]+)`/.exec(cells[1] ?? '')?.[1];
        if (!file) continue;
        const signers = (cells[2] ?? '')
          .split(/\s+and\s+|,/)
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean)
          .map((name) => idByName.get(name) ?? `unknown signer "${name}"`);
        const key = normalisePath(file);
        signed.add(key);
        if (!sameSet(signers, fromRoles.get(key) ?? [])) {
          problems.push(
            `${key}: the table of signers says ${signers.sort().join(', ')}, roles.json says ${describeOwnership(fromRoles, key)}`,
          );
        }
      }
      if (signed.size === 0)
        problems.push('docs/how-we-work.md has no table with a "Signed by" column');
      for (const file of fromRoles.keys()) {
        if (file.includes('skills/') && !signed.has(file)) {
          problems.push(`${file} is owned in roles.json but missing from the table of signers`);
        }
      }
      return problems.length === 0
        ? ok(`${roles.roles.length} roles`)
        : fail('roster out of step', problems);
    },
  },
  {
    name: 'The compliance policy keeps data for the days config/environments.json sets',
    run: () => {
      const { retentionDays } = readJson<{ retentionDays: number }>('config/environments.json');
      const policy = read('plugins/house-policies/skills/compliance/SKILL.md');
      if (policy === undefined) return fail('the compliance policy is missing');
      const days = /\*\*Retention:\*\*\s*(\d+)\s+days/.exec(policy)?.[1];
      if (days === undefined)
        return fail('the compliance policy has no "**Retention:** N days" line');
      return Number(days) === retentionDays
        ? ok(`${retentionDays} days`)
        : fail(`the policy says ${days} days, config/environments.json says ${retentionDays}`);
    },
  },
  {
    name: 'The model in .claude/settings.json matches config/claude.json',
    run: () => {
      const { model } = readJson<{ model: string }>('config/claude.json');
      const settings = readJson<{ model?: string; availableModels?: string[] }>(
        '.claude/settings.json',
      );
      const problems: string[] = [];
      if (settings.model !== model) problems.push(`model is ${settings.model ?? 'unset'}`);
      if (stableJson(settings.availableModels) !== stableJson([model])) {
        problems.push(`availableModels is ${stableJson(settings.availableModels)}`);
      }
      return problems.length === 0 ? ok(model) : fail(`the pin is ${model}`, problems);
    },
  },
];

async function main(): Promise<number> {
  const history = await hasHistory();
  const { files, fromGit } = await listFiles();
  const context: Context = { files, fromGit, history };
  const counts = { ok: 0, fail: 0, skip: 0 };

  console.log('checks');
  for (const rule of rules) {
    let outcome: Outcome;
    if (rule.needsGit && !history) {
      outcome = skip('no git history here, so this rule was skipped');
    } else {
      try {
        outcome = await rule.run(context);
      } catch (error) {
        outcome = fail((error as Error).message);
      }
    }
    counts[outcome.status] += 1;
    const label = { ok: 'ok  ', fail: 'FAIL', skip: 'skip' }[outcome.status];
    console.log(`  ${label}  ${rule.name}${outcome.detail ? ` (${outcome.detail})` : ''}`);
    for (const problem of outcome.problems ?? []) console.log(`          - ${problem}`);
  }
  console.log(`checks: ${counts.ok} passed, ${counts.fail} failed, ${counts.skip} skipped`);
  return counts.fail === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
