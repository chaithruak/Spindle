# One chat window where anyone on the team can pick any of our models

Author: Mark
Status: draft
Record: pull request #3

## Problem

Based on Mark's notes at `docs/1-plan/sources.md`.

The team uses four different chat tools, and nobody chose them on purpose. Each one
arrived because someone liked it. Claude lives in one browser tab and GPT in another,
one person uses an open model on NVIDIA's site, and someone else uses a plug-in inside
their editor.

A conversation started in one tool cannot move to another. When someone wants a second
opinion, they copy the question across by hand and lose everything that came before.
Nobody can find last week's useful answer, because it sits in someone else's account.

We hold four sets of keys and they are not kept in one place. Some are in personal
notes, some in a shared document, and one was pasted into a chat by mistake and had to
be replaced. When someone leaves, nobody is sure which keys they had, so we replace all
of them.

It costs us three ways. New starters ask which tool to use and get a different answer
from each person. We pay for tools that overlap, without knowing who uses what. And
choosing a model is a habit rather than a decision, so we never compare answers side by
side.

## Proposed outcome

One chat window, running on our own machines, that anyone on the team can sign in to
with a simple stand-in sign-in.

On a Tuesday morning, someone opens that window and:

- picks a model from a list, say Claude, and asks their question
- wants a second opinion, picks GPT or the open model from the same list, and asks
  again without copying anything into another tool
- finds yesterday's conversation still there, and picks up where they left off
- never sees or handles a key

The list of models follows whatever keys exist on the machine. A model the team has no
key for is shown in the list but switched off. With no keys at all, someone can still
try the window with the pretend model.

A month after it exists, these are the things anyone could check to say it worked:

- Everyone uses one window to chat with Claude, GPT or the open model.
- Getting a second opinion means picking another model in the same window, with no
  copying.
- Yesterday's conversation is still there.
- Nobody ever sees a key.
- Someone with no keys can still try it with the pretend model.
- It can be used fully with just a keyboard or a screen reader.

## Affected users and systems

**Users.** Everyone who signs in gets the identical window. There is no admin screen and
nobody can switch models on or off from inside the window. The one different job is
looking after the keys, and it happens outside the app: that person adds or replaces a
key in the one keys file on the machine, and the model list follows. There is no view of
what the team is using.

Some people work only with a keyboard or a screen reader, and the window has to work
fully for them. New starters get exactly the same window as everyone else.

**Systems.** Almost all of this is new. Spindle today has an empty starter page, a small
server that answers a health check, and two empty placeholders: one for the model
connectors, one for the part that routes a message to them. There is no chat window and
no sign-in; the stand-in sign-in is part of this work.

`config/environments.json` already sets the three environments (development, staging,
production) with their ports, data folder, cookie name and a 30-day retention period. It
holds no keys. Keys are never in the project: `keys.env.example` shows only their names,
and the real keys live in one file outside the project.

**Left alone.** The pipeline, the git hooks, the four house policies and `CLAUDE.md`.

## Constraints

The four house rules hold this in:

- **Security.** Keys stay in one safe place. They never appear on screen, in a chat, or
  in any record.
- **Privacy.** We keep only the stand-in name, the conversation, which model answered
  and when. After 30 days it is deleted. Only the chat text goes to the model the person
  picked, and the pretend model sends nothing anywhere.
- **Easy to use.** It works with just a keyboard or a screen reader, on a small screen
  too, and error messages are in plain words.
- **Our name and voice.** It is called Spindle, it uses plain friendly words, and it
  says it is an independent teaching project.

The 30-day retention in `config/environments.json` is fixed. "Yesterday's conversation"
fits inside it, and this work does not change that number.

There is no fixed date. Nothing new is to be spent: it uses the keys we already have,
and stays small and simple.

Not included:

- Real company sign-in or accounts. The stand-in sign-in is enough.
- A public website. It runs on our own machines only.
- File uploads, images, voice, web search.
- Billing, usage limits, or cost tracking per person.
- Sharing conversations between people.
- Any model beyond Claude, GPT and one open model.
- New paid tools.
- Training or tuning any model.
- Cancelling our existing chat tools.
- Moving old conversations out of other tools.

## Open questions

- Our compliance lead reads each provider's terms before we offer that model. That has
  not been done yet for Claude, GPT or the open model, so we do not yet know what their
  rules do and do not allow us to send.
- Which open model is "the open model"? Today one person uses one on NVIDIA's site;
  nobody has decided whether that is the one.
