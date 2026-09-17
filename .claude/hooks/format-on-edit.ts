import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { record, type LogDeps } from './lib/decision-log.ts';

// Once a file has been edited, this formats and lints that one file by calling
// the Prettier and ESLint libraries straight, rather than starting npm.
//
// It is the only hook allowed to fail open, and that is the point of it. A
// Prettier that has gone missing should stop formatting silently, not stop
// anyone editing. Every other guard here refuses what it cannot work out; this
// one shrugs. The backstop is `npm run lint`, which tolerates no warnings and
// runs before anything merges, so a file this hook could not reach is caught
// there instead of going unnoticed.
//
// ESLint runs first and Prettier second, matching the order `npm run lint`
// checks them in: eslint --max-warnings 0, then prettier --check. Formatting
// last is what makes the file Prettier-clean at the end.

const EDITING_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'];

export type FormatInput = {
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
};

// The one file this call edited, or nothing. Anything unexpected is nothing,
// because a formatter that guesses is worse than one that stands aside.
export function editedFile(input: FormatInput): string | undefined {
  if (!EDITING_TOOLS.includes(input.tool_name ?? '')) return undefined;
  const toolInput = input.tool_input ?? {};
  for (const field of ['file_path', 'notebook_path']) {
    const value = toolInput[field];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

export function isInside(file: string, projectDir: string): boolean {
  const relative = path.relative(path.resolve(projectDir), path.resolve(file));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export async function tidy(file: string, projectDir: string): Promise<string> {
  const { ESLint } = await import('eslint');
  const prettier = await import('prettier');

  const info = await prettier.getFileInfo(file, {
    ignorePath: path.join(projectDir, '.prettierignore'),
  });
  if (info.ignored || !info.inferredParser) return 'Prettier has no parser for it, so it was left';

  // ESLint fails on its own, not on Prettier's behalf. A missing config or a
  // parser that cannot read the file should cost the lint pass and nothing more;
  // formatting still happens, because half of this hook working is better than
  // none of it. `npm run lint` remains the backstop for whatever was skipped.
  let lint: string;
  try {
    const eslint = new ESLint({ fix: true, cwd: projectDir, errorOnUnmatchedPattern: false });
    const results = await eslint.lintFiles([file]);
    await ESLint.outputFixes(results);
    const problems = results.reduce((count, result) => count + result.messages.length, 0);
    lint = problems === 0 ? 'lints clean' : `${problems} left for lint`;
  } catch (error) {
    lint = `lint stood aside (${(error as Error).name})`;
  }

  const { readFile, writeFile } = await import('node:fs/promises');
  const before = await readFile(file, 'utf8');
  const options = await prettier.resolveConfig(file);
  const after = await prettier.format(before, { ...options, filepath: file });
  if (after !== before) await writeFile(file, after, 'utf8');

  return `formatted, ${lint}`;
}

function deps(input: FormatInput): LogDeps {
  return {
    env: process.env,
    now: Date.now(),
    projectDir: process.env.CLAUDE_PROJECT_DIR ?? path.join(import.meta.dirname, '..', '..'),
    cwd: input.cwd ?? process.cwd(),
  };
}

async function readInput(): Promise<FormatInput> {
  let text = '';
  for await (const chunk of process.stdin) text += String(chunk);
  try {
    return JSON.parse(text) as FormatInput;
  } catch {
    return {};
  }
}

async function main(): Promise<void> {
  const input = await readInput();
  const where = deps(input);
  const file = editedFile(input);
  if (!file || !isInside(file, where.projectDir)) return;

  let reason: string;
  try {
    reason = await tidy(file, where.projectDir);
  } catch (error) {
    reason = `stood aside after an error (${(error as Error).name})`;
  }

  record(
    {
      hook: 'format-on-edit',
      tool: input.tool_name ?? 'none',
      decision: 'aside',
      reason,
      sessionId: input.session_id,
    },
    where,
  );
}

// Always zero. This hook never blocks, never refuses and never reports a
// failure upward, which is what "fails open" means and why its entry in
// .claude/settings.json ends in `|| true` rather than `|| exit 2`.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch(() => undefined);
  process.exitCode = 0;
}
