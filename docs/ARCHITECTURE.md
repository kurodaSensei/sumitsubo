# Architecture

> Rendered reference: [sumitsubo-docs.vercel.app/en/reference](https://sumitsubo-docs.vercel.app/en/reference)

## Layers

1. **Kernel** — the managed `CLAUDE.md` block (`sumi/templates/CLAUDE.managed.md`), kept short so it costs little context; everything else loads on demand as skills, whose descriptions act as the index.
2. **Workflow** — `sumi:workflow`: tiered execution, scope check against the literal request (Minimal vs Extended), uncertainty refutation, single feature file, line budget, `ponytail:` notes, risk assessment, chained PRs. Commands: `feature`, `review`, `ship`.
3. **Model routing** — `sumi:model-routing` and agents `scout` (Haiku), `builder` (Sonnet), `architect` (Opus); `balanced` / `economy` / `performance` profiles applied by passing `model` on each delegation; session model `opusplan` by default. Command: `models`.
4. **Engineering standards** — `code-quality`, `html`, `css-architecture`, `js-ts`, `a11y`, `performance` (core) + stack packs.
5. **Design** — `design-direction` (process), `anti-slop` (catalog), `design-ledger` (cross-project memory, script), `design-tokens` (DESIGN.md + contrast script), `motion`, `claude-design-bridge`. Companions (Impeccable, Taste, Emil Kowalski) are orchestrated at specific stages.
6. **Review** — subagent lenses with fresh context, on a budget (frozen diff and checks computed once, ≤ 3 lenses, ~12 tool calls each, slice-sized ranges): `lens-correctness`, `lens-a11y`, `lens-performance`, `lens-security` (core) and `lens-design` (design). Selected by risk; findings verified by the orchestrator; outcome recorded as a receipt in `.sumi/reviews/`, burned on approval.
7. **Deterministic guards** — hooks (`guard-git`, `guard-edit`, `session-start`) and scripts (`ledger.mjs`, `contrast.mjs`, `validate.mjs`). Hooks are opt-in per project via `.sumi/config.json`.

8. **Companions** — Impeccable, Ponytail, Taste, Emil Kowalski and Superpowers skills, referenced from upstream in the marketplace (whole plugins or single skill folders via `git-subdir`) and installed as dependencies of `sumi` / `sumi-design`. See `THIRD-PARTY.md`.

## Project state

```
CLAUDE.md                 managed block between Sumitsubo markers + your own notes
DESIGN.md                 visual source of truth
design/brief.md           discovery brief and anti-references
design/claude-design-brief.md
.sumi/config.json        stack, model profile, budgets, protected branches, review excludes
.sumi/tasks/*.md         feature files (status: active|blocked|done)
.sumi/reviews/*          review receipts (.md) with their frozen diff and checks
.claude/settings.local.json  session model (opusplan), personal
~/.sumi/design-ledger.json   cross-project design memory (outside repos)
```

## Roadmap ideas

- A single Sumitsubo status line (model profile, active feature, Ponytail mode) instead of each plugin installing its own.
- Optional MCP memory (e.g. Engram) adapter for cross-agent memory.
- A `sumi` CLI (npm package `sumitsubo`) for install/sync outside Claude Code and for publishing.
- Playwright + axe + Lighthouse runner script for one-command evidence.
- Mirror rules for other agents (Cursor, Codex) if the framework is published.
- Evals for skills (trigger accuracy, slop rate on a fixed set of design prompts).
