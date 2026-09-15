import { spawn, type ChildProcess, type SpawnOptions, type StdioOptions } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// The one way any Spindle script starts another program. Windows cannot spawn
// npm, npx or an npm-installed claude directly (they are .cmd shims, and Node
// refuses to run those without a shell), so this resolves each to something it
// can start with no shell at all, which also keeps prompts free of quoting.

export type Tool = 'claude' | 'npm' | 'npx' | 'node' | 'git';

// Every claude run a script starts is headless. The session-start hook sees
// this marker and leaves the GitHub token and any session note alone.
export const HEADLESS_MARKER = 'SPINDLE_HEADLESS';

export type Prepared = { file: string; args: string[]; env: NodeJS.ProcessEnv };

export type PrepareOptions = {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  execPath?: string;
};

export class ToolNotFound extends Error {}

function pathEntries(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  const key = Object.keys(env).find((name) => name.toUpperCase() === 'PATH');
  const value = key ? env[key] : undefined;
  return (value ?? '').split(platform === 'win32' ? ';' : ':').filter(Boolean);
}

export function findOnPath(
  names: string[],
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
): string | undefined {
  const join = platform === 'win32' ? path.win32.join : path.posix.join;
  for (const dir of pathEntries(env, platform)) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

function npmCli(
  tool: 'npm' | 'npx',
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  execPath: string,
): string {
  const script = `${tool}-cli.js`;
  const { dirname, join, basename } = platform === 'win32' ? path.win32 : path.posix;
  const fromNpm = env.npm_execpath;
  if (fromNpm && basename(fromNpm) === 'npm-cli.js') {
    const candidate = join(dirname(fromNpm), script);
    if (existsSync(candidate)) return candidate;
  }
  const beside = join(dirname(execPath), 'node_modules', 'npm', 'bin', script);
  if (existsSync(beside)) return beside;
  const shim = findOnPath([`${tool}.cmd`], env, platform);
  if (shim) {
    const candidate = join(dirname(shim), 'node_modules', 'npm', 'bin', script);
    if (existsSync(candidate)) return candidate;
  }
  throw new ToolNotFound(`Could not find ${script} for ${tool}.`);
}

function claudeFile(env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string {
  if (platform !== 'win32') {
    const found = findOnPath(['claude'], env, platform);
    if (found) return found;
    throw new ToolNotFound('claude is not on the PATH.');
  }
  const exe = findOnPath(['claude.exe'], env, platform);
  if (exe) return exe;
  const shim = findOnPath(['claude.cmd'], env, platform);
  if (shim) {
    const bundled = path.win32.join(
      path.win32.dirname(shim),
      'node_modules',
      '@anthropic-ai',
      'claude-code',
      'bin',
      'claude.exe',
    );
    if (existsSync(bundled)) return bundled;
  }
  throw new ToolNotFound('claude is not on the PATH.');
}

export function isAvailable(tool: Tool, options: PrepareOptions = {}): boolean {
  try {
    prepare(tool, [], options);
    return true;
  } catch (error) {
    if (error instanceof ToolNotFound) return false;
    throw error;
  }
}

export function prepare(tool: Tool, args: string[], options: PrepareOptions = {}): Prepared {
  const env = { ...(options.env ?? process.env) };
  const platform = options.platform ?? process.platform;
  const execPath = options.execPath ?? process.execPath;

  switch (tool) {
    case 'node':
      return { file: execPath, args, env };
    case 'git':
      return { file: 'git', args, env };
    case 'npm':
    case 'npx':
      if (platform !== 'win32') return { file: tool, args, env };
      return { file: execPath, args: [npmCli(tool, env, platform, execPath), ...args], env };
    case 'claude':
      env[HEADLESS_MARKER] = '1';
      return { file: claudeFile(env, platform), args, env };
  }
}

export type RunOptions = PrepareOptions & {
  cwd?: string;
  input?: string;
  stdio?: StdioOptions;
  spawnImpl?: (file: string, args: string[], options: SpawnOptions) => ChildProcess;
};

export type RunResult = { code: number; stdout: string; stderr: string };

// Starts a long-running program, such as the dev servers, and hands back the child.
export function start(tool: Tool, args: string[], options: RunOptions = {}): ChildProcess {
  const prepared = prepare(tool, args, options);
  const spawnImpl = options.spawnImpl ?? spawn;
  return spawnImpl(prepared.file, prepared.args, {
    cwd: options.cwd,
    env: prepared.env,
    stdio: options.stdio ?? 'inherit',
    shell: false,
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
}

// Runs a program to the end and collects what it printed.
export function run(tool: Tool, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const prepared = prepare(tool, args, options);
  const spawnImpl = options.spawnImpl ?? spawn;
  return new Promise((resolve, reject) => {
    const child = spawnImpl(prepared.file, prepared.args, {
      cwd: options.cwd,
      env: prepared.env,
      stdio: options.stdio ?? ['pipe', 'pipe', 'pipe'],
      shell: false,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    if (child.stdin) {
      if (options.input !== undefined) child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}

// Stops a child started with start(), together with everything it started.
export async function stopTree(child: ChildProcess): Promise<void> {
  if (child.pid === undefined || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise<void>((resolve) => {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true }).on(
        'close',
        () => resolve(),
      );
    });
    return;
  }
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}
