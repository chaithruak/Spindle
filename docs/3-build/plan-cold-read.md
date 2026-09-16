# The cold read of the Wave 3 plan

The Wave 3 brief asks for one thing before the plan reaches its gate: that
something with no memory of the interview reads the section, is handed the plan
and the repository and nothing else, and lists every question it would still
have to ask. The section is revised until that list comes back empty. This is
the record of that, all fifteen rounds of it, because a record that held only
the round which passed would say nothing about what the plan was like before.

## What the reader was

The built-in read-only exploring helper, one of the two the brief allows. Each
round was a fresh one: a new reader with its own context, no memory of the
interview that produced the plan and no memory of any earlier round. It could
read and search the repository and nothing else. It could not write, could not
reach the network, and was never told what an earlier round had found.

Each round was handed the same task: read the last dated section of
`intent/spindle/plan.md`, read whatever else in the repository it needed, and
list every question it would still have to ask before it could start work — with
a question counting only if the section genuinely left it open, the answer would
change what got written or whether a pull request passed, and no other file in
the repository already answered it. Style preferences, deferrals the section
makes on purpose, and things a competent engineer would simply decide were ruled
out. From round 7 onwards the task also ruled out things the section explicitly
puts to the gate as two written-out options or assigns to an owner's turn, since
two rounds had raised those as gaps when the section had in fact routed them.

## The rounds

| Round | Questions | What they were about |
|---|---|---|
| 1 | 7 | The route contract did not exist; the brand policy's owed wording; a self-contradiction on change tickets; where the terms-read flag lives; `CLAUDE.md`'s `record` line; the guide rows; the README |
| 2 | 8 | The adapter interface was prose, not types; no session route; the stopped turn had nowhere to live; what a screenshot round could photograph with no API; where the four labels live; the delete-my-data route; the mock's missing controls; whether the file lists were the fence |
| 3 | 5 | The `/api` prefix — the contract contradicted `apps/web/vite.config.ts`, which strips it; a worktree has no `node_modules` and the section forbade the one command that fixes it; `models.ts`'s export shape was prose; how the server compiles against an empty barrel; where the recorder gets a key |
| 4 | 4 | The models route was in the batch that cannot build it; a conversation title with no source; the mock's light-and-dark control in no list; times with no type on the wire |
| 5 | 4 | A terms reading is per provider, not per adapter; whether the picker is a native select; where the recorder run sits in the order; whether acceptance happens before or after the pull request exists |
| 6 | 4 | The providers' HTTP surface, which no session may look up; the workspace manifests, frozen but unnamed; what produces `unavailable`; `send` and `Usage` with no consumer |
| 7 | 5 | What `modelId` means to an adapter; the recorder had no capture seam; `code` minted in two places at once; the no-inventing-words rule was too broad to build under; which streams may name the shared files |
| 8 | 4 | One recording per provider or two; the failure statuses were unwritten; `terms.ts` typed against a package it may not yet read; the `EnterWorktree` argument — bare stem or branch name |
| 9 | **none** | Five wrinkles noted, none blocking: a paragraph contradicting a list, a forward reference written as a backward one, a nullable field against a non-nullable one, the mock's notice described two ways, and one sentence that only parsed against a list |
| 10 | **none** | Confirming the five wrinkles were fixed. Mentioned in passing that three sessions cannot share port 3000 |
| 11 | 1 | The port paragraph written in answer to round 10 was wrong: `scripts/smoke.ts` loads `development` by name, so sending a stream to staging would have it poll the other worktree's servers |
| 12 | **none** | Confirming the rewritten port paragraphs. Three factual slips noted: the smoke's ninety seconds is its deadline, not its duration; a `CLAUDE.md` line count; and what `CLAUDE.md` actually forbids |
| 13 | 1 | The wave owes four measures and the section had left them homeless — `scripts/measures.ts` is in no stream's paths and on no shared list |
| 14 | 2 | Prettier reformats a trimmed recording, and `.prettierignore` was in nobody's reach; and the co-sign paragraph claimed CODEOWNERS owns the root manifest, which it does not. Four factual overstatements noted alongside |
| 15 | **none** | Confirming. Three slips noted: a clause that contradicted the order of work, what `CLAUDE.md` forbids, and what the page actually meets when the API is a draft |

Fifty-one blocking questions over fourteen revisions. Every one of them was a
real gap or a real contradiction, and every one is answered in the section as it
now stands — either by a decision written into it, or by being routed somewhere
a builder does not have to chase: to the gate as two written-out options, to an
owner's turn, or to the build kit's own dated section.

## What the last round said

Round 15 returned `No questions.` Its verdict, in its own words, was that the
section is buildable cold, that the path table is genuinely disjoint, and that
everything left open is either handed to the kit's own section, put to the gate
as two written-out options — the recorder's key, the fifth shared file, the brand
policy's three strings — or assigned to an owner's turn, being the model ids and
the two providers' HTTP surface.

It checked the section's factual claims against the repository rather than
taking them on trust, and reported that these held: the `EnterWorktree` bare-stem
behaviour against `docs/0-setup/facts.md`; `strictPort: true` and the `/api`
rewrite against `apps/web/vite.config.ts`; `scripts/smoke.ts` loading
`development` by name and sitting in no stream's paths; `**/recordings/** -text`
in `.gitattributes` and `recordings-raw/` in `.gitignore`; the loopback origin in
`.mcp.json`; both providers' key shapes in `scripts/key-scan.ts`;
`packages/adapters/src/index.ts` being `export {}`; `CLAUDE.md` at 40 lines
against the 60-line cap in `scripts/checks.ts`; and the "three worktrees in
place" proof holding because `vitest.config.ts`, `eslint.config.js`,
`.prettierignore` and `scripts/lib/repo.ts` all exclude `.claude/worktrees/**`.

## Three corrections made after the last round

Round 15 returned no blocking questions and then noted three sentences that were
loose rather than wrong-in-effect. They were fixed before the commit, so the
section as committed is three sentences different from the text round 15 read.
Saying so is cheaper than pretending the empty list was of the exact bytes that
shipped:

1. A clause saying the adapters barrel is `export {}` "for as long as this
   stream runs" contradicted the order of work, where the adapters merge before
   the web stream catches up. It now says the barrel is `export {}` until the
   adapters merge, which is most of the time that stream runs.
2. A line said `CLAUDE.md` forbids reading `config/environments.json` twice. It
   forbids copying the values into code. Reworded.
3. The web stream's `api.ts` entry said "with nothing listening". Through Wave 3
   the API is listening and answers 404 to every route the contract adds, since
   the server stream stays a draft. The entry now says so, and says the
   plain-words state is the same either way.

None of the three changes what any stream builds, which file it goes in, or the
order of the work.

## What this cost, and what it was worth

Fifteen readings of one plan section is more than the brief expected, and the
section it produced is long. Against that: rounds 3, 11 and 14 each caught a
claim that was false about code already in this repository — the `/api` prefix,
the smoke script's environment, and Prettier reformatting the recordings — and
each of the three would have reddened a pull request or produced a green result
that measured the wrong thing. Round 3 also caught a worktree with no
`node_modules` against a plan that forbade the one command that fixes it, which
would have stopped all three streams within the hour.

The value is not that a reader found problems. It is that the reader had no
memory of the interview, so it could not fill a gap from something the plan
never said. That is what "a newcomer could build from this" means when it is
tested rather than asserted.
