# What the build kit measured

Written in the session that built commit 5, on 2026-09-17. It records what was
actually observed, including the things that were not observed and the one thing
the session was refused. Standing rule 7: nothing is planted.

## Settled here

**The store goes on `better-sqlite3`, not the `node:sqlite` fallback.**
Version 13.0.3 installed with no native build step on Windows, and opening an
in-memory database, creating a table, inserting and reading back all worked on
Node 24.16.0. Every `pipeline` run on `build/kit` concluded `success`, so it
builds and runs on `ubuntu-latest` as well. Plan Risk 10 is closed and the
fallback is not needed.

**`npm ci` reproduces the tree from the committed lockfile.** Run with
`node_modules` removed, which is what every stream will do. It added 318 packages
and did not write the lockfile. `npm audit` reported no vulnerabilities.

**The `provider-adapter` skill loaded in the session that wrote it**, with no
restart and no reload step. That extends what Wave 0 found for plugin skills to a
project skill in `.claude/skills/`.

**The repository's own guards refused this session's work twice**, which is the
most useful evidence in this file because neither was arranged:

1. `scripts/key-scan.ts` refused the commit holding
   `.claude/hooks/protect-secrets.test.ts`, because the test wrote a claude.ai
   share link out in full to check that the guard recognises one.
2. ESLint's `no-irregular-whitespace` refused the lint, because a byte-order mark
   escape, written through a tool call as backslash-u-F-E-F-F, had landed in
   `.claude/hooks/lib/decision-log.ts` as the character itself. It then happened a
   second time in the Markdown row describing the first, and a third time in this
   very file, in the sentence you are reading. ESLint does not read Markdown, so
   only a byte sweep found the second and the third. **Three times in one session,
   every time while writing about the character** - which is the measurement, and
   why the `CLAUDE.md` line now says to sweep for the bytes before committing
   prose about it. Spelling the escape out in words, as this paragraph does, is
   the only form that survived.

Both corrections are in `CLAUDE.md`, and both have rows in
`docs/claude-mistakes.md`.

**The new checks rule refused this session too.** The rule against adding a
skipped test flagged `scripts/checks.test.ts`, whose fixture held `it.skip(` and
its siblings as literals. The markers are now assembled from parts while the test
runs. A rule that catches the file testing it, on its first day, is a rule that
works.

## Not settled, and carried forward

**Whether `PreToolUse` fires at all in a desktop session is still unknown.**
`docs/0-setup/facts.md` records `SessionStart` firing in the Code tab and
headlessly, `Stop` not firing headlessly, and `PreToolUse` not firing in any of
Wave 0's three headless attempts. It has never been tried in a desktop session.
All three guards in this commit are `PreToolUse`.

This session could not test it. Hook configuration is read when a session starts,
so the session that writes the wiring is not governed by it. **The wave stops if
the next session finds that `PreToolUse` does not fire**, because every guard
here would then be decoration.

**Whether `CLAUDE_PROJECT_DIR` stays at the main checkout inside a worktree is
still unknown**, for the same reason: it is proved by attempting a blocked edit
from inside a worktree, and no edit can be blocked until the guards are live.
Plan Risk 4 is carried to the next session.

**None of the brief's deliberate attempts were run.** Reading the keys file, the
canary, the workflow edit with no ticket, the guard rename, the concurrent
decision log and the bypass refusal all need the guards loaded at session start.
They belong to the sessions after this one.

**The skill trigger test was not run**, for a plainer reason: it needs five
differently worded prompts per skill across six skills, and a session that wrote
the skill is the worst possible judge of whether its description triggers.

## The one thing this session was refused

**The auto-mode classifier declined to let Claude write the settings wiring.**
The edit adds the allow list, the deny list, `defaultMode`, the bypass setting
and the four guard entries to `.claude/settings.json`. It was refused on the
grounds that it widens Claude's own permissions and changes its own approval
gates without the owner having asked for that specific change.

Wave 0 met the same refusal on a much smaller settings edit, and
`docs/0-setup/facts.md` records it: a plan default was refused until the owner
said in writing that it should be there.

Nothing here worked around it. The guard files, their tests and the deny list
they expect are all committed; the settings file that wires them is the owner's
to apply or to authorise. Two of the six checks rules — the one holding the
settings deny list equal to the guard's shell copy, and the one requiring every
guard entry to carry its shell field and a matcher including PowerShell — wait
with it, because a rule policing a file that does not yet say anything would be
red on its first day.

## Observed in passing

**`EnterWorktree` did not produce the names Wave 0 recorded.** A worktree made
earlier the same day sat at `.claude/worktrees/wave-3-build-kit-30b2fb` on branch
`claude/wave-3-build-kit-30b2fb`. Wave 0 measured `.claude/worktrees/probe` on
`worktree-probe`, and `intent/spindle/plan.md` leans on that shape for the three
stream branches. This session did not make that worktree and cannot say which
route made it, so this is an observation, not a measurement — but the first
stream session must check before trusting the `worktree-<stem>` name, because the
allow list's `git push -u origin worktree-*` and the kit's paths rule both depend
on it.

**The pipeline does not run on a pushed branch.** It triggers on `pull_request`
and on pushes to `main`. A branch pushed with no pull request open gets no run at
all, so the plan's idea of pushing early for an early verdict only works once a
pull request exists. A draft was opened for exactly that reason.
