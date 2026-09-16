---
name: write-spec
description: Turn an accepted intent into a spec, the design a build works from, with every concern flagged and every policy conflict named. Runs only when a person types it by name, or when the spec job on GitHub runs it; never start it on your own judgement, even where an intent is accepted and no spec exists.
disable-model-invocation: true
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# Write a spec

A spec is the design a build works from. It reads an accepted intent and the house policies
together, says what will be built, and flags everything the policies make hard, risky or
unclear so a person can settle it before any code exists.

It does not say how to write the code. That is the plan's job, one commit at a time.

**Owners:** Rahul, product owner, signs this template, and Linda, tech lead and release
manager, co-signs it.

## Before you start

The four house policies must be loaded in the session. Check, and **stop if any is missing**:
a spec written without policy loaded is worth nothing as evidence, and the whole point of
writing it this way is that policy is found now rather than in a review weeks later.

Read the accepted intent, and read the repository it is about. A spec written from the intent
alone will describe a product nobody has started building.

## The shape

```markdown
# <Product> · spec: <the intent's own one line>

Author: <who wrote it>
Status: draft
Record: none
Intent: <path to the intent>
Prompt: <path to the committed copy of the prompt that produced this>

<a table naming each policy file and the commit id it was read at>

## What this is

## Requirements

## Flagged concerns

## Open questions from the intent

## Owed to the policies

## Not in this spec
```

## The header

Name every policy file and the commit id it was read at, one row each, even when they all
read alike — the next spec will not be so lucky. Name the path the prompt was saved to, so
anyone can see what was asked for. `Record: none` until a pull request carries it, then the
pull request's number.

## Requirements

What the thing does, in numbered parts a person can hold in their head. Ground every one in
something real: the intent, a policy, or a file already in the repository. Say which file
fixes a figure rather than repeating the figure loose in prose.

## Flagged concerns

The part that earns the spec its keep.

- **Number them**, so each can be settled one at a time.
- Each says what the trouble is, which policy raises it, and **who owns it** — the policy's
  owner, by name and role.
- Each carries a **Settled by** line, filled in when its owner decides: the name, the date,
  the gate phrase in its fixed form, and the decision in the owner's own words.
- Where a decision changes a requirement, change the requirement and say which ones carry it.
  A spec whose concerns and requirements disagree is two documents.
- Where settling one concern narrows an earlier one, say so where both can be seen. Do not
  quietly rewrite the earlier answer.

**Close the section with a Policy conflicts line.** Either name the policies that contradict
each other and the concern that holds it, or say plainly that none were found. **Never invent
one to fill the line.** Most pulls are between the intent and a policy, or between a policy
and a gap in the spec; neither of those is a conflict, and calling them one wastes the
owner's attention on the day it matters.

## Open questions from the intent

Take **every** question the intent left open. For each, either answer it here, or say in as
many words that it is carried forward, and to whom. None may be dropped, and none may be
quietly answered without saying so. An answer that is partly settled says which part is
settled and which is carried.

## Owed to the policies

When settling a concern asks a policy to say something it does not say yet, write the debt
down here: the policy, what it owes, its owner, and the concern it came from. **Never edit a
policy from inside a spec commit.** A policy changes in its own commit, gated by its own
owner.

## Not in this spec

The intent's own list of what is not included, plus anything this spec rules out that the
intent did not mention. Mark which is which.

## The voice

The brand policy owns the words. Plain words, short sentences, British spelling, models named
the way their makers write them, and nothing that suggests more is built than is built.
