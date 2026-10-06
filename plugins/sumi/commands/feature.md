---
description: Start (or resume) a T2 feature — explore, refute uncertainty, ask the decision-level questions, forecast lines and slices, and write the single feature file in .sumi/tasks/.
argument-hint: "<what you want to build> | resume <slug>"
---

Request: $ARGUMENTS

Follow `sumi:workflow`.

**If the argument starts with `resume`:** open the matching `.sumi/tasks/*.md`, read the process log and unchecked tasks, rebuild the todo list from it, summarize where things stand in three lines, and continue with the next task.

**Otherwise:**
1. **Explore** with `sumi:scout` agents in parallel (cheap model) rather than reading everything in the session. Explore the relevant code first (structure, existing patterns, versions in the lockfile, tests). Research current docs for anything version-sensitive.
2. **Scope check** (`sumi:workflow` §1b): if the plan would go beyond the literal request (more than 3 slices or unrequested subsystems), present Minimal vs Extended with costs and let the user choose before continuing.
3. **Refute uncertainty**: list assumptions; verify each one you can with evidence. Keep only decision-level unknowns.
4. **Ask** the remaining questions in one batch (multiple choice when possible), each with a recommended default and its trade-off. If the user is away, take the defaults and record them as decisions.
5. **Decide and forecast**: for architecture, data-model or migration choices, ask `sumi:architect` (with the scouts' facts) and record its decision. Estimate changed lines per phase. If the total exceeds the line budget in `.sumi/config.json` (default 400), split into slices that each leave the code working; propose single PR, chained PRs or slices-to-main.
6. **Write** `.sumi/tasks/<yyyy-mm-dd>-<slug>.md` from `${CLAUDE_PLUGIN_ROOT}/templates/feature.md`: goal, why, scope, non-goals, constraints, decisions, phased tasks, checkable acceptance criteria (always include the a11y and performance criteria), first process-log entry.
7. Mirror the tasks into the todo list. Present the plan briefly and start with the first slice unless the change is high risk or irreversible — then wait for a go-ahead.
