---
description: Check and install the companion design skills sumi-design orchestrates — Impeccable, Taste and Emil Kowalski's skills — and explain what each adds.
allowed-tools: Bash, Read, Glob
---

sumi-design works alone, but it is designed to orchestrate three independent open-source projects. They are NOT bundled (they keep their own licenses and update on their own); this command checks for them and helps install them.

1. **Detect** what is installed: look for skills named `impeccable*`, `design-taste-frontend` (and variants), `emil-design-eng` / `review-animations` / `animation-vocabulary` in `~/.claude/skills/`, `.claude/skills/`, and the enabled plugins list (`/plugin` output or `~/.claude/plugins/`).
2. **Report** a table: project · status · what it adds in Sumitsubo:
   - **Impeccable** (pbakaus/impeccable, Apache-2.0): PRODUCT.md context, critique/audit/polish commands and deterministic anti-pattern detectors. Used in direction Stage 1 and in `/sumi-design:critique`.
   - **Taste** (Leonxlnx/taste-skill, MIT): variance/motion/density dials and style families (soft, minimalist, brutalist, redesign). Used in direction Stage 3.
   - **Emil Kowalski skills** (emilkowalski/skills): design-engineering and motion craft. Recommended: `emil-design-eng`, plus `review-animations` for audits. Load one or two at a time.
3. **Offer install commands** for the missing ones and run them only after the user confirms (they download third-party code). Current documented commands — verify against each repo's README before running:
   - Impeccable: `npx impeccable install` (or its Claude Code plugin marketplace entry, per its README)
   - Taste: `npx skills add https://github.com/Leonxlnx/taste-skill`
   - Emil Kowalski: `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng` (repeat with `--skill review-animations`)
4. Remind the user to restart the Claude Code session so new skills load.
