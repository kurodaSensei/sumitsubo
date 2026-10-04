# Tokens and variant components

## Mapping DESIGN.md to @theme

`DESIGN.md` (produced by forge-design) is the source of truth. Mirror its token groups into Tailwind
namespaces so utilities are generated automatically:

| DESIGN.md group | @theme namespace | Generates |
| --- | --- | --- |
| Colors (raw) | `--color-*` | `bg-*`, `text-*`, `border-*`, `fill-*`... |
| Font families | `--font-*` | `font-*` |
| Type scale | `--text-*` (+ `--text-*--line-height`) | `text-*` |
| Spacing base | `--spacing` | `p-4`, `gap-6` = multiples of the base |
| Radii | `--radius-*` | `rounded-*` |
| Shadows / elevation | `--shadow-*` | `shadow-*` |
| Easing | `--ease-*` | `ease-*` |
| Breakpoints | `--breakpoint-*` | `sm:`, `md:`... |
| Container sizes | `--container-*` | `@sm:`, `max-w-*` |

Namespace names above reflect Tailwind v4 conventions; verify against current docs when adding a
less common group.

Rules:
- Keep the raw palette small (brand, neutral ramp, feedback colors). Semantic tokens reference it.
- If the design needs a value not in `DESIGN.md`, update `DESIGN.md` first, then the theme.
- Naming: semantic tokens describe role (`surface`, `surface-raised`, `fg`, `fg-muted`, `line`,
  `accent`, `accent-fg`, `danger`, `focus`), not appearance (`light-gray`).

## Type scale with line heights

```css
@theme {
  --text-body: 1rem;
  --text-body--line-height: 1.6;
  --text-h2: clamp(1.5rem, 1.2rem + 1.2vw, 2.125rem);
  --text-h2--line-height: 1.2;
  --text-h2--letter-spacing: -0.01em;
}
```

Usage: `text-h2`, `text-body`. Headings get their size from tokens, never `text-[34px]`.

## Variant component with cva + tailwind-merge

```ts
// app/utils/cn.ts
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
```

```vue
<!-- app/components/ui/Button.vue -> <UiButton> -->
<script setup lang="ts">
import { cva, type VariantProps } from 'class-variance-authority'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-card font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ' +
  'disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent/90',
        secondary: 'border border-line bg-surface text-fg hover:bg-surface-raised',
        ghost: 'text-fg hover:bg-surface-raised',
      },
      size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4', lg: 'h-12 px-6 text-lg' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)
type ButtonVariants = VariantProps<typeof button>

const { variant, size, class: className, type = 'button' } = defineProps<{
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: string
  type?: 'button' | 'submit' | 'reset'
}>()
</script>

<template>
  <button :type="type" :class="cn(button({ variant, size }), className)">
    <slot />
  </button>
</template>
```

Notes:
- Assumes semantic tokens `accent-fg`, `surface-raised` and `focus` exist in the `@theme inline`
  layer alongside the ones shown in SKILL.md.
- `h-10` gives a 40px target; WCAG 2.2 AA (2.5.8) requires at least 24x24 CSS px or adequate
  spacing - larger is better for touch.
- If the button can render as a link, accept an `as`/`to` prop and render `<NuxtLink>`; never put a
  `<button>` inside an `<a>`.

## Styling foreign content

```css
/* Prose from CMS / markdown */
.prose-content {
  @apply text-body text-fg;
  & h2 { @apply mt-12 mb-4 font-display text-h2; }
  & a  { @apply text-accent underline underline-offset-4 hover:no-underline; }
}
```

Or use `@tailwindcss/typography` customized with your tokens. This is the legitimate home of `@apply`.

## Container queries

```vue
<article class="@container rounded-card border border-line bg-surface p-4">
  <div class="grid gap-4 @md:grid-cols-[8rem_1fr]">
    <NuxtImg ... class="aspect-square w-full rounded-card object-cover" />
    <div>...</div>
  </div>
</article>
```

The card adapts to its slot (sidebar vs main column) without knowing the viewport.

## Migrating v3 projects (summary)

- Move `theme.extend` values to `@theme` variables; delete the JS config when done.
- Check renamed utilities (several shadow, radius, blur and outline utilities shifted one step or were
  renamed in v4) and default border/ring color changes - verify with the official upgrade guide and
  run the upgrade tool, then review the diff visually.
