---
name: model-routing
description: Sumitsubo's model routing — which model does which work (Haiku to explore, Sonnet to build and review, Opus to decide), the balanced / economy / performance profiles in .sumi/config.json, how to pass the model on every delegation, and the recommended session model. Use whenever delegating to a subagent, running reviews, choosing how to approach a task, or when the user mentions tokens, cost, limits, speed or models.
---

# Model Routing

Spend expensive reasoning only where it changes the outcome. Facts are cheap, implementation is mid-priced, decisions are expensive.

## Roles

| Role | Agent | Typical work |
|---|---|---|
| **scout** | `sumi:scout` | Find files, map structure, read versions and docs, summarize. Read-only |
| **builder** | `sumi:builder` | Implement a briefed task or slice, write tests, run checks |
| **architect** | `sumi:architect` | Architecture, data model, migrations, security design, slicing a large feature, trade-offs |
| **lens** | `sumi:lens-correctness`, `lens-a11y`, `lens-performance`, `sumi-design:lens-design` | Reviews of medium-risk slices |
| **lens-high** | `lens-correctness` + `sumi:lens-security` (+ one more at most) | Reviews of high-risk slices |

## Profiles (`.sumi/config.json` → `"modelProfile"`)

| Role | `balanced` (default) | `economy` | `performance` |
|---|---|---|---|
| scout | haiku | haiku | sonnet |
| builder | sonnet | sonnet | sonnet |
| architect | opus | sonnet | opus |
| lens | sonnet | haiku | sonnet |
| lens-high | opus | sonnet | opus |
| **Session (orchestrator)** | `opusplan` | `sonnet` | `opus` |

- `balanced`: the default. Opus only for decisions and high-risk review.
- `economy`: small projects, tight plan limits, or routine maintenance.
- `performance`: complex or high-stakes work where quality beats cost. Opus-heavy: use it for a specific feature, then switch back.

The agents' frontmatter holds the `balanced` values. For other profiles, **pass `model` explicitly on every delegation** (the per-call value overrides the agent's frontmatter). Read the profile from `.sumi/config.json` once per session; default to `balanced` if absent.

## Routing rules for the orchestrator

1. **Need facts?** Send a scout. Never spend the session model on searching or reading many files. Several independent questions → several scouts in parallel.
2. **Need a decision that is expensive to undo?** Send the architect with the facts the scouts gathered. Record its decision in the feature file.
3. **Need code?** T0 work stays in the session. T1/T2 tasks go to a builder with a complete brief (`sumi:workflow` §5).
4. **Need review?** Lenses per `/sumi:review` — at most 3, each on a frozen diff with a tool budget — with `lens` or `lens-high` models by risk. Routine changes use `--quick` (one lens on the scout model).
5. **Design direction** (`/sumi-design:direction`) is a decision: run it in the session with the architect-level model for the profile (in `balanced`, plan mode under `opusplan` uses Opus).
6. Escalate one level when a cheaper model fails twice at the same task; note it in the process log. Do not escalate preemptively.

## Session model

Set it per project in `.claude/settings.json` (`"model": "opusplan"`), with `/model opusplan` in a session, or via `/sumi:models <profile>`, which updates both the profile and the project setting. Under `opusplan`, planning in plan mode runs on Opus and execution on Sonnet.

## Evidence of savings

When a feature closes, add to its process log a one-line summary of delegations by role (e.g. "scouts 9, builders 4, architect 1, lenses 5") so profiles can be compared across projects.
