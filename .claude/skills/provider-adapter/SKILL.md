---
name: provider-adapter
description: How a model provider is added to or changed in Spindle - the shape an adapter takes, how its errors are mapped, and the recorded-reply test behind it. Use whenever work adds a provider, changes one, touches packages/adapters, or changes how a key reaches the code that calls a provider.
---

Example: replace this with your company's own. See docs/make-it-yours.md.

# Adding or changing a provider

**Owners:** Linda, tech lead and release manager.

This is the first engineering skill in Spindle. The four house policies came earlier, in Wave 0, because design could not start without them: the ux and brand policies fix what the window says, and the security and compliance policies fix what may be kept. This one came first among the engineering skills for a narrower reason, and it is worth saying plainly.

**Left alone, every adapter would find its own way to a key.** One would read `process.env`, the next would open the keys file "just to check", a third would take a key as a constructor argument and hold it. Each would look reasonable on its own, and together they would make the spec's rule — that only one part of Spindle reads keys — untrue without any single commit having broken it. A rule that is easy to follow once and hard to follow four times is exactly the kind that belongs in a skill rather than in somebody's memory.

## The one rule everything else serves

**A key reaches an adapter only through the accessor the router hands in.** Never `process.env`. Never a file. Never a constructor. Never a module-level variable that something else filled in.

```ts
type KeyAccessor = () => string | undefined;
```

The router owns the key because the router is the only part allowed to read one. An adapter that goes looking for a key itself has taken that decision away from the one place the spec, the security policy and the checks all agree it belongs.

The same holds for the network:

```ts
type Http = (url: string, init: RequestInit) => Promise<Response>;
```

An adapter reaches the network only through the `Http` it is handed. **That is the seam, and it is the only one.** Three callers hand in three different ones: the router hands in the real fetch, the recorder hands in one that copies the status, the content type and every body chunk on the way past, and a test hands in one that replays a recording. An adapter that calls `fetch` directly cannot be recorded and cannot be tested, and nobody notices until the tests are the ones that need it.

## The shape an adapter takes

```ts
type Adapter = {
  id: string;
  send(request: Request, key: KeyAccessor, http: Http): Promise<Reply>;
  stream(request: Request, key: KeyAccessor, http: Http): AsyncIterable<Chunk>;
};
```

`Request` carries `providerModelId` — the provider's own id, never a picker id. The router looks the entry up in `MODELS` and passes the provider's id across. **An adapter never sees `claude` or `gpt`, and never opens `MODELS`.** Usage rides on the last chunk of a stream, whose text is empty, because that is the only place a streamed reply can carry it.

The full contract is written out in `intent/spindle/plan.md` under "The contract between the router and an adapter". Read it there rather than from memory; this page does not restate the field list, so the two cannot drift.

## How errors are mapped

```ts
type Category =
  | 'no-key' | 'refused' | 'unavailable'
  | 'rate-limited' | 'timed-out' | 'bad-request';
```

`AdapterError` is **thrown, never returned**, and carries `{ category }` and nothing else. No raw body. No provider text. No key. And no code.

**The category and the code are two different things, minted in two different places.** The adapter says what kind of failure it was; the API mints the short code a request carries. An adapter that invents a code has started deciding what the page shows, which is not its job and is not somewhere a provider's wording should be able to reach.

Nothing a provider said comes back in an error. A provider's message can quote the request, and the request can hold what a person typed, which the compliance policy says a log never holds.

## The test behind it

Every adapter is tested by pushing **real recorded replies back through the real parser**. Not a hand-written fixture of what the provider probably sends.

- The recording holds three things: the status, the content type and the body chunks. A test fails on any further field, and on anything shaped like a credential.
- **Where a recording is missing, the test fails outright.** Nothing falls back quietly to a stub, because a stub would make a green run mean nothing.
- No session writes or edits a recording. The owner runs the recorder, outside the app, against real keys. A recording that is wrong is re-recorded, never corrected by hand.
- Recordings are in `.prettierignore`, and `.gitattributes` keeps git from converting their line endings.

## Before you say it is done

Run the adapter checks and **paste what they actually printed** into both the session summary and the pull request body:

```bash
npx vitest run packages/adapters
npm run lint
npm run checks
```

Not a description of what they would print. The real lines. `CLAUDE.md` says why: whatever the tools really printed is what goes into the report.

## When a provider is added

1. Check the provider's model ids on its own catalogue page **on the day**, and pin what is really there. No session has outbound reach, so the owner reads and pastes them.
2. Add the entry to `MODELS`. The label and its line come from the brand policy — never invented here.
3. Add the provider to `packages/proxy/src/terms.ts` only when the Compliance lead has confirmed in writing that its terms were read. Until then the model is switched off, and a present key makes it `terms-not-read` rather than selectable.
4. Add the key's name to `keys.env.example`, with no key in it.
5. Record a reply, and give the new adapter its own row in `docs/make-it-yours.md`.
