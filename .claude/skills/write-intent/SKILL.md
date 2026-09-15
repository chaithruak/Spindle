---
name: write-intent
description: Turn an idea, a complaint, an incident or a GitHub issue into an intent, the one-page record that starts every change in Spindle. Use when someone brings something new and no intent, spec or plan exists for it yet.
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# Write an intent

An intent is a short markdown file that a product owner and an agent can both act on. It says what is wrong and what better would look like. It does not say how to build anything; the spec and the plan come later.

**Owners:** Rahul, product owner, signs this template, and Linda, tech lead and release manager, co-signs it. Marcus, engineer, stood it up through Claude.

## 1. Ask whoever brought the idea

Ask these one at a time, in plain words, and write down the answers as given. Do not tidy them yet.

1. What can you not do today?
2. Who does that get in the way of?
3. What would it look like if it were better?
4. What is not part of this?

When the starting point is a GitHub issue, read the issue first and ask only what it leaves open.

## 2. Then ask as an analyst would

Work these out from the answers and from the repository, and check each one with the person before writing it down.

1. **Reach.** Which parts of Spindle would change, and which would be left alone?
2. **Users.** Which users does it touch, and does it touch them differently?
3. **Constraints.** What holds it in: the four house policies, `config/environments.json`, cost, time, a provider's terms?
4. **Success.** How would anyone tell, afterwards, that it worked?

## 3. Write the intent

Every intent gets a folder of its own: `intent/<short-name>/intent.md`, with the short name in lower case and hyphens. Use this shape and nothing more.

```markdown
# <One line saying what this is about>

Author: <who brought it>
Status: draft
Record: <the pull request that carries this intent, once it exists>
Class: incident   <- this line only for an incident

## Problem

## Proposed outcome

## Affected users and systems

## Constraints

## Open questions

## Evidence   <- this section only for an incident
```

- Anything outside the intent goes under **Constraints**, as a plain list of what is not included.
- The shape of success goes under **Proposed outcome**, stated so someone could check it.
- **Open questions** holds whatever the four and four questions did not settle. Leave it empty rather than inventing answers.
- For an incident, **Evidence** holds what was seen, when, and where the record of it lives.

Status starts at `draft`. It moves on only when Rahul writes Rahul's gate comment on the pull request.
