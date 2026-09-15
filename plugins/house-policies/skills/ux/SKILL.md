---
name: ux
description: Spindle's UX policy, the rules the chat window follows. Use whenever work changes the chat page, the model picker, the sign-in stand-in, an error message or anything a person sees or operates.
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# UX policy

**Owner:** Rahul, product owner.
**Written source:** the Web Content Accessibility Guidelines 2.2 at level AA, https://www.w3.org/TR/WCAG22/, with the words themselves taken from the brand policy.

These rules are a first cut. They are sharpened in Wave 2, once the mock of the chat window exists.

## The window

- One window: the conversation, the box to write in, and the model picker. Nothing else competes with them.
- Mock is picked by default and always works, so a fresh copy can hold a conversation with no keys.
- A model without a key stays in the picker, switched off, showing the brand policy's no-key wording. It never disappears and never fails silently.
- While a reply is on its way, the window says so and offers a way to stop it.

## Everyone can use it

- Every control can be reached and used from the keyboard, and the focus is always visible.
- Enter sends; Shift and Enter together start a new line.
- New replies are announced to screen readers, and each message says who wrote it: you, or the model by its picker name.
- Text and controls meet AA contrast in both light and dark colour schemes.
- The window works at 320 pixels wide and respects a request for reduced motion.

## Honest screens

- The sign-in is a stand-in, and the screen says so wherever it appears. It never looks like a real identity check.
- An error says in plain words what happened and what the person can do next. It never shows a stack trace or a provider's raw response.
