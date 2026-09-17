# Make it yours

Spindle is a worked example, not a template of opinions to adopt. Wherever a file here would really belong to one particular company — its security policy, its people, its ports, its deploy targets — that file ships as an **example**, and this guide is the list of every one of them.

Each example file carries this note at the top, sitting directly beneath the closing `---` of any frontmatter, written as a `#` comment in YAML and as a `//` comment in TypeScript:

> Example: replace this with your company's own. See docs/make-it-yours.md.

A JSON file has nowhere to put a comment, so those are named on a fixed list inside the repository checks instead. Either way, the rule is the same: nothing can carry that note, or sit on that list, without also having a row somewhere below. The checks enforce it, so this guide cannot quietly fall behind the code.

Some files are not examples but are still worth editing — Spindle's own working files, where a company changes a line or two rather than the whole thing. Those get rows too, and their rows name the lines to change.

**The sections follow the order you would actually adopt things in, not the order the repository was built in.** Work down them.

Each stage of the build fills in the rows it creates, and the last one completes the guide. Stage 0's rows are in; sections with no rows yet are waiting for the stage that brings their files.

---

## 1. Start your copy

There are two ways in. **Use this template** on GitHub gives you a new repository holding these files and none of their history. **Clone or download** gives you the same files locally; a download has no `.git` folder, and `npm install` says so and passes over the git hooks until you run `git init` and install again.

Either way, Spindle's records come with the files. They show how Spindle itself was built. Keep them as a worked example, or delete them once your own records start.

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `intent/spindle/plan.md` | 0 | Spindle's dated plan sections, one per commit built without an intent | Start your own plan file; keep this one only as an example |
| `docs/0-setup/facts.md` | 0 | What Spindle measured about Claude Code on its owner's machine | Measure again on your own machines; the answers change with each Claude Code release |
| `docs/0-setup/sign-off.md` | 0 | Who signed Stage 0 for Spindle | Your own signers sign your copy |
| `docs/0-setup/claude-md-init-draft.md` | 0 | The draft `/init` produced before `CLAUDE.md` was cut to a page | Evidence only; delete it once your own `CLAUDE.md` exists |
| `NOTICE` | 0 | Says the screenshots under `docs/` fall outside the MIT grant | Keep it while you keep those screenshots |
| `intent/spindle/intent.md` | 1 | The intent Spindle itself was built from, written with the template | Write your own product's intent; keep this one only as an example |
| `docs/1-plan/sources.md` | 1 | The before-state notes the intent's Problem section was built from | Your own notes on how things stand today |
| `docs/1-plan/conversation.md` | 1 | The conversation that produced the intent, start and end times included | Your own conversation, copied out the same way |
| `docs/1-plan/evidence.md` | 1 | How each piece of Stage 1 evidence was made, and what is missing from it | Your own record; keep nothing you did not really do |
| `docs/1-plan/connector-access.png` | 1 | Which repositories the installed Claude app reaches, with the account name covered | Your own connector's page, scrubbed the same way |
| `intent/spindle/spec.md` | 2 | The spec Spindle was designed from, with nine concerns each settled by its policy's owner | Write your own product's spec with the spec template; keep this one only as an example |
| `design/chat-mock.html` | 2 | The chat window's mock, one standalone page with nothing loaded from the web | Your own mock, however you make it |
| `design/chat-mock.png` | 2 | A picture of that mock, taken with the Playwright tools, which Wave 3 compares screenshots against | A picture of your own mock |
| `docs/2-design/spec-prompt.md` | 2 | The prompt the owner typed to produce the spec, kept word for word | Your own prompt, as you really typed it |
| `docs/2-design/skills-present.md` | 2 | Proof that all four policies were loaded in the session that wrote the spec | Your own proof, taken the same way |
| `docs/2-design/session-export.md` | 2 | The spec session's transcript, turned into Markdown and scrubbed | Your own session, scrubbed the same way |
| `docs/2-design/evidence.md` | 2 | How each piece of Stage 2 evidence was made, and what is missing from it | Your own record; keep nothing you did not really do |
| `docs/3-build/plan-cold-read.md` | 3 | Every round of the cold read of Spindle's Wave 3 plan, and what each round changed | Your own rounds, including the ones that found things; a record holding only the round that passed says nothing |
| `docs/3-build/kit/measurements.md` | 3 | What the build kit actually measured, what it could not, and the one edit Claude was refused | Your own measurements. The value is in the things that did not work, so keep those rather than only the ones that did |

## 2. Repository settings to re-create

Do this before any workflow runs: a copy made from the template receives files, and nothing else.

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `docs/repository-settings.md` | 0 | Every GitHub setting, with the clicks and the `gh` command for each | Apply each one to your copy, in order |
| `.github/workflows/pipeline.yml` | 0 | Build, lint, test, key scan, checks and audit, plus the no-keys smoke | Change `runs-on` if you use your own runners, and `--audit-level` if your bar differs |
| `.github/workflows/write-spec.yml` | 2 | Turns an accepted intent into a spec and pushes a branch; it never opens the pull request | Your marketplace and plugin names, and the environment your Claude key sits on |
| `SECURITY.md` | 0 | How to report a vulnerability | Keep GitHub's private vulnerability reporting, or name your own route; either way, publish no personal email |

## 3. Your account and names

**Your account.** These are the only files allowed to carry the GitHub account name; `npm run checks` fails if it turns up anywhere else.

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `.github/CODEOWNERS` | 0 | Every owned path, each line naming the one account behind all the roles | Your own people or teams, one per role |
| `LICENSE` | 0 | The MIT licence, with the account on its copyright line | Your own name on the copyright line |
| `README.md` | 0 | The front page, which links to the repository by its account | Your product's description, status line and repository link |

## 4. Keys and providers

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `keys.env.example` | 0 | The shape of the keys file that lives outside the project | Your providers' key names, with placeholders that match no credential shape |
| `scripts/key-scan.ts` | 0 | The credential shapes every commit, push and pipeline run refuses | Add the shape of each of your providers' keys to `CREDENTIAL_RULES`, with a test in `scripts/key-scan.test.ts` |
| `config/claude.json` | 0 | The pinned model and the command-line Claude Code version for CI and scripts | Your model and version; `.claude/settings.json` must repeat the model |

## 5. People and gates

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `config/roles.json` | 0 | The one roster: each role's id, name, gate phrase and owned paths | Your roles and people |
| `.github/CODEOWNERS` | 0 | The same ownership, in GitHub's format, with each role in a comment | The same roles as `config/roles.json`; the checks compare them |
| `docs/how-we-work.md` | 0 | The roster, the gate, the table of signers and each stage's working rules | Your roster and signers; the checks compare the table of signers with the roster |
| `.github/pull_request_template.md` | 0 | The fields every pull request fills in | Keep the fields; change the example gate phrase to one of yours |

## 6. Policies

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `.claude-plugin/marketplace.json` | 0 | Registers this repository as a plugin marketplace | Your marketplace name and owner; a new name must also change `extraKnownMarketplaces` and `enabledPlugins` in `.claude/settings.json` |
| `plugins/house-policies/.claude-plugin/plugin.json` | 0 | The house-policies plugin | Your author and description |
| `plugins/house-policies/skills/security/SKILL.md` | 0 | How keys, tokens and logs are handled | Your security policy, its owner and its written source |
| `plugins/house-policies/skills/ux/SKILL.md` | 0 | The rules the chat window follows | Your UX rules, owner and written source |
| `plugins/house-policies/skills/compliance/SKILL.md` | 0 | What may be kept about a person, for how long, and the providers' terms | Your policy; keep the `**Retention:**` line equal to `retentionDays` |
| `plugins/house-policies/skills/brand/SKILL.md` | 0 | The name, the voice and the picker's wording | Your brand rules and your models' wording |
| `plugins/house-policies/skills/write-spec/SKILL.md` | 2 | The spec template: the header, the flagged concerns, the Policy conflicts line and the open-question mapping | Your own spec headings; keep the Policy conflicts line and the rule against inventing one |

## 7. The steering files

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `CLAUDE.md` | 0 | The one page every session reads | Your commands with their healthy output, your conventions, and what Claude gets wrong in your repository; 120 lines at most |
| `.claude/settings.json` | 0 | Session keys, the plugin marketplace and the session hook entries | The `model` and `availableModels` lines to match `config/claude.json`, and the marketplace name |
| `.claude/hooks/session-start.ts` | 0 | Loads the GitHub token, binds a session note and warns on a model mismatch | The home-folder layout (`~/.spindle/`), the 10-minute note window and the 24-hour binding age, near the top of the file |
| `.claude/skills/write-intent/SKILL.md` | 0 | The intent template | Your questions and your intent headings |
| `.claude/hooks/protect-secrets.ts` | 3 | Refuses the key files and anything key-shaped, ahead of any edit or shell command | Your own key file shapes in `SHUT_GLOBS`, and whatever your equivalent of `keys.env.example` is called in `NEVER_BLOCKED` |
| `.claude/hooks/protect-paths.ts` | 3 | Refuses infrastructure edits without a change ticket, and holds the deny list in shell form | Your own protected paths in `TICKET_PATHS`, and your own `DENY_RULES`; the checks hold each rule's `settings` equal to `.claude/settings.json` |
| `.claude/hooks/format-on-edit.ts` | 3 | Formats and lints the one file just edited; the only hook allowed to fail open | Nothing, unless you format with something other than Prettier and ESLint |
| `.claude/hooks/lib/decision-log.ts` | 3 | The one log every guard writes to, one whole line per decision | Your own field list, if you want more than the nine; keep it free of anything about a person |
| `.claude/skills/provider-adapter/SKILL.md` | 3 | How a provider is added or changed, and the rule that a key reaches an adapter only through the accessor | Your providers, your error categories, and your own recorded-reply test |
| `.claude/agents/researcher.md` | 3 | A read-only helper that explores and reports back | Nothing, unless you want it to hold different tools |
| `.claude/agents/code-simplifier.md` | 3 | One tidying pass at the close of a stream | Your own list of what it leaves alone |
| `docs/claude-mistakes.md` | 3 | Every first mistake, dated; a second sighting moves its correction into `CLAUDE.md` | Your own rows. Start it empty and let it fill, rather than copying these |
| `.mcp.json` | 0 | The MCP servers a session may use: Playwright, pinned to one version, isolated, and allowed to reach the loopback ports alone | Only the servers your repository needs, each also named in `allowedMcpServers` and `enabledMcpjsonServers`; keep `--allowed-origins` in step with the ports in `config/environments.json` |

## 8. Environments and deploy

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `config/environments.json` | 0 | Ports, data folder, cookie name and retention for each environment | Your environments; change the compliance policy's retention line with `retentionDays` |

## 9. App stand-ins

| File | Stage | What it is | What to put there |
|---|---|---|---|

## 10. Evals and monitoring

| File | Stage | What it is | What to put there |
|---|---|---|---|

## 11. Enterprise examples

Things Spindle shows the shape of, but deliberately never switches on.

| File | Stage | What it is | What to put there |
|---|---|---|---|

## 12. For teams

What changes once more than one person is involved.

| File | Stage | What it is | What to put there |
|---|---|---|---|
