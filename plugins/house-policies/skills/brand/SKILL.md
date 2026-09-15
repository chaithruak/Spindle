---
name: brand
description: Spindle's brand policy, covering what the product is called, the voice it writes in, and the exact wording the model picker gives each model. Use whenever work writes words a person will read, in the app, the README or the docs.
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# Brand policy

**Owner:** Rahul, product owner.
**Written source:** `README.md`, which says what Spindle is and that it is independent, and this policy for everything the README does not cover.

## The name

- **Spindle**, with a capital S, and nothing added to it. Not "SPINDLE", not "Spindle AI", not "Spindle Chat".
- Spindle is one chat window for any model.
- Wherever Spindle presents itself in public, it says it is an independent teaching project, neither affiliated with nor endorsed by Anthropic.

## The voice

- Plain words and short sentences. Say what a thing does, not how exciting it is.
- Talk to the reader as "you".
- British spelling: licence, colour, organisation.
- Name models the way their makers write them: Claude, GPT, NVIDIA.
- Say when something is a stand-in, a placeholder or not built yet. Never let a screen or a page suggest more than is there.

## The picker's wording

Use these words exactly.

| Model | Label | Line under the label | When it has no key |
|---|---|---|---|
| Mock | Mock | A stand-in model that answers without a key. | Always available |
| Claude | Claude | Anthropic's model, reached through OpenRouter. | add a key: see keys.env.example |
| GPT | GPT | OpenAI's model, reached through OpenRouter. | add a key: see keys.env.example |
| NVIDIA | NVIDIA | A model served by NVIDIA. | add a key: see keys.env.example |

The sign-in button reads **Sign in (stand-in)**.
