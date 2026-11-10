---
name: design-ledger
description: Cross-project design memory that keeps a freelance portfolio from repeating itself — records each project's typefaces, accent hues, layout signature, shape language and signature element in ~/.sumi/design-ledger.json and checks new directions against recent work. Use when drafting anti-references or directions for a new site, before finalizing or right after approving a DESIGN.md, or when the user asks which fonts, colors or layouts they used before or whether a design looks like a past client's.
---

# Design Ledger

Uniqueness across a freelance portfolio needs memory. The ledger lives outside any repo at `~/.sumi/design-ledger.json` (override with `SUMI_LEDGER`), so it spans all clients. It stores design decisions only — never client secrets or personal data.

## Commands

```bash
L="node ${CLAUDE_PLUGIN_ROOT}/skills/design-ledger/scripts/ledger.mjs"

$L recent [n]            # last n projects (default 6) — use in anti-references
$L check --project "New Client" --display "Fraunces" --fonts "Fraunces,Work Sans" --hue 28 --chroma 0.12 \
       --layout "asymmetric-editorial" --shape "sharp" --signature "…" [--window 6]
                         # exit 2 on collisions with the last <window> projects; shared body fonts are notes only
$L add --project "Acme Coffee" --fonts "Fraunces,Instrument Sans" --hue 28 --chroma 0.12 \
       --palette "oklch(0.32 0.04 40),oklch(0.95 0.02 85)" --layout "asymmetric-editorial" \
       --shape "sharp" --signature "stamp-style section numbers" --direction "Field notebook"
$L list                  # everything
```

## Rules of use

- **Stage 2 of design-direction**: run `recent` and put the results into the anti-references.
- **Before writing DESIGN.md**: run `check` with the chosen direction. Collision policy within the window:
  - Same **display** typeface → change it (body faces may repeat if neutral and justified).
  - Accent hue within ±15° and chroma within ±0.04 (when both known) → shift or justify (brand-mandated colors are exempt; note `--brand-locked`).
  - Same layout signature **and** shape language → change at least one.
  - Same signature element → always change.
- **After approval**: run `add`. If a direction is later changed, run `add` again with the same project name (it replaces the entry).
- Brand-locked choices (client's existing font/colors) are recorded with `--brand-locked` and never count as your collisions.
