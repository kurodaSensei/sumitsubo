---
name: wp-performance-audit
description: Performance and design-system enforcement for native WordPress block themes — removing default WordPress weight, font preloads, deferred scripts, loading plugin assets only where used, image priorities, aiming for Lighthouse 100, plus a deterministic token audit (colors, font sizes, spacing in CSS must come from theme.json) and Impeccable critiques. Use when optimizing a WordPress theme, adding scripts, styles, fonts or plugins, before shipping, or when checking that CSS respects the theme.json design system.
---

# Performance and Token Audits

Target: Lighthouse 100 on mobile for marketing pages, and Core Web Vitals inside the `sumi:performance` budgets. A block theme with no builder and no build step makes this realistic; protect it.

## inc/performance.php recipes

- Remove emoji detection script and styles; remove `wp_generator`, `rsd_link`, `wlwmanifest_link` from the head.
- Preload only the 1–2 font files used above the fold (`<link rel="preload" as="font" type="font/woff2" crossorigin>` at priority 1); the rest load on demand through theme.json `fontFace` with `font-display: swap`.
- Enqueue theme JS with `array( 'strategy' => 'defer', 'in_footer' => true )`; no jQuery dependency.
- Plugins that enqueue globally (forms, sliders, reviews): dequeue their CSS/JS on pages that don't use them, detecting usage with `has_shortcode()` / `has_block()` — including your own custom blocks that wrap them. Leave a `ponytail:` note about where the heuristic would need extending (widgets, templates).
- Hero image: `loading="eager"` + `fetchpriority="high"`; every other image lazy with width/height; art direction with `<picture>` so mobile downloads only its own file.
- Don't load block library CSS you don't use; prefer `wp_enqueue_block_style` per block when adding block-specific CSS.

## Token audit (required before shipping)

Run the bundled auditor against the theme; it fails (exit 2) on CSS values outside the design system:

```bash
node ${CLAUDE_PLUGIN_ROOT}/skills/wp-performance-audit/scripts/audit-tokens.mjs <theme-dir>
```

It reads `theme.json` and scans `assets/css/**/*.css`. Colors, font sizes and radii fail the run; spacing is reported as warnings unless you pass `--strict`:
- **Colors**: hex literals that aren't `#fff`/`#000` — use `var(--wp--preset--color--*)`, `var(--wp--custom--*)` or a `color-mix()` derivative.
- **Font sizes**: `font-size` in px/rem that isn't a theme.json size — use `var(--wp--preset--font-size--*)`.
- **Radii**: `border-radius` literals — use `var(--wp--custom--radius--*)` (0 and 50% allowed).
- **Spacing** (warning, or failure with `--strict`): margin/padding/gap literals that aren't on the spacing scale — use `var(--wp--preset--spacing--*)` or `--wp--custom--space--*`.
Allowed exceptions: `0`, `1px` borders, `rgba()` scrims, and lines ending with `/* token-ok: reason */`.

If a value is genuinely new, add it to theme.json (and DESIGN.md) first, then use the variable.

## Design critique

If Impeccable is installed, run its critique/audit on the rendered pages and keep its config in `.impeccable/` in the repo (ignored rules need a reason). Combine with `/sumi-design:critique`.

## Evidence

Record in the feature file: Lighthouse mobile scores (performance, a11y, best practices, SEO) for home and one template per content type, the token audit output, and axe results.

## Done checklist

- [ ] No emoji/head bloat; fonts preloaded selectively; JS deferred.
- [ ] Plugin assets only where used.
- [ ] Token audit passes.
- [ ] Lighthouse mobile ≥ 95 everywhere, 100 on key pages, numbers recorded.
