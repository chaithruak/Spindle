# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Spindle is one chat window that can talk to any model, built in public as a worked example of an AI-native software lifecycle. It goes up a stage at a time; right now it is Stage 0 (set-up): workspaces, a starter page, an API with `/health`, and the repository's own checks and guardrails. The chat path, sign-in stand-in and model picker arrive in later stages.

## Commands

Node 24 (see `.nvmrc`). On Windows the git hooks and the Claude Code hooks run through Git Bash.

| Command | What it does |
|---|---|
| `npm install` | Installs every workspace; its `prepare` step points git at `.githooks` (or says it skipped, when there is no `.git`) |
| `npm run dev` | Starts the API on 127.0.0.1:4000 and the Vite page on 127.0.0.1:3000, together, via `concurrently` |
| `npm test` | Vitest across all workspaces, scripts and the session hook, from the root `vitest.config.ts`; fails if it finds no tests |
| `npx vitest run scripts/key-scan.test.ts` | Run a single test file |
| `npx vitest run -t "refuses each credential shape"` | Run tests whose name matches |
| `npm run lint` | ESLint with zero warnings allowed, then `prettier --check .` (Markdown is excluded from Prettier) |
| `npm run build` | Type-checks the root project (scripts, hooks) and runs each workspace's `build` (the web one also runs `vite build`) |
| `npm run checks` | `scripts/checks.ts`: the repository rules (CLAUDE.md length, key files, workflow policy, the make-it-yours guide, roles, retention, model pin) |
| `npm run wording-check` | `scripts/wording-check.ts`: fails on 12-word runs shared with the playbook copy or, for evidence, the hand-off (paths from `PLAYBOOK_COPY` and `HANDOFF_COPY`) |
| `npm run smoke` | Starts `npm run dev` with the keys path aimed at a missing file and waits for the page and `/health` |
| `npm run measures` | Prints the measures report (empty for now) |
| `node scripts/key-scan.ts --all` | The pipeline's key scan over every file |

`evals`, `record`, `deploy`, `watch`, `replay` and `loop` exist as scripts but are not built yet; each exits 1 saying so.

## Architecture

- **Workspaces** (`package.json` `workspaces`): `apps/web` (React + Vite starter chat page, proxies `/api/*` to the API), `apps/api` (plain `node:http` server, currently only `GET /health`), `packages/proxy` and `packages/adapters` (empty placeholders for the provider proxy and per-provider adapters).
- **No build step for Node code.** Everything under `apps/api`, `packages/*`, `scripts/` and `.claude/hooks/` is TypeScript run directly by Node 24's type stripping. `tsconfig.base.json` sets `erasableSyntaxOnly` and `allowImportingTsExtensions` with `noEmit`; every workspace extends it. Imports therefore spell out `.ts`, and enums, namespaces and constructor parameter properties are refused (by the compiler and by an ESLint `no-restricted-syntax` rule).
- **Configuration is read from `config/`, not duplicated.** `config/environments.json` holds each environment's web and API ports, data folder, cookie name and the retention figure; both the API (`apps/api/src/environment.ts`) and `apps/web/vite.config.ts` read it, and both bind to 127.0.0.1 only. `config/claude.json` pins the model and the command-line Claude Code version; `.claude/settings.json` repeats the model and the checks fail when they drift. `config/roles.json` is the only roster; the checks compare it with `.github/CODEOWNERS` and the table of signers in `docs/how-we-work.md`.
- **Starting other programs goes through `scripts/lib/run.ts`.** On Windows it resolves `npm`, `npx` and an npm-installed `claude` to something spawnable without a shell. Every `claude` run it starts carries `SPINDLE_HEADLESS=1`. `scripts/lib/repo.ts` lists repository files (git's tracked plus untracked-not-ignored, or a directory walk without git).
- **Guardrails.** `.githooks/pre-commit` runs `key-scan --staged` then `wording-check --staged`; `.githooks/pre-push` runs `key-scan --push`. Key-scan rules match credential values, never the word in front of them, and print file and line only. Personal patterns come from `~/.spindle/private-patterns.txt`, which is never committed.
- **Session setup.** `.claude/settings.json` wires `.claude/hooks/session-start.ts` to SessionStart (token and model check for every source; session note for `startup` only), SessionEnd (removes the session binding) and PostModelSwitch (model check). The hook reads a Spindle-only GitHub token and an optional session note from `~/.spindle/`, and stands aside when `SPINDLE_HEADLESS` is set.
- **House policies** ship as a plugin in this repository (`.claude-plugin/marketplace.json`, `plugins/house-policies/`), and the intent template is the `write-intent` project skill.
- **Examples.** Company-specific files carry the note `Example: replace this with your company's own. See docs/make-it-yours.md.` under any frontmatter (JSON examples are listed in `scripts/checks.ts` instead). Every example and adapt file needs a row in `docs/make-it-yours.md` in the same commit, or `npm run checks` fails.

## Process

- A commit that builds something without an intent first gets a dated section in `intent/spindle/plan.md`, accepted by the stage's gate role before any file is written.
- Keys live outside the project (`keys.env.example` shows the shape and where the real file goes).
