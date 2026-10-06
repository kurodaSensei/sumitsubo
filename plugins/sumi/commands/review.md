---
description: Receipt-based review of the current slice — size it, freeze the diff and the checks once, run only the lenses the risk needs (never all of them), each on a strict budget, consolidate findings and issue a review receipt.
argument-hint: "[git range, default: since the last receipt or merge-base with main] [--quick] [--all-lenses]"
---

Review target: $ARGUMENTS

The orchestrator does the expensive shared work ONCE (diff, checks) and lenses only judge. Lenses never rediscover the project.

1. **Range and size.** Determine the range (argument, else since the last approved receipt in `.sumi/reviews/`, else `git merge-base HEAD <main>`). Count changed lines excluding `review.exclude` globs from `.sumi/config.json` (defaults: lockfiles, `node_modules/`, `dist/`, `.nuxt/`, `.output/`, `.next/`, build output and any generated folders listed there).
   - If the counted lines exceed 1.5 × `lineBudget` (default 600), the range spans several slices. Stop and propose reviewing slice by slice (one receipt per slice or commit group) — reviewing 2,000 lines at once is slow, expensive and shallow. Continue as one review only if the user explicitly says so.
2. **Freeze once.** Write, for the receipt id `<yyyy-mm-dd>-<shortsha>`:
   - `.sumi/reviews/<id>.diff` — `git diff -U5 <range> -- . ':(exclude)<each exclude glob>'`.
   - `.sumi/reviews/<id>.checks.txt` — output of the project's typecheck, lint, test and build commands, run once here. Lenses read this file; they never run builds or installs themselves.
3. **Lineage.** 5–10 factual lines: what changed, why (feature file task), files, out of scope. No defense of the implementation.
4. **Risk and lenses** (`sumi:workflow` §6). Hard cap: `review.maxLenses` (default 3).
   - **Low** → no lenses; run the Done checklists yourself.
   - **Medium** → `lens-correctness` only, plus at most ONE more if the diff clearly needs it (`lens-a11y` for new interactive UI, `lens-performance` for new dependencies, data loading or heavy assets).
   - **High** → `lens-correctness` + `lens-security` + at most ONE of a11y/performance, whichever the diff touches most.
   - Visual quality is NOT reviewed here: that is `/sumi-design:critique`, run on screens, not diffs.
   - `--quick` → a single `lens-correctness` with the `scout` model of the profile; for small or routine changes.
   - `--all-lenses` → every applicable lens; only when the user asks for it.
5. **Run lenses in parallel**, each with the model from `sumi:model-routing` (`lens` for medium, `lens-high` for high risk). Give each ONLY: the paths of the `.diff` and `.checks.txt` files, the lineage, the project root and the relevant budgets. Never pass your reasoning or the conversation.
6. **Consolidate.** Deduplicate, verify each blocker/major yourself against the code (drop what you can disprove, and say so), order by severity. Use the receiving-code-review companion when available.
7. **Receipt.** `.sumi/reviews/<id>.md`: range, lineage, lenses run (with models), verdict, findings with status (open/fixed/won't-fix + reason). `approved` only with no open blocker or major.
8. **Fix loop.** Fix blockers and majors in the same slice; re-run ONLY the lenses that raised them, on the new diff only. When approved, set `burned: true` with the commit sha.
9. Report in the user's language: verdict, fixes, remaining nits, and the lens cost (lenses × model) so the user sees what the review spent.
