---
name: design-tokens
description: How to write and use DESIGN.md — the single source of truth for a project's visual system (type, color roles in OKLCH, spacing, radius, elevation, motion, breakpoints, focus and a11y rules) — and how to translate it into CSS custom properties, Tailwind v4 @theme, Shopify theme settings or WordPress theme.json. Includes a contrast checker. Use when creating or editing DESIGN.md, adding a token, theming, building dark mode, or wiring tokens into a stack.
---

# Design Tokens and DESIGN.md

`DESIGN.md` (repo root) is the contract between direction and implementation. Template: `${CLAUDE_PLUGIN_ROOT}/templates/DESIGN.md`. Code consumes tokens; it never invents values.

## What DESIGN.md must define

1. **Direction summary**: concept, brand tensions, signature element, anti-references (short).
2. **Typography**: families with fallbacks and metric overrides, loading strategy, weights actually used, a modular scale (fluid with `clamp()`), line heights and tracking per step, rules for headings vs body vs UI vs numerals (`font-variant-numeric: tabular-nums` for prices/tables).
3. **Color**: primitives in OKLCH (consistent lightness steps, hue/chroma from the brand) and **semantic roles**: `surface`, `surface-raised`, `text`, `text-muted`, `border`, `accent`, `accent-contrast`, `focus`, `success`, `warning`, `danger`, `info`. Light and dark values for each role. Every text/surface pair listed with its contrast ratio.
4. **Spacing**: one scale (e.g. 4-based or fluid) and named layout spacings (`section-block`, `gutter`, `stack-sm|md|lg`).
5. **Shape**: radii by role (container, control, chip, media), border widths, divider style.
6. **Elevation / depth**: the depth model and at most 2–3 elevation tokens, or explicitly none.
7. **Layout**: grid columns, max widths (content measure 60–75ch for text), breakpoints, container query usage.
8. **Motion**: duration tokens (`instant` ~100ms, `quick` ~160–200ms, `standard` ~240–300ms, `slow` for large surfaces), easing tokens (custom curves named by intent: `enter`, `exit`, `move`), reduced-motion policy.
9. **Iconography and imagery**: icon set, stroke width, sizes; photo treatment, aspect ratios, illustration style.
10. **Accessibility rules**: focus ring spec, minimum target size, contrast minimums, motion limits.
11. **Components inventory**: the primitives the project uses (button variants, inputs, cards…) with their token mapping — added as they are built.

## Naming

- Primitives: `--{category}-{name}-{step}` → `--color-clay-600`, `--space-4`.
- Roles: `--{category}-{role}` → `--color-text-muted`, `--radius-control`, `--motion-quick`, `--ease-enter`.
- Components reference roles only. Changing a theme = remapping roles.

## Translation by stack

- **Plain CSS / SCSS**: `tokens.css` with `:root { … }` and `[data-theme="dark"] { … }` inside `@layer tokens`.
- **Tailwind v4**: `@theme { --color-surface: …; --font-display: …; --radius-control: …; }` so utilities are generated from tokens; dark mode via a custom variant mapping roles. No arbitrary values in markup. Because Tailwind prefixes utilities with the property (`text-`, `border-`), use these aliases for color roles so classes stay readable:

  | DESIGN.md role | Tailwind token | Utility example |
  |---|---|---|
  | `--color-text` | `--color-fg` | `text-fg` |
  | `--color-text-muted` | `--color-fg-muted` | `text-fg-muted` |
  | `--color-border` | `--color-line` | `border-line` |
  | `--color-accent-contrast` | `--color-accent-fg` | `text-accent-fg` |
  | all other roles | same name | `bg-surface`, `bg-accent`, `ring-focus` |
- **Nuxt/Next**: same `tokens.css` imported globally; fonts through `@nuxt/fonts` / `next/font` with the families in DESIGN.md.
- **Shopify**: brand-level tokens become `settings_schema.json` settings (color schemes, font pickers, ranges) output as CSS variables in the layout; section-level overrides map to the same variable names.
- **WordPress block themes**: `theme.json` `settings.color.palette`, `typography.fontFamilies` / `fontSizes` (fluid), `spacing.spacingSizes`, `custom` for radius/motion; classic/Timber themes use `tokens.css`.

## Contrast verification (required)

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/design-tokens/scripts/contrast.mjs "oklch(0.27 0.03 40)" "oklch(0.97 0.01 85)"
node ${CLAUDE_PLUGIN_ROOT}/skills/design-tokens/scripts/contrast.mjs --pairs design/contrast-pairs.json
```
Pairs file: `[{ "name": "text on surface", "fg": "…", "bg": "…", "min": 4.5 }]`. Use `min: 3` for large text, UI boundaries and focus rings. Record results in DESIGN.md. Exit code 2 means a failure.

## Rules

- Add a token before using a new value; review new tokens like code.
- Prefer fewer tokens: if two values are nearly identical, merge them.
- Never encode a brand color directly in a component; never use a primitive where a role exists.
- Re-run the contrast check whenever a color role changes, in every theme.
