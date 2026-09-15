import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { afterAll, describe, expect, it } from 'vitest';
import { HEADLESS_MARKER, isAvailable, prepare, run, start } from './run.ts';

const scratch = mkdtempSync(path.join(os.tmpdir(), 'spindle-run-'));

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

function touch(file: string): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, '');
  return file;
}

// A Windows layout: node beside its npm, and claude installed through npm.
const nodeDir = path.join(scratch, 'node');
const execPath = touch(path.join(nodeDir, 'node.exe'));
touch(path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'));
touch(path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'));
const globalDir = path.join(scratch, 'global');
touch(path.join(globalDir, 'claude.cmd'));
const claudeExe = touch(
  path.join(globalDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'),
);
const windows = { platform: 'win32' as const, execPath, env: { Path: `${nodeDir};${globalDir}` } };

// Any other system's layout: claude found by name on a colon-separated PATH.
const binDir = path.join(scratch, 'bin');
const claudeBin = touch(path.join(binDir, 'claude'));
const posix = { platform: 'linux' as const, execPath, env: { PATH: binDir } };

// Windows paths only resolve on Windows, so the lookups are tested on the system
// they belong to, and everything else uses the layout of the system running the tests.
const onWindows = process.platform === 'win32';
const host = onWindows ? windows : posix;
const hostWithoutClaude = onWindows
  ? { ...windows, env: { Path: nodeDir } }
  : { ...posix, env: { PATH: path.join(scratch, 'empty') } };

describe('prepare', () => {
  it.runIf(onWindows)('starts npm on Windows through node and npm-cli.js, with no shell', () => {
    const prepared = prepare('npm', ['test'], windows);
    expect(prepared.file).toBe(execPath);
    expect(prepared.args[0]?.endsWith('npm-cli.js')).toBe(true);
    expect(prepared.args.slice(1)).toEqual(['test']);
  });

  it.runIf(onWindows)('finds the claude.exe behind an npm-installed claude.cmd on Windows', () => {
    expect(prepare('claude', ['--version'], windows).file).toBe(claudeExe);
  });

  it.skipIf(onWindows)('starts npm by name on other systems, with no shell', () => {
    const prepared = prepare('npm', ['test'], posix);
    expect(prepared.file).toBe('npm');
    expect(prepared.args).toEqual(['test']);
  });

  it.skipIf(onWindows)('finds claude on the PATH on other systems', () => {
    expect(prepare('claude', ['--version'], posix).file).toBe(claudeBin);
  });

  it('marks every claude run as headless, even when the caller tries to clear the mark', () => {
    const plain = prepare('claude', ['-p', 'hello'], host);
    expect(plain.env[HEADLESS_MARKER]).toBe('1');

    const cleared = prepare('claude', ['-p', 'hello'], {
      ...host,
      env: { ...host.env, [HEADLESS_MARKER]: '' },
    });
    expect(cleared.env[HEADLESS_MARKER]).toBe('1');
  });

  it('leaves the mark off runs of npm and node', () => {
    expect(prepare('npm', ['test'], host).env[HEADLESS_MARKER]).toBeUndefined();
    expect(prepare('node', ['--version'], host).env[HEADLESS_MARKER]).toBeUndefined();
  });

  it('reports claude as unavailable when it cannot be found', () => {
    expect(isAvailable('claude', hostWithoutClaude)).toBe(false);
    expect(isAvailable('npm', hostWithoutClaude)).toBe(true);
  });
});

describe('run and start', () => {
  function fakeSpawn(seen: SpawnOptions[]) {
    return (_file: string, _args: string[], options: SpawnOptions): ChildProcess => {
      seen.push(options);
      const child = new EventEmitter() as ChildProcess;
      queueMicrotask(() => child.emit('close', 0));
      return child;
    };
  }

  it('hands the headless mark to the claude process it starts', async () => {
    const seen: SpawnOptions[] = [];
    await run('claude', ['-p', 'hello'], { ...host, spawnImpl: fakeSpawn(seen) });
    start('claude', ['-p', 'hello'], { ...host, spawnImpl: fakeSpawn(seen) });
    expect(seen).toHaveLength(2);
    for (const options of seen) {
      expect(options.env?.[HEADLESS_MARKER]).toBe('1');
      expect(options.shell).toBe(false);
    }
  });

  it('really starts node', async () => {
    const result = await run('node', ['--version']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/^v\d+/);
  });
});
