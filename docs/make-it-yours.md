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

## 2. Repository settings to re-create

Do this before any workflow runs: a copy made from the template receives files, and nothing else.

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `docs/repository-settings.md` | 0 | Every GitHub setting, with the clicks and the `gh` command for each | Apply each one to your copy, in order |
| `.github/workflows/pipeline.yml` | 0 | Build, lint, test, key scan, checks and audit, plus the no-keys smoke | Change `runs-on` if you use your own runners, and `--audit-level` if your bar differs |
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

## 7. The steering files

| File | Stage | What it is | What to put there |
|---|---|---|---|
| `CLAUDE.md` | 0 | The one page every session reads | Your commands with their healthy output, your conventions, and what Claude gets wrong in your repository; 60 lines at most |
| `.claude/settings.json` | 0 | Session keys, the plugin marketplace and the session hook entries | The `model` and `availableModels` lines to match `config/claude.json`, and the marketplace name |
| `.claude/hooks/session-start.ts` | 0 | Loads the GitHub token, binds a session note and warns on a model mismatch | The home-folder layout (`~/.spindle/`), the 10-minute note window and the 24-hour binding age, near the top of the file |
| `.claude/skills/write-intent/SKILL.md` | 0 | The intent template | Your questions and your intent headings |
| `.mcp.json` | 0 | The MCP servers a session may use; none yet | Only the servers your repository needs, each also named in `allowedMcpServers` and `enabledMcpjsonServers` |

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
