import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { run } from './run.ts';

export const ROOT = path.join(import.meta.dirname, '..', '..');

// Folders a walk skips when there is no git to say what belongs to the
// repository, as in a copy downloaded as a ZIP.
const WALK_SKIPS = new Set([
  '.git',
  'node_modules',
  'dist',
  'data',
  '.deploy',
  '.playwright-mcp',
  'test-results',
  'playwright-report',
  'recordings-raw',
  '.claude/worktrees',
  '.claude/logs',
]);
const WALK_SKIP_FILES = new Set([
  '.claude/settings.local.json',
  '.claude/launch.json',
  'CLAUDE.local.md',
]);

export function toPosix(file: string): string {
  return file.split(path.sep).join('/');
}

export async function git(args: string[], root = ROOT): Promise<string | undefined> {
  if (!existsSync(path.join(root, '.git'))) return undefined;
  try {
    const result = await run('git', args, { cwd: root });
    return result.code === 0 ? result.stdout : undefined;
  } catch {
    return undefined;
  }
}

// True when git is present and the repository has at least one commit.
export async function hasHistory(root = ROOT): Promise<boolean> {
  return (await git(['rev-parse', '--verify', '--quiet', 'HEAD'], root)) !== undefined;
}

function walk(root: string, dir = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!WALK_SKIPS.has(relative) && !WALK_SKIPS.has(entry.name)) {
        found.push(...walk(root, relative));
      }
    } else if (
      entry.isFile() &&
      !WALK_SKIP_FILES.has(relative) &&
      !/^\.env|\.env$/.test(entry.name)
    ) {
      found.push(relative);
    }
  }
  return found;
}

// Every file the repository holds, or would take in on `git add -A`: tracked
// files plus untracked ones that no ignore rule keeps out. Without git, a walk.
export async function listFiles(root = ROOT): Promise<{ files: string[]; fromGit: boolean }> {
  const listed = await git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], root);
  if (listed === undefined) return { files: walk(root).sort(), fromGit: false };
  const files = [...new Set(listed.split('\0').filter(Boolean))]
    .filter((file) => existsSync(path.join(root, file)))
    .sort();
  return { files, fromGit: true };
}

const MAX_TEXT_BYTES = 2_000_000;

export function looksBinary(text: string): boolean {
  return text.slice(0, 8000).includes('\0');
}

// The file's text, or undefined when it is binary or too large to be prose or code.
export function readText(file: string, root = ROOT): string | undefined {
  const full = path.join(root, file);
  if (statSync(full).size > MAX_TEXT_BYTES) return undefined;
  const text = readFileSync(full, 'utf8');
  return looksBinary(text) ? undefined : text;
}
