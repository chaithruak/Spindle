# Spindle · plan

One dated section per commit that builds something without an intent of its own.
`scripts/checks.ts` (plan-sync) compares each such commit against the section
that covers it.

---

## 2026-09-14 — Wave 0, commit 1: the empty house

**Gate role for this section:** Linda, tech lead and release manager.
**Reworked:** 2026-09-15, in the desktop app's Code tab. The first draft leaned
on a launcher script that would open every interactive session with
command-line flags. The desktop app accepts no launch options and no launcher
will be written, so that script is gone from this section. Its work is spread
over a session-start hook, a handful of committed settings keys,
`.worktreeinclude`, and the owner's own local settings file, which git never
sees and only the owner edits. Revised once more the same day, in a second
desktop session, after the owner's headless marker test (measurement 6 below).
**Accepted:** 2026-09-15 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the second desktop session.

### What the measurements changed

The terminal session answered section 1 of the Wave 0 brief; the two desktop
sessions added what the Code tab does and what a headless run does. Six answers
move the design. Everything else is in `docs/0-setup/facts.md`.

1. **The workflow-token route is settled as "not the owner."** GitHub's own
   documentation on merge methods does not say who becomes the author of a
   squashed commit, so the brief's fallback applies. The spec job and the scan
   job, when they arrive in later waves, **push a branch and stop**; the pull
   request is opened afterwards from the owner's Spindle session in the desktop
   app with `gh pr create`. Nothing in this commit opens a pull request from a
   workflow.
2. **A plugin declared only in settings did not load headlessly.** Registering
   the repository through `extraKnownMarketplaces` and switching the plugin on
   through `enabledPlugins` was, on its own, not enough for a headless session
   to see the policies. An install is needed once per machine. Both keys still
   go in, because they pin the plugin on once it is installed, and anything
   headless passes `--plugin-dir` instead of relying on the install. Whether
   the Code tab offers the install itself is still unmeasured (see Risks).
3. **No update step is needed, so none is added.** A marketplace whose source
   is a local directory is read where it sits and never copied into the plugin
   cache, so an edited policy is live in the very next session. The update step
   the brief once allowed for stays out of the eval runner, CLAUDE.md and the
   guide.
4. **The desktop app carries its own, older Claude Code.** Code tab sessions run
   a bundled 2.1.270; the command-line install is 2.1.272. `config/claude.json`
   pins 2.1.272 for CI and headless scripts, and `facts.md` records the app's
   version apart from it. Everything this commit asks of an interactive
   session — the three hook events and the new settings keys — has to be shown
   working in the app's build, not assumed from the command line's.
5. **Both shell tools are registered in the Code tab, PowerShell as the primary
   one.** The hook hands the token to later commands through the file
   `CLAUDE_ENV_FILE` names, which Bash reads. Whether PowerShell commands see it
   can only be measured once the hook exists, so the fallback is carried below
   as a conditional entry rather than decided now.
6. **A headless run fires SessionStart, and did not fire Stop.** In the owner's
   marker test — a Start-menu PowerShell window, the app shut, one `claude -p`
   run — the SessionStart marker appeared and the Stop marker did not. So the
   session-start hook will run inside any headless run started in this folder
   on the owner's machine. The `SPINDLE_HEADLESS` marker `run.ts` sets is
   therefore what keeps the token out of those runs, not a nicety, and this
   section proposes that the same marker keeps the note part out of them too,
   so a script's run can never take a session note saved for the owner's next
   desktop session. Why Stop did not fire is unknown and goes to Wave 3.

### Files this section will touch

Grouped in the order they will be written.

1. **Ground** — `.nvmrc`, `tsconfig.base.json`, root `package.json` (its
   `prepare` step points git at `.githooks`, or prints why it skipped),
   `package-lock.json` (made by `npm install`; the no-keys smoke job installs
   from it), `vitest.config.ts`, `eslint.config.js`, `.prettierrc`,
   `.prettierignore`, `.gitattributes` (one line added), `.gitignore` (one line
   added: `.claude/launch.json`).
2. **Workspaces** — `apps/web/**`, `apps/api/**` with its `/health` test,
   `packages/proxy/**`, `packages/adapters/**`.
3. **Configuration** — `config/environments.json`, `config/claude.json` (the
   model id and the command-line version, 2.1.272), `config/roles.json`,
   `keys.env.example`, `.mcp.json` holding `{ "mcpServers": {} }`.
4. **Scripts** — `scripts/lib/run.ts` with `scripts/lib/run.test.ts`,
   `scripts/prepare.ts`, `scripts/key-scan.ts`, `scripts/key-scan.test.ts`,
   `scripts/wording-check.ts`, `scripts/checks.ts`, `scripts/measures.ts`.
   `run.ts` is the single way any script starts `claude`, `npm` or `npx`. Every
   `claude` run it starts is headless by construction, and it sets
   `SPINDLE_HEADLESS=1` in that run's environment so the session-start hook
   leaves the token out.
5. **Guardrails** — `.githooks/pre-commit`, `.githooks/pre-push`.
6. **Session setup** — `.claude/hooks/session-start.ts` with
   `.claude/hooks/session-start.test.ts`; then `.worktreeinclude`, one line
   naming `.claude/settings.local.json`; then `.claude/settings.json`. That last
   file already exists on disk, untracked, holding one key the terminal session
   wrote (`attribution.sessionUrl` false); it is grown, not created. It gains:
   - **hooks**, each `"type": "command"` with `"shell": "bash"`, calling the one
     hook file with the part to run:
     - SessionStart, matcher `startup|resume|clear|compact|fork`: token, then
       model check;
     - SessionStart, matcher `startup`: note;
     - SessionEnd, with an explicit `timeout` of 10 seconds: end;
     - PostModelSwitch: model check;
   - **session keys**: `model` and `availableModels` holding only the pinned
     model, `enforceAvailableModels` true, `allowedMcpServers` and
     `enabledMcpjsonServers` naming only this repository's servers (none until
     Wave 2), `autoMemoryEnabled` false, `crossSessionInbound` `"refuse"`, and
     `attribution.sessionUrl` false, kept;
   - **the policies**: `extraKnownMarketplaces` with a local directory source,
     and `enabledPlugins` switching `house-policies` on;
   - **conditional** — an `env` entry setting `CLAUDE_CODE_USE_POWERSHELL_TOOL`
     to `"0"`, only if PowerShell commands cannot see the exported token; and a
     Read deny on the folder holding the env file, once the fresh session has
     shown where it sits, because that file holds the token in plain text. The
     deny is written so that no personal path is committed. It is the one deny
     this commit carries; the rest of the deny list, the allow list, the guard
     hooks and the mode settings wait for Wave 3.

   The hook, part by part:
   - **token** — unless `SPINDLE_HEADLESS` is set, reads `.spindle/gh-token.txt`
     in the home folder and appends an `export GH_TOKEN=…` line to the file
     `CLAUDE_ENV_FILE` names; prints only that the token loaded, or that GitHub
     features are off because the file is missing, and never the token;
   - **model check** — compares the model named in the hook's input with
     `config/claude.json` and warns when they differ;
   - **note** — unless `SPINDLE_HEADLESS` is set (proposed, measurement 6),
     accepts `.spindle/session.txt` only when it was saved in the 10
     minutes before the session started (a byte-order mark tolerated; one
     `ticket:` or `release:` line, an optional `role:` line); copies it, with the
     role, the start time and the transcript path, into
     `.spindle/sessions/<session id>.json`; deletes the note; and sets a session
     title showing the ticket or release;
   - **end** — deletes this session's binding and any binding older than 24
     hours, which the later guards treat as expired.

   Every part prints one line and exits 0 when something is missing or
   malformed, so the hook never spoils a session start.
7. **Steering** — `CLAUDE.md`, `docs/0-setup/claude-md-init-draft.md`. `/init`
   is offered in the Code tab, so the draft is made there.
8. **The intent template** — `.claude/skills/write-intent/SKILL.md`.
9. **House policies** — `.claude-plugin/marketplace.json`,
   `plugins/house-policies/.claude-plugin/plugin.json`,
   `plugins/house-policies/skills/{security,ux,compliance,brand}/SKILL.md`.
10. **People** — `.github/CODEOWNERS`, `.github/pull_request_template.md`,
    `SECURITY.md`, `NOTICE`.
11. **Pipeline** — `.github/workflows/pipeline.yml`.
12. **Documents** — `docs/how-we-work.md`, `docs/playbook-map.md`,
    `docs/repository-settings.md` ("Allow auto-merge" listed as off),
    `docs/make-it-yours.md` (grown from its skeleton), `docs/0-setup/facts.md`,
    `docs/0-setup/sign-off.md`, `README.md` (grown from its skeleton).

### The order, and why it is that order

Ground before workspaces, because every workspace extends the base TypeScript
configuration. Configuration before scripts, because `checks.ts` reads the
roles and environments files and the hook reads the model pin. Scripts before
guardrails, because both git hooks are thin callers. Session setup after
scripts, because the hook trusts the marker `run.ts` sets; and within session
setup the hook and its tests come before `.claude/settings.json` names it,
because the moment that file names a hook, every new session opened on this
folder runs it, committed or not. Policies before people, because CODEOWNERS
names a policy per signer. The documents come last, because the guide has to
list files that already exist and the checks go red if it does not.

Then, before anything is committed: `npm test` and `npm run checks` pass; the
owner closes the building session and opens a fresh Code tab session on the
folder, where the facts that wait for the hook are measured; each conditional
entry is written or recorded as not needed; `facts.md` and the sign-off are
written; and the owner commits.

### Risks

- **The guide and the checks can deadlock.** `checks.ts` fails when an example
  file has no row in `docs/make-it-yours.md`, and the whole point is that it
  fails loudly. Mid-build it will fail for real. It is only meaningful at the
  end of the section, and it is run then.
- **The wording check has no corpus of its own.** It reads the owner's playbook
  copy and the hand-off through two environment variables. Both are set on this
  machine and visible to commands in the Code tab; on any other machine the
  check has to skip rather than pass, and it says which of the two it skipped.
- **The commit hook runs the wording check, so a bad phrase blocks the commit.**
  Everything here is written fresh, and the check is run before the owner is
  asked to commit, not after.
- **A hook in settings is live before it is committed.** Any session opened on
  this folder after `.claude/settings.json` names the hook runs it. The hook's
  tests pass before its entries go in, and each part exits 0 with a one-line
  message rather than disturbing a session start.
- **The app's Claude Code is older than the pin.** PostModelSwitch, the `fork`
  source, `crossSessionInbound`, `enforceAvailableModels`, `allowedMcpServers`
  read from project settings, and a session title set by a hook may be missing
  from 2.1.270 or behave differently there. Each is checked in the fresh
  session; whatever does not work is written into `facts.md` as not working,
  and Linda decides whether its key stays.
- **An empty `allowedMcpServers` may reach further than intended.** If the app
  honours it from project settings, it may also shut out the app's own tools.
  The fresh session counts what remains, and the result is recorded either way.
- **PowerShell may not see the token, and the env file holds it in plain
  text.** Covered by the two conditional entries above; neither is written
  until the fresh session has measured what it needs.
- **`gh` falls back to the owner's own sign-in.** The first desktop session ran
  `gh` successfully with no `GH_TOKEN` set, on the owner's keyring sign-in,
  whose scopes reach every repository the account holds. So a missing token
  file does not really switch GitHub features off, and the Spindle-only token
  is only used while `GH_TOKEN` is set. This commit does not close that gap; the
  fresh session records what `gh` does without the token, and Linda decides
  whether it is closed here or with Wave 3's deny list.
- **Desktop sessions do not always end cleanly.** SessionEnd may never run when
  the app is quit, so bindings carry their age and anything over 24 hours
  counts as expired.
- **The plugin install is a per-machine step, not a repository state.** A fresh
  clone gets the policies only after an install. Whether the Code tab offers
  that install itself, what the offer says, and whether the install can be held
  to local scope so the policies never reach the owner's other project, are
  measured in the fresh session before the README carries any wording for it.
- **The session-start hook runs in headless runs too.** The owner's marker test
  showed a `claude -p` run started outside the app firing SessionStart. Were
  `run.ts` to forget its marker, a script's run on the owner's machine would
  load the Spindle-only token and could take a waiting session note. Both skips
  are covered by the hook's tests, and the marker by `run.ts`'s own test.
- **The Stop hook did not fire headlessly.** The same run left no Stop marker,
  and one run cannot say why. The Stop hook Wave 3 plans cannot count as a
  control CI enforces until it is shown firing headlessly; that is handed to
  Wave 3 rather than solved here. The app marks its own sessions as child
  sessions and the mark reaches every command they run, so any repeat of the
  test runs from a Start-menu PowerShell window with the app shut.

### Proof

- `npm install` on a clean clone, then `npm test`, ends on the line CLAUDE.md
  promises.
- `npm test` includes the hook's tests — a note saved inside the window is
  bound; one saved earlier, or after the session started, is refused; a
  byte-order mark is tolerated; a binding is removed at the end and swept when
  too old; no token line is written, and no note is taken, when
  `SPINDLE_HEADLESS` is set — and
  `run.ts`'s test, showing every `claude` run it starts carries that marker.
- `npm run dev` serves the starter page on 3000 and `/health` on 4000, and
  `netstat` shows 4000 bound to the loopback address only.
- `npm run checks` passes with every rule this wave adds switched on.
- `git check-ignore .claude/launch.json` reports the file as ignored.
- In the fresh Code tab session: the hook's line appears; a check for `GH_TOKEN`
  prints only whether it is set, in Bash and in PowerShell; `gh auth status`
  reports a token from the environment; a note saved just before opening gives a
  titled session, and the owner confirms from a Start-menu PowerShell window
  that the note is gone and a binding exists; the model dropdown offers only
  the pinned model.
- A worktree session opened from the app shows the isolation still in force:
  the same `~/.spindle/` probe is refused there.
- Three prepared commits are refused by the hooks: a fake key, a home path with
  its backslashes doubled, and a fake claude.ai bundle address. A fourth commit,
  touching CODEOWNERS, is let through — proving the personal-pattern file does
  not match the bare account name.
- A row is deleted from `docs/make-it-yours.md`, `npm run checks` goes red, and
  the row is put back. That is never committed.
- Installing inside a copy with no `.git` folder finishes and prints the line
  saying the git hooks were passed over.

### What acceptance means

Linda accepts this section when she is satisfied that the launcher is gone from
it everywhere; that the session setup matches the brief — the hook under three
events with its matcher split, the session keys, `.worktreeinclude`,
`.claude/launch.json` ignored, and `run.ts` marking its runs; that measured
facts are recorded as measured and the ones still waiting are carried as open,
each with the step that will settle it; and that she agrees the values this
section proposes: the model pin `claude-opus-5`, the command-line pin 2.1.272,
the 10-minute note window, the 24-hour binding age, the note part standing
aside in headless runs as well as the token part, and the two conditional
entries. Acceptance is the comment `Accepted - Linda, tech lead and release
manager`, given before any file in the list is written. No pull request exists
in Wave 0, so the owner writes it in the Spindle session and Claude copies it
onto the Accepted line above.

### Built differently from this section

Written on 2026-09-15 by the building session, after acceptance, so Linda can
see at the gate every place the build left the accepted section. Nothing above
this heading was changed.

- **Acceptance confirmed.** At the start of the building session the owner
  confirmed that the acceptance above stands.
- **Files the list did not name.** A root `tsconfig.json`, which type-checks
  `scripts/` and `.claude/hooks/`; `scripts/lib/repo.ts`, the file listing and
  git calls that the checks, the key scan and the wording check share; and
  `scripts/smoke.ts`, the no-keys smoke that both `npm run smoke` and the
  pipeline's `no-keys-smoke` job run. Each workspace also has its own
  `package.json` and `tsconfig.json`, and the web app a stylesheet, all inside
  the `apps/**` and `packages/**` the list named.
- **One more dev dependency.** `npm run dev` starts both servers through
  `concurrently`; `yaml` lets the checks read the workflow.
- **Scripts not built yet say so.** `evals`, `record`, `deploy`, `watch`,
  `replay` and `loop` exit 1 with a line saying they are not built.
- **The roster.** The owner gave Marcus's role in this session: engineer, who
  steers Claude Code, approves the build plan and marks the pull request ready
  for review. The Security lead and the Compliance lead stay unnamed.
- **Names this build chose.** The two provider keys are `OPENROUTER_API_KEY`
  and `NVIDIA_API_KEY`. The repository variable recording that the `claude`
  environment is protected is `CLAUDE_ENVIRONMENT_PROTECTED`.
- **The playbook map's rows are open.** The owner chose to leave them open in
  this commit. `docs/playbook-map.md` carries the count, the recount notes, the
  columns and the G-11 row; the order of plays inside each stage waits with them.
- **The wording check leaves out addresses and cuts out fixed wording** before
  it measures, after its first run hit the owner's links and a run that ran into
  the example note.
- **The personal pattern file's first line may carry a label.** The owner's
  file puts the name after a label and a colon, so the first proof of a doubled
  home path got through; the key scan now drops a leading label, with a test.
- **Who runs what.** Partway through, the owner ruled that Claude runs no
  `git commit`, `git push`, `git reset` or GitHub-changing `gh` command, and
  deletes no files, for the rest of the session. The commits, the push-refusal
  proofs and the repository settings are the owner's turns.

Added on 2026-09-15 by the fourth desktop session, the first fresh session the
hook ran in. Its measurements are in `docs/0-setup/facts.md`.

- **Both conditional entries are written.** PowerShell commands did not see the
  token and Bash commands did, so `.claude/settings.json` now sets
  `CLAUDE_CODE_USE_POWERSHELL_TOOL` to `"0"` through `env`. No command in a
  session could see the env file's name and the documentation names no folder,
  so the owner found it from a Start-menu PowerShell window instead:
  `~/.claude/session-env/<session id>/`. The settings now deny
  `Read(~/.claude/session-env/**)`. The location came from the owner's search,
  not from the fresh session the plan named.
- **The README's session keys line was corrected.** It said the settings allow no
  MCP servers beyond this repository's. In the desktop app the empty
  `allowedMcpServers` removed nothing, and Claude Code's documentation says the
  key does not reach the app's own tools or the connectors the app delivers. The
  line now says that, and that the PowerShell tool is switched off.
- **A temporary line that must not be committed.** At the owner's request,
  `.claude/settings.json` carries `"defaultMode": "plan"` under `permissions`
  for one fresh session, to see whether the mode picked in the app's selector
  wins over project settings. The session that reads the result removes the
  line before commit 1; mode settings arrive with Wave 3.
- **The worktree proof moves after the push.** A worktree is made from
  `origin/main`, and until commit 1 is pushed that holds none of the session
  setup, so the worktree session in the Proof list above can only run once
  commit 1 is on main. Until then it is carried as open in `facts.md`.

Added on 2026-09-15 by the fifth desktop session. Its measurements are in
`docs/0-setup/facts.md`.

- **Both conditional entries hold.** A Read aimed at the env file's folder is
  refused, and Bash is the only shell tool from the session's start, while Bash
  commands still carry `GH_TOKEN`.
- **The temporary line is out.** The bar read Auto, so a mode picked in the
  selector wins over `defaultMode` in project settings. The first attempt to
  remove the line was refused by the auto-mode classifier until the owner said
  in their own words to remove it; then it went. `.claude/settings.json` carries
  no mode setting, as this section intended.
- **The marketplace reaches user settings without an install.** The owner had
  removed the user-level `spindle` entry and did not add it back, yet it was
  there again, last updated around when a Spindle session opened. The plugin is
  still not installed and is switched on only by project settings. The brief
  wants the policies held away from the owner's other project; whether they show
  there through this entry is not measured, and Linda decides at the gate
  whether that waits for the plain-session comparison.
- **The README names 2.1.270 as the lowest version,** with the parts of the
  session setup not yet seen working in the app listed beside it.

Added on 2026-09-15 by the sixth desktop session, which took the measurements
again and gathered the signatures. Its measurements are in
`docs/0-setup/facts.md`; the decisions are in `docs/0-setup/sign-off.md`.

- **Two signatures were closed first, and the files reworked.** The Security
  lead closed the security policy because it said only the hook reads the
  GitHub token; it now says the session receives the token, that a plain-text
  copy stays in each session's env file, and that a Read deny protects the copy
  until Wave 3's guards, stopping the Read tool but not a shell command. Rahul
  closed the intent template over one pronoun on its last line, now "Rahul's
  gate comment". Both were then accepted, and Linda co-signed the template. The
  compliance, ux and brand policies were accepted as first written.
- **One file the list did not name.** `docs/0-setup/session-export.md`, this
  session's transcript rendered and scrubbed as the evidence the Code tab's
  missing `/export` would have given. The renderer stayed outside the project.
- **Proofs run before commit 1, in a copy with no history.** The install says
  the git hooks were passed over, the tests pass, the no-keys smoke answers, and
  taking a policy's row out of the guide turns the checks red.
- **Carried past commit 1, each still open in `facts.md`.** Linda accepted the
  set-up with these listed here, so commit 1 does not wait for them. Later
  measurements reach the repository through a pull request once the rules for
  main exist:
  - after the push: an install and test run on a fresh clone; the worktree
    session, with its folder and branch names, the local settings file and the
    hooks; the rules page screenshot; and a direct push to main refused;
  - at the next fresh session opened with a note saved: the note bound, the
    session titled, the note deleted;
  - at the next quit of the app: whether an env file holding the token outlives
    it. The sixth session found all 6 earlier files still on disk, but the app
    had most likely not been quit, and one file written as it opened is
    unexplained;
  - whenever the owner opens a plain session elsewhere: whether the project or
    the account refuses Sonnet 5, whether `availableModels` narrows the menu,
    and how a plain session's load compares with a Spindle session's;
  - the user-level `spindle` marketplace entry, registered again without the
    owner adding it: whether a session put it there, whether the policies reach
    the owner's other project through it, and whether a copy of this folder
    loads its own edited policies or this folder's. The copy-and-edit proof
    waits on that;
  - the owner's check that the 18 account-level skills are the account's
    claude.ai skills;
  - the Stop hook in a headless run, and PostModelSwitch in the app, as already
    carried to Wave 3 and to the first wave that allows a second model.

---

## 2026-09-15 — Wave 0, fix: the run helper's tests fail on Linux

**Gate role for this section:** Linda, tech lead and release manager.
**Triage:** 2026-09-15 — `Fix now - the pipeline has to be green before the
rules for main require it`, written by the owner in the sixth desktop session.
**Accepted:** 2026-09-15 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the same session, before the test file was changed.

### What went wrong

Commit 1 (`33e67a2`) went to main, and its first pipeline run failed in the
`pipeline` job's Test step: 6 of 34 tests failed, all in
`scripts/lib/run.test.ts`, while the same 34 pass on the owner's Windows
machine. The steps after Test (the key scan, the repository checks and the
dependency audit) never ran on GitHub. The `no-keys-smoke` job passed.

The cause is in the tests, not in `scripts/lib/run.ts`. The tests build a fake
Windows install on disk (`node.exe` beside `npm-cli.js`, and a `claude.cmd`
with its `claude.exe`) and ask `run.ts` to find it as Windows would. `run.ts`
joins Windows paths with backslashes, which is right on Windows. On the
pipeline's Linux runner the fake files sit at forward-slash paths, so the
backslash paths match nothing. Two tests exercise the Windows lookups
themselves; three borrow the fake install only to check the headless marker;
one checks that npm counts as available.

### Files this section will touch

1. `scripts/lib/run.test.ts` — the only code change:
   - the two tests of Windows lookups (npm through `npm-cli.js`, and the
     `claude.exe` behind `claude.cmd`) run only when the tests run on Windows;
   - two matching tests for other systems (npm started by name, and `claude`
     found on the PATH) run only when the tests do not run on Windows;
   - the marker tests, the "leaves the mark off npm and node" test and the
     "claude unavailable" test use a fake install shaped for the system the
     tests are running on, so they run everywhere.
2. `intent/spindle/plan.md` — this section, and its Triage and Accepted lines.
3. `docs/0-setup/facts.md` — commit 1's push, its red pipeline run, and the
   fix's pipeline run.

`scripts/lib/run.ts` and `.github/workflows/pipeline.yml` are not changed.

### The order

Triage and acceptance first. Then the test change on a branch, `npm test`,
`npm run lint`, `npm run checks` and `npm run wording-check` on the owner's
machine; then the owner commits and pushes the branch, and Claude opens the
pull request with `gh pr create`, filling in the template's fix fields. The
owner applies the repository settings from `docs/repository-settings.md`
before the pull request is merged, so the rule requiring the pipeline check is
in force when it merges.

### Risks

- **The Windows lookups are proven only on Windows.** The pipeline runs on
  Linux, so there those two tests show as skipped. Windows is covered by
  `npm test` on the owner's machine and by the checks' spawn smoke, which
  really starts `node`, `npm` and `claude` there. A Windows runner in the
  pipeline would close that; it is not added here.
- **Steps that have never run on GitHub may fail next.** The key scan, the
  repository checks and the audit run on the pull request for the first time.
  If one fails, the work stops and returns to Linda with what failed, rather
  than widening this fix without a decision.
- **Skipped tests could hide a test that never runs anywhere.** Each skipped
  test has a partner that runs on the other kind of system, and the counts
  below show both.

### Proof

- On the owner's Windows machine, `npm test`: 36 tests, 34 passed, 2 skipped.
- On the pull request's pipeline run: every step of the `pipeline` job green,
  its Test step showing 36 tests, 34 passed and 2 skipped; `no-keys-smoke`
  green.
- The pull request's fix fields name `33e67a2` as the red commit, the
  `pipeline` job as the failing check, and the assertion message it printed.

### What acceptance means

Linda triages the red pipeline with `Fix now - <reason>`, and accepts this
section with `Accepted - Linda, tech lead and release manager`, before the test
file is changed. Accepting it means agreeing that the Windows lookups stay
proven on Windows only for now, and that the owner commits and pushes the
branch while Claude opens the pull request.

---

## 2026-09-15 — Wave 1: the measures script reads its first two measures

**Gate role for this section:** Rahul, product owner.
**Accepted:** 2026-09-15 — `Accepted - Rahul, product owner`, written by the
owner in the Wave 1 session before any file in the list was written.
**Co-signed:** 2026-09-15 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the same message, because the section changes
`CLAUDE.md`, which CODEOWNERS gives to the tech lead.

### Why this section exists

Wave 1 builds nothing for the product: Mark's idea becomes
`intent/spindle/intent.md`. But the wave adds two measures, and its done-check
asks `npm run measures` to print the first of them. Today the script only says
that no measure has data. In the Wave 1 session's plan mode the owner chose to
build the two measures in the intent's own pull request, inside the draft
commit, so that the pull request still shows two commits: the draft, then
Rahul's status edit. The same choices settled two smaller points: the closed
count comes from GitHub's public API with no token, and the README's status line
moves to Stage 1 in the same commit.

### The two measures

1. **Conversation start to merged intent.** The start is the time on the first
   line of `docs/1-plan/conversation.md`, written as
   `Conversation started: 2026-09-15T14:05-05:00` (an ISO 8601 time with its
   offset; a line without an offset is refused, not guessed). The end is the
   author date of the commit on main that added `intent/spindle/intent.md`,
   following main's first parents only. For a squash merge that date is the
   merge time: on pull requests #1 and #2 the squash commit's author date and
   GitHub's merge time agree to the second. Until the intent is on main, the
   script says so and prints no figure. Which conversation belongs to which
   intent is a short list at the top of the script, with one entry today.
2. **Share of intents accepted rather than closed.** Every pull request whose
   branch starts with `intent/` and that has been decided: merged counts as
   accepted, closed without a merge counts as closed. A closed pull request
   leaves no commit, so git alone cannot see it; the script reads the closed
   pull requests from GitHub's REST API with an unauthenticated `fetch`, which
   the repository being public allows. It reads no token and starts no program.
   The account and repository come from the git remote. If GitHub cannot be
   reached, or refuses, the script says so and prints no share.

### Files this section will touch

1. `scripts/measures.ts` — rewritten: small exported functions (read the start
   line, format a duration, name the repository from a remote address, tally
   decided intent pull requests) and a `main` that prints the report. Git is
   reached through `git()` in `scripts/lib/repo.ts`.
2. `scripts/measures.test.ts` — new: the start line accepted with an offset and
   refused without one; a duration printed in hours and minutes, and a negative
   one refused; the repository named from both remote shapes; the tally counting
   merged and closed `intent/` pull requests and ignoring every other branch. No
   test reaches the network: the fetch is handed in.
3. `CLAUDE.md` — the one Commands line for `npm run measures`, so it names the
   new healthy output.
4. `intent/spindle/plan.md` — this section, and its Accepted line.

Riding in the same draft commit, but not built by this section: the intent, the
evidence under `docs/1-plan/`, the Stage 1 rows in `docs/make-it-yours.md`, and
the README's status line.

### The order

This section first, and Rahul's acceptance before any file above is written.
Then the tests and the script together, `npm test`, `npm run lint` and
`npm run build`; then the `CLAUDE.md` line. The script can be built while the
owner is in claude.ai, since nothing in it depends on the conversation's words.
Its first real figure comes only after the merge.

### Risks

- **A script that reaches the network.** Only `npm run measures` does it, and
  nothing in the pipeline runs that script. Offline, the second measure says it
  could not reach GitHub rather than printing a share.
- **GitHub allows 60 unauthenticated requests an hour.** One run makes one
  request for each page of 100 closed pull requests, so that limit is far off.
- **A stale local main.** The first measure reads the local `main`; until the
  owner pulls after the merge, it still says the intent is not on main.
- **The start time is a person's clock reading,** taken to the minute when the
  first message is sent. `docs/1-plan/conversation.md` says how it was taken.
- **The squash author date could stop matching the merge time** if GitHub
  changes how it squashes. The proof below compares the two after this merge.
- **A branch name is the convention.** A pull request that carries an intent on
  a branch not starting with `intent/` is not counted. Rework after a close goes
  on a new `intent/` branch, so a close and a later acceptance both count.

### Proof

- `npm test` passes with the new test file in it.
- `npm run lint`, `npm run build` and `npm run checks` pass.
- On the branch before the merge, `npm run measures` says the intent is not on
  main yet, and that no intent pull request has been decided.
- After the merge and a pull on main, `npm run measures` prints the time from
  the conversation's first line to the squash commit's author date, and that
  figure agrees with GitHub's merge time for the pull request to the minute.
  The share reads 1 of 1 accepted, 0 closed.

### What acceptance means

Rahul accepts this section when Rahul agrees that the two measures are built
inside the intent's pull request and its draft commit; that the start is the
conversation file's first line and the end is the squash commit's author date
on main; that the closed count comes from GitHub's public API with no token;
and that each figure is printed only when its data exists. Acceptance is the
comment `Accepted - Rahul, product owner`, written by the owner in the Wave 1
session before any file in the list is written, and copied by Claude onto the
Accepted line above. No pull request exists yet to hold it.

---

## 2026-09-15 — Wave 2: the spec skill, the spec job, Playwright and two measures

**Gate role for this section:** Rahul, product owner.
**Accepted:** 2026-09-15 — `Accepted - Rahul, product owner`, written by the
owner in the Wave 2 session before any file in the list was written.
**Co-signed:** 2026-09-15 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the same message, because the section changes
`CLAUDE.md`, `.claude/settings.json`, `.mcp.json` and a workflow, which
CODEOWNERS gives to the tech lead.

### Why this section exists

Most of Wave 2 has an intent behind it. `intent/spindle/spec.md` reads the
accepted intent and the four policies, and the mock is a picture of the window
that intent asks for; neither needs a plan section. Four things in the wave do,
because nothing in the intent asks for them:

1. The owner's spec prompt kept as a skill, so the next spec is written the same
   way rather than from memory.
2. A job on GitHub that can run that skill from main.
3. Playwright named in `.mcp.json`, which is how the picture of the mock gets
   taken and how Wave 3 compares screenshots.
4. The wave's two measures, added to `npm run measures` the way Wave 1 added its
   two.

### What the brief asked for, and what this section does instead

The brief gives the spec job `contents` and `pull requests` write. It also says
the route is settled by what `docs/0-setup/facts.md` recorded about squash-merge
authorship, and that record is plain: the job pushes a branch and stops, and the
pull request is opened afterwards from the owner's own session, so the owner
stays the author of the merge. `docs/how-we-work.md` already says so in its
Stage 2 section. A job that never opens a pull request has no use for write
access to pull requests, so the workflow gets `contents: write` alone. The owner
chose this in plan mode. It is written down here because it narrows what the
brief asked for, and nobody reading the workflow later should have to guess why.

### Files this section will touch

1. `plugins/house-policies/skills/write-spec/SKILL.md` — new, carrying the
   example note. It asks for the Policy conflicts line, for every open question
   in the intent to be answered or carried forward on purpose, and for a header
   naming the four policy commit ids and its own. It runs only when someone
   types it.
2. `.github/workflows/write-spec.yml` — new. `workflow_dispatch` alone, taking
   the intent's path as its input. It registers the marketplace, installs the
   plugin, and stops with an error when the spec skill or any of the four
   policies is missing from the session. It commits against the owner's no-reply
   address, built from the repository owner the workflow context hands it,
   pushes its branch and stops there. The automatic trigger sits commented out,
   with a line above it saying it is an example that is not running.
3. `scripts/checks.ts` — `WORKFLOW_POLICY` gains the new workflow, or the
   workflow rule fails on a file it has no policy for. The trigger type widens
   so a `workflow_dispatch` entry can name its inputs by name.
4. `.mcp.json` — Playwright at one exact version, isolated, headless, its
   allowed origins naming only the development ports in
   `config/environments.json` on 127.0.0.1, and its output folder the one
   `.gitignore` already knows.
5. `.claude/settings.json` — `allowedMcpServers` and `enabledMcpjsonServers`
   each name that server, which is what the guide's row for `.mcp.json` asks
   for.
6. `CLAUDE.md` — the browser line, which today says `.mcp.json` names no
   servers.
7. `.prettierignore` — the design export, which is kept exactly as it came out
   of Claude Design.
8. `scripts/measures.ts` and `scripts/measures.test.ts` — the wave's two
   measures.
9. `config/roles.json`, `.github/CODEOWNERS` and the table of signers in
   `docs/how-we-work.md` — the new skill owned by Rahul and Linda, as the intent
   template is.
10. `docs/make-it-yours.md` — a row for every new example file and every Stage 2
    record, in this same commit.
11. `README.md` — the status line moves to Stage 2.
12. `intent/spindle/plan.md` — this section, and its Accepted and Co-signed
    lines.

Riding in the same commit, but not built by this section: `intent/spindle/spec.md`,
the mock's two halves under `design/`, and the evidence under `docs/2-design/`.

### The two measures

1. **Intent commit to spec commit.** Both dates come from `main`, first parents
   only: the commit that added `intent/spindle/intent.md`, which is `add7ce5`,
   and the commit that adds `intent/spindle/spec.md`. The span is printed
   through the `formatDuration` that is already there. Until the spec is on
   main, the report says so and prints no figure.
2. **Edits to the intent after the first spec.** Commits on `main` that touch
   `intent/spindle/intent.md` and are dated after that spec commit. It reads 0
   the day the spec merges. `c304731` edited the intent before any spec existed
   and is not counted; the measure is about an intent being reopened once design
   has read it.

Both are pure functions over lists of dates, tested directly. Git is reached
only from the reporting layer, through `git()` in `scripts/lib/repo.ts`, and no
test reaches git or the network.

### The order

This section first, and its acceptance before anything else is written. Then the
proof that the policies loaded, then the spec, then the concerns settled one at
a time. The mock is the owner's turn and can happen while the skill, the
workflow, the measures and the guide rows are built, because none of them depend
on it. The picture of the mock comes last, since Playwright only appears once a
session has started with it named in `.mcp.json`.

### Risks

- **A new MCP server is a new program a session starts.** It is pinned to an
  exact version rather than a moving tag, kept isolated so no browser profile is
  written to disk, and its allowed origins name the two local ports and nothing
  else. The owner reads `.mcp.json` line by line at the gate.
- **Playwright blocks `file://` by default**, so the exported mock cannot be
  opened as a file without widening that access. It is served over 127.0.0.1
  instead, for the length of the capture, and nothing new is committed to do it.
- **The export may ask for a web font.** The allowed origins do not include one,
  so the picture would show the fallback. If that happens the evidence says so;
  the allowlist is not widened to make the picture prettier.
- **The spec job cannot succeed yet.** Its key arrives with the `claude`
  environment in Wave 4. The wave's done-check asks only that the Run button is
  there, so the button is not pressed. One press would cost 1 Claude run.
- **The marketplace-and-install route in the job is the brief's, not the one
  `facts.md` prefers.** That record says `--plugin-dir plugins/house-policies` is
  the dependable route where nothing has been installed. The job runs on a fresh
  runner every time, where the install works, and it fails closed either way; if
  the install turns out not to hold on a runner, the fallback is one flag.
- **A skill that runs only when typed** depends on what this build of Claude
  Code supports. Whichever way it turns out to work is what gets written down,
  and the name the menu really shows is recorded rather than assumed.
- **The example note and the guide move together.** Every new file carrying the
  note needs its row in the same commit, or `npm run checks` goes red.

### Proof

- `npm run lint`, `npm test`, `npm run build` and `npm run checks` pass, with
  the checks counting 2 workflows and the new example files.
- `npm run wording-check` prints no matches, with the evidence folder measured
  against the hand-off as well as the playbook.
- Before the merge, `npm run measures` says the spec is not on main yet. After
  the merge and a pull it prints the span, and 0 edits to the intent since.
- On main, `gh workflow view write-spec.yml` shows the Run button.
- A fresh session lists the spec skill, and the name it shows goes into
  `docs/2-design/evidence.md`.
- `design/chat-mock.png` opens and shows the mock, and the owner has confirmed
  everything legible in it.

### What acceptance means

Rahul accepts this section when Rahul agrees that the spec prompt is worth
keeping as a skill and a job; that the job pushes a branch and never opens a
pull request, and so needs write access to contents alone; that Playwright is
pinned, isolated and held to the local ports, with the mock served over
127.0.0.1 rather than opened as a file; that the two measures are the ones the
wave asks for; and that the new skill is owned by Rahul and Linda together.
Linda co-signs because the section changes `CLAUDE.md`, `.claude/settings.json`,
`.mcp.json` and a workflow. Acceptance is the comment
`Accepted - Rahul, product owner`, and Linda's is
`Accepted - Linda, tech lead and release manager`, both written by the owner in
this session before any file in the list is written, and copied by Claude onto
the lines above. No pull request exists yet to hold them.

### Built differently from this section

Four things went otherwise than the section above expected. They are recorded
here rather than tidied out of it.

1. **Claude Design was not used, so three pieces of evidence do not exist.**
   The section, and the wave's brief behind it, expected the mock to be built at
   claude.ai/design, exported as standalone HTML, and handed off with a prompt
   carrying a bundle link. None of that happened. The owner had the mock written
   in one go by another Claude session, from the intent, the UX and brand
   policies and this wave's settled concerns. So there is no hand-off prompt, no
   design conversation and no record of rounds, and `docs/2-design/` holds none
   of the three. The done-check line about no bundle link surviving in the
   committed hand-off prompt is met because there is no hand-off prompt at all,
   which is not the same thing as a link having been removed, and is not written
   up as though it were. `docs/make-it-yours.md` lost the three rows it had
   gained for those files.
2. **The mock needed no font from the web,** so the risk about the allowed
   origins showing a fallback never arose. The export holds no address of any
   kind, and the picture shows the mock as designed.
3. **The mock ran ahead of the brand policy, and was brought back.** Its first
   version wrote its own words for a model with no key. The brand policy fixes
   those words, and this spec had just recorded two further cases as owed to that
   policy rather than invented anywhere. The owner changed the mock so the
   no-key wording is the brand policy's exactly, leaving `terms not read` as the
   one proposal in the picture, which is the worked example the owed change gets
   decided against.
4. **The spec job declares the `claude` environment,** which this section did not
   mention. The key it needs is held there rather than at repository level, so
   without the line the job could never see it, and the environment's required
   reviewer means a Run press asks the owner first. The runner guard still
   arrives in Wave 4.

---

## 2026-09-15 — Wave 3: three streams build the window, the adapters and the server

**Intent:** `intent/spindle/intent.md`, accepted 2026-09-15 by Rahul, product
owner, on pull request #3.
**Spec:** `intent/spindle/spec.md`, merged 2026-09-15 in `a04e46b`.
**Record:** none.
**Gate role for this section:** Marcus, engineer.
**Accepted:** 2026-09-16 — `Accepted - Marcus, engineer`, written by the owner in
the Wave 3 plan session, before any file this section names for a stream was
written and before the pull request existed to hold it.
**Co-signed:** 2026-09-16 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the same message, because `worktree-server` names
`packages/proxy/**` and `apps/api/src/sign-in.ts`, which this section classes as
high risk.
**Three things the gate settled**, each written into the section where it
belongs: the shared table holds seven rows and not the brief's four; the recorder
reads the keys file once the security policy's own commit says it may; and
Rahul settles the brand policy's three owed strings before `worktree-web` opens.

### Why this section exists

The spec says what Spindle does. It does not say which files change, in what
order, or who may touch what while three sessions work at once. Everything
Wave 3 builds has no intent of its own beyond that spec, so it starts here.

This section covers the three streams and this commit. It does **not** cover the
build kit — the grown `CLAUDE.md`, the `provider-adapter` skill, the four hooks,
the settings file and the two helper agents. The kit writes its own dated
section in its own session, accepted by Linda before its first code commit. It
is kept apart on purpose: the kit is what teaches the checks to police these
three streams, and one section covering both would be planning the policeman and
the traffic in the same breath.

### The three streams

Picked so that no file belongs to two of them.

```
worktree-web   worktree-adapters   worktree-server
```

Each stream works on the branch of that name. Each is an ordinary Local session
on the project folder with the app's worktree option off, whose very first step
is `EnterWorktree`.

**The argument is the bare stem, not the branch name.** Wave 0 measured it:
`EnterWorktree` called with `probe` made `.claude/worktrees/probe` on the branch
`worktree-probe`, based on the tip of `origin/main` — it puts `worktree-` on the
front itself. So the three calls take **`web`**, **`adapters`** and **`server`**,
and passing `worktree-web` would give `worktree-worktree-web`. Every branch name
elsewhere in this section is the full `worktree-<stem>`, because that is what
`git` and the checks see.

If it does not give that branch name on the day, the fallback is the app's own
worktree option followed by `git branch -m worktree-<stem>`, and `docs/3-build/`
records which of the two was used.

No stream edits any section but its own, in this file or anywhere else.

**A worktree arrives with no `node_modules`.** It is made from `origin/main`, and
git never tracked one. Walking up the folders would find the main checkout's,
because a worktree sits under `.claude/worktrees/`, and that is the trap: the
workspace links inside it point back at the main checkout's `apps/` and
`packages/`, so a stream would be testing the wrong copy of its own code without
being told. So **each stream's second step, straight after `EnterWorktree`, is
`npm ci`** in the worktree. `npm ci` installs exactly what the lockfile says and
**never writes it**, failing instead if the lockfile and the manifests disagree —
which is the guard this wave wants anyway. `npm install` is not used and is not
allowed. The kit's allow list therefore carries `npm ci` as one more exact
command; the brief's list does not name it, and it is named here because without
it no stream can run a test before opening a pull request.

**Three sessions cannot all have port 3000.** `apps/web/vite.config.ts` sets
`strictPort: true` and the API binds the environment's port outright, so the
second stream to run `npm run dev` fails rather than quietly moving. Only two
streams need a running server at all: `worktree-web`, to photograph
`screenshot.html`, and `worktree-server`, to run `npm run smoke`.

**They take turns on 3000 and 4000, and neither moves to another environment.**
`scripts/smoke.ts` loads `development` by name rather than from `SPINDLE_ENV`,
and it is in no stream's paths, so sending a stream to staging would have it
poll 3000 while its own servers came up on 3100 — failing, or worse, answering
from the other worktree's code and recording a green smoke it never ran. Neither
stream holds the ports for long: web wants them for the moment it takes a
picture, server for one run of smoke, which gives up after ninety seconds and
usually answers in a few. Each starts its server, does
the one thing, and stops it. A stream that finds the port held waits rather than
reaching for another environment, and a stream that leaves one held has made the
other stream's next run a lie.

### What a stream's paths are

**The boundary is the path, not the numbered list below.** Each stream owns:

| Stream | Its paths |
|---|---|
| `worktree-web` | `apps/web/**` |
| `worktree-adapters` | `packages/adapters/**`, `scripts/record.ts`, `scripts/record.test.ts` |
| `worktree-server` | `apps/api/**`, `packages/proxy/**` |

plus that stream's own folders under `docs/3-build/`, its own section in this
file, and whichever shared files its section names. The numbered lists that
follow say what each stream builds inside its paths; they are not the fence. So
when the server stream extends `apps/api/src/environment.ts` to hand out the
retention figure — which it should, rather than copying the number into the
store, which `CLAUDE.md` forbids — nothing about
the fence is in the way. Its list names that file anyway, because it is work
somebody has to do; a file the list had forgotten would be just as allowed.

Nothing outside a stream's paths moves without the shared-file rule, and the
kit's paths check is written against this table.

### The contract between the window and the API

`worktree-web` and `worktree-server` build the two halves of this, at the same
time, sharing no file. The web pull request merges in this wave and the server's
stays a draft until Wave 5, so nothing later reconciles two independently
invented shapes. It is therefore fixed here, and a stream that wants to change
it says so in its own section first.

**Two spellings of every path, and they are not the same.** The page calls
`/api/...`. `apps/web/vite.config.ts` proxies `/api` to the API port **and
strips the prefix on the way**, so the API itself serves the bare path. That is
already true of the one route that exists: `apps/web/src/App.tsx` fetches
`/api/health`, `apps/api/src/server.ts` serves `/health`, and `scripts/smoke.ts`
asks for both. The table below gives the API's own paths, bare. Read every one of
them with `/api` in front when the page is the caller.

Every failure, on every route, answers with exactly two fields — `error`, in the
plain words requirement 9 allows on a page, and `code`, the short code for that
request — and nothing else. The statuses are fixed too, because otherwise the
page's fake-fetch tests and the API's supertest tests would each invent their
own and both go green:

```
400  a body that is not the shape the route takes; an unknown modelId; a
     modelId that is not selectable
401  no cookie, a cookie the API does not know, or a wrong password
404  an unknown conversation id — and a conversation saved under a different
     stand-in name, which answers 404 rather than 403 so that nothing tells
     the asker it exists
502  a provider refused, or was unavailable
500  anything else
```

**On the turn route a failure has two shapes, and the dividing line is the first
chunk.** Anything that goes wrong before the stream opens — a bad body, no
cookie, an unselectable model, a provider that refuses outright — is an ordinary
non-200 JSON `{ error, code }`. Once the 200 and its `text/event-stream` header
have gone out, nothing can change the status, so a failure after that point is
`event: error` inside the stream and the status stays 200.

```
GET    /session
       200 { "name" }            the stand-in name this cookie belongs to
       401 { "error", "code" }   no cookie, or one the API does not know

GET    /models
       200 { "models": [ { "id", "label", "note", "selectable", "reason" } ] }
       reason is "no-key", "terms-not-read", "both" or "unavailable", and is
       left out when selectable is true. Five fields per model, never a sixth.
       Answers whether or not anyone is signed in.

POST   /sign-in       { "name", "password" }  ->  204, setting the cookie
                                                  401 on a wrong password
POST   /sign-out                              ->  204, clearing the cookie

GET    /conversations
       200 { "conversations": [ { "id", "title", "updatedAt" } ] }, newest first
       title is the first turn's text cut to 60 characters, and an empty
       string while the conversation has no turns. A row with an empty title
       shows its date and nothing else, so no placeholder phrase is invented
       for a screen — which no stream is allowed to do anyway.
POST   /conversations                         ->  201 { "id" }
GET    /conversations/:id
       200 { "id", "turns": [ { "id", "author", "text", "writtenAt",
                                "stopped" } ] }
       author is "you" or a model's picker id, never a provider's name.
       stopped is false on every turn but one that was stopped part-way.
DELETE /conversations                         ->  204
       Everything saved under the signed-in name, deleted rather than
       archived. This is spec requirement 7's "delete my data sooner", and the
       route is built in this wave rather than deferred. Whether the window
       grows a control for it waits for Wave 5: the mock shows none, the ux
       policy has not been asked, and until then the person running Spindle
       calls the route, which is where looking after this already sits.

POST   /conversations/:id/turns   { "modelId", "text" }
       200 text/event-stream:
         event: chunk   data: { "text" }
         event: done    data: { "turnId", "stopped" }
         event: error   data: { "error", "code" }
       Stopping is the page closing the stream. The API keeps whatever text
       had arrived, marks that turn stopped, and writes no error.
```

**Signed in or not** is settled by `GET /session` (`/api/session` from the
page) and nothing else. The
cookie is `HttpOnly`, `SameSite=Lax`, `Path=/`, and not `Secure`, because
Spindle serves plain HTTP on the loopback address; the page therefore cannot read
it and must ask. Every route but `/models`, `/sign-in` and `/health`
answers **401** to a request with no valid cookie, and the page shows the
sign-in view whenever it gets one.

**Every time on the wire is an ISO 8601 string in UTC**, as
`2026-09-15T22:16:41.000Z`. That covers `writtenAt` and `updatedAt`, and any time
field a later wave adds. Nothing sends epoch milliseconds, and the page does the
formatting.

`/health` keeps its present shape, because `npm run smoke` measures it.

### The contract between the router and an adapter

`packages/adapters/src/index.ts` is `export {}` on main today, so nothing in
`packages/proxy` can import a type from it until the adapters stream merges.
Two things follow, and they are the order the server stream works in:

- The server builds everything that needs no adapter type first — the store, the
  sign-in, the sessions, the key reader, the logger, and the session, sign-in,
  sign-out and conversation routes. All of that compiles against main as it
  stands.
- `router.ts`, `terms.ts`, **the models route** and the streamed turn route come
  **last**, after the adapters pull request has merged and the server branch has
  caught up. `terms.ts` is in this batch and not the first because it is typed
  against `TermsFrom`, which `models.ts` exports: a bare list of strings would
  let `'openrounter'` switch Claude off for ever with nothing to catch it, and
  declaring `TermsFrom` a second time inside `packages/proxy` is the duplication
  this section forbids. The models route is here for the same kind of reason —
  the four labels live in `models.ts` and the selectable-and-reason decision
  lives in `router.ts`. The server's draft pull request opens then, not
  before, because `pipeline` is a required check on every pull request including
  a draft and `npm run build` typechecks every workspace.

So "Order of work" step 6, where the other two streams do not wait for the
adapters to merge, is exact for `worktree-web` and half true for
`worktree-server`: it does not wait to start, and it does wait to open. Nothing is declared twice, and no contract is
duplicated into `packages/proxy` to get around the ordering.

The contract is written down here all the same, because the server writes its
tests and its route shapes against it long before it can import it.

```
Category   'no-key' | 'refused' | 'unavailable' | 'rate-limited'
           | 'timed-out' | 'bad-request'

AdapterError   thrown, never returned. Carries { category } and nothing
               else: no raw body, no provider text, no key, and no code —
               see below for why the code is not minted here.

KeyAccessor    () => string | undefined
               The router hands this in. An adapter never reads the
               environment and never opens a file.

Http           (url: string, init: RequestInit) => Promise<Response>
               The one way an adapter reaches the network, handed in like the
               key. Three callers hand in three of these: the router's is the
               real fetch; the recorder's copies the status, the content type
               and every body chunk on the way past; a test's replays a
               recording. That is the seam, and it is the only one.

Turn           { author: string, text: string }
               author is a picker id or 'you', as requirement 4 asks.

Request        { providerModelId: string, turns: Turn[], signal: AbortSignal }
               The provider's own id, never a picker id. router.ts looks the
               entry up in MODELS and passes providerModelId across; an
               adapter never sees 'claude' or 'gpt' and never opens MODELS.
Usage          { inputTokens: number, outputTokens: number }
Chunk          { text: string, usage?: Usage }
               Usage rides on the last chunk, whose text is empty. That is
               the only way a streamed reply can carry it.
Reply          { text: string, usage?: Usage }

Adapter        { id: string
                 send(request: Request, key: KeyAccessor, http: Http):
                   Promise<Reply>
                 stream(request: Request, key: KeyAccessor, http: Http):
                   AsyncIterable<Chunk> }
```

**`category` and `code` are two different things, and they are minted in two
different places.** `errors.ts` turns a status and a body into a **category**,
which is a classification: the same failure always gives the same word. The
**code** is a reference to one request — a short opaque string, different every
time — and the spec asks for it so that "it failed at about four o'clock" becomes
something anyone can look up. A classification cannot do that. So the API's
failure path mints the code, once per failed request, shows it once on the page
and writes it once in the log beside the category, the model, the provider and
the time. `errors.ts` never sees it and `AdapterError` never carries it.

**Both methods have a consumer, and both have a recording.** `stream` is what the
turn route calls; it is the only route that reaches a provider. `send` is what
the recorder calls for its non-streamed capture, so the interface the brief asks
for is proved on both halves rather than one being written and never run. The
recorder therefore takes two captures per provider — one streamed, one not — and
`packages/adapters/recordings/` holds both.

`packages/adapters/src/models.ts` exports exactly this, and the server's models
route and router read it:

```
PickerId    'mock' | 'claude' | 'gpt' | 'nvidia'
            The four ids the mock already uses.

TermsFrom   'openrouter' | 'anthropic' | 'openai' | 'nvidia'
            The four readings the spec's open question 1 owes, one per
            provider, each unlocking its own models and nothing else.

ModelEntry  { id: PickerId
              label: string            the brand policy's word for word
              note: string             its line under the label, likewise
              adapter: 'mock' | 'openrouter' | 'nvidia'
              termsFrom: readonly TermsFrom[]
              providerModelId: string }
              Mock carries the plain string mock, so no entry is ever null and
              Request.providerModelId is a plain string everywhere.

MODELS      readonly ModelEntry[], in the picker's order: mock, claude, gpt,
            nvidia. The order in this array is the order on the screen.
```

**Where `unavailable` comes from.** The other three reasons fall out of `keys.ts`
and `terms.ts`, and the fourth does not: it is for a key that is present and that
the provider refused. `router.ts` keeps one note per model id, in memory and
nowhere else: it is set when a call fails as `refused` with a key present, and it
is cleared when the keys file's modified time changes or when the API restarts —
the same moment `keys.ts` re-reads, so nothing has to be invalidated twice.
`/models` reports `unavailable` while that note is set. Nothing about it is
written to the store or to a log beyond the ordinary failure line, so it names
nobody and survives no restart, which is what the spec's "switches off at the
next availability check" means in practice.

**`termsFrom` is why `adapter` is not enough.** The spec owes four readings, not
three, and one OpenRouter reading must not unlock Claude and GPT together: Claude
is `['openrouter', 'anthropic']`, GPT is `['openrouter', 'openai']`, NVIDIA is
`['nvidia']`, and Mock is `[]`. `packages/proxy/src/terms.ts` holds the list of
`TermsFrom` values that have actually been read — **today, none of them** — and
`router.ts` calls a model selectable only when every one of that model's
`termsFrom` is in it **and** its key is there. That keeps the model knowledge in
one file, which is the rule this section set itself, and it puts the field in
`models.ts` now rather than reopening a merged contract from the server side
later.

**The four labels and their lines live there and nowhere else.** The server sends
them on `/api/models`; the page draws what it was sent and holds no label of its
own. That keeps the brand policy's words in one file rather than three, in three
pull requests that share none.

### Files that change

#### worktree-web — the chat window and the model picker

1. `apps/web/src/App.tsx` — replaced. The window: the bar, the picker, the
   thread, the composer, and the switch between the signed-out and the signed-in
   view.
2. `apps/web/src/SignIn.tsx` — new. The stand-in sign-in: an account name, the
   one-time password the API prints at start-up, and a button reading
   **Sign in (stand-in)**. It says in plain words that a name is treated as one
   person, and that the password is shared by everyone using this copy.
   **There is no mock for this view.** It is written from spec requirement 3 and
   the ux policy, and the screenshot rounds do not cover it. That is a decision,
   not a round that went missing.
3. `apps/web/src/ModelPicker.tsx` — new. **A native `<select>` with `disabled`
   options**, exactly as `design/chat-mock.html` has it, described by the note
   paragraph beneath. Not a custom listbox: the mock is the thing every round is
   measured against, a custom control could never match it, and a native select
   is keyboard-reachable and screen-reader-announced without anyone building
   that twice. A switched-off option reads `Label — reason`, the shape the mock
   uses (`Claude — add a key: see keys.env.example; terms not read`), and the
   note beneath shows the selected model's line. **The page holds no label of
   its own** and decides no availability; the only words it owns are the ones for
   the four switched-off reasons, and those are the brand policy's exactly.
   **This stream cannot open until those words exist** — see "The wording this
   wave is waiting on" below.
4. `apps/web/src/Conversation.tsx` — new. The thread as a log region announced
   to screen readers, every turn labelled with who wrote it.
5. `apps/web/src/ConversationList.tsx` — new. Newest first, with the line saying
   this history belongs to the stand-in name.
6. `apps/web/src/Composer.tsx` — new. Enter sends, Shift and Enter start a new
   line, and a way to stop a reply on its way that keeps whatever text had
   arrived and marks it stopped.
7. `apps/web/src/api.ts` — new. The one place the page talks to the API. It
   calls the real routes the server stream is building. Through Wave 3 the API is
   listening and answers 404 to every route the contract adds, since the server
   is a draft; whether it is a 404 or a dead socket, `api.ts` returns the
   plain-words state requirement 9 asks for and the window still draws.
8. `apps/web/src/styles.css` — the mock's stylesheet becomes the app's: light
   and dark, AA contrast in both, usable at 320 pixels wide, reduced motion
   respected.
9. `apps/web/src/FaceToggle.tsx` — new. The mock's own light-and-dark control,
   which sits in the bar and overrides `prefers-color-scheme` for whoever
   presses it. **It is real, not mock scenery**, because the bar is one of the
   five things every screenshot round is measured over and a bar without it
   could never match. Its two words, `Dark face` and `Light face`, come from
   `design/chat-mock.html`, which Rahul accepted in Wave 2; the brand policy
   does not cover them and nobody invents a third phrase for them here.
10. `apps/web/index.html` — the title and the root element.
11. `apps/web/src/*.test.tsx` and `apps/web/src/*.test.ts` — new. Each test file
    that needs a DOM carries `// @vitest-environment jsdom` in its own head, so
    the root `vitest.config.ts` never changes and never becomes a file two
    streams want at once.
12. `apps/web/src/screenshot.tsx` and `apps/web/screenshot.html` — new, and
    development-only. See "What a screenshot round photographs" below.
13. `docs/3-build/web/` and `docs/3-build/screenshot-rounds/` — this stream's
    notes, and one image per round holding the mock beside the app together with
    the written list of what still differs.
14. `intent/spindle/plan.md` — the `worktree-web` section above, and nothing
    else in the file, if the work departs from it.

Shared files this stream may name: **the make-it-yours guide**, for the rows its
own records under `docs/3-build/` create.

**What a screenshot round photographs.** There is no API in this wave, so the
real window shows the plain-words state that says the server is not answering,
and photographing that against the mock would measure nothing. The rounds are
therefore taken of `screenshot.html`, a second Vite entry that mounts the same
components with the mock's own content passed straight in as props — the sample
conversation, and the four picker entries with their labels, their lines and
their switched-off reasons. It is not the stub this section rejected: `App.tsx`
and `api.ts` are untouched, nothing in the shipped bundle imports it, and it
exists to be photographed. The production build does not emit it, and
`npm run build` proves that.

**Those four picker entries are copied from `design/chat-mock.html`, not from
`models.ts`, and that is not a second home for the brand policy's words.**
`apps/web` cannot import `@spindle/adapters`: its manifest is frozen, and the
barrel is `export {}` until the adapters merge, which is most of the time this
stream runs. Nor should it —
the harness's job is to reproduce the accepted mock so a picture can be compared
with it, so the mock is the right source, and a round where the harness and the
mock disagreed would be measuring the wrong thing. The rule that the labels live
in `models.ts` and nowhere else is about **the product**: `ModelPicker.tsx`
draws only what the API sent it, and there is no route from `screenshot.tsx`
into anything the build ships.

Playwright reaches it at `http://127.0.0.1:3000/screenshot.html`, which
`.mcp.json` already allows.

**What counts as a difference.** The mock shows the bar, the picker, the notice,
the thread and the composer. Those are what a round's list is about, and what
the owner's final comment is about. The window also has a conversation list, a
way to stop a reply, a sign-out and the sign-in view, none of which the mock
shows. Those are listed once, in the first round, under "in the app and not in
the mock", and they are not differences that have to shrink to zero. Saying so
here stops a later reader taking a list that never reached zero as a round that
failed.

**What a round cannot show.** `docs/2-design/evidence.md` already records that
`design/chat-mock.png` shows the picker **closed**, so the three switched-off
models and their reasons are inside it and not visible, and that opening a native
select cannot be done from a picture. The rounds therefore measure the closed
picker, which is what the mock shows. The switched-off wording — the thing this
stream waits on the brand policy for — is proved by this stream's own tests
instead, one per reason, and the evidence says so plainly rather than leaving a
reader to assume a picture covered it.

#### worktree-adapters — one interface, two providers and the mock

1. `packages/adapters/src/adapter.ts` — new. The one interface: a send and a
   stream, the request and reply shapes, and the error categories. A key reaches
   an adapter only through the accessor the router hands in. No adapter reads
   the environment, and no adapter opens a file.
2. `packages/adapters/src/parse.ts` — new. The one parser both providers go
   through: reading a streamed reply frame by frame, turning each frame into a
   Spindle chunk, and picking up usage.
3. `packages/adapters/src/errors.ts` — new. The one error mapper: a status and a
   body become a **category**, and the raw body never travels with it. It mints
   no code; the API does that, once per failed request.
4. `packages/adapters/src/openrouter.ts` — new, thin. Serves Claude and GPT.
5. `packages/adapters/src/nvidia.ts` — new, thin. Thinking switched off, usage
   asked for.
6. `packages/adapters/src/mock.ts` — new. Answers with no key at all.
7. `packages/adapters/src/models.ts` — new, carrying the example note. The
   pinned ids, the picker order, and which provider serves which. The ids are
   checked against the providers' own catalogue pages on the day this stream
   opens — by the owner, in the owner's own browser, and pasted in — because no
   session in this build has outbound network reach and none is given any. The
   starting points are `anthropic/claude-haiku-4.5` and `openai/gpt-5.6-luna` at
   OpenRouter, and `nvidia/nemotron-3.5-lightning-30b-a3b` at NVIDIA. It also
   holds the four labels and the four lines under them, copied word for word
   from the brand policy, because they belong in one file rather than three. It
   holds **no** notion of whether a model can be picked: a key it never sees,
   and whether a provider's terms have been read is the server stream's to hold.
   **The owner pastes more than the ids** — see "What the owner pastes, and why
   nobody looks it up" below.
8. `packages/adapters/src/index.ts` — the barrel.
9. `packages/adapters/recordings/` — new. **Two trimmed recordings per
   provider**, one from `stream` and one from `send`, so both halves of the
   interface are proved against something real; four files in all. Each holds
   the status, the content type and the body chunks, and nothing else.
   **Written only by the recorder, which the owner runs outside the app.** No
   session writes or edits a recording by hand: `protect-paths.ts` refuses it,
   and no stream session holds the change ticket that would let it through. A
   recording that needs changing is re-recorded.
10. `packages/adapters/src/*.test.ts` — new. The tests push the recorded replies
    back through the real parser. Where a recording is missing the test fails
    outright; nothing falls back quietly.
11. `scripts/record.ts` and `scripts/record.test.ts` — new. The recorder the
    owner runs. It calls the real adapters, handing in an `Http` that copies the
    status, the content type and every body chunk on the way past — which is why
    the interface takes one. It writes that raw copy into `recordings-raw/`,
    which git ignores, and the trimmed recording beside the tests. Identifiers
    become fixed placeholders and the prompt is nothing but a greeting. **Where
    it gets a key is not settled by this section** — see "The recorder needs a
    key, and every written rule says no" below.

    **It refuses to keep a capture that is not a 2xx**, and says which provider
    and which status. Without that rule the recorder is happy to record a 404
    from a mistyped model id, the test replays it faithfully, and the suite goes
    green over a recording of a failure. That is the one way this wave could
    produce evidence that is worse than none, and it costs one line to close.
12. `docs/3-build/adapters/` — this stream's notes, including the date the ids
    were read and what was on the page.
13. `intent/spindle/plan.md` — the `worktree-adapters` section above, and
    nothing else in the file, if the work departs from it.

Shared files this stream may name: **the root manifest**, to point `record` at
the real script instead of the stub that exits 1; **`.prettierignore`**, so that
`prettier --check .` leaves the recordings alone; **`CLAUDE.md`**, whose Commands
list says today that `record` is not built yet and would be wrong in the same
pull request that builds it — the line becomes `npm run record` ending on what
the recorder really prints, which with two captures from each of two providers
is `record: 4 replies captured (openrouter, nvidia).`, and `record` leaves the
list of scripts that exit 1; and **the make-it-yours guide**, for the row
`packages/adapters/src/models.ts` needs in section 4, Keys and providers, and
for the rows its own records under `docs/3-build/` create.

**What the owner pastes, and why nobody looks it up.** `openrouter.ts`,
`nvidia.ts`, `parse.ts` and `errors.ts` need each provider's HTTP surface: the
address, the authorization header, the request body, and the shape of a streamed
frame. None of that is in this repository, no session has outbound reach, and
this section refuses to give one any. So it comes in the same paste as the model
ids, from the same two catalogue and quickstart pages, in the same owner's turn.

What the plan expects to be pasted back, so the stream starts from a proposition
rather than from nothing: both providers serve an OpenAI-compatible
`POST .../chat/completions`, authorized with `Authorization: Bearer <key>`,
taking `{ model, messages: [{ role, content }], stream }`, and streaming
`data:` frames carrying a delta of content, ending on a sentinel frame. If the
paste says otherwise, the paste wins and `docs/3-build/adapters/` records the
difference. `parse.ts` exists precisely because both providers are expected to
speak the same shape; if they turn out not to, that is a departure and the
stream's own section says so.

**The recorder needs a key, and every written rule says no.** The brief has the
owner run `npm run record` against the real providers. But
`intent/spindle/spec.md` requirement 5 says "Only the API process reads that
file", the security policy says "Only the API process reads keys", and this
section makes `packages/proxy/src/keys.ts` the only reader — a file in a
different stream, empty on this branch. Every route into a key is closed.

Two ways out were put to the gate. **Settled on 2026-09-16 by Marcus: the first.**

1. **Taken. The security policy gains one sentence, in a commit of its own gated
   by the Security lead**, saying that the recorder also reads the keys file: a
   development tool the owner runs by hand outside the app, never part of a
   running Spindle, keeping nothing but the status, the content type and the
   body chunks. The spec's requirement 5 is owed the same sentence whenever the
   spec is next opened, and this section records that debt rather than anyone
   editing the spec here. Reading that file is what every other part of Spindle
   does, and it can be tested.
2. **Not taken.** The recorder would have read no file, asking for each key on a
   hidden prompt with nothing stored anywhere. No policy would have changed — at
   the cost of the owner handling key material by hand at a moment when they
   would not otherwise have to, by a path with no test behind it.

That commit lands before the recorder runs. The recorder never writes a key
anywhere, and `scripts/key-scan.ts` already knows both providers' key shapes.

#### worktree-server — the API, the proxy, the store and the sign-in

1. `apps/api/src/server.ts` — the routes, in place of the single `/health`.
   `/health` keeps answering exactly as it does today, because `npm run smoke`
   measures it.
2. `apps/api/src/routes/` — new, one file per group: the session, the models
   list, the sign-in and sign-out, the conversations including the delete, and
   the streamed turn. Every route in the contract above, and none that is not.
3. `apps/api/src/sign-in.ts` — new. The stand-in: an account name, the one-time
   password printed once to the console at start-up and never to a log file, and
   a session cookie named by `config/environments.json` holding a session id and
   nothing more. Bound to loopback.
4. `apps/api/src/store.ts` — new. One database file per environment under that
   environment's own data folder. It deletes anything past the retention figure
   in three places: at start-up, on a timer while the API runs, and the moment
   an expired thing is read. Each sweep writes one line — the time and how many
   conversations went — and nothing else.
5. `apps/api/src/main.ts` — start-up: the password, the first sweep, the timer,
   and the keys file's permission warning.
6. `apps/api/src/environment.ts` — extended, not replaced, to hand out the
   retention figure it already loads. The store reads it from there rather than
   opening `config/environments.json` a second time.
7. `packages/proxy/src/keys.ts` — new. **The only reader of the keys file.**
   Read at start-up, its modified time checked whenever the availability list is
   asked for, and re-read only when that time has changed. Nothing it returns
   carries a path, a length, or any part of a key.
8. `packages/proxy/src/terms.ts` — new, carrying the example note. The one
   place that records which providers' terms the Compliance lead has read and
   confirmed in writing. **Today it names none**, so every provider model is
   switched off and only Mock answers. It is what turns a present key into
   `terms-not-read` rather than into a model that can be picked, and it is the
   server stream's because it is a fact about compliance rather than about an
   adapter.
9. `packages/proxy/src/router.ts` — new. Picks the adapter for a model and hands
   it the key accessor. It is the one place that combines a key with
   `terms.ts` to decide whether a model is selectable, and with what reason. The
   only part that talks to a provider.
10. `packages/proxy/src/log.ts` — new. The logger that swaps a key, a token, a
   cookie value or an Authorization value for `[redacted]` and keeps the word in
   front of it. A canary test proves it.
11. `packages/proxy/src/index.ts` — the barrel.
12. `apps/api/src/**/*.test.ts` and `packages/proxy/src/**/*.test.ts` — new. The
    routes are driven through supertest; the purge, the key reader and the
    logger are tested directly.
13. `docs/3-build/server/` — this stream's notes.
14. `intent/spindle/plan.md` — the `worktree-server` section above, and nothing
    else in the file, if the work departs from it.

Shared files this stream may name: **the make-it-yours guide**, for the row
`packages/proxy/src/terms.ts` needs in section 4, Keys and providers, the row
the sign-in stand-in needs in section 9, App stand-ins, and the rows its own
records under `docs/3-build/` create.

### Two lists of paths, which are not the same list

They are confused easily and they do different jobs.

**Paths that need a change ticket.** The kit builds `protect-paths.ts` around
this list, from the brief:

```
the recorded replies       .worktreeinclude          .mcp.json
.github/workflows/**       .github/actions/**        .github/ci/**
.claude/settings*.json     .claude/hooks/**          scripts/deploy*.ts
```

**No stream session holds a ticket, and none is given one.** So no stream edits
any of these, including the recordings — which is why the recorder runs outside
the app and a recording is re-recorded rather than corrected. A stream that finds
it needs one of these paths stops and says so rather than asking for a ticket.

**Paths that make Linda's gate comment compulsory on a plan section.** The kit's
plan-sync check reads this list, which is the one above plus two:

```
packages/proxy/**          apps/api/src/sign-in.ts
```

`worktree-server` names both. That is the whole reason Linda co-signs this
section: they are the only reader of the keys file, the only part that talks to a
provider, the logger that redacts, and the sign-in.

#### This commit

1. `intent/spindle/plan.md`, holding this section.
2. `docs/3-build/plan-cold-read.md`, the cold read that ends on an empty list of
   questions.
3. `docs/make-it-yours.md` — the row that cold read's record creates.
4. `README.md` — the status line moves to Stage 3, as Wave 1 and Wave 2 each
   moved it in their own commit. It is rewritten to stay true for the whole
   stage rather than only for today, since no stream may name the README and
   nothing else in Wave 3 would come back to it: the window, the adapters and
   the server are built a stream at a time, and sending a message to a real
   model becomes possible in Stage 5.

### The wording this wave is waiting on

The picker cannot be drawn without words that do not exist yet, and no stream is
allowed to invent them.

Today no provider's terms have been read, so all three provider models sit in
exactly the state the brand policy does not cover. `intent/spindle/spec.md` is
explicit about it: concerns 4 and 9 leave three strings owed — **terms not
read**, **terms not read with no key either**, and **unavailable**, for a key
that is present but refused — and the spec says that until the brand policy
carries those words, no wording for them is invented anywhere in the build.
`design/chat-mock.html` carries `terms not read` as a proposal and
`docs/2-design/evidence.md` records it as exactly that: the worked example the
owed change gets decided against.

So **the brand policy gains those three strings in a commit of its own, gated by
Rahul, before `worktree-web` opens.** A policy changes in its own commit owned by
its own owner; that is how Wave 2 left it, and this section does not edit a
policy. It is a small commit — one table in
`plugins/house-policies/skills/brand/SKILL.md` — and it is the only thing in
Wave 3 the brief does not already ask for. It is named here because the wave
stops without it, and Marcus and Rahul both see it at this gate.

**Settled at the gate on 2026-09-16 by Marcus: Rahul settles the three strings
first**, in that commit of his own, before `worktree-web` opens. It can be done
while the kit is being built, so it costs the wave no waiting.

The fallback was not taken, and is recorded here so nobody later reads the
decision as the only option there was: `worktree-web` would have drawn only the
states the brand policy already fixes, the picker would have shown the three
provider models as having no key, and the terms-not-read state would have waited
— a screen saying something true and incomplete, rather than a picker quietly
inventing a phrase.

**Every other word on the screen is the stream's to write.** The rule is
narrower than "no stream invents words", which would stop the wave dead: a
stream may not invent words **where a policy or an accepted artefact already
fixes them**, and must use those exactly. The brand policy fixes the picker's
four labels and lines, the no-key reason and the button reading
`Sign in (stand-in)`; `design/chat-mock.html`, accepted in Wave 2, fixes the face
toggle's two words and the history notice — which **is** the line beside the
conversation list that spec requirement 3 asks for, so nobody writes a second
one. Everywhere else — the sign-in view's plain-words explanation, the state
`api.ts` shows when nothing is listening, the API's `error` strings, and what
Mock actually replies — the stream writes plain words against the ux policy's
rules, and the owner reads them at the gate. Screen text a person reads is
exactly what a gate is for.

### The wave's four measures, and where they go

Waves 1 and 2 each carried their measures in their own commit, so the silence
here would be read as a change of practice. It is not. Wave 3 owes four:

1. **Merges that passed on the first attempt** — pull requests merged to main
   whose own first pipeline run was green, against all of them. `33e67a2` is not
   in it: `docs/0-setup/facts.md` records that red run as being on a **push** to
   main, not on a pull request, and the measure counts pull requests.
2. **The distance from plan approval to merge** — from the date on an accepted
   plan section to the merge of the first commit it covers.
3. **The distance from a policy being approved to its skill merging** — the four
   policies landed in Wave 0; the first engineering skill lands with the kit.
4. **Spec commits dated after the first plan** — commits on main touching
   `intent/spindle/spec.md` and dated **after `a04e46b`, the commit that added
   it**. The obvious wording, "after the first plan section", counts `a04e46b`
   itself, because the first plan section is dated 2026-09-14 and the spec
   arrived the day after — so it would read 1 for a spec nobody has ever
   reopened. Wave 2's intent measure took the same care, and for the same
   reason. Worded this way it reads 0 today, which is a figure.

**They go in the kit's commit, not in any stream's.** `scripts/measures.ts` and
`scripts/measures.test.ts` are in no stream's paths and on no shared list, and
putting them there would make the kit's own section the only lawful home — which
it is, since the kit is the wave's one commit that touches shared tooling. The
kit's section names them. No stream writes a measure, and a stream that thinks it
needs to has misread its fence.

**Three of the four have figures the day the kit merges**, which is worth saying
because it would be easy to write all four as "no figure yet" and never notice
they were silent. Measure 1 has five merged pull requests to count already, all
of which passed first time. Measure 2 has four accepted plan sections. Measure 4
reads 0, which is a figure and not a silence. Only measure 3 waits, because the
first engineering skill arrives with the kit itself.

**The count of permission prompts per stream session is not one of these.** It
is per-session, it is counted by a person watching, and it goes into
`docs/3-build/` as evidence. Nothing in `npm run measures` can read it.

### The shared files

Four, as the brief fixes them: the lockfile, the root manifest, `CLAUDE.md` and
the make-it-yours guide. The table adds three more the brief does not name — the
frozen workspace manifests, `docs/claude-mistakes.md` and `.prettierignore` —
each with its reason in its own row, and each surfaced at the gate rather than
slipped in. A stream may change one only from inside its own pull
request, and only once its own section above names it. Stream pull requests land
one after another, each catching up with main before it lands, so a shared file
never needs a pull request or a commit of its own.

The table carries one row the brief's list does not: the four **workspace
manifests**, which are not shared files so much as frozen ones. They are here
because they are the only files inside a stream's own fence that it must not
touch, and a table nobody reads twice is the right place to say so.

**Read this table together with each stream's own line.** Three of these rows
are open to any stream — `CLAUDE.md` and `docs/claude-mistakes.md` for the
repeated-mistake rule, and the guide for that stream's own rows — so every
stream may name them without its own line repeating it. A stream's own line
names only what is particular to that stream, which today is the root manifest,
`.prettierignore` and the `CLAUDE.md` `record` line, all three the adapters'.

| File | Who may name it | Why |
|---|---|---|
| `package-lock.json` | **nobody** | The kit installs everything the three streams need, so the lockfile has stopped moving before any stream opens. No stream runs `npm install`; each runs `npm ci`, which installs what the lockfile says and never writes it. The checks redden a stream pull request that moves it |
| `apps/web/package.json`, `apps/api/package.json`, `packages/proxy/package.json`, `packages/adapters/package.json` | **nobody** | Frozen for exactly the same reason, and this is the trap worth naming: each of these sits *inside* a stream's own paths, so nothing about the fence stops a stream editing one — but the lockfile records every workspace's dependency block, so a line added here moves the lockfile, reddens the pull request, and makes that stream's own next `npm ci` fail. The kit puts every dependency in before the streams open, including `packages/proxy` declaring `@spindle/adapters`. A stream that finds it needs a package stops and says so |
| `package.json`, the root manifest | `worktree-adapters` | To point `record` at the real script instead of the stub that exits 1 |
| `CLAUDE.md` | `worktree-adapters`, and any stream | Adapters, because building `record` makes the Commands line that says it is not built yet false in the same pull request. Any stream, for the one case the kit's rule creates: a mistake seen a second time moves its correction into `CLAUDE.md` in the same pull request |
| `docs/make-it-yours.md` | any stream, for its own rows only | A new file carrying the example note needs its row in the same commit, and the guide's own rule is that each stage fills in the rows it creates. Each stream writes rows for its own files and its own records under `docs/3-build/`, and touches nobody else's |
| `docs/claude-mistakes.md` | any stream, for its own rows only | The fifth file this section asks for, below. Same terms: a row for a mistake that stream met, and nobody else's |
| `.prettierignore` | `worktree-adapters` | `npm run lint` runs `prettier --check .`, and Prettier reformats a trimmed recording — it puts the body chunks on one line. No session may re-format a recording to suit it, because no session may touch a recording at all, and `.gitattributes` already carries `**/recordings/** -text`, so git does no end-of-line conversion on them either. So `packages/adapters/recordings/` goes in `.prettierignore` in the same pull request that creates it, exactly as Wave 2 did for the design export |

**A fifth file this section asks for, which the brief's list does not hold.**
`docs/claude-mistakes.md` begins with the kit: every first mistake earns a dated
row there, and the second time the same one shows up its correction moves into
`CLAUDE.md` inside the same pull request, which links back to the row. Three
streams will each meet their own first mistakes. Unless all three may write a
row, the link that rule asks for has nothing to point at, and the `CLAUDE.md`
line in the table above cannot be used. So this section proposes
`docs/claude-mistakes.md` as a fifth shared file, on exactly the same terms as
the other four.

The alternative, which this section did not take: the streams report their
mistakes and one later session writes every row. That keeps the brief's four
intact, but it puts each row in a different commit from the correction it
explains, and it has the row written by a session that never watched the mistake
happen.

**Settled at the gate on 2026-09-16 by Marcus: all seven rows stand.** The
brief's four, plus the frozen workspace manifests, `docs/claude-mistakes.md` and
`.prettierignore`. Two of the three came out of the cold read finding a pull
request that could not otherwise go green, and the third is what makes the
repeated-mistake rule usable at all. The departure from the brief's list of four
is recorded here rather than tidied away.

### Order of work

1. **This section**, accepted by Marcus with Linda's comment beside it, written
   by the owner **in the plan session**, before the other three files this commit
   carries are written. No pull request exists yet to hold those words, so Claude
   copies them onto the header above. When the pull request does exist, the owner
   writes both again as pull request comments, because the gate ritual's record
   is a comment on the pull request. Waves 0, 1 and 2 each closed the same clash
   the same way.
2. **The cold read.** A read-only helper with no memory of the interview is
   handed this plan and the repository and nothing else, and told to list every
   question it would still have to ask. The section is revised until that list
   comes back empty, and every attempt is kept in
   `docs/3-build/plan-cold-read.md`. Commit 4 carries four files: this section,
   that record, the guide row the record creates, and the README's status line.
   The cold read runs **before** acceptance, since what Marcus accepts is a
   section a newcomer has already shown can be built from; the guide row and the
   README line are written after it.
3. **The kit**, in its own session under a change ticket, beginning with its own
   dated section and Linda's acceptance of it. Its deliberate attempts run
   inside that session. Linda approves the kit, and then main is merged and
   pulled in the main folder before a single stream opens.
4. **The keys**, the owner's own turn, outside the app. Nothing before this point
   needs one, and the recorder is the only thing in the whole wave that uses one.
5. **Two small policy commits, each gated by its own owner.** The brand policy's
   three owed strings, gated by Rahul — `worktree-web` cannot open until that is
   on main. And the security policy's one sentence about the recorder, gated by
   the Security lead — the recorder cannot run until that is on main. Neither
   blocks the kit, so both can be done while the kit is being built. Both were
   settled at the gate on this section; see "The wording this wave is waiting on"
   and "The recorder needs a key, and every written rule says no".
6. **Three stream sessions at once**, each of which runs `EnterWorktree` and then
   `npm ci` before anything else. `worktree-adapters` fixes the interface the
   server reads, so it is first to a pull request. `worktree-web` does not wait
   for it at all. `worktree-server` does not wait to start and does wait to open,
   for the reason set out under the adapter contract. Every stream closes with
   the code-simplifier's single pass before its pull request opens.
7. **Commit 6, the adapters,** which has an owner's turn in the middle of it. The
   adapters session writes the interface, the parser, the mapper, the two
   providers, the mock, the recorder and the tests, and then **stops**: its own
   tests fail outright with no recordings, and no session may write one. The
   owner runs `npm run record` in that worktree, from a PowerShell window outside
   the app, and reads the diff of recordings. Then the session resumes, the tests
   go green, the code-simplifier makes its pass, and only then does the pull
   request open — so `pipeline`, which is required on every pull request, sees a
   green branch on its first run rather than a red one waiting on a person.
   Marcus accepts. Merged.
8. **Commit 7, the web.** It catches up with main first, and Marcus accepts.
   Merged.
9. **The server stays a draft** until Wave 5, titled so that anyone can see it is
   waiting for the review in Stage 5. Each time anything merges to main that
   branch catches up, and says that it has.

Nothing in this section presses a Run button, so it costs no Claude run on
GitHub. What it costs is sessions: this one, the kit's, and three at once.

### Risks

1. **`CLAUDE.md` is 40 lines and the checks cap it at 60.** The kit adds
   Architecture and a block on verification to it. Either the file is compressed
   to fit or the cap moves, and moving a cap is a decision rather than something
   that happens quietly while a file grows. The kit's own section settles which,
   in as many words.
2. **Three sessions and one lockfile.** The kit installs everything first —
   Express, better-sqlite3 and supertest for the server, and for the web stream's
   tests a DOM environment and a React testing library, which the brief's list
   does not name but its rule does. No stream runs an install, no stream names
   the lockfile, and the paths rule reddens a stream pull request that moves it.
   What this guards against is two streams each resolving the tree slightly
   differently and the third inheriting whichever landed last.
3. **The worktree route has not been seen since commit 1 reached main.** Wave 0
   measured `EnterWorktree` before anything was pushed, so three rows in
   `docs/0-setup/facts.md` still wait on a worktree session: whether the owner's
   local settings file travels into one, whether the app's own worktree option
   gives the same folder and branch names, and whether a worktree session runs
   the main checkout's hooks. All three are answered the first time a stream
   opens, and whatever they answer goes into `docs/3-build/` — including an
   answer that contradicts what this section expects.
4. **The hooks run from wherever the session began.** `CLAUDE_PROJECT_DIR` stays
   at the main checkout when a session enters a worktree, which is what puts
   every stream's decision-log line in one file and lets `protect-paths.ts` find
   the bindings folder. If that turns out to be false, the log splits three ways
   and the ticket check reads the wrong place. The kit proves it before any
   stream opens, by attempting a blocked edit from inside a worktree.
5. **A guard that fails closed can stop the build it guards.** `protect-secrets.ts`
   shuts key files and anything key-shaped, and a source file these streams need
   must never match. The shapes are exact, `keys.env.example` is never blocked,
   and the kit's attempts prove both directions: the refusal, and an ordinary
   edit going through untouched.
6. **The formatter is the one hook allowed to fail open,** so a Prettier that has
   gone missing stops formatting silently rather than stopping the edit. That is
   the point of letting it fail open. `npm run lint` is the backstop and it
   tolerates no warnings.
7. **A recording could carry more than the three allowed fields.** The test fails
   on any further field and on anything shaped like a credential, the key scan
   runs over it at commit, and the owner reads the diff of recordings before it
   goes anywhere.
8. **Four sessions write one decision log.** The kit and the three streams all
   append to one file in the main checkout's `.claude/logs/`, from separate Node
   processes, on Windows. Interleaved or lost lines are the risk, and a
   half-written log is worse than none because it looks complete. Each line is
   written with a single append of one whole line, which is the one thing that
   keeps concurrent appends apart, and the kit's own section owns proving it —
   the deliberate attempts run while more than one session is open.
9. **A pinned model id can be wrong, and it is the recorder that finds out** —
   running against a real key and real credit. The ids are read from the
   providers' own pages on the day, the OpenRouter credit is capped at ten
   dollars with automatic top-up off, and the recorded prompt is nothing but a
   greeting.
10. **`better-sqlite3` is a native module.** It compiles or fetches a prebuilt
   binary at install time, on the owner's Windows machine and on the Linux
   runner both. If it will not install on either, the fallback is Node 24's own
   `node:sqlite`, which needs no package at all. The kit is where the install
   happens, so the kit finds this out and writes down which of the two the store
   ended up on.
11. **The route contract is held together by this page and nothing else.** The
    two streams that build its halves share no file, so no compiler and no test
    catches a mismatch: the web stream's tests drive a fake fetch shaped from
    the table above, and the server's drive supertest against the same table. It
    is Wave 5, when the API merges and the two halves meet for the first time,
    that finds anything this page got wrong. That is a known cost of building
    them apart, and the mitigation is that the contract is written down before
    either stream opens rather than discovered afterwards.
12. **The server stream can prove less than the other two.** It never runs
    against a real key in this wave and its pull request stays a draft, so its
    only evidence is its own tests and the replies the adapters stream recorded.
    That is why it is the stream Linda gates rather than Marcus alone.

### Alternatives not taken

1. **One stream on one branch.** Simpler to merge and impossible to get wrong.
   Rejected because the thing this wave is measuring is three sessions working at
   once, and one branch measures nothing.
2. **A stub API behind the web stream,** so the window is fully alive in Wave 3.
   Rejected: it would be torn out in Wave 5 by a commit nobody has planned, and
   every screenshot round would be proving a stub rather than the product.
3. **Fixtures only for the web stream,** with the model list read from a
   checked-in file. Rejected for the same reason and one more: requirement 2 says
   availability is settled by the API and not by the page, and a fixture leaves
   that rule unbuilt and untested.
4. **A shared vitest environment setting** in the root `vitest.config.ts`, rather
   than a line in each test file that needs a DOM. Rejected because it would make
   `vitest.config.ts` a file two streams want, and the shared list is meant to
   stay short.
5. **`node:sqlite` from the start,** skipping the native module. Rejected because
   the brief names `better-sqlite3` and the fallback costs one import if it is
   ever needed. It is kept here as the fallback rather than the plan.
6. **Letting the adapters session read the catalogue pages itself.** Rejected: it
   would hand a build session the outbound reach the deny list exists to take
   away, by a route the checks cannot police.
7. **A server-rendered sign-in page,** which would keep the streams even further
   apart. Rejected because it splits the window across two streams and two
   technologies, and the ux policy would then govern a page React never sees.
8. **A commit of its own for the shared files.** Rejected: the brief forbids it,
   and catching up with main before each landing does the same job with no extra
   pull request.

### Proof

- `npm test`, `npm run lint`, `npm run build`, `npm run checks` and
  `npm run wording-check` all pass in the main folder with three worktrees in
  place, and give what they gave before: 10 checks passed, 0 failed, 0 skipped,
  plus whatever rules the kit adds.
- `npm run smoke` still prints its one line with no keys file present.
- Each stream's pull request raises the test count above main's, and adds no
  skipped, exclusive or pending test.
- The adapters tests replay the recorded OpenRouter and NVIDIA streams through
  the real parser. Taking a recording away makes that test fail; this is proved
  once and written down, rather than asserted.
- Nothing beyond the status, the content type and the body chunks survives in a
  recording, and the test that says so fails on anything shaped like a
  credential.
- Each stream's pull request touches only its own paths, its own plan section,
  and the shared files that section names. `npm run checks` proves it rather than
  a reviewer's eye, and neither merged stream moves the lockfile.
- The web stream files one paired image and one written list of differences per
  round under `docs/3-build/screenshot-rounds/`, the list getting shorter each
  round, and the owner says in a pull request comment that the final one matches
  the captured mock — measured over the five things the mock shows, with what
  the app has and the mock does not listed once and not counted.
- `npm run build` emits no `screenshot.html` and no chunk for it, so the
  development-only entry cannot reach anyone.
- The count of permission prompts is recorded for each of the three stream
  sessions, and under accept-edits a stream reaches an open pull request with
  none at all for the commands the allow list covers.
- The cold read for this section ends on an empty list of questions, and every
  earlier attempt is in `docs/3-build/plan-cold-read.md` beside it rather than
  only the one that passed.
- Both Marcus's and Linda's decisions are written in the plan session before the
  commit's other three files, copied onto the header above, and written again as
  comments on this commit's pull request once it exists.

### What acceptance means

Marcus accepts this section when Marcus agrees that:

- the three streams as drawn share no file, and the boundary between the window
  and the server is the right place to cut;
- the route contract and the adapter contract above are the contracts, fixed
  here because the streams that build their halves share no file and nothing
  later reconciles them;
- a stream's fence is its paths, and the numbered lists are what it builds inside
  them rather than the fence itself;
- the screenshot rounds are taken of a development-only second entry that the
  production build never emits, and they are measured over what the mock shows;
- the delete-everything-under-this-name route is built in this wave and the
  window's control for it waits for Wave 5;
- each stream runs `npm ci` in its worktree and never `npm install`, and the
  kit's allow list carries that one extra exact command;
- the server stream builds the router last and opens its draft only once the
  adapters have merged, rather than declaring the interface twice;
- the recorder gets its key by reading the keys file, once the security policy
  says it may;
- the brand policy's three owed strings are settled in their own commit, gated by
  Rahul, before the web stream opens, and the security policy's one sentence in
  its own commit gated by the Security lead before the recorder runs;
- the web stream builds the sign-in view from the spec's words, with no mock
  behind it and no screenshot round covering it;
- the page calls the real routes from the first day and degrades in plain words,
  rather than being given a stub or a fixture;
- the model ids are the owner's to read and paste, because no session is given
  outbound reach;
- the shared list is the seven rows the table above holds, three of them more
  than the brief names;
- the order is right, and in particular that the adapters stream is the one that
  reaches a pull request first while the other two carry on;
- and that the proof above is measurable rather than asserted.

Linda co-signs because `worktree-server` names `packages/proxy/**` and
`apps/api/src/sign-in.ts`, which this section classes as high risk: they are the
only reader of the keys file, the only part that talks to a provider, the logger
that redacts, and the sign-in.

**Linda co-signs the adapters pull request too**, when it comes, because it
changes `CLAUDE.md`, which `.github/CODEOWNERS` gives to the tech lead. Waves 1
and 2 both co-signed for that reason. Nothing else the adapters stream touches
is owned: `.github/CODEOWNERS` names no row for the root manifest or for
`.prettierignore`, and this section does not ask for one — a row is a change to
three files the checks compare against each other, and it is not this wave's to
make. The web pull request needs Marcus alone unless it ends up naming
`CLAUDE.md` for a repeated mistake, in which case it needs Linda as well.

**Rahul is not pulled in by a plan section.** `.github/CODEOWNERS` gives
`/intent/` to the product owner, and every stream's list ends with
`intent/spindle/plan.md`, so the co-sign rule read literally would put Rahul on
all three stream pull requests and on this one. It does not, and the precedent
is in this file: the Wave 0 fix section was accepted by Linda alone, and it
edited `intent/spindle/plan.md`. What `/intent/` protects is the intent and the
spec — the things a product owner decides. A plan section is accepted by that
section's own gate role, and a stream extending its **own** subsection with a
departure is doing what this section already told it to do. Rahul is pulled in
when the intent or the spec changes, which nothing in Wave 3 does.

Acceptance is `Accepted - Marcus, engineer`, with
`Accepted - Linda, tech lead and release manager` beside it. Both are written by
the owner in the plan session first, before the other three files this commit
carries, since no pull request exists yet to hold them; Claude copies them onto
the header above. Both are then written again as comments on this commit's pull
request, which is where the gate ritual keeps its record.

### Built differently from this section

One thing has already gone otherwise than the order above says. It is recorded
here rather than tidied out of it, and more will be added as the wave runs.

1. **Two of this commit's own files were written before the gate, not after.**
   "Order of work" step 1 puts the guide row and the README's status line after
   acceptance. Both were written before the owner wrote either gate comment. The
   cold read had already run and its record was written, which is the part of
   step 2 that genuinely has to come first; what slipped was the two small
   records that follow. Nothing in either prejudges the decision — neither
   changed when the gate settled the seven shared rows, the recorder's key and
   the brand policy's three strings — and the owner was told before deciding
   rather than after. The section is left as it stands, because the rule it sets
   is the right rule; this is a note that the rule was not kept on its first
   outing.

---

## 2026-09-17 — Wave 3, the build kit: the guards, the settings, the first engineering skill and two helper agents

**Intent:** `intent/spindle/intent.md`, accepted 2026-09-15 by Rahul, product
owner, on pull request #3.
**Spec:** `intent/spindle/spec.md`, merged 2026-09-15 in `a04e46b`.
**Record:** none.
**Gate role for this section:** Linda, tech lead and release manager, because
everything this commit builds sits under `.claude/`, which `.github/CODEOWNERS`
and `config/roles.json` both give the tech lead.
**Accepted:** 2026-09-17 — `Accepted - Linda, tech lead and release manager`,
written by the owner in the kit session, before any code file this section names
was written and before the pull request existed to hold it. Written again as a
comment on this commit's pull request, which is where the gate ritual keeps its
record.

### Why this section exists

The Wave 3 section above covers the three streams and commit 4. It says in as
many words that it does **not** cover the kit, and why: the kit is what teaches
the checks to police those three streams, and one section covering both would be
planning the policeman and the traffic in the same breath. This is that second
section.

Nothing in Wave 3 proceeds past this commit. Three sessions are about to work at
once on one repository; the kit is what stops them treading on each other, what
stops any of them reaching a provider key, and what makes a stream's pull request
turn red by itself when it strays outside its fence rather than relying on a
reviewer's eye.

### Built without a change ticket, which is a departure

Brief §2 opens: "Start this session only after the owner has saved a change
ticket as a session note (owner's turn 2), since it writes hooks and settings;
its first reply names the ticket it holds." The session that wrote this commit
held **no ticket**. The session-start hook reported `Session note: none saved` as
it opened — the file-missing branch of `notePart`, not the too-old or malformed
one — and a session cannot acquire a ticket after it has started, because the
note is read once, at `SessionStart`, inside a ten-minute window.

The owner was told before any file was written, was offered a two-minute restart
that would have met the rule exactly, and chose to carry on. That is written here
rather than tidied away, and three consequences follow, none of them hidden:

1. **The rule was not kept on its first outing.** The rule is still the right
   rule. `protect-paths.ts`, built in this very commit, is what will enforce it
   from the next session onward.
2. **Nothing mechanically stopped the work**, because the guards did not exist
   yet. That is the honest reason it was possible, and it is exactly the gap this
   commit closes.
3. **The ticket mechanism is therefore still unproven end to end.**
   `docs/0-setup/facts.md` carries an open row for a bound note, and this commit
   does not close it. It is carried forward, not claimed.

A likely explanation for the missing note is recorded because it bears on the
mechanism: `notePart` **deletes** the note file the moment it binds. A worktree
made at 14:55 on the same day, `claude/wave-3-build-kit-30b2fb` from
`origin/main`, suggests an earlier session that bound the note and was then
abandoned. If so the owner's turn worked and the note was simply consumed. That
is inference, not measurement, and it is labelled as such.

### What this commit holds

Four guard files, the settings that wire them, the grown steering file, the first
engineering skill, two helper agents, six new rules in the checks, the wave's
four measures, and one dependency install that every stream depends on.

### Files that change

**The hooks.** All TypeScript, all run by Node with no build step, all failing
closed except the formatter. Each is written with the test pattern
`.claude/hooks/session-start.test.ts` already sets: the parts are exported and
called directly with an injected `Deps`, scratch folders come from `mkdtempSync`,
the clock is frozen, no child process is spawned, and any credential-shaped
string in a test is assembled at run time so `scripts/key-scan.ts` does not
refuse the test file itself.

1. `.claude/hooks/lib/decision-log.ts` — new, and first, because the others
   import it. One timestamped line per decision, written with a single append of
   one whole line, into the main checkout's `.claude/logs/`. Each line carries
   the time, the hook, the tool, the decision, the reason, the session id, then
   the working folder or worktree, the branch, and the session's role label. The
   label comes from the session's binding, or from the stream name in a stream
   session. Git ignores the folder, and a copy reaches the evidence folder only
   after the scrub.

   **It holds nothing about a person.** It lives outside `data/<environment>/`,
   so the compliance policy's retention does not reach it and the right answer is
   that it never holds anything to retain: no key, no token, no cookie value, no
   Authorization value, no chat text, no email address.

   **It is also the only debugger this commit has.** The owner's
   `.claude/settings.local.json` denies the session every route to its own
   binding. When a guard refuses and nobody can see why, this log is the one
   place that says which glob matched, which session id was looked up, and
   whether a ticket was found.

2. `.claude/hooks/protect-secrets.ts` — new. `PreToolUse`. Ahead of any edit or
   shell command it stops key files and anything key-shaped from being read or
   written, and its message names the proper route instead. The files it holds
   shut are the Spindle home folder, `**/.env*`, `**/*.env` and `**/keys.env`.
   `keys.env.example` is never blocked.

   **It matches globs against tokens, never substrings against a command.**
   `cat keys.env.example` contains the text `keys.env`; a substring test would
   shut out the one file the spec points every newcomer at. The command is split
   into tokens and each token is glob-matched, and the tests pin all four cases:
   `keys.env.example` allowed, `keys.env`, `../keys.env` and the home-folder path
   refused. This guards against mistakes, not against someone who sets out to
   write the path in pieces, and saying so is more useful than implying otherwise.

3. `.claude/hooks/protect-paths.ts` — new. `PreToolUse`. It refuses edits to the
   recorded replies and to the nine protected globs unless the session holds a
   change ticket, which it finds in the binding the session-start hook wrote
   under the owner's home folder for this session id. It is also **the single
   place the deny list exists in shell form**, read out of commands in either
   shell, because a deny rule never sees what has been wrapped inside `sh -c`.

4. `.claude/hooks/format-on-edit.ts` — new. `PostToolUse`. Once a file has been
   edited it formats and lints that one file by calling the Prettier and ESLint
   libraries straight. **The only hook permitted to fail open**, so that a tool
   gone missing never stops anyone editing. `npm run lint` is the backstop and it
   tolerates no warnings.

**The settings.** `.claude/settings.json` gains the hook entries, the allow list,
the deny list, bypass mode locked off, and plan mode as the mode every session
opens in. Every entry declares Bash as its shell and runs the guard so that any
non-zero result becomes a block.

**The rest.**

5. `.claude/skills/provider-adapter/SKILL.md` — new, carrying the example note,
   with its row in `docs/make-it-yours.md` in this same commit.
6. `.claude/agents/researcher.md` and `.claude/agents/code-simplifier.md` — new,
   the first two files in a folder that does not exist today.
7. `CLAUDE.md` — gains Architecture and a block on verification.
8. `docs/claude-mistakes.md` — new, the fifth shared file the Wave 3 section
   already asked for and the gate already settled.
9. `scripts/checks.ts` — six new rules, and rule 1's cap moved.
10. `scripts/measures.ts` and `scripts/measures.test.ts` — the wave's four
    measures, which the Wave 3 section put here and in no stream.
11. `docs/make-it-yours.md` — the rows every new example and adapt file needs.
12. The four workspace manifests and `package-lock.json` — the one install.
13. `docs/3-build/kit/` — this commit's records.

### Decisions this section settles

**1. The `CLAUDE.md` cap moves from 60 lines to 120, and that is a decision.**
The file is 40 lines today and the checks cap it at 60. The block on verification
the brief asks for is not description that can be trimmed — it is the build, the
tests and the lint each with the line that means they are healthy; the lint
tolerating no warnings; a failing test neither skipped nor deleted; whatever the
tools really printed being what goes into the report; and a red test cured in the
code rather than by rewriting the test. Architecture is four workspaces and what
each one may not do. Compressed into twenty lines, either the new rules arrive as
headings with the reasoning cut away, or the Commands list loses the healthy-
output lines that make it worth having.

So the cap moves, in the open, with the figure chosen to leave room for Wave 4's
verifier line and not much else. The rule's **name** carries the figure —
`CLAUDE.md is 60 lines or shorter` — so the name changes with it, or the checks
print a line that lies about itself. The `docs/make-it-yours.md` row for
`CLAUDE.md` ends "60 lines at most" and changes in the same commit.

The alternative, not taken: leave the cap at 60 and move Architecture and
verification into a longer page under `docs/` that `CLAUDE.md` points at. Rejected
because the rules that most change what a session does would then sit in a file
no session is obliged to read.

**2. `npm ci` joins the allow list as one more exact command.** The Wave 3
section asks for it and the reason is its own: no stream may run `npm install`,
every stream must run `npm ci` in its worktree, and without the rule no stream can
run a test before opening a pull request.

**3. The `provider-adapter` skill gets no row of its own in `config/roles.json`.**
The checks rule at `scripts/checks.ts` compares `config/roles.json` against
`.github/CODEOWNERS` both ways and then demands a `docs/how-we-work.md` signers
row for any `roles.json`-owned path containing `skills/`. `/.claude/` already
gives this skill to the tech lead in both files, so a narrower row buys nothing
and forces an entry into a table that holds policy and template signatures.
`.claude/skills/write-intent/` has its own row only because two roles sign it,
which is a different case. Linda settles this at the gate.

**4. The decision log is proved to survive concurrent writers, or it is not
claimed.** Four sessions will append to one file from separate Node processes on
Windows, and a half-written log is worse than none because it looks complete. One
append of one whole line is the mitigation. The proof runs with more than one
session open, and it does not run in the session that wrote the code.

**5. Three things this commit measures rather than asserts.** Each is a fact
`docs/0-setup/facts.md` does not hold, and standing rule 7 says the record carries
what actually took place.

- **Whether `PreToolUse` fires at all in a desktop session.** It has never been
  seen. Wave 0 offered `Stop`, `SessionStart` and `PreToolUse` hooks to headless
  runs three separate ways and none fired; the later clean test showed
  `SessionStart` firing and `Stop` not. In the app only `SessionStart` has been
  observed. All three guards here are `PreToolUse`. If it does not fire, this
  commit is theatre and the wave stops rather than opening three streams behind a
  guard nobody has seen work.
- **Whether `CLAUDE_PROJECT_DIR` stays at the main checkout inside a worktree.**
  Wave 3's Risk 4 depends on it: it is what puts every stream's log line in one
  file and lets `protect-paths.ts` find the bindings folder. Proved by attempting
  a blocked edit from inside a worktree, before any stream opens.
- **Whether hook wiring takes effect mid-session or only at session start.** If
  the wiring is snapshotted at startup, the session that writes the guards cannot
  exercise them, and the deliberate attempts need sessions of their own. Measured
  by attempting one protected edit immediately after the wiring lands.

**6. `better-sqlite3` is installed, and which of the two the store ended up on is
written down.** It is a native module that compiles or fetches a prebuilt binary
on Windows and on the Linux runner both. The fallback is Node 24's own
`node:sqlite`, which needs no package at all. This commit is where the install
happens, so this commit finds out.

**7. The brief's count of self-loading skills is right, and its count of typed
ones is not.** Spindle holds five skills that load on their own — `brand`,
`compliance`, `security`, `ux` and `write-intent` — and one that does not:
`write-spec`, whose own description says it "Runs only when a person types it by
name, or when the spec job on GitHub runs it; never start it on your own
judgement." `provider-adapter` is the sixth, and it arrives with this commit, so
the brief's six is right only because this commit lands. The brief also says
"the four typed skills are left out". **There is one, not four.** The record
carries the count as it is.

### Order of work

1. This section, and the owner's acceptance of it, before any other file.
2. The one install, on its own, pushed at once — so the runner's verdict on the
   native module arrives while the rest is still being written, and so a failure
   is one revert rather than an excavation.
3. `decision-log.ts` and its tests.
4. The three hooks and their tests, **unwired**.
5. The four measures.
6. The prose: `CLAUDE.md`, `docs/claude-mistakes.md`, the skill, the two agents,
   and every guide row in the same commit as the file that needs it.
7. `.claude/settings.json`: the wiring, the allow list, the deny list, bypass off.
   This is the point of no return, and everything before it is already pushed.
8. The new checks rules, now that every subject they police exists.
9. The deliberate attempts, in sessions of their own, and their records.

### Risks

1. **`PreToolUse` may not fire in the app.** Never measured here. Decision 5
   covers it, and the wave stops rather than pretending.
2. **A session can lock itself out of `.claude/`.** Once the wiring lands, a
   missing binding, a session id that does not match, or a hook that throws means
   the session refuses its own edits — including the edit that would fix it, and
   including the shell command, because `protect-paths.ts` reads commands too.
   There is no in-session recovery and that is deliberate. The recovery is the
   owner's own shell outside the app, and it heals the running session on its
   next tool call, because the guard script is read fresh on every invocation.
   **The guard's refusal message prints that recovery line.**
3. **A `settings.json` that does not parse loads no hooks at all**, and fails
   open where every hook fails closed. No hook can close that, so a checks rule
   does: the file parses, carries every guard entry, each with its shell field,
   each `PreToolUse` command ending in the guard clause and the one `PostToolUse`
   command ending in its fail-open twin.
4. **A guard that fails closed can stop the build it guards.** The shapes are
   exact, `keys.env.example` is never blocked, and the attempts prove both
   directions — the refusal, and an ordinary edit going through untouched.
5. **The owner's own deny list will confound the deliberate attempts.**
   `.claude/settings.local.json` already denies reading and editing the Spindle
   home folder and any Bash command naming it. A refused read of the keys file may
   have been refused by the permission layer before the hook ever ran, and the
   evidence would prove nothing. The decision log is what tells the two apart: a
   log line means the hook saw the call.
6. **That same deny refuses the commands that describe this work.** A pull
   request body or a commit message naming the guarded paths is itself a command
   naming them. The body goes in a file and is passed by file; test names are
   built from parts rather than written as literals, exactly as
   `session-start.test.ts` already does for its fake token.
7. **The lockfile must stop moving before any stream opens.** One install, every
   workspace's dependency block final, every `@types` package in the same pass —
   because `npm run build` typechecks every workspace and no stream is permitted
   to move the lockfile to add one.
8. **`defaultMode` is a default, not a control.** Wave 0 measured the app's mode
   selector beating project settings, and a mid-session write of it not applying
   to that session. It is committed as a statement of intent and nothing here
   counts it as enforcement.

### Alternatives not taken

1. **Guards as deny rules alone, with no hooks.** Rejected: a deny rule never
   sees what has been wrapped inside `sh -c`, which is the whole reason
   `protect-paths.ts` carries the shell form of the list itself.
2. **One combined guard file.** Rejected: the secrets rule and the paths rule
   fail for different reasons and want different messages, and a single file
   would make every key refusal and every infrastructure refusal share one
   blast radius.
3. **Letting the formatter fail closed like the others.** Rejected, and the Wave
   3 section already said why: a Prettier gone missing would stop anyone editing,
   and the backstop that actually matters is `npm run lint` with no warnings
   tolerated.
4. **Teaching `session-start.ts` to re-mint a binding on `resume`, `clear`,
   `compact` and `fork`.** Real: `/clear` fires SessionEnd, the binding is
   deleted, and the next start carries a source the note entry's matcher does not
   cover — so a ticketed session silently becomes ticketless and looks identical.
   Not taken here because it edits a Wave 0 file this commit has no other reason
   to open. `CLAUDE.md` gains the rule instead, and the gap is named rather than
   closed.

### Proof

- `npm test`, `npm run lint`, `npm run build`, `npm run checks` and
  `npm run wording-check` all pass. `npm run checks` gave
  `10 passed, 0 failed, 0 skipped` on main and gives 16 rules after this commit,
  with none failed. **Two of them skip off a stream branch**, and that is the
  right answer rather than a gap: the plan-sync rule and the paths rule are both
  written against a `worktree-<stem>` branch, so on `main` or on the kit's own
  branch there is nothing for them to measure. They run, and must pass, on every
  stream pull request. An earlier draft of this section promised none skipped;
  that was a figure written before the rules existed, and it is corrected here
  rather than met by having a rule report success for work it never did.
- `npm run smoke` still prints its one line with no keys file present.
- The test count rises, and no skipped, exclusive or pending test is added.
- `npm ci` succeeds against the committed lockfile after `node_modules` is
  deleted, which is what every stream will do and what proves the manifests and
  the lockfile agree.
- `npm run measures` prints a figure or a stated reason for each of the four new
  measures.
- The three measurements under decision 5 are recorded in `docs/3-build/kit/`
  with what actually happened, including an answer that contradicts what this
  section expects.
- Each deliberate attempt is recorded with its refusal and its decision-log line,
  and the log is shown to have survived two sessions writing at once.

### What acceptance means

Linda accepts this section when Linda agrees that:

- the `CLAUDE.md` cap moving to 120 is the right call and the reason above is the
  real one;
- three guards that fail closed and one formatter that fails open is the right
  split, and that the recovery from a self-lockout being the owner's own shell
  outside the app is acceptable rather than a defect;
- the deny list as written closes the Bash route to the session env file, which
  Wave 0 left open and named Wave 3 as the closer of;
- `npm ci` in the allow list and no `npm install` anywhere is the rule the
  streams work under;
- the skill needs no signers row, or that it does and all three files change
  together;
- the three things under decision 5 are measured before a stream opens, and the
  wave stops if `PreToolUse` does not fire;
- and that this commit was built without a change ticket, which is a departure
  from brief §2, recorded above rather than tidied away.

Acceptance is `Accepted - Linda, tech lead and release manager`, written by the
owner before the first code file this section names, copied onto the header
above, and written again as a comment on this commit's pull request.

### Built differently from this section

Recorded here as it happened, rather than tidied out of the section.

1. **No change ticket**, as the section's own opening says. The owner was told
   before any file was written and chose to carry on.
2. **The leftover worktree's folder did not delete.** Git's record of
   `.claude/worktrees/wave-3-build-kit-30b2fb` was removed and its branch
   deleted, but the folder itself is held open by something and `rm` answered
   "Device or resource busy". It is inert — git no longer registers it,
   `.claude/worktrees/` is ignored, and `vitest`, `eslint`, `prettier` and
   `scripts/lib/repo.ts` all exclude it — so it is left on disk and written down
   rather than claimed as removed.
3. **The early push bought nothing, and a draft pull request was opened
   instead.** The order of work says the install is pushed at once so the
   runner's verdict arrives early. It does not: `.github/workflows/pipeline.yml`
   runs on `pull_request` and on pushes to `main`, so a pushed branch gets no run
   at all. The draft was opened to get the verdict, and retitled for the gate
   afterwards.
4. **Decision 6 is settled: the store goes on `better-sqlite3`.** Version 13.0.3
   installed with no native build step and opened an in-memory database on Node
   24.16.0 on Windows. `node:sqlite` is not needed and stays the fallback.
5. **The brief names a variable that does not exist.** Its deny list covers
   "anything naming the release-approval or change-ticket variable". Wave 0 built
   that mechanism on the session note and the binding, not on an environment
   variable, and no such variable is anywhere in the repository. The deny rule
   covers what does exist — the note, the bindings folder, and `SPINDLE_HOME` and
   `SPINDLE_KEYS_FILE`, either of which could move both — and the discrepancy is
   recorded rather than a name being invented to match the sentence.
6. **The `provider-adapter` skill loaded without a session restart**, in the
   session that wrote it. That matches what Wave 0 found for plugin skills and
   extends it to a project skill.
7. **Two of the six new checks rules skip off a stream branch.** See Proof above.
8. **The settings wiring was refused to Claude.** The auto-mode classifier
   declined the edit that adds the allow list, the deny list, the mode settings
   and the guard entries, on the grounds that it widens Claude's own permissions
   and changes its own approval gates. Wave 0 met the same refusal on a smaller
   settings edit and `docs/0-setup/facts.md` records it. It is the owner's to
   apply or to authorise, and nothing here worked around it.
