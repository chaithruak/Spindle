# What the installed Claude Code actually does

Measured on 2026-09-14, on the owner's Windows machine, before any of Wave 0's
build files were written. Section 1 of the Wave 0 brief asks these questions;
the answers below are what the tools on this machine actually did, not what the
documentation promises. Where something could not be measured it is marked
**OPEN** and left unanswered rather than filled in.

Counts and generic descriptions only. No server, plugin or skill belonging to
the owner is named here, and no path that contains a person's name.

> **2026-09-15.** Wave 0 moved to the desktop app's Code tab, and the launcher
> these terminal notes mention will never be written. The terminal entries
> below stay as they were measured; dated notes mark what the move superseded,
> and the desktop measurements are in the last section.

## Versions on the bench

| Thing | Version |
|---|---|
| Claude Code | 2.1.272 |
| Node | v24.16.0 |
| npm | 11.13.0 |
| git | 2.55.0.windows.5 |
| Git Bash | present, under Program Files |
| GitHub CLI (`gh`) | **not installed** — found by neither Git Bash nor PowerShell |

> **2026-09-15.** `gh` 2.100.0 is now found by both shells inside a Code tab
> session, and it is signed in. The app's own bundled Claude Code is 2.1.270,
> older than the command-line 2.1.272 above; see the desktop section.

## The seven flags

All seven exist on this build. Behaviour is as `claude --help` describes it.

| Flag | Exists | What it does here |
|---|---|---|
| `--setting-sources` | yes | Comma-separated list drawn from `user`, `project`, `local`. Naming `project` alone keeps user settings out of the session. |
| `--strict-mcp-config` | yes | Uses only the servers named by `--mcp-config` and ignores every other MCP configuration. Proven below. |
| `--tools` | yes | Picks from the built-in set. An empty string disables all tools, `default` takes them all, otherwise a list such as `Read,Grep,Glob`. |
| `--json-schema` | yes | A JSON Schema for structured output. Print mode only. |
| `--max-budget-usd` | yes | A ceiling on spend. Print mode only. |
| `--worktree` | yes | Short form `-w`. Makes a new git worktree for the session, optionally named. |
| `--model` | yes | Takes an alias or a full model id. |

Two further flags turned out to matter for the launcher and are recorded here
because the brief's design leans on them: `--plugin-dir`, which loads a plugin
straight from a directory for one session, and `--permission-prompts none`,
which makes anything that would prompt deny itself instead of hanging a
headless run.

## `.mcp.json` must not be empty

The brief calls for an empty `.mcp.json`. An empty JSON object is **rejected**,
with an error saying the MCP configuration is invalid because `mcpServers` is
not there. The file has to carry the key with nothing in it:

```json
{ "mcpServers": {} }
```

With that file and `--strict-mcp-config`, a session reported it could see no MCP
tools at all. Outside the launcher's flags this machine has **four** MCP servers
registered: two first-party connectors from claude.ai, one third-party
connector from claude.ai, and one remote HTTP server. None of the four reached a
session started with `--strict-mcp-config --mcp-config .mcp.json`. The isolation
the brief depends on holds.

## How a plugin folder is laid out

A marketplace and the plugin it offers can sit in the same repository:

```
.claude-plugin/marketplace.json
plugins/<plugin-name>/.claude-plugin/plugin.json
plugins/<plugin-name>/skills/<skill-name>/SKILL.md
plugins/<plugin-name>/commands/<command-name>.md
```

`claude plugin validate <path>` checks either manifest. Two things it caught:

- Each entry in the marketplace's `plugins` array needs its own `name`. An entry
  carrying only a `source` is refused, naming that missing field.
- A marketplace with no `description` passes with a warning.

### What the commands are called in the menu

Both skills and commands from a plugin appear under one namespace, prefixed with
the plugin's name and a colon. A plugin named `house-policies` holding a skill
`security` and a command `check-keys` listed as:

```
house-policies:security
house-policies:check-keys
```

There is no separate naming rule for the two. A session listing what it had
available showed them side by side with the built-in skills, which carry no
prefix.

## Getting an edited plugin skill into the next session

This is the question the brief flagged as uncertain, and the answer is the
opposite of what it expected in one respect and matches it in another.

### Declaring the plugin in settings is not enough

A project `.claude/settings.json` holding both of these:

```json
{
  "extraKnownMarketplaces": {
    "<marketplace>": { "source": { "source": "directory", "path": "." } }
  },
  "enabledPlugins": { "<plugin>@<marketplace>": true }
}
```

did **not**, on its own, put the plugin's skills in front of a headless session.
Asked to list its available skills, the session named only the built-in ones.
This was tested twice, before the install and again after uninstalling, with the
same result both times. The plugin subcommands agree: neither the list of
installed plugins nor the list of configured marketplaces showed anything that
only project settings declared.

### An install is needed, once per machine

These are the exact commands, run from the root of the repository:

```
claude plugin marketplace add ./
claude plugin install <plugin>@<marketplace>
```

Notes taken while running them:

- A bare dot as the source is refused, with a message asking for an owner and
  repository, a URL, or a path beginning `./`. The `./` form works, and so does
  an absolute path.
- Adding a marketplace writes its entry into **user** settings, not project
  settings, and says so as it goes.
- The install lands at user scope.

### No update step is needed, and none should be added

A marketplace whose source is a `directory` is **not copied into the plugin
cache**. Nothing appeared for it among the cached marketplaces, and no clone
folder was made at all; marketplaces fetched from GitHub are cloned there, but a
directory source is read where it sits.

The consequence was tested directly. A skill's text and its frontmatter
`description` were edited on disk, and the very next session reported the new
wording, with no plugin update and no restart beyond starting the next session.

So the brief's provisional instruction — that wherever an update step turns out
to be needed it belongs in the launcher, in the eval runner, in the Commands
section of CLAUDE.md and in the guide — **does not apply**. No update step is
needed, and adding one to those four places would be inventing work that does
nothing. This is recorded as a measurement, not a preference.

### Whether they load under the launcher's flags, and headlessly

Once installed, yes, on both counts. A headless run confined to project settings
and to a strict MCP configuration listed the plugin's skill and printed its
edited description back verbatim. Install state lives alongside the plugin cache
rather than in any of the three settings sources, so confining a session to
project settings does not hide an installed plugin.

Before the install, the same run saw nothing. **For anything headless that
cannot rely on a prior install — the eval runner, and any job on GitHub — the
dependable route is `--plugin-dir plugins/<plugin-name>`**, which loaded the
skill and the command with no install and no marketplace at all.

### OPEN — the first-session install offer

The brief speaks of a marketplace prompt that a first session puts up, and the
README is meant to carry its wording. A prompt of that kind cannot appear in a
headless run, and this session has no terminal of its own to start an
interactive one in. **Whether an interactive session offers to install a plugin
that project settings declare, and what that offer says, is unmeasured.** It
needs one interactive session started by the owner in a plain terminal.

## Which shell tools this build registers

**Both.** Asked to name the shell and command-running tools it had, a session on
this build answered that it had Bash and PowerShell. Git Bash is installed,
which is what every guard entry needs, since both hooks run through it.

## OPEN — what the Stop hook does during a headless run

**Unmeasured, and deliberately not guessed at.**

What was tried: a `Stop` hook, a `SessionStart` hook and a `PreToolUse` hook,
each a one-line command that appends to a marker file, offered to headless runs
three different ways — through a project `.claude/settings.json`, through a file
named by `--settings`, and inside a directory that is a trusted git repository
rather than a scratch folder. In every attempt the run finished normally and
**no hook fired at all**, not one of the three, and turning on debug output for
hooks printed nothing about them either.

Why that is not yet an answer: every one of those runs was started from inside a
Claude Code session, and the environment carries a variable marking the run as a
child session. Clearing that variable and its neighbours changed nothing, but
that does not rule out the nesting being the cause. Two explanations remain and
this bench cannot tell them apart:

1. Hooks do not run in print mode at all, in which case the Stop hook Wave 3
   adds is not a control that CI enforces, and the waves that lean on it need
   rethinking.
2. Hooks do not run in a session spawned by another session, in which case they
   work in CI perfectly well and this result is an artefact of how it was tested.

**How to settle it:** the owner runs one headless session from a plain terminal,
with a settings file carrying a `SessionStart` and a `Stop` hook that each
append to a marker file, and then reads the marker file. Output naming both
hooks means explanation 2; an absent marker file means explanation 1.

> **2026-09-15.** The owner ran that test as owner's turn 6: a Start-menu
> PowerShell window with the app shut, a scratch folder whose project settings
> carried a SessionStart marker hook and a Stop marker hook, both run through
> bash, and one `claude -p` run. **The SessionStart marker appeared. The Stop
> marker did not.** So a headless run started outside any session does run
> hooks, which rules explanation 1 out for SessionStart and fits the nesting
> explanation for the terminal's empty result. The Stop hook, though, did not
> fire in that run, and nothing measured here says why. It was a single run.
> Until a Stop hook is shown firing headlessly, Wave 3 cannot count one as a
> control that CI enforces.

### The reduced tool list

Partly answered. A headless session held to `--tools "Read,Grep,Glob"` started,
loaded its skills, read files and answered normally, so nothing about that flag
combination breaks a session. The prompts for diagnosis and for scanning do not
exist yet — they arrive in Wave 6 — so whether **those** prompts still behave
with only those three tools cannot be tested until they are written. It is
marked here so Wave 6 remembers to test it rather than assuming it.

## Putting a skill into claude.ai

The clicks, from the Claude help centre's article on getting started with
skills: **Customize → Skills → the `+` button → Create skill → Upload a skill**,
then upload a ZIP holding the skill's folder. It then appears in the skills
list with a toggle.

Whether switching one on there makes it visible to a local session: the article
says skills are also available to Claude Code and to API users through the code
execution tool, but it **does not say** that a skill enabled on the web reaches a
local session, and nothing here measured it. Treated as "not shared" until
something demonstrates otherwise, which is the safe direction: it means Spindle's
policies have to be installed locally rather than assumed to arrive.

> **2026-09-15.** A Code tab session lists 18 skills under one namespace that
> belongs neither to this repository nor to the built-in set, with Anthropic's
> document-format skills among them. That looks like the account's claude.ai
> skills reaching a local desktop session. It is unconfirmed until the owner
> checks the list against the account, and it says nothing about the terminal.
> Either way the policies are still installed locally, not assumed to arrive.

## Whether the version-control connectors can write

- **claude.ai's GitHub connector: read-only.** Its help-centre article describes
  syncing the names and contents of files on one branch, and states plainly that
  commit history, pull requests and other metadata are not retrieved. Nothing in
  it describes making a commit, a branch or a pull request.
- **Cowork: the same connector, so the same read-only repository access** — but
  on the desktop it can read and write local files directly, without uploads or
  downloads. That is a different route to the same end: a repository cloned onto
  the machine can be edited by Cowork and pushed by the person, even though the
  connector itself cannot write.

This matches what Stage 2 of `docs/how-we-work.md` will describe: a designer
without engineering skill works with the repository synced read-only, and change
reaches the repository some other way.

## Who GitHub records as author of a squash merge

**The documentation does not say, so the answer is "not the owner."**

Two pages of GitHub's own documentation on merge methods were read — the one
about pull request merges and the one on configuring commit squashing. Between
them they describe how commits are combined and how the default message is
built, and **neither addresses who becomes the author or the committer** of the
resulting commit. A related passage notes that an email selector is offered only
to the person who opened the pull request, which points the same way without
settling it: someone merging a pull request they did not open is given no such
choice.

The brief's instruction covers exactly this case — where the documentation
leaves it open, treat the answer as "not the owner".

**What this settles, for the two places later waves use it:** the spec job and
the scan job do **not** open pull requests. Each pushes a branch and stops.
The pull request is opened afterwards from the owner's launcher session with
`gh pr create`, which is already permitted and avoids the closing-and-reopening
dance entirely.

> **2026-09-15.** With no launcher, that pull request is opened from the
> owner's Spindle session in the desktop app instead. The route is unchanged.

## OPEN — what `/context` and `/mcp` leave out

**Unmeasured.** Both are slash commands inside a running interactive session,
and this bench has no terminal to open one in. The brief asks for what they omit
under the launcher's flags, written as counts and generic names.

What is already known and can stand in for part of it: under
`--strict-mcp-config` with an `.mcp.json` holding no servers, a session reported
**no MCP tools whatsoever**, against four servers registered on this machine
outside the project. So `/mcp` should show an empty list. That is an inference
from a session's own report of its tools, not from `/mcp` itself, and the
evidence the brief asks for — the `/mcp` output showing this repository's
servers and no others — still has to be captured from a real session.

**How to settle it:** the owner starts one session through the launcher, runs
`/context` and then `/mcp`, and the output is recorded here as counts and
generic names.

> **2026-09-15.** There is no launcher, so this question becomes which slash
> commands work in the Code tab at all. It is carried in the desktop section's
> table.

## One thing the owner's machine still needs

`gh` is not installed. Steps 3 and 4 of the owner's turns in the Wave 0 brief —
installing the GitHub CLI, reopening PowerShell, and signing in while declining
the offer to authenticate git with those credentials — have not happened yet.
Step 7, which applies the repository settings, cannot run until they do.

The two environment variables holding the owner's playbook copy and the hand-off
are both set, and the private pattern file and the token file both exist in the
owner's home folder, so the rest of the bench is ready.

> **2026-09-15.** Superseded: `gh` is installed, on the app's PATH and signed
> in. A Code tab session can no longer check that the token file exists,
> because every path under that home folder is refused to it, as intended.

---

## The desktop app's Code tab

Measured on 2026-09-15 in the first desktop session, a Local session opened on
the project folder, before any commit 1 file was written. The owner switched
plan mode on part-way through, so most of these measurements were read-only.

### Versions

| Thing | Version |
|---|---|
| Claude Code bundled inside the app (the process that runs the session) | 2.1.270 |
| Claude Code on the command line (the npm global install) | 2.1.272 |
| `gh` | 2.100.0, found by both shells, signed in to the project account |
| Git Bash | 5.3 |

**The two Claude Code versions differ.** `config/claude.json` does not exist yet.
It will pin the command-line version for CI and headless scripts, and the app's
version is recorded here apart from it. The owner has been warned. Check again
whenever the app updates itself.

### Shell tools

Both Bash and PowerShell are registered in a Code tab session, and PowerShell is
the primary one. The Bash tool runs Git Bash.

### What a Code tab session carries in its environment

Only names were printed, never values.

- Every command the session runs carries the variable marking it as a child
  session. It is the same mark the terminal session suspected of stopping
  hooks in nested headless runs.
- Both copy variables, for the playbook copy and the hand-off, are visible.
- `CLAUDE_ENV_FILE` is absent, as expected with no SessionStart hook.
- Auto memory is still on: the session is offered a memory folder for this
  project. Nothing was written to it. Commit 1's `autoMemoryEnabled` false
  turns it off.

### The owner's isolation file, checked by behaviour

Counts only. The file itself was read once, only to count its allow rules.

| Check | Result |
|---|---|
| Allow rules in the file | **1** — the brief expects 0; the owner has been told. It was most likely written by the app when a permission prompt earlier in this session was approved with its "always" choice, since the owner had saved the file with none |
| Plugins installed on the machine / enabled for this folder | 1 / 0 |
| Skills from any plugin | 0 |
| Skills under one account-level namespace (see the note on claude.ai skills) | 18 |
| Built-in skills | 17 |
| Tools from a memory server | 0 |
| Paths under the Spindle home folder, probed with Read, Glob, Grep, Bash and PowerShell | 5 of 5 refused |
| App helper tools present in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13 plus 2 built-in, scheduled tasks 6, Terminal panel 1 | 68 present |
| App helper probes, one per group, each read-only or aimed at an id that does not exist | 5 of 5 refused |
| Personal CLAUDE.md or rules folder in the user folder | none |

The helper tools are **present but refused**: the deny rules stop the calls
without taking the tools out of the list. Two helpers were not probed. One lists
other sessions, and would have shown their names if it had been allowed. The
other sends a message, which is not a read-only call. Both are built-in tools
rather than app servers, and the isolation file had no line for either; the
owner was offered a deny line for each.

### Connectors

The session's connector status lists **one claude.ai connector, with 2 tools**,
and one app server that is not a connector. No other MCP server appears. The
connector's two tools show up under **two prefixes**, one built from its name
and one from its id; whether both lead to the same server is not established.
The owner was given one deny line per prefix, two in all, to add to the
isolation file. The counts after that edit come from a fresh session.

### `gh` inside a session

With no `GH_TOKEN` set, `gh` still works inside a session, on the owner's own
keyring sign-in, whose scopes reach every repository the account holds. The
Spindle-only token therefore does not decide what `gh` can do unless `GH_TOKEN`
is set. This is recorded as a risk in the commit 1 plan.

### Worktrees made by `EnterWorktree`

Called with the name `probe`, it made the folder `.claude/worktrees/probe` on a
branch called `worktree-probe`, based on the tip of `origin/main`. **That is the
`worktree-<stream>` shape Wave 3 needs.** The local settings file was present in
the new worktree even though no `.worktreeinclude` exists yet. Untracked project
files were not, since the worktree is made from the remote branch. The worktree
and its branch were removed straight afterwards, leaving 1 worktree and 0
`worktree-*` branches. Whether a session *started* inside a worktree honours the
copied local file is a separate question, still open below.

### The second desktop session

Measured on 2026-09-15 in a fresh Code tab session, opened after the owner had
edited the isolation file and run the headless marker test. Still before any
commit 1 file was written. Counts only.

| Check | Result |
|---|---|
| Allow rules in the isolation file | **2** — the brief expects 0, and the first desktop session counted 1. Counted by a one-line script that printed the number and nothing else. The owner has been told |
| Skills from any plugin | **18, corrected from 0.** `/context`, typed by the owner, gives every skill under the account-level namespace a plugin carrying that namespace's name as its source, and `/reload-plugins` reports 1 plugin. The first count went by the session's skill list, which shows the namespace but not where it comes from; the first desktop session's 0 rests on the same reading |
| Skills under the account-level namespace | 18, the same 18 |
| Built-in skills | 17 |
| The personal plugin | Switched off for this folder by the owner's file. The one plugin `/reload-plugins` counts carries a different name, so it is not the personal plugin, and none of the personal plugin's skills appear |
| Tools from a memory server | 0 |
| claude.ai connectors in the connector status | 1, with 2 tools. Its status row carries both its name and its id, so the two prefixes the first session saw belong to this one connector |
| Connector tools probed, one per prefix, each read-only | **2 of 2 refused** — the owner's two deny lines hold |
| Other servers in the connector status | 1, the app's scheduled-tasks server, 6 tools |
| Paths under `~/.spindle/`, probed with Read, Glob, Grep, Bash and PowerShell, each aimed at a file that does not exist | 5 of 5 refused |
| App helper tools still in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13, scheduled tasks 6, Terminal panel 1 | 66 present |
| App helper probes, one per group, each read-only or aimed at an id that does not exist | 5 of 5 refused |
| The two built-in tools for listing and messaging other sessions | no longer in the tool list |
| Further app tool groups the brief does not list: suggestion chips and chapters 4, connector control 3, working folder 2, pull request watching 5, sidebar 9, pane view 3, window 4, connector registry 3 | 33 present; not probed, apart from one read-only connector status call, which was allowed |
| Personal CLAUDE.md or rules folder in the user folder | none |

Two further things this session showed:

- **The permission mode is auto.** Two read-only attempts to find which Claude
  Code build runs the session, by walking up the process tree, were refused by
  the auto-mode classifier as credential exploration; the first of them had also
  asked whether a token variable was set. So the app's bundled version was
  **not re-measured** here. The first desktop session's 2.1.270 stands.
- **The session's model is `claude-opus-5`**, the id the commit 1 plan proposes
  to pin.
- **This session's transcript is not fit for evidence as it stands.** The owner
  pasted the isolation file into it whole, and Claude's reply gives a revised
  file back whole. If it is ever rendered as evidence, those two messages are
  removed entirely, not scrubbed line by line. The evidence export the brief asks
  for comes from the building session in any case.

### Slash commands in the Code tab

Typed by the owner into the second desktop session.

| Command | Works | What it gave |
|---|---|---|
| `/context` | yes | A usage report: the model, `claude-opus-5`; tokens by category; a table of 103 MCP tools under 15 server prefixes; and a table of 35 skills, 18 from one plugin and 17 built in. No memory server appears, and nothing from this repository, which has no `.mcp.json` yet. The one claude.ai connector appears twice, as 2 tools under its id and 2 under its name |
| `/reload-plugins` | yes | Reloaded 1 plugin, with 20 skills, 6 agents, 0 hooks and 0 plugin LSP servers. That is two skills more than the session lists; which two, and why they are not listed, is not known |
| `/export` | **not offered** | It is not among the commands the Code tab offers: typing `/expo` narrowed the command menu to six other entries, none of them `/export`. The evidence fallback applies: this session's own transcript, rendered into Markdown and scrubbed |
| `/mcp` | runs, but shows nothing | The owner reports it showed no MCP servers or connectors at all — in the same session where `/context` listed 103 MCP tools under 15 prefixes and the connector status tool listed 1 claude.ai connector and 1 app server. So in the Code tab `/mcp` is not a view of what a session loads. The evidence the brief asks for falls back to the session's own count of MCP tool prefixes |
| `/init` | offered | Listed among the session's skills; it runs for real in the build |

### The third desktop session, which built commit 1

Measured on 2026-09-15 in the Code tab session that wrote the commit 1 files.
The isolation checks ran before any file was written; the rest came up while
building. Counts only.

| Check | Result |
|---|---|
| Allow rules in the isolation file | **0**, as the brief expects. Counted by a one-line script that printed the number and nothing else |
| Skills under the account-level namespace / built in / from the personal plugin | 18 / 17 / 0 |
| Tools from a memory server | 0 |
| Paths under `~/.spindle/`, probed with Read, Glob, Grep, Bash and PowerShell, each aimed at a file that does not exist | 5 of 5 refused |
| App helper tools in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13, scheduled tasks 6, Terminal panel 1 | 66 present |
| App helper probes, one per group, each read-only or aimed at an id that does not exist | 5 of 5 refused |
| claude.ai connectors | 1, with 2 tools under 2 prefixes; one read-only probe per prefix, 2 of 2 refused. No further deny lines are needed |
| Other servers in the connector status | 1, the app's scheduled-tasks server, 6 tools |
| Personal CLAUDE.md or rules folder in the user folder | none |
| Claude Code inside the app, read afresh | **2.1.270**, printed by the session's own executable asked for its version. The command line is still 2.1.272, so the two still differ; the owner has been warned again |

What building showed:

- **Settings reach a running session.** Once `.claude/settings.json` held the
  session keys, including an empty `allowedMcpServers`, this session's
  connector status still listed the same 1 connector and 1 app server. What a
  fresh session loads under those keys is measured there, not here.
- **`/init` runs when Claude calls it as a skill.** Its draft is kept beside
  `CLAUDE.md` as `claude-md-init-draft.md`.
- **Both plugin manifests pass `claude plugin validate`.**
- **The session hook works as a process.** Run by hand against a scratch home
  folder, never the real one: the token part said GitHub features were off with
  no token file; a note saved a moment earlier was bound, then deleted, and the
  output carried a session title; the end part removed the binding; a model
  switch printed the warning; and with `SPINDLE_HEADLESS` set, the token and note
  parts both stood aside. The app has not run it yet.
- **Both dev servers listen on the loopback address only.** `netstat` showed
  3000 and 4000 bound to 127.0.0.1 and nothing else.
- **Stopping a background task does not stop what it started, on Windows.**
  Stopping the session's background `npm run dev` left both node servers
  listening; they were stopped by process id. `npm run smoke` stops its own
  process tree and freed both ports.
- **A Unicode escape can land as the character itself.** A byte-order mark
  written as an escape through a tool call arrived as the invisible character in
  4 files. ESLint caught it, and `CLAUDE.md` now warns about it.
- **The wording check's first run hit three lines.** Two were the owner's links,
  whose addresses share words with the playbook copy; one was a run of words
  that ran into the fixed example note from outside it. Addresses are now left
  out of every run, and fixed wording is cut out before anything is measured.

### The commit hook, tried by the owner

On 2026-09-15 the owner ran three prepared commits from a Start-menu PowerShell
window, with `core.hooksPath` reading `.githooks`. Each put one line, assembled
while the command ran, into a scratch file and tried to commit it.

| Commit carrying | Result |
|---|---|
| A fake OpenRouter key | **Refused.** The key scan printed one finding, `proof.txt:1  OpenRouter key` |
| A home path with its backslashes doubled | **Not refused.** The key scan reported the staged file clean, which means the personal pattern file was found and read, and the commit was made locally. It was never pushed. The owner then moved `main` back to commit 0 with `git reset --mixed origin/main` and removed the scratch file; the build's uncommitted changes were untouched |
| A fake claude.ai bundle address | **Refused.** One finding, `proof.txt:1  claude.ai share or bundle link` |

Why the second got through: the same text, scanned against a scratch pattern
file whose first line is exactly the Windows user name, is caught as a personal
home path, and scanned against one whose first line is a full path, it is not.
So the first line of the owner's real file is not the bare user name. The owner
then confirmed its shape: the name comes after a label and a colon. The key scan
had taken the whole line as the name. It now drops a leading label before
building the path shapes, with a test for it, and the owner's file is left as it
is.

**The retry was refused.** With the fixed key scan, and after the owner had
removed one later line from the pattern file, the same doubled home path was
refused with one finding, `proof.txt:1  personal home path`. The owner unstaged
and removed the scratch file, and `main` still held only commit 0. So all three
prepared commits are now refused. The fourth proof, a commit touching
CODEOWNERS getting through the personal patterns, is commit 1 itself.

**This session's transcript is not fit for evidence as it stands.** While
answering that question, the owner pasted the pattern file's contents into the
session. If this transcript is ever rendered as evidence, that message is
removed entirely, not scrubbed line by line.

### The fourth desktop session, the first the hook ran in

Measured on 2026-09-15 in a fresh Code tab session opened on the project folder
after the commit 1 files were written and before anything was committed. No
session note was saved before it opened. Counts only; values of variables were
never printed, only whether each was set.

**The session hook**

| Check | Result |
|---|---|
| The SessionStart hook in a Code tab session | **Fires.** Its three lines reached the session as it started: the token loaded, the model not named, no note saved |
| The model part at session start | **Compared nothing.** The hook's input carried no model it recognises, so it printed that the session did not say which model it runs, with the pin beside it. The session itself runs `claude-opus-5`. On the app's 2.1.270 the start-of-session model check is therefore silent, not wrong |
| `GH_TOKEN` in Bash commands | set |
| `GH_TOKEN` in PowerShell commands | **not set** |
| `CLAUDE_ENV_FILE` in the commands of either shell | not set in either, so where the env file sits **cannot be read from inside a session** |
| `gh auth status` in Bash | 2 sign-ins listed: the token from `GH_TOKEN` active, the keyring sign-in inactive |
| `gh auth status` in PowerShell | 1 sign-in listed: the keyring sign-in, active |
| Where the env file sits | **`~/.claude/session-env/<session id>/sessionstart-hook-0.sh`**, one folder per session. Found by the owner from a Start-menu PowerShell window: a search of files written in the previous 3 hours for the token's export line, printing only paths with the home folder and ids masked. **3 files** matched, each in its own session folder, so the token sits in plain text in one file per session that ran the hook. Whether those files outlive their sessions is not yet known |
| Session title | none set, as expected with no note |

**Isolation, under commit 1's session keys**

| Check | Result |
|---|---|
| Allow rules in the isolation file | 0. Counted by a one-line script that printed the number and nothing else |
| Skills: account-level namespace / built in / project / from the personal plugin | 18 / 17 / 1 / 0 |
| Skills from the house-policies plugin | **4 of 4 listed** |
| Any prompt about the marketplace or the plugin as the session opened | **none**, the owner reports |
| `claude plugin list` (command line, 2.1.272) | 1 plugin entry, and it is not `house-policies`: the policies are **not installed** on this machine |
| `claude plugin marketplace list` | lists `spindle` with a directory source on the project folder, and lists it **when run outside the project too**, so it is registered in user settings. That is left over from the terminal session's `claude plugin marketplace add ./`; the uninstall it later ran removed the plugin, not the marketplace |
| Which of the two lets the app list the policies | **not known yet.** The app loads the plugin with no install and no prompt, from either the project settings alone or the user-level marketplace entry together with the project's `enabledPlugins`. Removing the user-level entry and opening a fresh session tells them apart |
| The user-level `spindle` marketplace entry, after the owner ran `claude plugin marketplace remove spindle` from a Start-menu PowerShell window | **gone.** `claude plugin marketplace list` names `spindle` 0 times, run outside the project and inside it. Inside it that matches the terminal session's finding that the command-line list does not show a marketplace only project settings declare |
| Permission mode picked in the selector for this folder | Auto, the owner reports |
| `/export` typed in full into the Code tab's message box | **not offered.** The owner's screenshot shows the command menu narrowed to 4 entries, none of them `/export`: one account-level skill whose description holds the word, and 3 other commands. It was not sent, since sending would have picked the highlighted skill. The evidence fallback stands: this session's transcript rendered into Markdown and scrubbed |
| The bar under the message box | shows the mode (Auto), the model (Opus 5) and the effort level (Extra) |
| The model menu opened from that bar | **1 model, Opus 5**, with its effort level set to Extra, the owner reports. That fits `availableModels` narrowing the menu, but the owner skipped the plain-session comparison, so whether the menu would list more without the key is open |
| `/model claude-sonnet-5` sent in the session | **Refused.** The app first asked whether to switch, warning that a session cached for one model is read again in full on the next message and uses more of the limit. Once the owner confirmed, it showed a notice saying Sonnet 5 is restricted by the organisation and the session is still using Opus 5 (both from the owner's screenshots). The notice gives the organisation as the reason, and this session cannot tell whether that wording covers the project's `enforceAvailableModels` or a restriction on the account. The same command in a plain session would tell them apart; the owner skipped that, so it is open |
| The model check on a model switch (PostModelSwitch) | **not triggered**, since the model never changed. While only the pinned model is allowed it cannot be seen firing in a Spindle session |
| Tools from a memory server | 0 |
| Paths under `~/.spindle/`, probed with Read, Glob, Grep, Bash and PowerShell, each aimed at a file that does not exist | 5 of 5 refused |
| App helper tools in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13, scheduled tasks 6, Terminal panel 1 | 66 present |
| App helper probes, one per group, each read-only or aimed at an id that does not exist | 5 of 5 refused |
| claude.ai connectors | 1, with 2 tools under 2 prefixes; one read-only probe per prefix, 2 of 2 refused |
| Further app tool groups (suggestion chips and chapters, connector control, working folder, pull request watching, sidebar, pane view, window, connector registry) | 33 present, not probed |
| The two built-in tools for listing and messaging other sessions | not in the tool list |
| Auto memory | **off.** No memory folder was offered to this session; the first desktop session was offered one |
| What the empty `allowedMcpServers` removed | **nothing.** The 66 helper tools, the 33 further app tools and the connector are all still listed. Claude Code's documentation on managed MCP explains why without any measurement here: the key covers servers a person adds, the in-process servers the host app registers skip it, and connectors the desktop app delivers are governed from the claude.ai organisation's settings instead. So in the desktop app the owner's deny lines, not this key, keep those tools out. The README says so |
| Personal CLAUDE.md or rules loaded into the session | none; the only instructions file the session was given is the project's `CLAUDE.md` |
| Claude Code inside the app / on the command line | 2.1.270 / 2.1.272, still different; the owner has been warned again |

**The repository, measured afresh**

| Command | Result |
|---|---|
| `npm test` | 4 test files, 34 tests, all passed |
| `npm run lint` | no findings; Prettier clean |
| `npm run checks` | 10 passed, 0 failed, 0 skipped |
| `npm run wording-check` | no matches, 73 files measured |
| `npm run build` | built, no TypeScript errors |

**What these measurements set off**

- **The PowerShell entry is written.** PowerShell commands cannot see the token,
  which is the condition the accepted plan attached to it, so
  `.claude/settings.json` now carries an `env` entry setting
  `CLAUDE_CODE_USE_POWERSHELL_TOOL` to `"0"`. The tools reference says that
  variable may be set through a settings file's `env` key, and that `0` turns
  the tool off on Windows. Whether the app's 2.1.270 honours it is measured in
  the next fresh session: the PowerShell tool should be missing from the tool
  list. The README's session keys line now says so.
- **The env-file deny is written.** No command in a session could see the env
  file's name, so the owner found it from outside the app, and
  `.claude/settings.json` now denies `Read(~/.claude/session-env/**)`. The `~`
  keeps any personal path out of the commit. It stops the Read tool only: a
  Bash command could still print the file, and Wave 3's deny list is what
  closes that. The next fresh session checks both that the Read is refused and
  that Bash commands still carry `GH_TOKEN`.
- **The `gh` fallback reaches PowerShell commands today.** In the same session,
  `gh` from Bash ran on the Spindle-only token and `gh` from PowerShell ran on
  the owner's keyring sign-in, whose scopes reach every repository the account
  holds. The PowerShell entry above closes that route once it takes effect; the
  Bash route still falls back to the keyring whenever the token file is missing.

### The fifth desktop session

Measured on 2026-09-15 in a fresh Code tab session opened on the project folder
after the fourth desktop session's changes to `.claude/settings.json`. Commit 1
was still uncommitted, and no session note was saved before it opened. Counts
only; variables were reported as set or not set, never printed.

**The session hook and the two entries the fourth session wrote**

| Check | Result |
|---|---|
| The hook's lines at session start | 3: the token loaded, the model not named with the pin beside it, no note saved |
| `GH_TOKEN` in Bash commands | set |
| `CLAUDE_ENV_FILE` in Bash commands | not set |
| A Read aimed at a file that does not exist under `~/.claude/session-env/` | **Refused.** The deny holds on the app's 2.1.270 |
| Shell tools in the tool list | **Bash only.** The PowerShell tool is gone, so the app's 2.1.270 honours `CLAUDE_CODE_USE_POWERSHELL_TOOL` set to `"0"` through the settings file's `env` key |

**The temporary mode line**

| Check | Result |
|---|---|
| Mode in the bar as the session opened, with Auto picked in the selector and `"defaultMode": "plan"` in project settings | **Auto**, the owner reports, and the session was given no plan-mode instructions. A mode picked in the selector wins over `defaultMode` in project settings |
| The temporary line taken out | **Yes, on the owner's own words.** The session's first edit was refused by the auto-mode classifier, which wanted the owner to say so before a plan default left a settings file. The owner then wrote that the line should be removed, and the second edit went through. `permissions` holds only the Read deny |

**The policies**

| Check | Result |
|---|---|
| Skills from the house-policies plugin | 4 of 4 listed |
| Any prompt about the marketplace or the plugin as the session opened | none, the owner reports |
| `claude plugin list` lines naming `house-policies` | 0: still not installed |
| `claude plugin marketplace list`, run outside the project | **1 entry named `spindle`, with a directory source.** The fourth desktop session counted 0 after the owner removed it, so it is registered in user settings again. This session therefore does not show project settings alone putting the policies in a session, since the user-level entry was there too |
| How the entry came back | **The owner did not add it.** Their PowerShell history shows the remove and the count, and no add after them; no Spindle session ran one. The entry's own last-updated time reads 17:16:13 UTC on 2026-09-15, around when a Spindle session opened, and this session's first `claude` command ran several minutes later. The owner's reading is that the app registered it from this folder's settings as a session opened. That fits, but it is not yet shown: the row for it under "Still to measure" says how |

**Isolation**

| Check | Result |
|---|---|
| Allow rules in the isolation file | 0. Counted by a one-line script that printed the number and nothing else |
| Skills: account-level namespace / built in / project / from the personal plugin | 18 / 17 / 1 / 0 |
| Tools from a memory server | 0 |
| Paths under `~/.spindle/`, probed with Read, Glob, Grep and Bash, each aimed at a file that does not exist | 4 of 4 refused. PowerShell is no longer a tool, so there are four probes, not five |
| App helper tools in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13, scheduled tasks 6, Terminal panel 1 | 66 present |
| App helper probes, one per group, each read-only or aimed at an id that does not exist | 5 of 5 refused |
| claude.ai connectors | 1, with 2 tools under 2 prefixes; one read-only probe per prefix, 2 of 2 refused |
| Further app tool groups (suggestion chips and chapters, connector control, working folder, pull request watching, sidebar, pane view, window, connector registry) | 33 present, not probed |
| The two built-in tools for listing and messaging other sessions | not in the tool list |
| Auto memory | off: no memory folder was offered |
| Worktrees / `worktree-*` branches | 1 / 0 |
| Claude Code inside the app | not read again; the third desktop session's 2.1.270 stands |
| Another session writing to these files | Three rows of the "Still to measure" table below gained text between this session's first read of this file and its first edit. The owner confirmed afterwards that no other Spindle session was working |

**The repository, measured afresh**

| Command | Result |
|---|---|
| `npm test` | 4 test files, 34 tests, all passed |
| `npm run lint` | no findings; Prettier clean |
| `npm run checks` | 10 passed, 0 failed, 0 skipped |
| `npm run wording-check` | no matches, 73 files measured |
| `npm run build` | built, no TypeScript errors |

### The sixth desktop session

Measured on 2026-09-15 in a fresh Code tab session opened on the project folder
after the fifth desktop session. Commit 1 was still uncommitted, and no session
note was saved before it opened. The owner started it with the Wave 0 brief's
first prompt; the brief's opening steps describe the folder as it stood before
the first desktop session, and every one of them was already done here, so this
session took the measurements again instead. Counts only.

**The session hook**

| Check | Result |
|---|---|
| The hook's lines at session start | 3: the token loaded, the model not named with the pin beside it, no note saved |
| Shell tools in the tool list | Bash only |
| A Read aimed at a file that does not exist under `~/.claude/session-env/` | refused |

**Isolation**

| Check | Result |
|---|---|
| Allow rules in the isolation file | 0. Counted by a one-line script that printed the number and nothing else |
| Skills: account-level namespace / built in / project / from the personal plugin | 18 / 17 / 1 / 0 |
| Skills from the house-policies plugin | 4 of 4 listed |
| Tools from a memory server | 0 |
| Paths under `~/.spindle/`, probed with Read, Glob, Grep and Bash, each aimed at a file that does not exist | 4 of 4 refused |
| App helper tools in the tool list: screen and clipboard 27, Browser pane 19, other sessions 13, scheduled tasks 6, Terminal panel 1 | 66 present |
| App helper probes, one per group: a cursor read, a session and a scheduled task looked up by ids that do not exist, a Terminal tab that does not exist, and the Browser pane sent to an outside site | 5 of 5 refused |
| claude.ai connectors | 1, with 2 tools under 2 prefixes; one read-only probe per prefix, 2 of 2 refused |
| Other servers in the connector status | 1, the app's scheduled-tasks server, 6 tools. The status call itself was allowed |
| Further app tool groups (suggestion chips and chapters, connector control, working folder, pull request watching, sidebar, pane view, window, connector registry) | 33 present, not probed |
| The two built-in tools for listing and messaging other sessions | not in the tool list |
| Auto memory | off: no memory folder was offered |
| Instructions files given to the session | the project's `CLAUDE.md` alone |
| The session's model | `claude-opus-5` |
| Worktrees / `worktree-*` branches | 1 / 0 |
| Claude Code inside the app | **2.1.270**, the version this session's own transcript file records against every entry. The command line is still 2.1.272; the owner has been warned again |
| `/export` | still not offered, so this session's evidence is its transcript file rendered by a script, run from outside the project, into `docs/0-setup/session-export.md`. The file holds only some of Claude's messages: several short progress notes written between tool calls never reached it. Claude's first attempt to write the rendering straight into `docs/0-setup/` was **refused by the auto-mode classifier**, which gave no reason; a rendering into the scratch folder was allowed. The owner read it there, asked for two of the owner's own messages to be taken out, and then asked Claude to copy it into the project, which went through. In the project, the wording check hit one line of it, a list of script names matching the hand-off, and that line was cut; the page's header says both |

**What a desktop Spindle session loads.** `/mcp` shows nothing in the Code tab
(see the slash command table), so this is the session's own count of the MCP
tools in its tool list: **103 tools under 15 prefixes**, the same totals
`/context` gave in the second desktop session. **This repository contributes 0
of them**, since `.mcp.json` names no server until Wave 2. The other 15 prefixes
are the app's own servers and the one claude.ai connector, and every group of
them that was probed refused the call.

**The repository, measured afresh**

| Command | Result |
|---|---|
| `npm test` | 4 test files, 34 tests, all passed |
| `npm run lint` | no findings; Prettier clean |
| `npm run checks` | 10 passed, 0 failed, 0 skipped |
| `npm run wording-check` | no matches, 73 files measured |
| `npm run build` | built, no TypeScript errors |
| `git check-ignore -v .claude/launch.json` | ignored, by its line in `.gitignore` |

**Proofs run in a copy with no history.** The working tree's files, less the
ignored ones and less `.git`, were copied into a scratch folder outside the
project: 74 files. Nothing in the project was changed.

| Step | Result |
|---|---|
| `npm ci` | finished; the install printed that the git hooks were passed over because the folder has no `.git`; 165 packages added, 0 vulnerabilities |
| `npm test` | 4 test files, 34 tests, all passed |
| `npm run checks` | 7 passed, 0 failed, 3 skipped. The three skipped rules each said they need git history or a remote |
| `npm run smoke` | the starter page and `/health` both answered with no keys file; ports 3000 and 4000 were free again afterwards |
| The security policy's row taken out of the copy's guide | **red**: 6 passed, 1 failed, 3 skipped, the failure naming the policy file as having no row. With the row put back: 7 passed, 0 failed, 3 skipped |

One thing to know when reading the marketplace row below: `npm run checks`
starts `claude --version` as part of its Windows spawn test, so this session
ran the command-line `claude` twice, once in the project and once in the copy,
a few minutes after it opened.

**Commit 1, pushed.** The owner committed and pushed from a Start-menu
PowerShell window after Linda's approval.

| Check | Result |
|---|---|
| `core.hooksPath` just before the commit | `.githooks`, so the commit went through the key scan and the wording check first |
| The commit | `33e67a2`, 74 files, on main and on GitHub, with local main equal to `origin/main` |
| Author | a GitHub no-reply address, the same kind as commit 0's; the repository sets it locally |
| Remotes | 1, this repository |
| A commit touching CODEOWNERS, which names the account | commit 1 itself touches it, and the key scan's personal patterns let it through |
| The first pipeline run, on the push to main | **failed.** `no-keys-smoke` passed. In the `pipeline` job, Build and Lint passed and Test failed: 6 of 34 tests, all in `scripts/lib/run.test.ts`. The key scan, the repository checks and the audit did not run |
| Why | the tests build a fake Windows install and ask `run.ts` to find it with Windows paths, which only resolve on Windows; the runner is Linux. `run.ts` itself was not at fault |
| What followed | Linda triaged it `Fix now` and accepted a dated fix section in `intent/spindle/plan.md`. The fix runs the Windows lookups only on Windows, adds their counterparts for other systems, and gives every other test a fake install shaped for the system running it: on the owner's machine, 36 tests, 34 passed and 2 skipped. Its pipeline run is recorded on the pull request that carries it |

### After commit 1

Recorded on 2026-09-15 by the sixth desktop session, from what the owner ran in
a Start-menu PowerShell window on the owner's own `gh` sign-in, and from what
this session could read back with the Spindle-only token.

**The fix, merged.** Pull request #1 fixed the tests behind commit 1's red run.

| Check | Result |
|---|---|
| The pull request's own pipeline run, its first | both jobs green. Test on Linux: 36 tests, 34 passed, 2 skipped. The key scan (`clean`, 76 files), the repository checks (10 passed, 0 failed, 0 skipped) and the audit (0 vulnerabilities) ran on GitHub for the first time |
| Merge | squashed into `61e3408` on main at 19:22 UTC. GitHub put ` (#1)` after the title. The author is the owner's no-reply address and the committer is GitHub |
| Co-author lines in the squash message | 2, both naming Claude: the one the description carried, and one GitHub added. No other name |
| The pipeline run on main after the merge | green |
| Who becomes author of a squash merge | for a pull request opened with the owner's own token and merged by the owner: the owner's no-reply address. This is **not** the case the brief asked about, a pull request opened by a workflow token, which stays "not the owner" as recorded above |
| Linda's gate comment | the owner wrote it in this session before merging, but the pull request had **0 comments** when it merged. At the owner's request, Claude posted it from this session at 20:09 UTC, 47 minutes after the merge |

**The repository settings.** Applied by the owner from `docs/repository-settings.md`.

| Setting | Result |
|---|---|
| Main ruleset | created and active, bypass list empty, `current_user_can_bypass` `never`. Read back by Claude as the rules GitHub applies to main: `deletion`, `non_fast_forward`, `pull_request` with squash alone, `required_status_checks` with `pipeline`. GitHub added one parameter the settings file does not ask for, `require_extra_approval_for_unattributed_changes` set to `true`; what it changes is not measured |
| Merging | from the owner's output: squash on, merge commits and rebase off, squash title and message from the pull request, auto-merge off |
| Security | from the owner's checks: secret scanning and push protection `enabled` (both already were before the command ran), CodeQL default setup `configured`, automated security fixes `false`, private vulnerability reporting `true`, Dependabot alerts on |
| Actions: read-only default, pull requests allowed, approval for outside contributors | applied; the owner reported it done. **Not read back**: the Spindle-only token gets HTTP 403, as it has no administration access |
| The `claude` environment | read back by Claude: 1 required reviewer |
| `CLAUDE_ENVIRONMENT_PROTECTED` | applied; **not read back**, HTTP 403 |
| Interaction limit | applied; **not read back**, HTTP 403 |
| The Security and quality tab | showed a count of **1** in the owner's view of the rules page, soon after CodeQL's default setup was switched on. What it counts was not checked |

**A direct push to main, refused.** With nothing uncommitted, the owner made an
empty throwaway commit on main and pushed it. GitHub refused it with `GH013`,
naming two violations: changes must go through a pull request, and the
`pipeline` check is required. The push ended `! [remote rejected] main -> main`.
GitHub's main stayed at `61e3408`; `git reset --hard origin/main` removed the
throwaway, and no branch contains it.

**The rules page screenshot was not taken into the evidence.** The owner's first
picture showed the account name in GitHub's top bar and was pasted into the
session rather than saved as a file. After two rounds of instructions for
cropping and saving it, the owner asked whether it was needed. Claude answered
that it was not, since the rules read back as text and the refused push show the
same thing. `docs/0-setup/` therefore holds no screenshot.

**Now possible, not yet measured.** Commit 1 is on main, so the worktree rows in
the table below no longer wait on the push; they wait on a fresh worktree
session.

### Still to measure

The fifth desktop session settled the Read deny, the PowerShell switch, the mode
selector and the README's marketplace wording, and struck those rows through. It
reopened the question of what puts the policies in a session.

Two rows settled in the second desktop session: the connector tools are refused,
and the headless marker test has run (see the Stop hook section above). The
third desktop session read the app's bundled version afresh, so that row is
settled too. The fourth desktop session settled the hook firing, what each shell
sees, and the policies being listed, and struck those rows through.

| Fact | When it can be measured | How it is settled |
|---|---|---|
| ~~The SessionStart hook fires in a Code tab session~~ | Settled in the fourth desktop session | It fires |
| ~~PowerShell commands see what the hook writes to `CLAUDE_ENV_FILE`~~ | Settled in the fourth desktop session | They do not; Bash commands do |
| ~~Where the env file sits~~ | Settled in the fourth desktop session, by the owner | `~/.claude/session-env/<session id>/sessionstart-hook-0.sh` |
| ~~The Read deny on that folder holds, and Bash commands still carry `GH_TOKEN`~~ | Settled in the fifth desktop session | The Read is refused; Bash commands carry `GH_TOKEN` |
| Whether a session's env file outlives the session | At the restart, by the owner | The owner then recalled opening **2** Spindle sessions in those 3 hours, against **3** matching files; why there is one more file than session is not known. 4 Wave 0 sessions are still open in the sidebar, none archived, with only the fourth desktop session in use. The owner counts the env files holding the token from a Start-menu PowerShell window just before quitting the app and again just after: the same count once every session has ended means the token stays on disk. The sessions are left unarchived until then, so archiving cannot move the count. **Before quitting, counted by the owner during the fifth desktop session: 6** hook env files under `~/.claude/session-env/` holding the token's export line, by a command that printed only the number. That search had no time limit, unlike the earlier 3-hour one, so 6 and 3 are not comparable. The count after quitting is taken by the owner and recorded by the next session. **Counted by the owner during the sixth desktop session, by the same kind of command: 8.** That is 2 more than the fifth session's 6; this session's own start accounts for 1, since its hook reported the token loaded. The owner then listed each matching file's last-written time, printing times alone: 6 fall between 10:12 and 12:17 local time, before the fifth session's count, and 2 at 13:06 and 13:07, around when this session opened. **So all 6 files the fifth session counted were still on disk.** Asked whether the app was quit from the tray between the two counts, the owner thinks that step was missed, so these 8 files **do not show whether an env file outlives a quit**; the question stays open for the next time the app is quit. What wrote the second file at 13:06 or 13:07, when only this session's start is known, is not yet recorded |
| ~~The PowerShell tool is gone once `.claude/settings.json` sets `CLAUDE_CODE_USE_POWERSHELL_TOOL` to `"0"`~~ | Seen in the fourth desktop session itself, some turns after the entry was written: the session's environment details switched to naming Bash as the shell, and a one-line PowerShell call came back as no such tool. Settled in the fifth desktop session | Bash is the only shell tool from the session's start |
| A session note is bound, titles the session and is deleted | Next fresh session, opened with a note saved just before | The hook's note line and the session title; the owner confirms from a Start-menu PowerShell window that the note is gone and a binding exists. **Baseline, taken by the owner during the fourth desktop session before any note was saved:** no note file, and 0 bindings under the Spindle home folder's `sessions` folder. So after the restart, `False` and `1` means the new session's note was bound, and no older binding is in the way |
| The model check fires on a model switch (PostModelSwitch) | **Untestable in a Spindle session** while only the pinned model is allowed: `/model claude-sonnet-5` was refused in the fourth desktop session | Carried to whichever wave first allows a second model; the hook's own tests cover the warning meanwhile |
| Whether the refusal of Sonnet 5 comes from the project's settings or from the account | **Open.** The owner chose to skip the plain-session comparison | The same `/model claude-sonnet-5` in a plain session on a folder without Spindle's settings: refused there too means the account restricts it |
| The local settings file is honoured in a session started in a worktree | **Waits for commit 1 on main.** A worktree is made from `origin/main`, and untracked files do not travel into it, so before the push a worktree session would have no `.worktreeinclude`, no hook and no session keys to test | A worktree session opened from the app; the Spindle home-folder probe must be refused there |
| The app's own worktree option: folder and branch names | Waits for commit 1 on main, for the same reason | The same worktree session |
| Worktree sessions run the main checkout's hooks | Waits for commit 1 on main, for the same reason | The same worktree session |
| Why the Stop hook did not fire in the headless run | Handed to Wave 3 | Wave 3 shows a Stop hook firing headlessly before relying on one |
| ~~The app's bundled Claude Code version, read afresh~~ | Settled in the third desktop session | 2.1.270, unchanged |
| The lowest Claude Code version that will do, for the README | **Partly settled** in the fourth and fifth desktop sessions | Seen working on the app's 2.1.270: the SessionStart hook on `startup`, the token reaching Bash commands, the `env` switch, the Read deny, auto memory off, a model menu listing Opus 5 alone, and the four policies listed. Not yet seen running in the app: the hook's SessionEnd and PostModelSwitch parts, a bound note and its session title, the `resume`, `clear`, `compact` and `fork` sources, and `crossSessionInbound`. The README names 2.1.270 and says which parts are unseen |
| ~~What the README says a first session puts up about the marketplace~~ | Settled in the fifth desktop session | No prompt appeared in the fourth or the fifth desktop session, and the user-level `spindle` entry came back without the owner adding it. The README says both, and says how to remove the entry |
| ~~What `/export` replies when typed in full and sent~~ | Settled in the fourth desktop session | Typed in full, it is still not in the menu |
| That the one plugin `/reload-plugins` counts carries the account's claude.ai skills | Now, by the owner | It is not the personal plugin (see the second desktop session). The owner compares its 18 skills with the account's skills page |
| `/init` | Offered: it is listed among the session's skills | It runs for real in the build, since it writes the CLAUDE.md draft |
| ~~A mode picked in the selector overrides `defaultMode` in project settings~~ | Settled in the fifth desktop session. The fourth desktop session had added `"defaultMode": "plan"` under `permissions` in `.claude/settings.json`, at the owner's request, with Auto picked in the selector; written mid-session, the line did not put that session into Plan mode | The bar read Auto as the fifth desktop session opened: the selector wins. That session took the temporary line out on the owner's words, before commit 1 |
| ~~The model dropdown in a Spindle session~~ | Settled in the fourth desktop session, by the owner | Opus 5 alone is listed |
| Whether `availableModels` is what narrows it | **Open.** The owner chose to skip the plain-session comparison | A plain session on a folder without Spindle's settings, counting the models its menu lists |
| ~~The house policies load in a desktop Spindle session~~ | Settled in the fourth desktop session | 4 of 4 listed |
| ~~What any install offer said when that session opened, at which scope, and whether the plugin was installed~~ | Settled in the fourth desktop session | No offer; not installed |
| Whether project settings alone put the policies in a desktop session, and whether opening a session registers the marketplace in user settings | **Reopened in the fifth desktop session.** The user-level `spindle` entry was back; the owner did not add it, and its last-updated time sits around a Spindle session opening | The owner removes the entry, and from a Start-menu PowerShell window outside the project counts `spindle` in `claude plugin marketplace list`: 0. Then the owner opens a fresh Spindle session and counts again from the same window before the session runs anything. Back at 1 means opening a session registers it; still 0 means that session counts the policies with project settings alone. **Counted by the owner during the sixth desktop session, from a Start-menu PowerShell window in the home folder: 2 matching lines.** That count matched without regard to case, so a line holding the project folder's path counts as well as the entry's name; it shows the entry is registered, not that there are two. Whether the owner removed the entry before this session opened is not yet recorded, and this session had run `claude --version` twice before the count |
| A desktop Spindle session compared with a plain desktop session elsewhere | **Open.** The Spindle side is above; in the fourth desktop session the owner chose to skip the plain side | The owner opens a session in an empty scratch folder and asks it for the same counts |
| The 18 account-level skills are the account's claude.ai skills | Now, by the owner | The owner compares the list with the account's skills page |
