# What the spec session had loaded

Taken on 2026-09-15 in the Code tab session that wrote `intent/spindle/spec.md`, before
a word of the spec was written. The owner typed `/context`; this page is what it showed,
kept to counts and generic names. No server, plugin or skill belonging to the owner's own
account is named, and no wording from any instruction set outside this repository is
copied here.

The wave's rule is that a spec written without the policies loaded is worthless as
evidence. This is the proof that they were.

## The four policies

All four, listed by the session itself under the plugin's own prefix:

| Policy | Listed as | Owner |
|---|---|---|
| Security | `house-policies:security` | Security lead |
| Compliance | `house-policies:compliance` | Compliance lead |
| UX | `house-policies:ux` | Rahul, product owner |
| Brand | `house-policies:brand` | Rahul, product owner |

The intent template, `write-intent`, was listed too, as a project skill.

## The counts

| Thing | Count |
|---|---|
| Model the session runs | `claude-opus-5`, the pin in `config/claude.json` |
| Skills listed in all | 41 |
| — from this repository's plugin | 4, the policies above |
| — from this repository's project folder | 1, the intent template |
| — from the account's own plugin | 19 |
| — built into Claude Code | 17 |
| MCP tools | 103 |
| MCP servers behind them | 15 |
| MCP servers this repository asks for | 0 — `.mcp.json` names none when this was taken |

## Three things worth knowing about these numbers

1. **Every MCP server here comes from the desktop app, not from this repository.** At the
   moment of the reading `.mcp.json` held `{ "mcpServers": {} }`. Wave 2 adds the first
   server this repository asks for, so a later reading will show 16.
2. **The counts moved since Wave 0.** The second desktop session counted 103 MCP tools
   under 15 prefixes, which is exactly what this session counted, and 35 skills, 18 from
   the account's plugin and 17 built in. Built-in still reads 17. The account's plugin now
   reads 19, and the four policies and the intent template make up the rest of the 41.
   Nothing in this repository changed to cause that; the account's own list grew.
3. **One skill in the account's plugin carries the same name as this repository's intent
   template.** Wave 1 uploaded the template to claude.ai as a skill, which is the likely
   reason, but this reading does not prove it. The session listed both, and the project
   one is the one this repository owns.

## What `/context` does not settle

It reports what the session loaded. It does not say where an install came from, and Wave 0
left open whether opening a session registers the marketplace in user settings. That
question stays open; nothing here answers it.
