---
description: Receipt-based review of the current slice — freeze the diff, write the lineage, size the risk, run only the needed context-free lenses in parallel, consolidate findings and issue a review receipt.
argument-hint: "[git range, default: changes since the last receipt or merge-base with main] [--all-lenses]"
---

Review target: $ARGUMENTS

1. **Freeze.** Determine the range (argument, else `git merge-base HEAD <main>`..working tree, else since the last approved receipt in `.sumi/reviews/`). If there are uncommitted changes, ask whether to include them or commit first. Record the exact range and HEAD sha — this is what gets reviewed, nothing else.
2. **Lineage.** Write 5–10 lines: what changed, why (link the feature file task), which files, what is explicitly out of scope. Facts only — no defense of the implementation.
3. **Size the risk** with the rules in `sumi:workflow` §6 and pick lenses:
   - Low → no lenses; run the Done checklists yourself and report.
   - Medium → `lens-correctness` + the one most relevant lens (`lens-a11y` for UI, `lens-performance` for pages/deps/data loading).
   - High → `lens-correctness`, `lens-security`, plus `lens-a11y` / `lens-performance` / `sumi-design:lens-design` as the diff warrants.
   - `--all-lenses` runs every applicable lens.
4. **Run lenses in parallel** as subagents, passing `model` per `sumi:model-routing` (`lens` models for medium risk, `lens-high` for high risk, under the project's `modelProfile`) (`sumi:lens-*`, and `sumi-design:lens-design` if installed and visual files changed). Give each ONLY: the git range, the lineage, the project root, and the relevant config budgets. Do not pass your reasoning, the conversation, or the feature file narrative — the lenses must judge the code without the author's context.
5. **Consolidate.** Deduplicate findings, verify each blocker/major yourself against the code (drop anything you can disprove, and say so), and order by severity.
6. **Receipt.** Write `.sumi/reviews/<yyyy-mm-dd>-<shortsha>.md` with: range, lineage, lenses run, verdict, findings with status (open/fixed/won't-fix + reason). Verdict is `approved` only when no blocker or major remains open.
7. **Fix loop.** Fix blockers and majors (each fix is part of the same slice), re-run only the lenses that raised them on the new diff, update the receipt. When approved, mark the receipt `burned: true` with the commit sha — it cannot be reused for later changes.
8. Report in the user's language: verdict, what was fixed, what remains as nits or follow-ups.
