# Stage 2 evidence

What this folder holds, how each piece was made, and what it does not hold. Written on
2026-09-15 by the Wave 2 session in the desktop app's Code tab.

| File | What it is |
|---|---|
| `spec-prompt.md` | The prompt the owner typed to produce the spec, word for word |
| `skills-present.md` | What `/context` showed the session had loaded, before the spec was written |
| `session-export.md` | This session's transcript, turned into Markdown and scrubbed |
| `evidence.md` | This file |

The spec itself is `intent/spindle/spec.md`, and the mock is `design/chat-mock.html` with
`design/chat-mock.png` beside it.

## Three pieces of evidence that do not exist, and why

The wave expected the mock to be built in Claude Design: exported as a standalone page,
handed off with a prompt carrying a bundle link, with the conversation and the rounds kept
as evidence. **That is not what happened.** The owner had the mock written in one go by
another Claude session, from the intent, the UX and brand policies, and the concerns this
wave had just settled. Claude Design was not used at all.

So there is no hand-off prompt, no design conversation and no record of rounds, and this
folder holds none of the three. The guide had gained a row for each; all three rows were
taken out again in the same commit.

One line of the wave's done-check asks that no bundle link survives in the committed copy of
the hand-off prompt. **It is met because there is no hand-off prompt at all.** That is not
the same as a link having been found and removed, and it is not written up as though it
were.

## The mock

`design/chat-mock.html` is one file of 10,319 bytes. It holds **no address of any kind** —
no font, no script, no image loaded from the web — which was checked by searching the file
for any `http` address and finding none. So the picture beside it shows the mock exactly as
designed, with nothing standing in for a resource that failed to load.

**It ran ahead of the brand policy once, and was brought back.** Its first version wrote its
own words for a model with no key. The brand policy fixes those words, and the spec written
an hour earlier had recorded two further cases as owed to that policy rather than invented
anywhere in the build. The owner changed the mock so the no-key wording reads exactly
`add a key: see keys.env.example`. What remains is `terms not read`, appended to that line,
and it stands as a proposal: the brand policy decides the words, and the owed change now has
a worked example to decide against.

What the mock shows, checked against the policies line by line: Spindle with a capital S and
its one-line description; the picker with Mock, Claude, GPT and NVIDIA in that order, Mock
selectable and the other three switched off; Mock's line word for word from the brand
policy; the sign-in saying it is a stand-in; the sentence from concern 1 saying that everyone
signing in with the same name shares that history; a conversation carried over from
yesterday; `Enter sends. Shift and Enter start a new line.` spelled out under the box; a
light and a dark scheme; and the independent-project line at the foot.

## The picture of the mock

`design/chat-mock.png` is taken with the Playwright tools that `.mcp.json` names. It could
not be taken in the session that wrote everything else here: MCP servers load only when a
session starts, and this session began before `.mcp.json` named Playwright. It is taken in
the next session on the same branch, and this file says so rather than leaving the gap
unexplained.

**How it is taken, and why not straight from the file.** Playwright is held to the loopback
ports in `config/environments.json` and blocks `file://` navigation by default, so the mock
is served over `http://127.0.0.1:3000` by a throwaway Node server while nothing else holds
that port, and the picture is taken from there. The server is not committed; it lives in the
session's scratch folder. The route was tested in this session before Playwright existed:
the page answered 200 with all of its bytes.

## The proof that the policies were loaded

`skills-present.md` is `/context`, typed by the owner before a word of the spec was written,
kept to counts and generic names. All four policies were listed. Had one been missing the
wave would have stopped there, because a spec written without the policies loaded is worth
nothing as evidence.

`/context` reports what a session loaded. It does not say where an install came from, and
the question Wave 0 left open — whether opening a session registers the marketplace in user
settings — is untouched by it and stays open.

## The prompt

`spec-prompt.md` is the owner's typed prompt, kept word for word, and its own last section
says that the owner had help wording it from another Claude session. The same was true of
Mark's notes in Wave 1, and `docs/1-plan/sources.md` says so there.

`plugins/house-policies/skills/write-spec/SKILL.md` is that prompt turned into a template.

## The session export

The Code tab offers no `/export`; Wave 0 measured that, typing it in full. So a throwaway
script in the session's scratch folder turned this session's own transcript file into
`session-export.md`. It is scrubbed the way `docs/0-setup/session-export.md` describes: home
folders, the Windows user name, the account name, email addresses other than no-reply ones,
and session ids all replaced; the contents of files that tools read left out; the text of
each edit left out, since the files themselves are in the commit.

The page stops while the session was still running, so the commit, the push and the gate
that came after it are not in it.

**Two more things it leaves out**, both wording from outside this repository: the raw
`/context` output the owner pasted, and the wave's lifecycle card, which Claude quoted in its
first message. A note stands where the card was. The output of any command that read the page
back is left out too, since the page is in the commit.

### What the scans found

`node scripts/key-scan.ts --staged` applies the owner's own private pattern file as well as
the shared credential rules, and names a file and a line without ever printing the words.
It was run over this page before anything was committed, and it **refused the first run**:

| Run | Result |
|---|---|
| 1 | 2 findings, both `personal pattern`, both the same thing: the name of a file inside the hand-off folder. `<hand-off file>` was added to the script's replacements |
| 2 | clean |

Reading the page afterwards turned up one thing the scan could not see, and it is recorded
because it shows what a scan of this kind does and does not cover. The Windows user name
survived once, inside a regular expression in one of Claude's own scan commands: the
replacement asked for a word boundary before the name, and the character in front of it was
part of `\b`, so the boundary did not hold. The rule was changed to match the name without a
boundary, which is safe because the account name is replaced before it. The page was built
again and the name is gone.

The key scan did not catch it because its personal rules only build home-path shapes from
that first line, deliberately: the bare name is never matched on its own, since it would fire
on the account name that CODEOWNERS, the licence and the README all carry. So the scan worked
as designed, and reading the result was still worth doing.

`node scripts/wording-check.ts --staged` came back clean on every run.

## What the spec produced, as a count

Nine concerns were flagged. One of the nine is a real contradiction between two policies —
the UX policy keeps a model in the picker while the compliance policy forbids offering it
before its terms are read — and it was settled by defining what offering means rather than by
bending either policy. The other eight are the intent pulling against a policy, or a policy
pulling against a gap in the spec; the spec says so rather than counting them as conflicts.

Settling the nine left three policies owing a wording change: compliance, brand and UX. None
was edited in this commit. Each is its own commit, gated by its own owner, and the spec
carries the list.
