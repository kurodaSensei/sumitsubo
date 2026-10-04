---
name: css-architecture
description: Modern CSS architecture for any stack (plain CSS, SCSS, Tailwind v4, scoped Vue/Svelte styles, CSS Modules) — tokens as custom properties from DESIGN.md, cascade layers, naming, specificity, intrinsic and fluid layout, container queries, logical properties, modern selectors, dark mode and reduced motion. Use when writing or reviewing *.css, *.scss, style blocks, Tailwind classes or theme config, or when layout/responsiveness/theming is involved.
---

# CSS Architecture

CSS is a design system's runtime. Every visual value comes from a token; layout is intrinsic first and responsive second; specificity stays flat.

## Tokens

- All colors, font families, type sizes, spacing, radii, shadows, z-indexes, durations and easings are CSS custom properties generated from `DESIGN.md`. Hardcoded values in components are bugs.
- Two layers: **primitives** (`--color-clay-600`) and **semantic roles** (`--color-surface`, `--color-text-muted`, `--color-accent`). Components consume roles only, so themes and dark mode swap roles, not components.
- Tailwind v4: tokens live in `@theme` in CSS; never sprinkle arbitrary values (`text-[17px]`, `bg-[#3a2f2a]`) — add a token.
- Shopify/WordPress: map merchant/editor settings to the same custom properties (`--section-padding-block`) instead of inline styles.

## Cascade and specificity

- Use `@layer reset, tokens, base, layout, components, utilities, overrides;` to make order explicit.
- Target specificity 0-1-0: one class per selector. No IDs, no `!important` (except utilities layer by design), no qualifying (`div.card`).
- Naming: follow the project. In plain CSS/SCSS without scoping, use BEM (`.card`, `.card__title`, `.card--featured`) with max one level of nesting. In scoped/module/utility systems, no BEM needed.
- `:where()` to zero specificity in base styles; `:is()` to group; `:has()` for parent/state styling (keep the subject element narrow for performance).

## Layout

- Intrinsic first: flexbox and grid with `minmax()`, `auto-fit`, `min()`, `clamp()` remove most breakpoints.
- Component-level responsiveness with **container queries** (`container-type: inline-size`); viewport media queries for page-level layout only.
- Mobile-first `min-width` queries with a fixed breakpoint set from DESIGN.md (custom properties don't work inside media queries: use Sass variables, `@custom-media` with a build step, or Tailwind's `--breakpoint-*` theme keys), never ad-hoc pixel values.
- Fluid type and spacing via `clamp()` with a rem component so zoom still works.
- Logical properties everywhere (`margin-inline`, `padding-block`, `inset-inline-start`, `text-align: start`) — free RTL support.
- `aspect-ratio` for media boxes; `gap` instead of margins between siblings; avoid magic numbers.
- Use `subgrid` to align card internals across a row.

## Modern capabilities (use, with fallbacks where needed)

- `color-mix()` and OKLCH for tints/shades and hover states derived from tokens.
- `@starting-style` + `transition-behavior: allow-discrete` for entry/exit of dialogs and popovers.
- View Transitions API for page/state transitions as progressive enhancement.
- Scroll-driven animations only when they add meaning; always reduced-motion safe.
- `text-wrap: balance` for headings, `text-wrap: pretty` for body.
- Native nesting is fine; keep it one level deep.

## Theming and preferences

- Dark mode swaps semantic roles under `[data-theme="dark"]` and/or `prefers-color-scheme`. Never invert blindly; re-check contrast for every role pair.
- `@media (prefers-reduced-motion: reduce)` disables non-essential motion (keep opacity fades, drop transforms/parallax).
- Respect `forced-colors: active`: don't rely on backgrounds or shadows for meaning; use real borders/outlines.
- Focus styles: visible `:focus-visible` outline from a token (house rule: ≥ 2px, ≥ 3:1 contrast). Never `outline: none` without a replacement.

## SCSS specifics

- Module system only: `@use` / `@forward`, never `@import`. Namespaced `sass:math`, `sass:color`.
- SCSS for build-time helpers (mixins for breakpoints, functions for rem); runtime values stay custom properties.
- Partials organized by role (abstracts, base, layout, components, sections/pages). Stylelint with property ordering.

## Slop tells

- Hardcoded hex colors, px font sizes and one-off spacing values; arbitrary Tailwind values.
- `z-index: 9999`; stacking contexts created by accident; `position: absolute` to fix layout problems.
- Every element with the same radius and shadow regardless of role.
- Breakpoint soup instead of intrinsic layout; fixed heights on text containers.
- Duplicate declarations, unused selectors, deep nesting mirroring the DOM.

## Done checklist

- [ ] No raw values outside the token definition files.
- [ ] Works from 320px to wide screens and at 200% zoom without horizontal scroll.
- [ ] Container queries for component responsiveness where the component is reused in different widths.
- [ ] Dark mode, reduced motion, forced colors and focus-visible verified.
- [ ] Stylelint/Prettier clean; no unused CSS shipped for the feature.
