---
name: security
description: Spindle's security policy for provider keys, the GitHub token and logs. Use whenever work touches a key, a token, an Authorization header, logging, the keys file, or anything under the Spindle home folder.
---
Example: replace this with your company's own. See docs/make-it-yours.md.

# Security policy

**Owner:** Security lead.
**Written source:** `SECURITY.md` in this repository, and the reference on securing an AI-native lifecycle: https://claude.com/blog/how-anthropic-secures-its-ai-native-software-development-lifecycle

## Keys and tokens

- Provider keys live in one file outside the project: `~/.spindle/keys.env`, or wherever `SPINDLE_KEYS_FILE` points. Never inside the repository, in an env file in the project folder, in a test, a fixture, a recording or a screenshot.
- Spindle runs with no keys at all. A missing key turns its models off in the picker; it is never an error page.
- Only the API process reads keys. The page never receives one, and no response carries one.
- The Spindle-only GitHub token is fine-grained, limited to this repository, and expires within 90 days. It is kept in `~/.spindle/gh-token.txt`, and only the session-start hook reads that file. The hook never prints the token.
- The session does receive the token: its Bash commands carry it as `GH_TOKEN`, and a plain-text copy stays in that session's env file under `~/.claude/session-env/`. Until Wave 3's guards arrive, a Read deny on that folder protects the copy. It stops Claude's Read tool, not a shell command.
- Claude never reads, writes or lists anything under `~/.spindle/`.
- A key that reached any commit, pushed or not, is revoked and replaced. Rewriting history alone does not make it safe.

## Logs

- A log never holds a key, a token, a cookie value or the value of an Authorization header. The logger swaps the value for `[redacted]` and keeps the word in front of it, so a log line still shows that a header was there.
- A log never holds what a person typed into the chat, and never an email address.
- The stand-in sign-in prints its one-time password to the console once, when the API starts. It is never written to a log file.
- Logs stay on the machine that made them. Anything committed as evidence is scrubbed first.

## Guards

- `scripts/key-scan.ts` runs before every commit and push, and again in the pipeline. When it refuses, remove the value. Never weaken a rule to get past it, and never skip the hooks with `--no-verify`.
- A claude.ai share or bundle link is treated like a key, because it lets someone in.

## Reporting

- Vulnerabilities are reported only through GitHub's private vulnerability reporting, as `SECURITY.md` explains.
