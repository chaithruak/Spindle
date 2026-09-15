import { existsSync } from 'node:fs';
import path from 'node:path';
import { run } from './lib/run.ts';

// Runs on npm install. Points git at .githooks so the key scan and the wording
// check guard every commit and push. A copy downloaded as a ZIP has no .git
// folder, so there is nothing to point, and it says so.

const root = path.join(import.meta.dirname, '..');

if (!existsSync(path.join(root, '.git'))) {
  console.log('git hooks: passed over, because this folder has no .git (a downloaded ZIP?).');
} else {
  const result = await run('git', ['config', 'core.hooksPath', '.githooks'], { cwd: root });
  if (result.code === 0) {
    console.log('git hooks: on (core.hooksPath = .githooks)');
  } else {
    console.log('git hooks: could not be switched on; git said:', result.stderr.trim());
    process.exitCode = 1;
  }
}
