import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { loadEnvironment } from '../apps/api/src/environment.ts';
import { ROOT } from './lib/repo.ts';
import { start, stopTree } from './lib/run.ts';

// The no-keys smoke: starts development with the keys path aimed at a file
// that is not there, and confirms the starter page and the health route answer.

const TIMEOUT_MS = 90_000;
const { environment } = loadEnvironment('development');
const page = `http://127.0.0.1:${environment.webPort}/`;
const health = `http://127.0.0.1:${environment.apiPort}/health`;
const proxied = `http://127.0.0.1:${environment.webPort}/api/health`;

const missingKeys = path.join(os.tmpdir(), `spindle-smoke-${randomUUID()}`, 'keys.env');
const child = start('npm', ['run', 'dev'], {
  cwd: ROOT,
  env: { ...process.env, SPINDLE_KEYS_FILE: missingKeys },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));

async function answers(url: string, expect: (body: string) => boolean): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok && expect(await response.text());
  } catch {
    return false;
  }
}

const checks: [string, string, (body: string) => boolean][] = [
  ['the starter page', page, (body) => body.includes('<div id="root">')],
  ['/health', health, (body) => JSON.parse(body).status === 'ok'],
  ['/health through the page', proxied, (body) => JSON.parse(body).status === 'ok'],
];

const deadline = Date.now() + TIMEOUT_MS;
const passed = new Set<string>();
while (passed.size < checks.length && Date.now() < deadline && child.exitCode === null) {
  for (const [name, url, expect] of checks) {
    if (!passed.has(name) && (await answers(url, expect))) passed.add(name);
  }
  if (passed.size < checks.length) await new Promise((resolve) => setTimeout(resolve, 1_000));
}

await stopTree(child);

if (passed.size === checks.length) {
  console.log('smoke: with no keys file, the starter page and /health both answered.');
} else {
  const missing = checks.map(([name]) => name).filter((name) => !passed.has(name));
  console.log(`smoke: failed. No answer from ${missing.join(', ')}. What development printed:`);
  console.log(output);
  process.exitCode = 1;
}
