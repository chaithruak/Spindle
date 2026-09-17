# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Spindle is one chat window for any model, built in public a stage at a time. Stage 0 has set up the house: workspaces, a starter page, an API with `/health`, and the rules that guard every commit.

## Architecture

Four workspaces, and what each one may not do.

- `apps/web` is the window. It talks to the API through `src/api.ts` and nowhere else, and it decides no availability: the API settles that.
- `apps/api` serves the page's requests, holds the sessions and owns the data folder. It never reads a provider key.
- `packages/proxy` routes a message to an adapter. It is the only part that reads keys and the only part that talks to a provider.
- `packages/adapters` holds one adapter per provider, each speaking the same shape. An adapter never reads the environment and never opens a file: the router hands it the key accessor and the http function, and that is the only seam.
- `scripts/` and `.claude/hooks/` are TypeScript that Node runs directly. Neither is built.

## Commands

Each line ends on what healthy output looks like.

- `npm install` ends with `git hooks: on (core.hooksPath = .githooks)` and `found 0 vulnerabilities`.
- `npm ci` is what every worktree runs instead. It installs what the lockfile says and never writes it.
- `npm run dev` prints `api listening on http://127.0.0.1:4000 (development)` and Vite's `Local: http://127.0.0.1:3000/`.
- `npm test` ends with `Test Files  N passed (N)`. One file: `npx vitest run <path>`; by name: `npx vitest run -t "<name>"`.
- `npm run lint` prints no ESLint findings, then `All matched files use Prettier code style!`
- `npm run build` ends with Vite's `✓ built in …` and no TypeScript errors above it.
- `npm run checks` ends with `checks: N passed, 0 failed, 0 skipped`.
- `npm run wording-check` prints `wording-check: no matches (N files measured)`.
- `npm run smoke` prints `smoke: with no keys file, the starter page and /health both answered.`
- `npm run measures` prints `Spindle measures`, a line for each measure that is a figure or says why there is none yet, and a pointer to the playbook map.
- `evals`, `record`, `deploy`, `watch`, `replay` and `loop` are not built yet; each exits 1 and says so.

## Verification

Nothing counts as done until the build, the tests and the lint have all been run and have all printed the lines above.

- The lint tolerates no warnings at all. `--max-warnings 0` is not a suggestion, and a warning is a failure.
- A failing test is neither skipped nor deleted. It is not marked exclusive, pending or todo to get a green run.
- A red test is cured in the code. Rewriting the test so it passes is how a bug reaches main wearing a green tick.
- Whatever the tools really printed is what goes into the report. Never describe a run that did not happen, and never round a failure up to a pass.
- Run `npx prettier --write <files>` on what you wrote, then `npm run lint`.

## Conventions

- Node 24, pinned in `.nvmrc`. Node runs the TypeScript itself: there is no compile step for `apps/api`, `packages/`, `scripts/` or `.claude/hooks/`.
- Erasable TypeScript only: no enums, no namespaces, no constructor parameter properties. Plain Node cannot run any of them.
- Write `.ts` in every relative import.
- Ports, data folders and the retention figure come from `config/environments.json`, and the model from `config/claude.json`. Read them; never copy the values into code.
- Servers bind to 127.0.0.1 and nowhere else.
- Scripts start `claude`, `npm` and `npx` only through `scripts/lib/run.ts`.
- A company-specific file carries the example note under its frontmatter, and gets its row in `docs/make-it-yours.md` in the same commit.
- A commit that builds something with no intent behind it starts from an accepted, dated section in `intent/spindle/plan.md`.

## Guards, and the change ticket

- `.claude/hooks/` holds three guards that fail closed and one formatter that fails open. They refuse the key files, anything key-shaped, and edits to infrastructure paths without a change ticket.
- A session holds a ticket when a one-line note was saved just before it opened. The note is read once, at session start, so a session cannot gain one afterwards.
- **Do not `/clear` a session holding a ticket.** Clearing removes the binding and the next start does not rebuild it, so the session carries on looking identical and holding nothing.
- A refusal writes its reason to `.claude/logs/`. That log is the only place that says which rule matched, because the session cannot read its own binding.
- If a guard breaks and nothing can be edited, there is no fix from inside the session. Run `git checkout -- .claude/hooks/` from a shell outside the app; it takes effect on the next tool call.

## What Claude keeps getting wrong here

Every first mistake earns a dated row in `docs/claude-mistakes.md`. The second time the same one appears, its correction moves here, in the same pull request, linking back to the row.

- Writing a Unicode escape (a byte-order mark, say) through a tool call: it can land in the file as the invisible character itself. Build such characters from their code, as `String.fromCharCode(0xfeff)`, and treat ESLint's irregular-whitespace error as this mistake.
- Leaving new code unformatted. Run `npx prettier --write <files>` on what you wrote before `npm run lint`.
- Writing a credential shape or a claude.ai share link into a test as a literal. The commit hook refuses the file. Assemble it from parts while the test runs.

## Browser work

Browser work goes through the Playwright server `.mcp.json` names, pinned to one version and isolated. It may reach the loopback ports in `config/environments.json` and nothing else, so serve a local file over one of those ports rather than opening it as a `file://` URL.
