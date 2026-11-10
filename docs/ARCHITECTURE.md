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

   Also deterministic: `evidence.mjs` (screenshots, axe and Lighthouse per route, gated by `performanceBudget`; dependencies live in `~/.sumi/evidence-runtime`; run by `/sumi:ship`) and `statusline.mjs` (the status line; `session-start` copies it to `~/.sumi/statusline.mjs`, `/sumi:init` offers to enable it).

8. **Companions** — Impeccable, Ponytail, Taste, Emil Kowalski and Superpowers skills, referenced from upstream in the marketplace (whole plugins or single skill folders via `git-subdir`) and installed as dependencies of `sumi` / `sumi-design`. Companion sources must be `url` or `git-subdir` over https — a `github` source is cloned over SSH by `claude plugin install` and fails on machines without keys (`validate.mjs` enforces this). See `THIRD-PARTY.md`.
9. **Distribution** — `bin/sumitsubo.mjs`, published to npm as `sumitsubo` (`npx sumitsubo`). A thin wrapper over the supported `claude plugin … --json` commands: it never writes Claude Code's settings files, routes GitHub through HTTPS only for its own child processes (`GIT_CONFIG_*`), verifies installed files on disk, repairs damaged installs on `update`, and offers `--sandbox` (`CLAUDE_CONFIG_DIR`) and `--no-ssh` to test an install as a stranger. `/sumi:doctor` is its in-session counterpart. `bin/rules.mjs` (`npx sumitsubo rules`) exports the same skills as Cursor rules and an `AGENTS.md` block for Codex; the npm package carries the skills and scripts for it, so it works without Claude Code. Releases: `scripts/release.mjs` bumps every version together; `release.yml` publishes on merge.

10. **Evals** — `scripts/run-evals.mjs` (`npm run evals`) runs the cases in `plugins/*/evals/`: trigger accuracy per plugin and a slop-rate case for `sumi-design`. It stages each plugin with its real dependencies, since `claude plugin eval` loads only the plugin under test. It costs tokens, so it runs on demand (`evals.yml`), not on every push.

## Project state

```
CLAUDE.md                 managed block between Sumitsubo markers + your own notes
DESIGN.md                 visual source of truth
design/brief.md           discovery brief and anti-references
design/claude-design-brief.md
.sumi/config.json        stack, model profile, budgets, protected branches, review excludes
.sumi/tasks/*.md         feature files (status: active|blocked|done)
.sumi/reviews/*          review receipts (.md) with their frozen diff and checks
.sumi/evidence/<ts>/     screenshots, Lighthouse JSON and evidence.md from evidence.mjs
.claude/settings.local.json  session model (opusplan), personal
~/.sumi/design-ledger.json   cross-project design memory (outside repos)
~/.sumi/statusline.mjs       status line script, refreshed by the SessionStart hook
~/.sumi/evidence-runtime/    Playwright, axe, Lighthouse for evidence.mjs
```

## Roadmap

See [ROADMAP.md](../ROADMAP.md) and the [milestones](https://github.com/kurodaSensei/sumitsubo/milestones).
