---
name: claude-design-bridge
description: Hand a Sumitsubo design direction to Claude Design (the visual design surface in the Claude app) or other design tools so the output follows DESIGN.md instead of generic defaults — produces a design-system brief and screen-by-screen prompts with explicit anti-references. Use when the user wants to design or mock up screens in Claude Design, Figma or another visual tool, or wants to turn the three directions into visual previews.
---

# Claude Design Bridge

Claude Design does not load Claude Code plugins, so the direction must travel as text. Without it, the design tool fills gaps with averages. This skill writes the package that carries the direction.

## Output: `design/claude-design-brief.md`

Generate it from `design/brief.md` and `DESIGN.md` (or from one of the three directions if previews are needed). Sections:

1. **Context** (5 lines): client, audience, primary task, platform constraints.
2. **Direction**: concept, brand tensions, signature element, motion personality.
3. **Design system spec** — copy exact values, never paraphrase: font families + weights + scale, color roles with OKLCH/hex, spacing scale, radii by role, depth model, icon set, imagery rules. This is what to use when creating a Design System in Claude Design for the client.
4. **Do not use** (anti-references): the category clichés, the AI-default tells most likely for this project (from `sumi-design:anti-slop`), and ledger exclusions — phrased as explicit prohibitions ("No centered hero with pill badge", "No purple/blue gradients", "No Inter").
5. **Screens**: one prompt block per screen — purpose, real content (actual headlines, product names, data), required components, the one focal point, states to show (empty, error, loading where relevant), breakpoints (mobile first).
6. **Acceptance**: contrast minimums, focus visibility, target size, and "every value must come from section 3".

## Workflow

1. If the client has no Design System in Claude Design yet, the user creates one from section 3 first; designs then start from it.
2. Paste one screen prompt at a time; review each result against the anti-slop self-test before continuing.
3. When a design is approved, implement it in code from DESIGN.md tokens (not by eyeballing the mockup), and update DESIGN.md with any new decision the design introduced.
4. For direction previews: produce three short briefs (one per direction) with the same screen prompt, so the comparison isolates the direction.

## Prompt rules

- Specific nouns and numbers over adjectives ("Fraunces 600 at 64/68, tracking -1%", not "an elegant serif").
- Real copy, never lorem ipsum.
- One focal point per screen, named.
- State the signature element and where it appears.
