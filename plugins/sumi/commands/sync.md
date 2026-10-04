---
description: Update the Sumitsubo-managed block in CLAUDE.md to the installed framework version without touching anything outside the Sumitsubo markers.
allowed-tools: Read, Edit, Glob, Bash(git:*)
---

1. Read `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.managed.md` (the current version) and the project's `CLAUDE.md`.
2. Find the block between `<!-- sumi:begin` and `<!-- sumi:end -->`. If there is none, tell the user to run `/sumi:init` and stop.
3. Preserve the "Project facts" values already filled in the existing block (stack, package manager, commands); carry them into the new template.
4. Replace only the content between the markers (markers included). Everything above and below stays byte-for-byte identical.
5. Show a short diff summary of what changed in the managed block and the version transition (e.g. v0.1.0 → v0.2.0).
6. Check `.sumi/config.json` against `${CLAUDE_PLUGIN_ROOT}/templates/config.json`: add missing keys with their defaults; never overwrite existing values. Report added keys.
