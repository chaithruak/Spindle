# The spec prompt, as it was typed

Typed by the owner, as Rahul, into the Code tab session on 2026-09-15, after `/context`
showed the four policies loaded and before any part of the spec was written. It is kept
word for word; `intent/spindle/spec.md` names this path in its header.

`plugins/house-policies/skills/write-spec/SKILL.md` is this prompt turned into a skill, so
the next spec is written the same way rather than from memory.

---

Read intent/spindle/intent.md and look around this repository, then write intent/spindle/spec.md, the design we will build from.

Start it with a header holding the commit id of each of the four house policies, the path where this prompt is saved, and Record: none.

Then set out the requirements that follow from the intent: the model picker that follows whatever keys exist, the stand-in sign-in, yesterday's conversation still being there, keys never showing on screen, full keyboard and screen-reader use, and the 30-day retention that config/environments.json already fixes.

Then flag every concern: anything the four policies make hard, risky or unclear. Number them, so I can settle them one at a time with whoever owns that policy.

I especially want to know where two policies pull against each other. End that section with a line naming the policies that conflict, or saying none were found. Do not invent one to fill the line.

Take every open question from the intent, the provider terms nobody has read yet and which model is "the open model", and either answer it in the spec or say plainly that it is carried forward.

Write it in Spindle's voice: plain words, British spelling, and models named the way their makers write them.

---

## How this prompt was written

The owner had help wording it from another Claude session, in the same way Mark's notes
were drafted in Wave 1 and `docs/1-plan/sources.md` says so on its own third line. The
points it covers were set out in this session first; the phrasing above is the owner's
after that help. It is recorded here because the wave's point is to measure what a typed
prompt really produces, and a reader should know how the prompt itself came about.
