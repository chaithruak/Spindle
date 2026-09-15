# Playbook map

Where each concept of the AI-native SDLC playbook lives in Spindle. Rows cite the playbook by the name of its section and its play, linked to the published article, and never by line number:
https://claude.com/blog/the-ai-native-sdlc-playbook

## The count

**256 concepts.** 18 framing rows (G-11 among them), 11 rows carried over from the older research inventory, 211 rows across the six stages, and 16 cross-cutting rows and prerequisites.

## Recount notes

1. **The older inventory's 250 was an undercount.** Counted again, the map held 255 rows. Nothing had been dropped to arrive at 250; the old figure was simply short.
2. **G-11 restored.** One framing concept was missing and is back: what a committed artifact is made of shifts as the lifecycle moves. Early on it is markdown, because two very different readers, a product owner and an agent, can both act on the same file. Once building starts, the artifact becomes the code together with the records kept around it. Its row is below. Restoring it brings the count to 256.
3. **A repeat sharpened rather than merged.** The row about giving each project its own scan schedule only restated the scheduled-scan row above it. It now carries what that step really adds: a cadence picked for each project, with weekly as the sensible default, and a scan narrowed to one directory or one branch when the repository is large or mixes different kinds of work.
4. **Two gaps in the owner's copy of the playbook**, both confirmed against the published article:
   - **The closing section.** The copy's contents promise one, but its text stops partway through the play on recurring scans. The published article does close. It makes the case that stronger models and harnesses let an organisation redesign its entire lifecycle, not only how code is written, while people keep the judgment calls and an enterprise still gets the governance it needs.
   - **Work that arrives through other channels.** The copy refers to this passage but does not contain it. In the published article, Claude takes part as an on-call teammate inside a workplace chat tool. The conversation itself becomes the audit trail. Claude triages what comes in, checks figures through connected tools, and turns anything too big to settle there into an intent.

## Columns

| Column | What it holds |
|---|---|
| ID | The concept's identifier, such as G-11 |
| Concept | The idea, in Spindle's own words |
| Where it lives in Spindle | The file, check, job or practice that carries it |
| Playbook section and play | The section name and play name, linked to the article |
| Prerequisites | The rows that must be in place first |
| Status | Real, example, or shown but never switched on |
| Waves | The waves that build or use it |
| How a team would measure it | The measure a team would track; Spindle has no data for any yet |

## Rows

**OPEN.** On 2026-09-15 the owner chose to leave the rows open in commit 1. Only the row the recount restored is written. The rest arrive with the concept map, and until then the order of plays inside each stage in `docs/how-we-work.md` stays open too.

| ID | Concept | Where it lives in Spindle | Playbook section and play | Prerequisites | Status | Waves | How a team would measure it |
|---|---|---|---|---|---|---|---|
| G-11 | A committed artifact changes what it is made of as the lifecycle moves: markdown first, so a product owner and an agent can each act on one file; later, the code plus the records around it | Intent, spec and plan are markdown in `intent/` that Rahul and Claude both work on; the code's record is its pull request | OPEN | OPEN | Real | 1 to 7 | OPEN |
