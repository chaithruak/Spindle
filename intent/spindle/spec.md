# Spindle · spec: one chat window where anyone on the team can pick any of our models

Author: Claude, in the Wave 2 design session, from Rahul's prompt
Status: draft
Record: none
Intent: `intent/spindle/intent.md`
Prompt: `docs/2-design/spec-prompt.md`

Written against these four house policies, at these commits:

| Policy | Commit |
|---|---|
| `plugins/house-policies/skills/security/SKILL.md` | `33e67a2` |
| `plugins/house-policies/skills/compliance/SKILL.md` | `33e67a2` |
| `plugins/house-policies/skills/ux/SKILL.md` | `33e67a2` |
| `plugins/house-policies/skills/brand/SKILL.md` | `33e67a2` |

All four were last changed in the same commit, so the four ids read alike. They are listed
one by one anyway, because the next spec will not be so lucky.

## What this is

The design Spindle is built from. It says what the chat window does, what the server behind
it does, and what each of those may and may not keep or send. It does not say how to write
the code; that is the plan's job, one commit at a time.

What exists today: a starter page that shows the shape of the window and whether the API
answers, an API with one route, `/health`, and two empty workspaces, `packages/proxy` and
`packages/adapters`. Everything below is new work, except the ports, the data folder, the
cookie name and the retention figure, which `config/environments.json` already fixes.

## Requirements

### 1. The window

One window holds the conversation, the box to write in and the model picker. Nothing else
competes with them. It is called Spindle, with a capital S and nothing added.

### 2. The model picker

Four models, always in this order, with the brand policy's wording used word for word:

| Model | Label | Line under the label | With no key |
|---|---|---|---|
| Mock | Mock | A stand-in model that answers without a key. | Always available |
| Claude | Claude | Anthropic's model, reached through OpenRouter. | add a key: see keys.env.example |
| GPT | GPT | OpenAI's model, reached through OpenRouter. | add a key: see keys.env.example |
| NVIDIA | NVIDIA | A model served by NVIDIA. | add a key: see keys.env.example |

- The list follows the keys the machine holds. A model whose key is missing stays in the
  picker, switched off, showing its no-key line. It never disappears and it never fails
  quietly.
- **Showing a model switched off is not offering it.** Offering means the model can answer.
  A model becomes selectable only when it has a key **and** its provider's terms have been
  read. Until then it sits in the picker, switched off, saying plainly why: no key, terms not
  read, or both. The brand policy fixes the words for the first of those three today; the
  other two are owed (see **Owed to the policies**).
- Mock needs no key and answers on a fresh copy of Spindle with no keys file at all.
- **The default is the first selectable model in the order above.** Where nothing else can
  be picked, that is Mock, so a fresh copy with no keys works and holds a conversation. Where
  a model is selectable, it is the default and Mock stays in the list as an ordinary choice.
- The picker is the only place a model is chosen. There is no admin screen, and nobody can
  switch a model on or off from inside the window. Turning one on means adding its key to
  the keys file, outside the app.
- Which models have keys is settled by the API, not by the page. The page asks for the
  list; the answer carries five things per model and nothing else: the id, the label, the
  line under the label, whether it can be picked, and — when it cannot — the reason.
- **There are four switched-off reasons**: no key, terms not read, both, and unavailable. The
  last is for a key that is present but refused by its provider, so the screen never says "no
  key" about a key that exists.
- The answer never carries a key, part of a key, a key's length, where a key came from, or
  any file name or path. Saying that a key exists is allowed; saying anything about the key
  itself is not.
- A wrong key and a missing key look the same to the page and take about the same time to
  answer, so watching cannot tell them apart.

### 3. Signing in

- The sign-in is a stand-in and says so everywhere it appears. The button reads
  **Sign in (stand-in)**. It never looks like a real identity check.
- It takes an account name, which is the only identity Spindle has, and a one-time password
  the API prints to the console once when it starts. That password is never written to a
  log file.
- **A name is treated as one person.** Everyone who signs in with the same name shares that
  name's conversations. The sign-in screen says so in plain words, and so does the line
  beside the conversation list. Telling real people apart needs a real sign-in, which is out
  of scope.
- **The password is shared, and the screen says so.** One password serves everyone using
  that copy of Spindle until the API restarts. It is a speed bump, not proof of who anyone
  is, and nothing in Spindle treats it as such. Spindle runs only on machines the team
  already trusts; putting it anywhere the team does not control means replacing this with a
  real sign-in, which is out of scope.
- A signed-in person gets a session cookie, named by the environment in
  `config/environments.json`, holding a session id and nothing more.
- Everyone who signs in gets the identical window. There is no admin view and no view of
  what the team is using.

### 4. Conversations

- A conversation is a list of turns. Each turn holds who wrote it — the person, or a model
  by its picker name — the text, and when it was written.
- Changing the model mid-conversation is the point of the product. The person picks another
  model and asks again in the same conversation, with nothing copied anywhere by hand.
- **The whole conversation travels with the change**, and every earlier turn is labelled
  with who wrote it: the person, or the model by its picker name. Nothing one model wrote is
  passed to another as that model's own words.
- A conversation started yesterday is still there today, and can be carried on. Conversations
  are listed newest first.
- Conversations belong to the stand-in name they were written under, and are listed for
  anyone signed in with that name. They are not shared across names.
- While a reply is on its way the window says so and offers a way to stop it. A stopped
  reply keeps whatever text had already arrived, marked as stopped.

### 5. Keys

- Provider keys live in one file outside the project: `~/.spindle/keys.env`, or wherever
  `SPINDLE_KEYS_FILE` points. `keys.env.example` shows the shape and names two keys today:
  `OPENROUTER_API_KEY`, which serves both Claude and GPT, and `NVIDIA_API_KEY`.
- Only the API process reads that file. The page never receives a key and no response
  carries one.
- **The file is read at start-up.** After that, its modified time is checked whenever the
  availability list is asked for, and it is re-read only when that time has changed. Adding a
  key shows up on the next page refresh, and nothing reads the file constantly.
- **Permissions are checked at start-up.** If the file is readable by anyone other than its
  owner, one warning goes to the console — the fact and nothing more about the path — and
  Spindle carries on.
- A reply already in flight when a key disappears finishes if it can. If the provider refuses
  it, the person sees the ordinary plain-words error and the model switches off at the next
  availability check.
- Nobody signing in ever sees or handles a key. Looking after the keys is one person's job
  and it happens outside the app.
- Spindle runs with no keys at all. A missing key switches its models off in the picker; it
  is never an error page.
- If the keys file cannot be read at all, every provider model is switched off with the same
  "no key" reason and the page is told nothing about the file. Why it could not be read goes
  to the log, for the person running Spindle, and never to the page.
- No key, no token, no cookie value and no Authorization header value reaches a log. The
  logger swaps the value for `[redacted]` and keeps the word in front of it.

### 6. Everyone can use it

Measured against WCAG 2.2 at level AA.

- Every control can be reached and used from the keyboard, and the focus is always visible.
- Enter sends. Shift and Enter together start a new line.
- New replies are announced to screen readers, and each message says who wrote it.
- Text and controls meet AA contrast in both the light and the dark colour scheme.
- The window works at 320 pixels wide and respects a request for reduced motion.

### 7. What is kept, and for how long

- Kept: the stand-in account name, what was written in the conversation, which model
  answered, and when. Nothing else — no real name, no email address, no IP address, no
  device details.
- Kept only in the environment's own data folder, `data/<environment>/`, which git never
  sees.
- **Retention is 30 days**, the `retentionDays` figure in `config/environments.json`. After
  that everything about a person is deleted, not archived. `npm run checks` already fails if
  the compliance policy and that figure disagree, and this spec does not change the number.
- A person may ask for their data to be deleted sooner, and it is: every conversation saved
  under that stand-in name goes.
- **Two things do the deleting.** A sweep runs when the API starts and then on a timer while
  it runs; and anything expired is deleted the moment it is read. So nothing older than 30
  days is ever shown, even on a machine that was switched off for a month.
- **Each sweep writes one line to the log:** the time, and how many conversations it
  deleted. Nothing else. A count names nobody, and without it there is no way to show the
  rule is working.

### 8. What leaves the machine

- Only the text of a conversation, sent to the provider of the model the person picked, and
  only when that provider has a key.
- Mock sends nothing anywhere.
- Nothing is sent that a provider's usage policy forbids.
- **No provider is used at all** until the Compliance lead has read that provider's terms and
  confirmed in writing that a conversation holding another model's replies may be sent to it.
  Until then Mock is the only model that answers, and nothing leaves the machine.
- Every server listens on 127.0.0.1 and nowhere else. Spindle is not a public website.

### 9. Errors and waiting

- An error says in plain words what happened and what the person can do next. It never
  shows a stack trace or a provider's raw response.
- **The page and the console have different audiences.** The page says only what a person can
  act on — that a model refused the request, or that a model is unavailable. The console,
  which only the person running Spindle sees, carries the model, the provider, the time, the
  failure category and a short code for that request.
- **Every failed request gets a short code**, shown once on the page and written once in the
  log, so a report of a failure at about four o'clock becomes a code anyone can look up.
- Neither the page nor the log ever holds a key, conversation text, a provider's raw reply,
  or an email address.
- A provider that fails does not empty the conversation or lose what was typed.

### 10. The shape of the code

- `packages/adapters` holds one adapter per provider, each speaking the same shape: Mock,
  OpenRouter (serving Claude and GPT) and NVIDIA.
- `packages/proxy` routes a message to an adapter. It is the only part that reads keys and
  the only part that talks to a provider.
- `apps/api` serves the page's requests, holds the sessions and owns the data folder.
- `apps/web` is the window.
- Ports, data folders, cookie names and retention are read from `config/environments.json`,
  never copied into code.

## Flagged concerns

Nine. Each says what the trouble is, which policy raises it, and who settles it. The
**Settled by** line is filled in when its owner has decided, with the date.

### 1. A stand-in sign-in cannot really tell two people apart

The intent wants yesterday's conversation to be there when you come back, and wants
conversations kept apart from one another. The only identity Spindle has is a name someone
types at a sign-in the UX policy says must never look like a real identity check, and the
compliance policy allows nothing else to be kept. If two people both sign in as `dev`, they
share a history. The same gap makes "delete my data sooner" hard to honour: there is no
certain way to know which conversations are that person's.

*Policies:* UX, compliance. *Owners:* Rahul, product owner, with the Compliance lead.

**Settled by:** Rahul, product owner, and the Compliance lead, on 2026-09-15 —
`Accepted - Rahul, product owner` and `Accepted - Compliance lead`.

> A stand-in name is treated as one person. Everyone who signs in with the same name shares
> that history, and the window says so in plain words, both on the sign-in screen and beside
> the conversation list. Nothing more is kept about anybody. A request to delete sooner
> removes every conversation saved under that name. Telling real people apart waits for a
> real sign-in, which this project puts out of scope.

Requirements 3, 4 and 7 carry this decision.

### 2. One console password for a whole team

The security policy has the API print a one-time password to the console once, at start-up.
The intent has everyone on the team signing in. Whoever reads that console has to pass the
password to everyone else, by some route Spindle does not control, and it is the same
password for all of them until the API restarts. That is either fine for a stand-in on
someone's own machine, or it is not fine at all, and the difference is a decision.

*Policy:* security. *Owner:* Security lead.

**Settled by:** the Security lead, on 2026-09-15 — `Accepted - Security lead`.

> The one-time password stays as it is. Spindle runs only on machines the team already
> trusts, and the screen says plainly that the sign-in is a stand-in and that everyone using
> this copy shares the same password. It is a speed bump, not proof of who anyone is, and
> nothing in Spindle treats it as such. If Spindle is ever put somewhere people outside the
> team can reach it, this is replaced by a real sign-in, which this project puts out of
> scope.

Requirement 3 carries this decision.

### 3. A second opinion sends one provider's words to another provider

Asking GPT to look at what Claude said is the product. It means the conversation sent to
OpenAI holds text Anthropic's model produced, and the other way round. The compliance policy
allows only the text of a conversation to leave the machine, and forbids sending anything a
provider's usage policy does not allow. Whether these providers' terms allow their output to
travel to a competitor as context is exactly the sort of thing that has to be read, not
assumed.

*Policy:* compliance. *Owner:* Compliance lead.

**Settled by:** the Compliance lead, on 2026-09-15 — `Accepted - Compliance lead`.

> When someone asks a different model for a second opinion, the whole conversation goes
> across, and every earlier turn is labelled with who wrote it: the person, or the model by
> the name in the picker. Nothing another model wrote is passed off as the new model's own
> words. No provider is used at all until the compliance lead has read that provider's terms
> and confirmed in writing that a conversation containing another model's replies may be
> sent. Until then only the pretend model answers, so nothing leaves the machine.

Requirements 4 and 8 carry this decision.

### 4. Nobody has read any provider's terms, so nothing but Mock may be offered yet

The compliance policy offers a provider's model only once the Compliance lead has read that
provider's current terms. That has not happened for OpenRouter, Anthropic, OpenAI or NVIDIA.
The UX policy says a model without a key stays in the picker, switched off, and never
disappears. So on the day Spindle first runs, three models must be visible and must not be
offered, and whether "visible but switched off" counts as being offered is not written down
anywhere. **This is the policy conflict.**

*Policies:* compliance, UX. *Owners:* the Compliance lead and Rahul, product owner, both.

**Settled by:** the Compliance lead and Rahul, product owner, on 2026-09-15 —
`Accepted - Compliance lead` and `Accepted - Rahul, product owner`.

> Showing a model switched off is not offering it. Offering means a model can answer. So the
> picker keeps all four, and each switched-off model says plainly why it is off: no key,
> terms not read, or both. A model becomes selectable only when it has a key and its terms
> have been read.
>
> The compliance policy should say this in those words rather than leaving it to be
> inferred. That wording change is its own commit, owned by the Compliance lead, and this
> spec should record it as owed rather than anyone editing a policy quietly here.

Requirement 2 carries this decision, and the two policy changes it owes are in **Owed to the
policies** below. No policy file is edited by this commit.

### 5. Nothing deletes anything

Retention is 30 days and the policy says deleted, not archived. No part of Spindle deletes
anything today, and the spec above does not say what does it or when. A retention rule with
no sweep behind it is a promise, not a behaviour.

*Policy:* compliance. *Owner:* Compliance lead.

**Settled by:** the Compliance lead, on 2026-09-15 — `Accepted - Compliance lead`.

> Both. A sweep runs when the API starts and then on a timer while it is running, and
> anything expired is also deleted the moment it is read, so nothing older than 30 days is
> ever shown even if the machine was switched off for a month. Deleted means removed, not
> archived.
>
> Each sweep writes one line to the log with the time and how many conversations it deleted,
> and nothing else. A count names nobody, and without it we cannot show the rule is actually
> working.

Requirement 7 carries this decision.

### 6. The page has to learn which models have keys without learning anything about the keys

The picker follows the keys on the machine, and the page never receives a key. Between those
two lies a list of small leaks: a key's length, its first characters, an error that names the
file, a timing difference between a missing key and a rejected one. The spec says the answer
carries an id, a label, a line and whether the model can be picked. It is worth one person
agreeing that is all it carries.

*Policy:* security. *Owner:* Security lead.

**Settled by:** the Security lead, on 2026-09-15 — `Accepted - Security lead`.

> The page gets four things per model and nothing else: the id, the label, the line under
> the label, and whether it can be picked. From now it also gets the reason when it cannot:
> no key, terms not read, or both. Saying a key exists or does not is fine; saying anything
> about a key itself is not. Never send or show a key's length, its first or last
> characters, where it came from, or any file name or path.
>
> If the keys file cannot be read at all, every provider model is switched off with the same
> "no key" reason, and the page is told nothing about the file. The reason goes to the log
> for the person running it, never to the page.
>
> A wrong key and a missing key must look the same to the page and take about the same time
> to answer, so nobody can learn which it was by watching.

Requirements 2 and 5 carry this decision. The last line of it pulls against the UX policy's
plain-words rule for errors; concern 9 settles how far.

### 7. When the keys file is read

The intent says the list follows whatever keys exist on the machine. If the file is read once
at start-up, adding a key means restarting the API, and the person who added it may not know
that. If it is read on every request, Spindle touches a file outside the project constantly
and a wrong file mode shows up as a stutter rather than an error.

*Policy:* security. *Owner:* Security lead.

**Settled by:** the Security lead, on 2026-09-15 — `Accepted - Security lead`.

> Read the keys file at start-up, then check its modified time when the availability list is
> asked for, and re-read only when that time has changed. So adding a key shows up on the
> next page refresh, and nothing reads the file constantly.
>
> At start-up, check the file's permissions. If it is readable by anyone other than its
> owner, print one warning to the console naming no path detail beyond the fact, and carry
> on.
>
> A conversation already in flight when a key disappears finishes if it can; if the provider
> refuses, the person sees the ordinary plain-words error and the model is switched off at
> the next availability check. Nothing about the file is ever shown on the page.

Requirement 5 carries this decision.

### 8. Mock is the default even on a machine full of keys

The UX policy has Mock picked by default so a fresh copy works with no keys. On a machine
where all the keys exist, everyone starts each conversation on the pretend model and has to
change it. That may be the right trade for honesty, or an annoyance that teaches people to
ignore the picker.

*Policy:* UX. *Owner:* Rahul, product owner.

**Settled by:** Rahul, product owner, on 2026-09-15 — `Accepted - Rahul, product owner`.

> Mock is the default only when nothing else can be picked. On a machine where a model is
> selectable, the first selectable model in the picker's order is the default, and Mock stays
> in the list as an ordinary choice. The fresh-copy promise holds: with no keys, Mock is the
> default and everything works.
>
> The UX policy needs rewording to say this, as its own commit owned by me, and the spec
> should record it as owed rather than anyone editing the policy here. Nothing extra is
> remembered about anybody, so the list of what may be kept stays at four items.

Requirement 2 carries this decision, and the policy change it owes is in **Owed to the
policies** below.

### 9. What is left to diagnose a failure with

A log holds nothing a person typed and no provider's raw response, and the screen shows
neither. When someone says "it failed at about four o'clock", what exists to work from is the
model name, the time, and a category of failure. That may be enough. It should be decided
now rather than during the first outage.

*Policies:* security, UX. *Owner:* Security lead, with Rahul, product owner.

**Settled by:** the Security lead and Rahul, product owner, on 2026-09-15 —
`Accepted - Security lead` and `Accepted - Rahul, product owner`.

> Keep the two rules apart by audience. The page says only what a person can act on: "that
> model refused the request" or "that model is unavailable", in plain words, with no detail
> and no raw response. The console, which only the person running Spindle sees, carries the
> real reason: the model, the provider, the time, the failure category and a short code for
> that request. No key, no conversation text, no provider's raw reply, and no email address
> ever goes to either place.
>
> Every request that fails gets that short code, shown once on the page and written once in
> the log, so "it failed at about four o'clock" becomes a code anyone can look up.
>
> The picker's switched-off reason stays as three plain reasons: no key, terms not read, or
> both. A key that is present but refused shows the model as unavailable rather than as "no
> key", so the screen is not saying something untrue, and the console holds why.

Requirements 2 and 9 carry this decision. It narrows concern 6: a refused key and a missing
key no longer read alike on the page — one says unavailable, the other says no key — while
the rule that neither reveals anything about the key, and that the two take about the same
time to answer, stands. The wording for the unavailable state is owed by the brand policy.

**Policy conflicts:** the UX policy and the compliance policy contradict each other over a
model whose terms have not been read. UX requires it to stay in the picker, switched off,
never disappearing; compliance says it may not be offered at all until the Compliance lead
has read that provider's terms. Concern 4 holds it. No other pair of the four policies
contradicts another. The rest of the pulls above are between the intent and a policy, or
between a policy and a gap in this spec, which is a different thing and is not dressed up as
a conflict.

## Open questions from the intent

The intent left two. Both are answered here or carried forward, in as many words.

### 1. No provider's terms have been read

**Carried forward.** It is the Compliance lead's to close, and writing this spec does not
close it. What the spec did do is turn it from a loose worry into a gate with a shape. Two
concerns settled against it:

- **Concern 3** decided that a second opinion carries the whole conversation across, every
  earlier turn labelled with who wrote it — and that no provider is used at all until the
  Compliance lead has read that provider's terms and confirmed in writing that a conversation
  holding another model's replies may be sent to it.
- **Concern 4** decided that a model may still sit in the picker meanwhile, switched off,
  saying that its terms have not been read.

So today Mock is the only model that answers and nothing leaves the machine. Four readings
are owed, one per provider named in the compliance policy's written source: OpenRouter,
Anthropic, OpenAI and the NVIDIA API Catalog. Each unlocks its own models and nothing else.

### 2. Which open model is "the open model"

**Answered in part, and the rest carried forward.** The provider is decided and already
written down in two places this spec did not invent: `keys.env.example` names
`NVIDIA_API_KEY`, and the brand policy fixes the picker's wording as **NVIDIA**, "A model
served by NVIDIA." So the fourth slot is NVIDIA's, and the window can be built without
waiting. **Which** model served by NVIDIA is still nobody's decision, and is carried forward
to whoever adds the key.

## Owed to the policies

Settling the concerns above asked two policies to say something they do not say yet. Neither
is edited here: a policy changes in its own commit, gated by its own owner. This list is what
that commit owes.

| Policy | What it owes | Owner | Where it came from |
|---|---|---|---|
| compliance | That showing a model switched off is not offering it, and that a model may answer only once it has a key and its provider's terms have been read — in those words, rather than left to be inferred | Compliance lead | Concern 4 |
| brand | The exact picker wording for the three switched-off reasons it does not cover yet: terms not read; terms not read with no key either; and unavailable, for a key that is present but refused. The no-key wording it already fixes stays as it is | Rahul, product owner | Concerns 4 and 9 |
| ux | That the default is the first selectable model in the picker's order, which is Mock only when nothing else can be picked. Today the policy says Mock is picked by default, full stop | Rahul, product owner | Concern 8 |

Until the brand policy carries those words, no wording for the two new cases is invented
anywhere in the build.

## Not in this spec

Taken from the intent's own list, and unchanged by it: real company sign-in or accounts; a
public website; file uploads, images, voice and web search; billing, usage limits and
cost-tracking per person; sharing conversations between people; any model beyond Claude, GPT
and one open model; new paid tools; training or tuning any model; cancelling the chat tools
the team uses today; and moving old conversations out of them.

Two more, added by this spec rather than the intent: there is no admin screen of any kind,
and there is no way to switch a model on or off from inside the window.
