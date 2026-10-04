---
name: performance
description: Web performance with Core Web Vitals as acceptance criteria — budgets, LCP, INP and CLS playbooks, images, fonts, JavaScript and third-party cost, caching and delivery, rendering strategy, and how to measure (lab and field) with evidence. Use when building pages or components, adding dependencies, scripts, images or fonts, choosing rendering strategy, or when something is slow. Framework-agnostic baseline: when a stack pack skill (nuxt-data-ssr, react-performance, shopify-performance-a11y, wp-performance-audit) applies, use it for stack specifics.
---

# Performance — Core Web Vitals as Requirements

Budgets are set before building (`.sumi/config.json` → `performanceBudget`) and checked before shipping. Defaults, measured at p75 on mid-tier mobile:

| Metric | Budget |
|---|---|
| LCP | ≤ 2.5 s |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| Initial JS (gzip) | ≤ 170 KB on content sites; justify more on apps |
| Total transfer size | ≤ 1.5 MB for a typical content page |

## LCP — make the hero arrive fast

1. Identify the LCP element (usually the hero image or headline).
2. It must be in the initial HTML (not injected by JS), not lazy-loaded, with `fetchpriority="high"`; preload it only if it is discovered late (CSS background, inside a component).
3. Serve it responsive (`srcset`/`sizes`), AVIF/WebP, from a CDN, sized for the actual slot.
4. Reduce TTFB: static/ISR/edge caching where content allows; avoid blocking server waterfalls.
5. Remove render-blocking: critical CSS small, non-critical CSS deferred; no blocking third-party scripts in `<head>`.

## INP — keep interactions instant

- Keep event handlers small: update UI first, defer non-urgent work (`scheduler.yield()`, `requestIdleCallback`, transitions in React).
- Break long tasks > 50 ms; avoid synchronous layout reads after writes.
- Ship less JS: server-render static content, hydrate only interactive islands, code-split by route and by interaction (load the modal code on first open).
- Watch third parties (chat widgets, A/B tools, tag managers): load after interaction or idle, via a facade when possible.
- Large lists: virtualize or paginate; avoid re-rendering whole trees on each keystroke.

## CLS — nothing jumps

- Dimensions or `aspect-ratio` on every image, video, iframe and ad/embed slot.
- Reserve space for late content (banners, cookie bars, app blocks, reviews widgets) or render them in overlays that don't push content.
- Fonts: `font-display: swap` with metric-matched fallbacks (`size-adjust`, `ascent-override`) or `optional` for body text.
- Animate `transform`/`opacity` only; never animate layout properties.

## Fonts

- Max 2 families, subset, WOFF2, self-hosted (or the framework's font optimizer), preload only the 1–2 files used above the fold. Variable fonts when they replace ≥ 3 static files.

## Images and media

- Correct format and size per slot; `loading="lazy"` below the fold; `decoding="async"`.
- Use the platform's image pipeline (Nuxt Image, next/image, Shopify `image_url` with widths, WordPress `wp_get_attachment_image` with sizes).
- Video: no autoplay hero videos on mobile unless tiny and muted with a poster; lazy-load embeds behind a facade.

## Delivery and caching

- Long-lived immutable caching for hashed assets; short or revalidated caching for HTML.
- HTTP/2+ with compression (Brotli). Preconnect only to origins needed in the first seconds (max 2–3).
- Choose rendering per route: static/ISR for content, SSR for personalized, CSR only behind auth for app-like screens.

## Dependencies

Check the cost before adding (bundlephobia / `pkg-size`, or the bundle analyzer). Prefer native APIs and small focused libraries. Remove unused polyfills for evergreen targets.

## Measuring (evidence required)

- **Lab**: Lighthouse (mobile, throttled) or Unlighthouse for multi-page sites; WebPageTest for waterfalls. Navigation runs can't measure INP — use TBT as its proxy, or a Lighthouse timespan run over the interaction. Record before/after numbers in the feature file.
- **Field**: CrUX / Search Console / `web-vitals` library reporting to analytics for real p75 data. Lab passes do not guarantee field passes.
- **Bundles**: the framework's analyzer (`nuxi analyze`, `@next/bundle-analyzer`, `vite-bundle-visualizer`).
- **Interactions**: Chrome DevTools Performance panel with CPU 4× throttling for INP debugging.

## Slop tells

- Lazy-loading the hero image; `loading="lazy"` on everything.
- Importing a whole library for one function (`lodash`, `moment`, icon packs without tree-shaking).
- Client-side fetching of content that could be server-rendered; `'use client'` / client-only wrappers at the top of the tree.
- Animations on `top/left/width/height`; scroll listeners without passive or throttling.
- Unbounded third-party scripts in the head.

## Done checklist

- [ ] LCP element identified and prioritized; images sized, modern formats, dimensions set.
- [ ] No new render-blocking resources; new third parties deferred or justified.
- [ ] JS added for the feature measured; budget respected or exception justified.
- [ ] Lighthouse mobile numbers before/after recorded as evidence.
