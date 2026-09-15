# Spindle

**Status: Stage 1 of 6, plan. Spindle's intent is in `intent/spindle/intent.md`. The starter page and the API's `/health` run; the sign-in stand-in, the model picker and the chat path are not built yet.**

Spindle is one chat window that can talk to any model, and it is being written in public as a worked example of an AI-native software lifecycle: how an idea is captured, specified, planned, built, tested, shipped and then watched, with a person deciding at every gate.

It is a teaching and demonstration prototype. The point is not the chat app — it is the trail the chat app leaves behind: the intent, the spec, the plan, the reviews, the release records and the checks that really held.

## Running it

1. Prerequisites: Node 24 (`node --version`), and on Windows, Git Bash, because the hooks run through it.
2. `npm install`, then `npm run dev`.
3. Open http://127.0.0.1:3000 and sign in as `dev`, the dev account (a stand-in); the API prints its one-time password when it starts.
4. Pick **Mock** and say hello. Claude, GPT and the NVIDIA model show "add a key: see keys.env.example" until someone adds keys.

Steps 3 and 4 describe where Spindle is heading, not what runs yet. Today step 2 serves a starter page at http://127.0.0.1:3000, and the API answers at http://127.0.0.1:4000/health. Both listen on the loopback address only.

**Signing in is a stand-in.** The `dev` account and its one-time password exist so the app has someone to talk to. They are clearly labelled as a placeholder, and they are never a real identity check.

Once the chat path arrives in Stage 5, Spindle will run on a fresh clone with no API keys at all, because a pretend model is the default. Keys only matter on a machine where somebody adds their own, in a file outside the project that `keys.env.example` describes.

## Before you trust this folder

Opening this folder in Claude Code lets the repository decide some of what happens, so know what it asks for:

- **A plugin marketplace.** `.claude/settings.json` registers this repository as a marketplace and switches on its `house-policies` plugin, which holds four example policies. In the desktop app, a session opened on this folder puts up no prompt about it and lists the four policies with no install. The marketplace also turns up in your own user-level Claude Code settings around the time such a session opens, even though you never added it; `claude plugin marketplace remove spindle` takes it out again. The plugin itself is switched on only by this folder's settings.
- **A session hook.** `.claude/hooks/session-start.ts` runs whenever a session starts or ends and whenever the model changes. It reads a GitHub token and a session note from `~/.spindle/` when they are there, never prints the token, and warns when the model is not the one `config/claude.json` pins. Claude Code hands the token to later Bash commands through a plain-text file it keeps under `~/.claude/session-env/`, and the settings file stops Claude's Read tool opening that folder.
- **Session keys.** The same settings file limits the model to the pinned one, turns auto memory off and refuses messages from other sessions. It allows no MCP servers beyond this repository's, which has none yet, but that list only covers servers you add: in the desktop app it does not reach the app's own tools or the claude.ai connectors the app brings in. If you want those out of a Spindle session, deny them in your own `.claude/settings.local.json`. On Windows the file also switches the PowerShell tool off, because the session's GitHub token reaches Bash commands only.
- **Git hooks.** `npm install` points git at `.githooks`, which scan every commit and push for keys, access links and lifted wording.

**Lowest Claude Code version:** 2.1.270, the build inside the desktop app and the oldest Stage 0 has been checked on. On it the session hook runs when a session starts, the four policies load, and the settings file turns off auto memory and the PowerShell tool. The hook's end and model-switch parts, and the refusal of messages from other sessions, have not been seen working there yet. Headless scripts and CI use 2.1.272, which `config/claude.json` pins.

## What pressing Run costs

No workflow calls Claude yet, so there is no Run button to press. Each Claude job that arrives is listed here with the number of Claude runs one press costs.

## Making it yours

Everything in here that would belong to one particular company — its policies, its people, its environments — ships as a marked example rather than as advice. [docs/make-it-yours.md](docs/make-it-yours.md) lists every one of those files and says what to put in its place.

## About this project

Spindle is an independent teaching project. It is not affiliated with Anthropic, and it is not endorsed by Anthropic.

The source lives at https://github.com/chaithruak/Spindle. Licensed under the MIT Licence. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
