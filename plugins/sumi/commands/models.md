---
description: Show or switch the model profile for this project (balanced, economy, performance) — updates .sumi/config.json and, with your OK, the session model in .claude/settings.json.
argument-hint: "[balanced|economy|performance]"
allowed-tools: Read, Edit, Write
---

Requested profile: $ARGUMENTS

1. Read `.sumi/config.json` (create it from `${CLAUDE_PLUGIN_ROOT}/templates/config.json` if missing) and the routing table in `sumi:model-routing`.
2. **No argument:** show the current profile, the model each role uses under it, and the current session model from `.claude/settings.json` (or "account default").
3. **With an argument:** validate it is one of `balanced`, `economy`, `performance`; set `"modelProfile"` in `.sumi/config.json`.
4. Propose the matching session model (`opusplan` / `sonnet` / `opus`) for `.claude/settings.json` → `"model"`. Ask once before writing it (it affects everyone who opens this repo with Claude Code if the file is committed; suggest `.claude/settings.local.json` for a personal-only setting). Never touch other keys in those files.
5. Report the new routing table and remind that the session model change applies to new sessions (or run `/model <name>` now).
