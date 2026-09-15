---
name: compliance
description: Spindle's compliance policy on what may be kept about a person, for how long, and what the model providers' terms require. Use whenever work stores, logs, sends or deletes anything about a person, or adds or changes a model provider.
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# Compliance policy

**Owner:** Compliance lead.
**Written source:** the `retentionDays` figure in `config/environments.json`, and the terms of each provider Spindle reaches: OpenRouter's terms of service (https://openrouter.ai/terms), Anthropic's usage policy (https://www.anthropic.com/legal/aup), OpenAI's usage policies (https://openai.com/policies/usage-policies/), and the NVIDIA API Catalog's terms as shown at https://build.nvidia.com.

**Retention:** 30 days, from `retentionDays` in `config/environments.json`. When that figure changes, this line changes in the same commit; `npm run checks` fails while the two disagree.

## What may be kept about a person

- The stand-in account name, what was written in the conversation, which model answered, and when. Nothing else: no real name, no email address, no IP address, no device details.
- It is kept only in the environment's own data folder, `data/<environment>/`, which git never sees.
- Each environment has its own session cookie, named in `config/environments.json`, holding a session id and nothing more.
- Everything about a person is deleted after the retention period. It is deleted, not archived.
- A person may ask for their data to be deleted sooner, and it is.

## What leaves the machine

- Only the text of a conversation, sent to the provider of the model the person picked, and only when that provider has a key. Mock sends nothing anywhere.
- Recorded provider replies kept for tests hold no personal data. Raw captures stay in `recordings-raw/`, which git never sees, until they are trimmed.
- Telemetry committed as evidence carries no identity attributes; the pipeline refuses them.

## Providers' terms

- A provider's model is offered only once the Compliance lead has read that provider's current terms, and its picker wording promises nothing those terms do not.
- Nothing is sent to a provider that its usage policy forbids.
- When a provider's terms change in a way that touches retention or training on inputs, this policy is reviewed before the next release.
