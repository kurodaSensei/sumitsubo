---
description: Critique UI work against DESIGN.md and the anti-slop catalog using the context-free design lens, plus Impeccable critique/audit when installed; then fix and polish.
argument-hint: "[files, route, or git range]"
---

Target: $ARGUMENTS (default: visual files changed since the merge-base with the main branch).

1. Confirm `DESIGN.md` exists. If not, stop and suggest `/sumi-design:direction`.
2. Launch `sumi-design:lens-design` as a subagent with ONLY: the target (range/files/routes), the path to `DESIGN.md` and `design/brief.md`, and a dev server URL if one is running. Do not pass your own reasoning.
3. In parallel, if Impeccable is installed, run its critique and audit on the same target; if Emil Kowalski's `review-animations` is installed and motion changed, run it too.
4. Merge findings, verify each blocker/major yourself, drop what you can disprove, and order by severity.
5. Fix blockers and majors using tokens only. If a fix needs a new token, add it to DESIGN.md first.
6. Re-run the lens on the fixes. Then a polish pass (Impeccable `polish` if installed): alignment, spacing rhythm, states, copy.
7. Report in the user's language: what changed, what remains as nits.
