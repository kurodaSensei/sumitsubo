---
description: Set up Sumitsubo in the current project — detect stack and commands, write the managed CLAUDE.md block, create .sumi/ (config, tasks, reviews) and recommend stack and design plugins.
argument-hint: "[nuxt|react|shopify|wordpress ...] (optional, auto-detected)"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(git:*), Bash(ls:*), Bash(cat:*), Bash(node:*)
---

Initialize the Sumitsubo framework in this repository. Arguments (optional stack override): $ARGUMENTS

1. **Detect** (read, don't guess):
   - Stack from files: `nuxt.config.*` → nuxt; `next.config.*` or `app/layout.tsx` → react/next; `config/settings_schema.json` + `sections/` → shopify; `style.css` with `Theme Name:` / `functions.php` / `theme.json` → wordpress; `firebase.json` / `firestore.rules` → firebase.
   - Package manager from the lockfile (pnpm-lock.yaml, package-lock.json, yarn.lock, bun.lock).
   - Commands from `package.json` scripts (dev, build, test, lint, typecheck) or platform CLIs (shopify theme dev, wp-env).
2. **Create `.sumi/`** if missing: copy `${CLAUDE_PLUGIN_ROOT}/templates/config.json` to `.sumi/config.json` with the detected `stack`; create `.sumi/tasks/` and `.sumi/reviews/` (with a `.gitkeep`). Ask the user once whether `.sumi/` should be committed (recommended for team/client repos so feature files travel with the code) or kept local (add to `.git/info/exclude`).
3. **CLAUDE.md**: read `${CLAUDE_PLUGIN_ROOT}/templates/CLAUDE.managed.md`, fill the `{{…}}` placeholders with detected facts, then:
   - If `CLAUDE.md` has a `<!-- sumi:begin` … `<!-- sumi:end -->` block, replace only that block.
   - Otherwise insert the block at the top, preserving everything else verbatim.
   - Never delete or rewrite user content outside the markers.
4. **Recommend plugins** for what was detected (only those not already enabled): `sumi-nuxt`, `sumi-react`, `sumi-shopify`, `sumi-wordpress`, and `sumi-design` for any project with UI. Show the exact `/plugin install <name>@sumitsubo` commands.
5. **Models**: set `modelProfile` to `balanced` unless the user explicitly asks for another profile (`economy` for small sites or tight plan limits; `performance` only on explicit request — it is Opus-heavy). Then, with one confirmation, write `"model": "opusplan"` (or the profile's session model) to `.claude/settings.local.json` (personal, not committed), creating the file if needed and never touching other keys.
   Generated folders the project produces (e.g. a content build step) go into `review.exclude` in `.sumi/config.json`.
6. **Status line note**: if Ponytail asks to add its status line to `~/.claude/settings.json` and the edit is blocked, explain that it is optional and cosmetic; its suggested path includes a version number and would break on update.
7. **Report** in the user's language: detected stack, files created/changed, and the next step (usually `/sumi-design:direction` for new UI projects or `/sumi:feature` for a new feature).
