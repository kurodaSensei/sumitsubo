---
description: Final pre-PR gate — verify checks, review receipt and acceptance criteria, then draft commits and the PR description (single or chained).
argument-hint: "[feature slug]"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash
---

Feature: $ARGUMENTS (default: the single `active` file in `.sumi/tasks/`).

1. **Branch guard.** Confirm you are on a feature branch, not a protected branch from `.sumi/config.json`.
2. **Checks.** Run typecheck, lint, tests and build with the project's commands. Paste the summarized results. Any failure stops the ship.
3. **Receipt.** There must be a burned/approved receipt in `.sumi/reviews/` covering the current HEAD for medium/high risk work. If not, run `/sumi:review` first.
4. **Acceptance criteria.** Walk the feature file criteria; each needs evidence in the Evidence section. List any missing and stop unless the user accepts the gap explicitly (record it).
5. **Commits.** Ensure Conventional Commits, one concern each. Suggest squashes/rewording if the history is messy (don't rewrite pushed history without asking).
6. **Deliberate simplifications.** Collect the `ponytail:` notes added in the diff (`git diff <base>...HEAD | grep '^+.*ponytail:'`) and list them in the PR under "Deliberate simplifications" with file and trigger. Also list notes removed (their trigger happened).
7. **PR draft.** Fill `${CLAUDE_PLUGIN_ROOT}/templates/pull-request.md` from the feature file and receipt (evidence, risk, rollback). For `delivery: chained-prs`, draft one description per slice with the chain links and a final tracker PR description.
8. Do not push or open the PR yourself unless the user asks; give them the exact commands (`git push -u origin <branch>`, `gh pr create --fill` or the body file).
9. Update the feature file: status, process log entry, follow-ups.
10. **Report** per `sumi:output`. Subject: the branch and feature slug. Body: a table of acceptance criteria × evidence, with any criterion still open marked `open`; below it the checks that ran and their results, and the `ponytail:` notes collected in step 6. Next step: the exact push and PR commands from step 8 — or `/sumi:review` when step 3 found no burned receipt.
