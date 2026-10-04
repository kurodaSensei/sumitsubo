---
description: Verify the companion plugins Sumitsubo orchestrates are installed and enabled, and find leftover duplicate copies (loose skills or other marketplaces) that should be removed.
allowed-tools: Bash, Read, Glob
---

Companions are declared as dependencies of `sumi` and `sumi-design`, so installing those plugins installs them. This command checks the result and cleans up the terrain.

1. **Expected companions** (all from the `sumitsubo` marketplace, referenced from upstream):
   - With `sumi`: `ponytail`, `superpowers-debugging`, `superpowers-tdd`, `superpowers-verification`, `superpowers-worktrees`, `superpowers-review-intake`.
   - With `sumi-design`: `impeccable`, `taste`, `taste-minimalist`, `taste-brutalist`, `taste-soft`, `taste-redesign`, `emil-design-eng`, `emil-review-animations`, `emil-animation-vocabulary`.
2. **Check** with `claude plugin list`: each must be installed and enabled from `@sumitsubo`. Offer `claude plugin install <name>@sumitsubo` for any missing one (ask before running).
3. **Find duplicates** that would compete or shadow them:
   - The same projects installed from other marketplaces (`impeccable@impeccable`, `ponytail@ponytail`, `superpowers@claude-plugins-official`).
   - Loose copies in `~/.claude/skills/` or `.claude/skills/` (folders or symlinks to `~/.agents/skills/`) named like the companions (`design-taste-frontend`, `minimalist-ui`, `industrial-brutalist-ui`, `high-end-visual-design`, `redesign-existing-projects`, `emil-design-eng`, `review-animations`, `animation-vocabulary`, `impeccable`) and loose `impeccable-*` agents in `~/.claude/agents/`.
   - Workflow plugins that inject a competing methodology at session start (e.g. the full superpowers plugin) or a competing design voice (`frontend-design`).
4. **Report** a table (item · where · recommendation) and give the exact commands: `claude plugin uninstall <name>@<marketplace>`, `claude plugin marketplace remove <name>`, and `mv` of loose skills into an archive folder (never delete). Run nothing destructive without the user's explicit OK.
5. Remind the user to restart Claude Code after changes.
