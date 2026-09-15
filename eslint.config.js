import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Plain Node strips types and runs the rest, so anything that is not erasable
// syntax is refused here as well as by the compiler.
const notErasable = [
  { selector: 'TSEnumDeclaration', message: 'No enums: plain Node cannot run them.' },
  {
    selector: 'TSModuleDeclaration[kind="namespace"]',
    message: 'No namespaces: plain Node cannot run them.',
  },
  {
    selector: 'TSParameterProperty',
    message: 'No constructor parameter properties: plain Node cannot run them.',
  },
];

export default defineConfig([
  globalIgnores(['.claude/worktrees/**', '**/dist/**', 'data/**']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    rules: {
      'no-restricted-syntax': ['error', ...notErasable],
      'linebreak-style': ['error', 'unix'],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
  },
]);
