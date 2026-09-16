Example: replace this with your company's own. See docs/make-it-yours.md.

# How we work

One section per stage, each short enough to read in a minute. The roster is an example; `config/roles.json` holds the same people, and `npm run checks` keeps this page, the roster and CODEOWNERS in step.

## Stage 0 · Set-up

**Roles.** One person plays every role in this teaching project. The names say whose decision each one is.

| Role | Name | Decides | Writes at a gate |
|---|---|---|---|
| Product owner | Rahul | What is worth doing, and anything users would feel | `Accepted - Rahul, product owner` |
| Tech lead and release manager | Linda | Plans, the steering files, the workflows, releases | `Accepted - Linda, tech lead and release manager` |
| Engineer | Marcus | Steers Claude Code, approves the build plan, marks the pull request ready for review | `Accepted - Marcus, engineer` |
| Security lead | (unnamed) | The security policy | `Accepted - Security lead` |
| Compliance lead | (unnamed) | The compliance policy | `Accepted - Compliance lead` |

**The gate.** Claude stops and posts `Gate: <role> decides <what>`, with the pull request link and three lines of summary. The owner reads the changed files, and reads them line by line wherever the diff touches `.mcp.json`, a deploy script, `.claude/`, or the workflow, action and runner-settings folders under `.github/`. The decision is a pull request comment in a fixed form: `Accepted - <name>, <role>` or `Closed - <reason>`; for triage, `Fix now - <reason>`, `Schedule - <reason>`, `Dismiss - <reason>` or `Route to product owner - <reason>`. Claude retitles the pull request to say what really happened. The owner checks the title, squashes and merges, reads the commit message before confirming, and then types `merged`. A closed pull request stays up as evidence and makes no commit; the work starts again on a new branch.

**Who signs what.** Linda also approves the set-up as a whole.

| What is signed | Path | Signed by |
|---|---|---|
| Security policy | `plugins/house-policies/skills/security/` | Security lead |
| Compliance policy | `plugins/house-policies/skills/compliance/` | Compliance lead |
| UX policy | `plugins/house-policies/skills/ux/` | Rahul |
| Brand policy | `plugins/house-policies/skills/brand/` | Rahul |
| Intent template | `.claude/skills/write-intent/` | Rahul and Linda |
| Spec template | `plugins/house-policies/skills/write-spec/` | Rahul and Linda |

**Adopting the plays.** Stage by stage, in the order of this page: set-up first, then intent, then design, and so on. The order of plays inside a stage waits for the rows of `docs/playbook-map.md`, which are still open.

**One source of truth per artifact.**

| Artifact | Where the truth lives |
|---|---|
| The roster | `config/roles.json` |
| Who owns which path | `.github/CODEOWNERS` |
| The model and the Claude Code version | `config/claude.json` |
| Ports, data folders, cookies, retention | `config/environments.json` |
| The house policies | `plugins/house-policies/skills/` |
| An intent | its own folder under `intent/` |
| A plan for work with no intent | its dated section of `intent/spindle/plan.md` |
| A commit | its pull request page |
| The example files and how to replace them | `docs/make-it-yours.md` |

## Stage 1 · Intent

- **Revisions.** An intent, spec or plan changes through the commits of its own pull request. There are no copies and no wiki page beside it.
- **Where intent lives.** In `intent/`, inside this product repository. It moves to a repository of its own only once intents regularly reach across several repositories.
- **Routing findings.** Something only engineering would notice, such as a flaky test or a slow build, may be accepted by whoever is on call. Anything users would feel goes to the product owner, with `Route to product owner - <reason>`.

## Stage 2 · Design

Someone without engineering skill gets through design in one of two ways:

- **In claude.ai or Cowork**, with the four house policies uploaded as skills and this repository synced read-only. The connector reads but cannot write, so their changes come back through a pull request someone else opens.
- **By merging the intent and pressing Run on the spec job.** The job pushes a branch; the pull request is then opened from the owner's Spindle session. The job is `.github/workflows/write-spec.yml`, and it stops before doing anything until the `claude` environment holds its key, which arrives in Wave 4.

**Writing a spec.** The four house policies must be loaded in the session, and the session proves it before the spec is written. The spec flags every concern the policies raise, each settled by that policy's owner with a gate comment and a date, and closes that section by naming the policies that contradict each other or saying none do. Where settling a concern asks a policy to say something new, the spec records the debt and the policy changes in its own commit. The template is `plugins/house-policies/skills/write-spec/`.

---

**Glossary.** What this repository calls an AI-native software lifecycle also goes by agentic software development, the AI-driven development lifecycle, and spec-driven development when the emphasis is on the written spec.
