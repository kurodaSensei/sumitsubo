<!-- sumi:begin v0.1.0 — managed by /sumi:sync. Edit outside this block; changes inside are overwritten. -->
## Sumitsubo framework

You are working inside a project that uses the Sumitsubo framework (Claude Code plugins `Sumitsubo-*`).

**Communication.** Talk to the user in their language. Code, identifiers, commits, comments and technical docs in English.

**Workflow.** Before implementing anything, apply `sumi:workflow`: classify the request (T0 direct / T1 delegated / T2 feature file), refute uncertainty with evidence before asking, respect the ~400-line slice budget, assess risk before each commit. Active feature files live in `.sumi/tasks/`.

**Quality bar.** Follow `sumi:code-quality` on every change. No speculative abstractions, no dead code, no invented APIs: when unsure of an API, read the installed source or the official docs. Accessibility (WCAG 2.2 AA, `sumi:a11y`) and performance budgets (`sumi:performance`) are acceptance criteria, not polish.

**Design.** Any visual or UI work starts from `DESIGN.md` (created by `/sumi-design:direction`). Never introduce fonts, colors, radii, shadows or motion that are not tokens there. If `DESIGN.md` does not exist and the task is visual, propose running the direction process first.

**Done means verified.** Run the checks (types, lint, tests, build) and show evidence before saying something works.

**Project facts:**
- Stack: {{STACK}}
- Package manager: {{PM}}
- Commands: dev `{{DEV}}` · build `{{BUILD}}` · test `{{TEST}}` · lint `{{LINT}}`
<!-- sumi:end -->
