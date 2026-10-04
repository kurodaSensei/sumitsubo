---
description: Set up forge in the current project — detect stack and commands, write the managed CLAUDE.md block, create .forge/ (config, tasks, reviews) and recommend stack and design plugins.
argument-hint: "[nuxt|react|shopify|wordpress ...] (optional, auto-detected)"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(cat:*), Bash(node:*)
---

Initialize the forge framework in this repository. Arguments (optional stack override): $ARGUMENTS

1. **Detect** (read, don't guess):
   - Stack from files: `nuxt.config.*` → nuxt; `next.config.*` or `app/layout.tsx` → react/next; `config/settings_schema.json` + `sections/` → shopify; `style.css` with `Theme Name:` / `functions.php` / `theme.json` → wordpress; `firebase.json` / `firestore.rules` → firebase.
   - Package manager from the lockfile (pnpm-lock.yaml, package-lock.json, yarn.lock, bun.lock).
   - Commands from `package.json` scripts (dev, build, test, lint, typecheck) or platform CLIs (shopify theme dev, wp-env).
2. **Create `.forge/`** if missing: copy `${CLAUDE_PLUGIN_ROOT}/templates/config.json` to `.forge/config.json` with the detected `stack`; create `.forge/tasks/` and `.forge/reviews/` (with a `.gitkeep`). Ask the user once whether `.forge/` should be committed (recommended for team/client repos so feature files travel with the code) or kept local (add to `.git/info/exclude`).
3. **CLAUDE.md**: read `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.managed.md`, fill the `{{…}}` placeholders with detected facts, then:
   - If `CLAUDE.md` has a `<!-- forge:begin` … `<!-- forge:end -->` block, replace only that block.
   - Otherwise insert the block at the top, preserving everything else verbatim.
   - Never delete or rewrite user content outside the markers.
4. **Recommend plugins** for what was detected (only those not already enabled): `forge-nuxt`, `forge-react`, `forge-shopify`, `forge-wordpress`, and `forge-design` for any project with UI. Show the exact `/plugin install <name>@forge` commands.
5. **Report** in the user's language: detected stack, files created/changed, and the next step (usually `/forge-design:direction` for new UI projects or `/forge-core:feature` for a new feature).
