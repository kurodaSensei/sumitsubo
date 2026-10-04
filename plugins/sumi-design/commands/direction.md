---
description: Run the full creative-direction process — brief, anti-references, ledger check, three divergent directions, selection, DESIGN.md and ledger entry.
argument-hint: "[project or client name] [links to current site, competitors or references]"
---

Project and references: $ARGUMENTS

Follow `sumi-design:design-direction` stage by stage. Do not skip stages and do not write UI code during this command.

1. Stage 0: check which companion skills are available (Impeccable, Taste, Emil Kowalski). Mention missing ones once and continue.
2. Stage 1: build `design/brief.md`. Gather facts from the repo and any links first; then ask the user the remaining questions in one batch, with recommended answers.
3. Stage 2: anti-references, including `ledger.mjs recent`.
4. Stage 3: three directions that differ on ≥ 5 axes (`${CLAUDE_PLUGIN_ROOT}/skills/design-direction/references/divergence-axes.md`). Check each against the ledger (`ledger.mjs check`) and fix collisions before presenting.
5. Present the directions compactly and ask the user to choose or combine. Offer visual previews (small static pages) or a Claude Design brief per direction (`sumi-design:claude-design-bridge`).
6. After the choice: write `DESIGN.md`, verify contrast with `contrast.mjs` (fix failures), record the project with `ledger.mjs add`, and, if Impeccable is installed, make sure `PRODUCT.md` reflects the brief.
7. Finish with the next step: implement screens from DESIGN.md, or generate `design/claude-design-brief.md`.
