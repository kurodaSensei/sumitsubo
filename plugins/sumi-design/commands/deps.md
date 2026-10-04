---
description: Check and install the companion design skills sumi-design orchestrates — Impeccable, Taste and Emil Kowalski's skills — and explain what each adds.
allowed-tools: Bash, Read, Glob
---

sumi-design works alone, but it is designed to orchestrate three independent open-source projects. They are NOT bundled (they keep their own licenses and update on their own); this command checks for them and helps install them.

1. **Detect** what is installed, in every place they can live: Claude Code plugins (`claude plugin list` — e.g. `impeccable@impeccable`), `~/.claude/skills/` and `.claude/skills/` (folders or symlinks), and `~/.agents/skills/` with its lock file `~/.agents/.skill-lock.json` (where `npx skills add` installs and records the source repo). Look for `impeccable*`, `design-taste-frontend` and its style variants, `emil-design-eng` / `review-animations` / `animation-vocabulary`. Also flag duplicates (the same project installed both as a plugin and as loose skills) and outdated variants (`design-taste-frontend-v1`, `gpt-taste`), and recommend keeping one copy.
2. **Report** a table: project · status · what it adds in Sumitsubo:
   - **Impeccable** (pbakaus/impeccable, Apache-2.0): PRODUCT.md context, critique/audit/polish commands and deterministic anti-pattern detectors. Used in direction Stage 1 and in `/sumi-design:critique`.
   - **Taste** (Leonxlnx/taste-skill, MIT): variance/motion/density dials and style families (soft, minimalist, brutalist, redesign). Used in direction Stage 3.
   - **Emil Kowalski skills** (emilkowalski/skills): design-engineering and motion craft. Recommended: `emil-design-eng`, plus `review-animations` for audits. Load one or two at a time.
3. **Ponytail** (DietrichGebert/ponytail): not a design tool, but the minimalism plugin whose `ponytail:` comment convention Sumitsubo adopts (`sumi:code-quality`). Recommend it if missing; if present, its `/ponytail-review` and `/ponytail-debt` complement `/sumi:review` and `/sumi:ship`.
4. **Offer install commands** for the missing ones and run them only after the user confirms (they download third-party code). Current documented commands — verify against each repo's README before running:
   - Impeccable: `npx impeccable install` (or its Claude Code plugin marketplace entry, per its README)
   - Taste: `npx skills add https://github.com/Leonxlnx/taste-skill`
   - Emil Kowalski: `npx skills add https://github.com/emilkowalski/skills --skill emil-design-eng` (repeat with `--skill review-animations`)
5. Remind the user to restart the Claude Code session so new skills load.
