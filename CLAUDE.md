# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Spindle is one chat window for any model, built in public a stage at a time. Stage 0 has set up the house: workspaces, a starter page, an API with `/health`, and the rules that guard every commit.

## Commands

Each line ends on what healthy output looks like.

- `npm install` ends with `git hooks: on (core.hooksPath = .githooks)` and `found 0 vulnerabilities`.
- `npm run dev` prints `api listening on http://127.0.0.1:4000 (development)` and Vite's `Local: http://127.0.0.1:3000/`.
- `npm test` ends with `Test Files  N passed (N)`. One file: `npx vitest run <path>`; by name: `npx vitest run -t "<name>"`.
- `npm run lint` prints no ESLint findings, then `All matched files use Prettier code style!`
- `npm run build` ends with Vite's `✓ built in …` and no TypeScript errors above it.
- `npm run checks` ends with `checks: N passed, 0 failed, 0 skipped`.
- `npm run wording-check` prints `wording-check: no matches (N files measured)`.
- `npm run smoke` prints `smoke: with no keys file, the starter page and /health both answered.`
- `npm run measures` prints `Spindle measures`, a line for each measure that is a figure or says why there is none yet, and a pointer to the playbook map.
- `evals`, `record`, `deploy`, `watch`, `replay` and `loop` are not built yet; each exits 1 and says so.

## Conventions

- Node 24, pinned in `.nvmrc`. Node runs the TypeScript itself: there is no compile step for `apps/api`, `packages/`, `scripts/` or `.claude/hooks/`.
- Erasable TypeScript only: no enums, no namespaces, no constructor parameter properties. Plain Node cannot run any of them.
- Write `.ts` in every relative import.
- Ports, data folders and the retention figure come from `config/environments.json`, and the model from `config/claude.json`. Read them; never copy the values into code.
- Servers bind to 127.0.0.1 and nowhere else.
- Scripts start `claude`, `npm` and `npx` only through `scripts/lib/run.ts`.
- A company-specific file carries the example note under its frontmatter, and gets its row in `docs/make-it-yours.md` in the same commit.
- A commit that builds something with no intent behind it starts from an accepted, dated section in `intent/spindle/plan.md`.

## What Claude keeps getting wrong here

- Writing a Unicode escape (a byte-order mark, say) through a tool call: it can land in the file as the invisible character itself. Build such characters from their code, and treat ESLint's irregular-whitespace error as this mistake.
- Leaving new code unformatted. Run `npx prettier --write <files>` on what you wrote before `npm run lint`.

## Browser work

Browser work in this repository goes through the Playwright tools that `.mcp.json` names; it names none yet.
