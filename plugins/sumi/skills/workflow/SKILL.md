---
name: workflow
description: The Sumitsubo adaptive workflow — how to scale process to the size and uncertainty of a request. Tiers (direct, delegated, feature file), refuting uncertainty before acting, the single feature file with acceptance criteria and evidence, the ~400-line budget per slice, pre-commit risk assessment and chained PRs. Use at the start of ANY implementation request, when planning work, when a task grows, or when the user says "feature", "plan", "implement", "build", "migrate" or "refactor".
---

# Sumitsubo Workflow

Process must be justified by the request. Small things get done; uncertain things get investigated; large things get a plan. Never apply heavy process to a light task, and never improvise a large task without a written plan.

## 1. Classify the request (always, silently)

| Tier | Signals | What you do |
|---|---|---|
| **T0 Direct** | One clear change, ≤ ~50 lines, 1–3 files, no open questions | Do it in the main thread. No feature file. Verify, report in two lines. |
| **T1 Delegated** | Clear goal but several files or a self-contained chunk (≤ ~400 lines) | Diagnose in the main thread first, then delegate the writing to a subagent with a precise brief. Verify its result yourself. |
| **T2 Feature** | > ~400 lines, multiple phases, architecture decisions, migrations, or anything that will span sessions | Create a feature file (section 3), get answers to open questions, then execute slice by slice. |

Re-classify when you learn something. A T0 that turns out to touch auth or payments becomes T1 at minimum.

## 2. Refute uncertainty before acting

Before writing code for anything non-trivial, list what you are assuming and try to disprove the risky assumptions with evidence: read the code, check versions in lockfiles, run the existing tests, query the docs. Only unresolved, decision-level unknowns go to the user.

- Diagnose in the main thread so the orchestrator owns the context it needs to delegate well.
- Ask questions in one batch, each with a recommended default and the trade-off in one line. Never ask what the repo can answer.
- If the user is not available, take the recommended default and record it under "Decisions" in the feature file.

## 3. The feature file (T2 only)

One file per feature at `.sumi/tasks/<yyyy-mm-dd>-<slug>.md`, created from `${CLAUDE_PLUGIN_ROOT}/templates/feature.md` (or `/sumi:feature`). It replaces multi-document spec workflows: one organic file that grows with the work.

It contains: goal and why, scope and explicit non-goals (what must NOT be built — your main defense against over-engineering), decisions, constraints, phases with tasks, acceptance criteria, a process log and evidence.

Rules:
- Mirror the tasks into the session todo list and keep both in sync as you go.
- Every acceptance criterion must be checkable (a command, a test, a measurable value, a screenshot).
- Append to the process log at each meaningful step: what changed, what you learned, what is next. Anyone (human or agent) must be able to resume from the file alone.
- Evidence is mandatory to tick a task: test output, a command result, a Lighthouse/axe number, or a screenshot path. "Should work" is not evidence.
- Set `status:` in the frontmatter (`active`, `blocked`, `done`). The session-start hook surfaces active files.

## 4. Line budget: small houses, not Eiffel towers

Before implementing a slice, forecast its size in changed lines. The budget is ~400 changed lines per slice — the range where review stays effective.

- Over budget: split into slices that each leave the codebase working and are independently reviewable. Each slice = one commit (or one PR on teams).
- Work inside the budget as a constraint, not a suggestion: the best solution that fits, not the most impressive one. Exceeding it requires a one-line written justification in the feature file. When you cut scope to fit, mark each seam with a `ponytail:` note (`sumi:code-quality`) instead of half-building the extension.
- Generated files, lockfiles and snapshots do not count.

## 5. Delegation briefs

A subagent starts with zero context. Every brief contains: goal, exact files/paths, constraints and conventions that apply (name the skills), the acceptance check it must run, and the output you expect back (diff summary + evidence). Prefer one well-briefed subagent over several vague ones. Run independent subagents in parallel.

## 6. Pre-commit risk assessment

Before each commit, classify the change:

| Risk | Typical triggers | Review |
|---|---|---|
| **Low** | Copy, docs, styles isolated to one component, tests | Self-check against the Done checklist |
| **Medium** | New component or module, dependency or config changes, shared utilities, routing | `/sumi:review` at the end of the slice (1–2 lenses) |
| **High** | Auth, payments, permissions, data model or migrations, security rules, caching layers, anything irreversible | `/sumi:review` with all relevant lenses before committing; ask the user before irreversible actions |

Review per slice, not per micro-task.

## 7. Shipping

- Commits: Conventional Commits, imperative, English, one concern per commit.
- If a feature exceeds one reviewable unit, plan **chained PRs**: each PR builds on the previous one and ends in a final tracker PR that merges to main; or, for small fast-moving work, each slice merges to main independently. Record the choice in the feature file.
- Use `/sumi:ship` to run the final checks and draft the PR description.

## Anti-patterns

- Creating a feature file for a one-line fix, or skipping it for a migration.
- Delegating before diagnosing (the subagent re-discovers everything, badly).
- Asking the user things the codebase answers.
- Ticking tasks without evidence; "done" with failing or unrun tests.
- Scope creep: refactoring adjacent code nobody asked about. Note it under "Follow-ups" instead.
