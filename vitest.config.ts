import { defineConfig } from 'vitest/config';

// One run covers every workspace, the scripts and the session hook. A run that
// finds no tests at all fails rather than passing on nothing.
export default defineConfig({
  test: {
    include: [
      'apps/*/src/**/*.test.{ts,tsx}',
      'packages/*/src/**/*.test.ts',
      'scripts/**/*.test.ts',
      '.claude/hooks/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**', 'data/**'],
    passWithNoTests: false,
  },
});
