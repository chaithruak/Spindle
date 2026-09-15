# Stage 1 evidence

What this folder holds, how each piece was made, and what it does not hold. Written on
2026-09-15 by the Wave 1 session in the desktop app's Code tab.

| File | What it is |
|---|---|
| `sources.md` | Mark's notes on how things stand today, attached to the claude.ai conversation |
| `conversation.md` | The conversation that produced the intent, with its start and end times |
| `connector-access.png` | GitHub's page for the installed Claude app, showing which repositories it reaches |
| `evidence.md` | This file |

## The skill archive

The intent template was uploaded to claude.ai as a skill from an archive built here, out of
the committed template at one named commit:

```
git archive --format=zip --prefix=write-intent/ --mtime=<741c330's commit date> \
  -o dist/skills/write-intent.zip 741c330:.claude/skills/write-intent
```

- **Commit:** `741c330`, main's tip at the time. The template's own last change was `33e67a2`;
  its file is identical at both.
- **SHA-256:** `ce2c69ee42c179e5a5feb6266e2534fdbc4685061f6b2ce4f1e7365bfa85f79a`. Giving the
  archive the commit's own date makes the build repeatable, and a second run produced the
  same digest.
- **Contents:** two entries, `write-intent/` and `write-intent/SKILL.md`.
- The archive sits under `dist/`, which git ignores, so it never enters the repository.

## The connector's repository-access page

The owner captured GitHub's page for the installed Claude app. Claude Code then cropped it to
the main column, which removed GitHub's top bar, both copies of the owner's profile photo,
the owner's name and the settings menu, and covered the account name in the repository row
with a grey box that is deliberately visible. The uncropped original was deleted by the owner.

What the picture shows: the app installed 5 months ago, developed by anthropics; read access
to commit statuses and metadata; read and write access to actions, checks, code, discussions,
issues, pull requests, repository hooks and workflows; "Only select repositories" chosen, with
one repository selected, its account name covered and `/Spindle` left legible.

**Two things the picture settles, which the brief did not expect:**

1. **The app was not installed today.** It had been installed about five months earlier and
   reached more repositories. The owner narrowed it to Spindle alone for this wave.
2. **GitHub's grant includes write.** claude.ai's connector only reads a repository, as its
   help article describes and as Wave 0 recorded, but the installation it runs on holds write
   access at GitHub. Nothing in this wave wrote anything through it; every commit here was
   made locally. The two facts sit side by side, and neither cancels the other.

## Mark's notes

The owner asked Claude to draft the notes while playing Mark, for this teaching demonstration,
and `sources.md` says so on its own third line. The paste arrived with every Markdown mark
escaped by a backslash and with three blank lines between blocks; Claude Code removed the
escapes and the extra blank lines and changed no word. The check was that the file holds the
same 250 words, in the same order, before and after, ignoring markup.

## The conversation

The Code tab offers no `/export`, and neither does claude.ai, so the owner copied the chat out
by hand. The first copy held the opening through the reach question; the second held the
constraints answer through the end. Claude Code joined them in the order they happened, added
the speaker labels, removed the markup escapes and collapsed runs of blank lines, changing no
word. The file's own header says this.

**A stretch is missing and stays missing.** Neither copy held the analyst's questions about
users and about constraints, or Mark's answers to them. The file marks the gap where it falls.
Both questions are answered in the intent itself, and Claude's next line in the conversation
confirms all four analyst answers were written down. Nothing was reconstructed.

## What this folder does not hold

- **The two conversation screenshots the brief asks for.** On 2026-09-15 the owner chose to
  leave them out. They were never taken, and nothing stands in for them.
- **A record of where the intent was told to live.** Recorded here instead: Claude in claude.ai
  offered the file for `intent/one-chat-window/intent.md`, following the template's rule that
  each intent gets a folder named after itself. The owner kept the brief's path,
  `intent/spindle/intent.md`.

## The GitHub connector and Code sessions

After connecting GitHub to claude.ai, the owner asked whether it reaches a desktop Code
session. In this session: the connector status listed 1 claude.ai connector with 2 tools and 1
app server, with no GitHub connector; a search of the tool list found no GitHub connector
tools; and one read-only probe of each of the existing connector's two prefixes was refused, so
the owner's deny lines still hold. This session opened before GitHub was connected, so it
cannot say what a fresh session would load. That is unmeasured.
