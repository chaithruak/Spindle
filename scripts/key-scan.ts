import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { git, listFiles, looksBinary, readText, ROOT } from './lib/repo.ts';

// Refuses credentials, claude.ai access links and personal patterns.
//
//   node scripts/key-scan.ts --staged   what is about to be committed (pre-commit)
//   node scripts/key-scan.ts --push     the commits about to be pushed (pre-push)
//   node scripts/key-scan.ts --all      every file, with the pipeline's generic rules
//
// Each rule matches a value, never the word in front of one, so "Bearer" or
// "GH_TOKEN" written in prose gets through. Findings name the file, the line and
// the rule; the matching text itself is never printed.

export type Rule = { name: string; test: (line: string) => boolean };
export type Finding = { where: string; line: number; rule: string };

function regexRule(name: string, pattern: RegExp): Rule {
  return { name, test: (line) => pattern.test(line) };
}

export const CREDENTIAL_RULES: Rule[] = [
  regexRule('OpenRouter key', /sk-or-v1-[0-9a-f]{64}/),
  regexRule('NVIDIA key', /nvapi-[A-Za-z0-9_-]{30,}/),
  regexRule('Anthropic key or token', /sk-ant-(api|oat)[0-9]{2}-[A-Za-z0-9_-]{20,}/),
  regexRule('GitHub token', /gh[opsu]_[A-Za-z0-9]{36}/),
  regexRule('GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{50,}/),
  regexRule(
    'Authorization header value',
    /Authorization:\s*(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{20,}/,
  ),
  regexRule('Bearer value', /Bearer\s+[A-Za-z0-9._~+/=-]{20,}/),
];

// A claude.ai address whose path holds a share or bundle segment.
export const ACCESS_LINK_RULE = regexRule(
  'claude.ai share or bundle link',
  /claude\.ai\/(?:[^\s"'<>()[\]]*\/)?(?:share|bundle)s?(?:[/?#]|$|[\s"'<>()[\]])/i,
);

// The pipeline's three generic rules.
const SEPARATOR = String.raw`(?:\\+|/)`;
export const HOME_PATH_RULE = regexRule(
  'absolute home path',
  new RegExp(
    String.raw`(?:\b[A-Za-z]:${SEPARATOR}Users${SEPARATOR}|(?<![\w.-])/(?:[A-Za-z]/)?Users/|(?<![\w.-])/home/)[A-Za-z0-9._-]+`,
    'i',
  ),
);

// The co-author trailer's address, and GitHub's no-reply addresses, are the only ones allowed.
const ALLOWED_EMAIL = 'noreply@anthropic.com';
const NOREPLY_SUFFIX = '@users.noreply.github.com';
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
export const EMAIL_RULE: Rule = {
  name: 'email address',
  test: (line) =>
    [...line.matchAll(EMAIL)].some(([address]) => {
      const lower = address.toLowerCase();
      return lower !== ALLOWED_EMAIL && !lower.endsWith(NOREPLY_SUFFIX);
    }),
};

export const TELEMETRY_IDENTITY_RULE = regexRule(
  'telemetry identity attribute',
  /\b(?:user\.id|user\.email|user\.account_uuid|organization\.id)\b/,
);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The personal pattern file: its first line holds a bare name, optionally after
// a label such as "user:", that only builds home-path shapes (never matched
// alone, since it may open the account name that CODEOWNERS, the licence and
// the README carry). Every later line that is not blank or a # comment is
// matched literally, ignoring case.
export function privateRules(fileText: string): Rule[] {
  const [first = '', ...rest] = fileText.replace(/^\uFEFF/, '').split(/\r?\n/);
  const rules: Rule[] = [];
  const name = first.trim().replace(/^[A-Za-z][A-Za-z ]*:(?![\\/])\s*/, '');
  if (name) {
    rules.push(
      regexRule(
        'personal home path',
        new RegExp(
          String.raw`(?:[A-Za-z]:${SEPARATOR}|/(?:[A-Za-z]/)?)(?:Users|home)${SEPARATOR}${escapeRegExp(name)}(?![A-Za-z0-9])`,
          'i',
        ),
      ),
    );
  }
  for (const line of rest) {
    const value = line.trim();
    if (!value || value.startsWith('#')) continue;
    rules.push(regexRule('personal pattern', new RegExp(escapeRegExp(value), 'i')));
  }
  return rules;
}

export function scanText(text: string, rules: Rule[], where: string, firstLine = 1): Finding[] {
  const findings: Finding[] = [];
  text.split('\n').forEach((line, index) => {
    for (const rule of rules) {
      if (rule.test(line)) findings.push({ where, line: firstLine + index, rule: rule.name });
    }
  });
  return findings;
}

export function scanFile(file: string, text: string, rules: Rule[], generic: boolean): Finding[] {
  const all = generic ? [...rules, HOME_PATH_RULE, EMAIL_RULE] : rules;
  const findings = scanText(text, all, file);
  if (generic && file.endsWith('.jsonl')) {
    findings.push(...scanText(text, [TELEMETRY_IDENTITY_RULE], file));
  }
  return findings;
}

// Added lines of a unified diff, with the file and line number each lands on.
export function addedLines(patch: string): { file: string; line: number; text: string }[] {
  const added: { file: string; line: number; text: string }[] = [];
  let file = '';
  let next = 0;
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.slice(4).replace(/^b\//, '');
    } else if (line.startsWith('@@')) {
      const match = /\+(\d+)/.exec(line);
      next = match ? Number(match[1]) : 0;
    } else if (line.startsWith('+')) {
      added.push({ file, line: next, text: line.slice(1) });
      next += 1;
    } else if (line.startsWith(' ')) {
      next += 1;
    }
  }
  return added;
}

export function spindleHome(env: NodeJS.ProcessEnv = process.env): string {
  return env.SPINDLE_HOME ?? path.join(os.homedir(), '.spindle');
}

// A machine holds keys when the providers' keys file or the Spindle-only
// GitHub token file is present on it.
export function machineHoldsKeys(env: NodeJS.ProcessEnv = process.env): boolean {
  const keysFile = env.SPINDLE_KEYS_FILE ?? path.join(spindleHome(env), 'keys.env');
  return existsSync(keysFile) || existsSync(path.join(spindleHome(env), 'gh-token.txt'));
}

function privatePatternsPath(env: NodeJS.ProcessEnv): string {
  return env.SPINDLE_PRIVATE_PATTERNS ?? path.join(spindleHome(env), 'private-patterns.txt');
}

async function scanStaged(rules: Rule[]): Promise<{ findings: Finding[]; count: number }> {
  const names = (await git(['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])) ?? '';
  const findings: Finding[] = [];
  let count = 0;
  for (const file of names.split('\0').filter(Boolean)) {
    const text = await git(['show', `:${file}`]);
    if (text === undefined || looksBinary(text)) continue;
    count += 1;
    findings.push(...scanFile(file, text, rules, false));
  }
  return { findings, count };
}

async function scanPush(
  stdin: string,
  rules: Rule[],
): Promise<{ findings: Finding[]; count: number }> {
  const findings: Finding[] = [];
  let count = 0;
  for (const update of stdin.split('\n').filter((line) => line.trim())) {
    const [, localSha = '', , remoteSha = ''] = update.trim().split(/\s+/);
    if (/^0+$/.test(localSha)) continue;
    const range = /^0+$/.test(remoteSha)
      ? [localSha, '--not', '--remotes']
      : [`${remoteSha}..${localSha}`];
    const commits = ((await git(['rev-list', ...range])) ?? '').split('\n').filter(Boolean);
    for (const sha of commits) {
      count += 1;
      const short = sha.slice(0, 7);
      const message = (await git(['log', '-1', '--format=%B', sha])) ?? '';
      findings.push(...scanText(message, rules, `commit ${short} message`));
      const patch =
        (await git([
          'diff-tree',
          '-p',
          '-r',
          '--root',
          '--no-commit-id',
          '-U0',
          '--no-color',
          sha,
        ])) ?? '';
      for (const added of addedLines(patch)) {
        findings.push(...scanText(added.text, rules, `commit ${short} ${added.file}`, added.line));
      }
    }
  }
  return { findings, count };
}

async function scanAll(rules: Rule[]): Promise<{ findings: Finding[]; count: number }> {
  const { files } = await listFiles();
  const findings: Finding[] = [];
  let count = 0;
  for (const file of files) {
    const text = readText(file);
    if (text === undefined) continue;
    count += 1;
    findings.push(...scanFile(file, text, rules, true));
  }
  return { findings, count };
}

function report(findings: Finding[], count: number, what: string): number {
  if (findings.length === 0) {
    console.log(`key-scan: clean (${count} ${what} scanned)`);
    return 0;
  }
  console.log(
    `key-scan: refused. ${findings.length} finding(s); the matching text is not printed.`,
  );
  for (const finding of findings) {
    console.log(`  ${finding.where}:${finding.line}  ${finding.rule}`);
  }
  return 1;
}

async function readStdin(): Promise<string> {
  let text = '';
  for await (const chunk of process.stdin) text += String(chunk);
  return text;
}

async function main(argv: string[]): Promise<number> {
  const mode = argv.find((arg) => ['--staged', '--push', '--all'].includes(arg));
  const baseRules = [...CREDENTIAL_RULES, ACCESS_LINK_RULE];

  if (mode === '--all') {
    const { findings, count } = await scanAll(baseRules);
    return report(findings, count, 'files');
  }
  if (mode !== '--staged' && mode !== '--push') {
    console.log('usage: node scripts/key-scan.ts --staged | --push | --all');
    return 2;
  }

  const patternsFile = privatePatternsPath(process.env);
  let rules = baseRules;
  if (existsSync(patternsFile)) {
    rules = [...baseRules, ...privateRules(readFileSync(patternsFile, 'utf8'))];
  } else if (mode === '--push' && machineHoldsKeys()) {
    console.log(
      'key-scan: refused. This machine holds keys but the personal pattern file is missing, so nothing is pushed until it is back.',
    );
    return 1;
  } else {
    console.log('key-scan: no personal pattern file here, so only the shared rules ran.');
  }

  if (mode === '--staged') {
    const { findings, count } = await scanStaged(rules);
    return report(findings, count, 'staged files');
  }
  const { findings, count } = await scanPush(await readStdin(), rules);
  return report(findings, count, 'commits');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.chdir(ROOT);
  process.exitCode = await main(process.argv.slice(2));
}
