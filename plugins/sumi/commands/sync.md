---
description: Update the Sumitsubo-managed block in CLAUDE.md to the installed framework version without touching anything outside the Sumitsubo markers.
allowed-tools: Read, Edit, Glob, Bash(git:*)
---

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.managed.md` (the current version) and the project's `CLAUDE.md`.
2. Find the block between `<!-- sumi:begin` and `<!-- sumi:end -->`. If there is none, tell the user to run `/sumi:init` and stop.
3. Preserve the "Project facts" values already filled in the existing block (stack, package manager, commands); carry them into the new template.
4. Replace only the content between the markers (markers included). Everything above and below stays byte-for-byte identical.
5. Keep a diff summary of what changed inside the managed block, and the version transition (e.g. v0.1.0 → v0.2.0), for the report.
6. Check `.sumi/config.json` against `${CLAUDE_PLUGIN_ROOT}/templates/config.json`: add missing keys with their defaults; never overwrite existing values.
7. **Report** per `sumi:output`. Subject: the version transition. Body: the diff summary from step 5 and the config keys added in step 6 — say `n/a` when either is empty rather than omitting the row. Next step: none when nothing changed; otherwise reviewing the managed block.
