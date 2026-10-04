---
name: tailwind-craft
description: Tailwind CSS v4 in Nuxt/Vue projects - CSS-first @theme configuration fed by DESIGN.md tokens, semantic token layers, component extraction instead of @apply sprawl, variant APIs, spacing and type scale discipline, dark mode, container queries, and avoiding arbitrary-value spam and class soup. Use when styling *.vue templates, editing app/assets/css/*.css, main.css, tailwind setup in nuxt.config.ts, adding design tokens, theming or dark mode, or reviewing long class lists.
---

# Tailwind Craft

Tailwind is a constraint system. Its value comes from a small, named set of tokens applied
consistently. Arbitrary values, one-off colors and 40-class strings are the signal that the
constraints were abandoned. Tokens come from `DESIGN.md` (forge-design); CSS layering and naming
rules come from `forge-core:css-architecture`.

## Core principles

1. **Tokens first.** Every color, font, radius, shadow and spacing step in the UI maps to a token in
   `@theme`. If a value is not in the theme, add it to `DESIGN.md` and the theme, or do not use it.
2. **Semantic over raw.** Components use `bg-surface`, `text-fg-muted`, `border-line`, not
   `bg-zinc-50 dark:bg-zinc-900`. Raw palette steps exist only to define semantic tokens.
3. **Extract components, not classes.** Repetition is solved with a Vue component (or a variant
   function), not with `@apply` copies of utility strings.
4. **One scale.** Spacing, type and radius follow the scale. No `mt-[13px]`.
5. **Accessible by construction.** Focus-visible styles, contrast-checked token pairs, reduced motion.

## Setup in Nuxt (v4)

```ts
// nuxt.config.ts
import tailwindcss from '@tailwindcss/vite'
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
})
```

The `@nuxtjs/tailwindcss` module is an alternative; verify its Tailwind v4 support before choosing it.
There is no `tailwind.config.js` by default in v4; configuration lives in CSS.

## Theme from DESIGN.md

```css
/* app/assets/css/main.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* raw tokens copied from DESIGN.md */
  --font-sans: "<Body family from DESIGN.md>", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Fraunces Variable", ui-serif, serif;
  --color-ink-950: oklch(0.18 0.02 260);
  --color-ink-50:  oklch(0.98 0.005 260);
  --color-brand-600: oklch(0.55 0.17 35);
  --radius-container: 0.75rem;
  --ease-enter: cubic-bezier(0.22, 1, 0.36, 1);
}

/* semantic layer: switches with theme, consumed by components */
@theme inline {
  --color-surface: var(--surface);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-line: var(--line);
  --color-accent: var(--accent);
}

:root  { --surface: var(--color-ink-50);  --fg: var(--color-ink-950); --fg-muted: oklch(0.45 0.02 260);
         --line: oklch(0.9 0.01 260); --accent: var(--color-brand-600); }
.dark  { --surface: var(--color-ink-950); --fg: var(--color-ink-50);  --fg-muted: oklch(0.75 0.02 260);
         --line: oklch(0.3 0.02 260); --accent: oklch(0.7 0.15 35); }
```

- Replace default namespaces deliberately (`--color-*: initial;`) when the brand palette should be the
  only palette; this stops stray `bg-blue-500` from compiling.
- Every fg/surface pair must meet WCAG 2.2 AA contrast (4.5:1 text, 3:1 large text/UI). Check both themes.
- Token names mirror `DESIGN.md` roles through the Tailwind alias table in `forge-design:design-tokens` (`text`→`fg`, `text-muted`→`fg-muted`, `border`→`line`, `accent-contrast`→`accent-fg`, so utilities read `text-fg`, not `text-text`); never invent names in components. Details: `references/tokens-and-variants.md`.

## Class discipline

```vue
<!-- BAD: class soup, raw colors, arbitrary values, duplicated in 6 places -->
<button class="inline-flex items-center justify-center gap-[6px] rounded-[10px] bg-[#e4572e]
  px-[18px] py-[9px] text-[15px] font-semibold text-white shadow-[0_2px_8px_rgba(0,0,0,.15)]
  hover:bg-[#c94a25] dark:bg-[#ff7a50] focus:outline-none">Save</button>

<!-- GOOD: one component owns the recipe, tokens only -->
<UiButton variant="primary" size="md">Save</UiButton>
```

- Order classes consistently (layout, box, typography, visual, state); use the Prettier Tailwind plugin.
- More than ~12 utilities on one element, repeated in 2+ places: extract a component.
- Variants via a typed function (`cva` or `tailwind-variants`) inside the component; merge consumer
  classes with `tailwind-merge` so overrides win predictably.
- `@apply` only for styling markup you do not control (CMS/markdown content, third-party widgets).
  In SFC `<style>` blocks, use `@reference "~/assets/css/main.css";` before `@apply`.
- Custom utilities with `@utility` for genuinely reusable single-purpose rules
  (e.g. `@utility text-balance-safe { ... }`), not for component recipes.
- Arbitrary values (`w-[37rem]`) are allowed once for a true one-off with a comment; a second use
  means it is a token.
- Dynamic classes must be complete strings in source (`variant === 'primary' ? 'bg-accent' : 'bg-surface'`).
  Never build class names by concatenation (`bg-${color}-500`); the scanner cannot see them.

## Layout and responsiveness

- Mobile-first: base classes for small screens, `md:`/`lg:` add complexity upward.
- Prefer container queries for components that live in different column widths:
  `@container` on the wrapper, `@md:grid-cols-2` on children. Viewport breakpoints for page layout.
- Use `gap` over margins between siblings; `space-*` only for simple stacks.
- Fluid type with `clamp()` defined as tokens (`--text-display`), not ad-hoc in templates.
- Respect the content: `max-w-prose`/`ch`-based widths for reading text.

## States, motion and dark mode

- Every interactive element: `hover:`, `focus-visible:` (visible ring with offset), `active:`,
  `disabled:`/`aria-disabled:` styles. Never strip outlines without replacement.
- Style off state attributes: `aria-expanded:`, `aria-selected:`, `data-[state=open]:` (headless libs).
- `motion-safe:` for transitions/animations; durations and easings from tokens.
- Dark mode via the class strategy with the preference stored in a cookie or `@nuxtjs/color-mode`
  (avoids hydration flash, see `nuxt-data-ssr`). Semantic tokens mean components need no `dark:` classes.

## Anti-patterns (AI slop tells)

- Hex codes and arbitrary values everywhere (`text-[#333]`, `p-[13px]`, `shadow-[...]`).
- The generic purple-to-blue gradient hero, `rounded-2xl shadow-xl` on every card, glassmorphism
  by default - style that ignores `DESIGN.md`.
- `dark:` duplicates on every element instead of semantic tokens.
- `@apply` re-creating Bootstrap (`.btn`, `.card`, `.container`) for markup you own.
- 30-class strings copy-pasted across files; string-concatenated class names.
- Mixed spacing (`p-3`, `p-[14px]`, `p-3.5`, `p-4`) in sibling components.
- `focus:outline-none` with no `focus-visible` replacement; low-contrast `text-gray-400` body copy.
- Keeping a v3 `tailwind.config.js` with JS theme alongside v4 CSS config "just in case".

## Done checklist

- [ ] All colors, fonts, radii, shadows and easings come from `@theme` tokens traceable to `DESIGN.md`.
- [ ] Components use semantic tokens; dark mode works without per-element `dark:` classes.
- [ ] No arbitrary values except documented one-offs; no concatenated class names.
- [ ] Repeated recipes extracted into components with typed variants; `@apply` only for foreign markup.
- [ ] Focus-visible, hover, disabled and reduced-motion states present; AA contrast verified in both themes.
- [ ] Layout uses container queries where components are reused across widths.
- [ ] CSS output size checked; no unused palettes shipped (`forge-core:performance`).
