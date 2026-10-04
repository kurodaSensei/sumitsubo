# Architecture

## Layers

1. **Kernel** — the managed `CLAUDE.md` block (`forge-core/templates/CLAUDE.managed.md`), kept short so it costs little context; everything else loads on demand as skills, whose descriptions act as the index.
2. **Workflow** — `forge-core:workflow`: tiered execution, uncertainty refutation, single feature file, line budget, risk assessment, chained PRs. Commands: `feature`, `review`, `ship`.
3. **Engineering standards** — `code-quality`, `html`, `css-architecture`, `js-ts`, `a11y`, `performance` (core) + stack packs.
4. **Design** — `design-direction` (process), `anti-slop` (catalog), `design-ledger` (cross-project memory, script), `design-tokens` (DESIGN.md + contrast script), `motion`, `claude-design-bridge`. Companion skills (Impeccable, Taste, Emil Kowalski) are orchestrated at specific stages, never vendored.
5. **Review** — subagent lenses with fresh context: `lens-correctness`, `lens-a11y`, `lens-performance`, `lens-security` (core) and `lens-design` (design). Selected by risk; findings verified by the orchestrator; outcome recorded as a receipt in `.forge/reviews/`, burned on approval.
6. **Deterministic guards** — hooks (`guard-git`, `guard-edit`, `session-start`) and scripts (`ledger.mjs`, `contrast.mjs`, `validate.mjs`). Hooks are opt-in per project via `.forge/config.json`.

## Project state

```
CLAUDE.md                 managed block between forge markers + your own notes
DESIGN.md                 visual source of truth
design/brief.md           discovery brief and anti-references
design/claude-design-brief.md
.forge/config.json        budgets, protected branches, stack
.forge/tasks/*.md         feature files (status: active|blocked|done)
.forge/reviews/*.md       review receipts
~/.forge/design-ledger.json   cross-project design memory (outside repos)
```

## Roadmap ideas

- Optional MCP memory (e.g. Engram) adapter for cross-agent memory.
- `forge` CLI for install/sync outside Claude Code and for publishing.
- Playwright + axe + Lighthouse runner script for one-command evidence.
- Mirror rules for other agents (Cursor, Codex) if the framework is published.
- Evals for skills (trigger accuracy, slop rate on a fixed set of design prompts).
