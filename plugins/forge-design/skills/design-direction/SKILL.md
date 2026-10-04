---
name: design-direction
description: The forge creative-direction process that runs BEFORE any visual design or UI code — discovery brief, anti-references, ledger check, three genuinely divergent directions built on explicit axes, selection, and a DESIGN.md that every later screen must obey. Orchestrates Impeccable, Taste and Emil Kowalski skills when installed. Use when starting a new site, app, landing page or redesign, a brand-new section with its own look, or when the user asks for a new design, mockup or Claude Design prompt and no DESIGN.md exists. For small visual tweaks in a project that already has DESIGN.md, use design-tokens and anti-slop instead.
---

# Design Direction

Generic AI design is what happens when the model fills every unspecified decision with the statistical average. The cure is to leave nothing unspecified: decide the direction deliberately, in writing, before anything is drawn or coded. This process produces `DESIGN.md`; every later screen is built from it.

## Stage 0 — Tools check

Check which companion skills are available and use them at the marked stages:
- **Impeccable** (`impeccable` commands, `PRODUCT.md`): product context, critique, audit, polish.
- **Taste** (`design-taste-frontend` and its variants): calibrating variance, motion intensity and density dials; style families.
- **Emil Kowalski skills** (`emil-design-eng`, `animation-vocabulary`, `review-animations`…): motion and interaction craft. Load one or two at a time.
If any are missing, continue (this process stands alone) and suggest `/forge-design:deps`.

## Stage 1 — Discovery brief

Fill `${CLAUDE_PLUGIN_ROOT}/templates/brief.md` (save as `design/brief.md`). Ask only what you cannot infer from the repo, the client's existing site, or links the user gives. The brief must capture:
- Business, offer, audience (who, context of use, device mix), primary conversion or task.
- **Three to five brand traits as tensions**, not adjectives: "precise but warm", "luxurious but not exclusive". Single adjectives ("modern", "clean") are banned — they describe every site.
- Content reality: real copy length, real product photos or none, data density.
- Constraints: platform (Shopify theme settings, WordPress editor, app), a11y level, performance budget, existing brand assets that are non-negotiable.
If Impeccable is installed, write or update `PRODUCT.md` with the same facts (its `init`/`shape` flow) so its critiques have context.

## Stage 2 — Anti-references

Write down what this must NOT look like, in three lists:
1. **Category clichés**: what every competitor in this niche does (collect 3–5 competitor patterns if the user provides links or you can research them).
2. **AI-default tells**: from `forge-design:anti-slop` — name the specific ones this project is most at risk of.
3. **Ledger exclusions**: run `node ${CLAUDE_PLUGIN_ROOT}/skills/design-ledger/scripts/ledger.mjs recent` and exclude display typefaces, accent hues and layout signatures used in recent projects.

## Stage 3 — Three divergent directions

Generate exactly three directions. Each is defined on the axes in `references/divergence-axes.md` (concept/metaphor, typography voice, color strategy, layout system, shape language, imagery, motion personality, density, copy voice). **Any two directions must differ on at least five axes**; renaming the same layout with a different palette is not a direction.

Each direction contains:
- A name and a one-sentence concept grounded in the brand (a metaphor from the client's world, not from "tech").
- Type pairing with specific families (and why they fit), scale ratio, and one typographic signature move.
- Palette as roles (surface, text, muted, accent, signal) with OKLCH values, contrast-checked.
- Layout system and one signature composition for the hero or key screen.
- Taste dial settings (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY on 1–10) if Taste is installed.
- Motion personality in one line (e.g. "mechanical and precise: 120–180 ms, ease-out, no overshoot").
- Risks: what could go wrong with this direction for this audience.

Direction A should be the strongest fit for the brief; B should push one axis to an unexpected place; C should be the bold option the client would not have imagined. None may be "safe average".

Present them compactly (a table plus a short paragraph each). If the user wants visual previews, build one small static preview per direction (hero + one content block) — or hand the three directions to Claude Design via `forge-design:claude-design-bridge`.

## Stage 4 — Select and refine

The user picks (or merges with explicit rules about which axes come from where). Resolve contradictions now, not during implementation.

## Stage 5 — DESIGN.md

Write `DESIGN.md` at the repo root from `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`, following `forge-design:design-tokens`. Verify every text/background pair with `contrast.mjs`. Then record the project in the ledger (`ledger.mjs add …`).

## Stage 6 — Build, then critique

- Build screens from tokens only (`forge-core:css-architecture`). Motion follows `forge-design:motion` (and Emil's skills when installed).
- After each significant screen, run `/forge-design:critique`: the `lens-design` agent plus Impeccable's `critique`/`audit` when available. Fix, then `polish`.
- Any new visual decision not covered by DESIGN.md is added to DESIGN.md first, then used.

## Rules

- Never start drawing or coding UI without a DESIGN.md (for small edits in an existing project, read the existing one).
- Never default: every font, color, radius and spacing choice must be traceable to the brief or DESIGN.md.
- Real content beats lorem ipsum; design with the client's actual copy and imagery or realistic stand-ins.
- Accessibility is part of the direction: contrast, focus styles, target sizes and reduced motion are defined in DESIGN.md, not retrofitted.
