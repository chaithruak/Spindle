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
