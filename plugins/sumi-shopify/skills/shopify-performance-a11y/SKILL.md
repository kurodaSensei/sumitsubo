---
name: shopify-performance-a11y
description: Core Web Vitals and WCAG 2.2 AA for Shopify themes - LCP image priority and preload, lazy loading by section position, responsive sizes, font loading with font_face, CSS/JS loading, app script and app block bloat, CLS from images, app blocks and banners, INP on variant and cart interactions; e-commerce accessibility patterns for product cards, sale prices, variant pickers, galleries, filters, cart drawer dialogs, quantity steppers, and announcements. Use when building or auditing layout/theme.liquid, header, hero, product, collection, cart or search sections, snippets/*card*.liquid, snippets/*price*.liquid, facets, or when Lighthouse, CrUX, the Shopify web performance report, axe or a manual a11y review flags issues.
---

# Shopify Performance and Accessibility

Targets: LCP under 2.5 s, CLS under 0.1, INP under 200 ms at p75 on mobile; WCAG 2.2 AA. Generic methodology lives in `sumi:performance` and `sumi:a11y`; this skill covers what is specific to Shopify themes.

## LCP

The LCP element on most storefronts is the hero image or the first product image.

```liquid
{%- liquid
  assign is_above_fold = false
  if section.index != nil and section.index <= 2
    assign is_above_fold = true
  endif
-%}
{%- if is_above_fold -%}
  {{ image | image_url: width: 2400 | image_tag: widths: '750, 1100, 1500, 2000, 2400', sizes: '100vw', loading: 'eager', fetchpriority: 'high', preload: true, alt: image.alt }}
{%- else -%}
  {{ image | image_url: width: 2400 | image_tag: widths: '750, 1100, 1500, 2000, 2400', sizes: '100vw', loading: 'lazy', alt: image.alt }}
{%- endif -%}
```

- Exactly one or two high-priority images per page; `preload: true` on at most one (it adds a preload hint; overusing it competes with CSS).
- Never lazy-load the LCP image; never fade it in with JS or hide it behind a slider init.
- Hero sliders: render slide 1 as a normal eager image; later slides lazy. Prefer no autoplay.
- `sizes` must match CSS width; oversized `sizes` wastes bandwidth on mobile.
- Server time matters: heavy Liquid (nested loops, many `all_products` lookups) delays first byte. See `shopify-liquid`.
- Image `section.index` logic must fall back when nil (Section Rendering API, static sections). Check whether the platform now applies default lazy loading to `image_tag` and keep explicit values regardless (verify against shopify.dev).

## CLS

- `image_tag` outputs width/height; keep them, and set `aspect-ratio` on media wrappers for ratio settings (`adapt`, square, portrait).
- Reserve space for anything injected later: app blocks (reviews stars, installments), announcement bars, cookie banners (overlay, do not push), recommendations, predictive search panel.
- Fonts: `font_display: 'swap'` plus metric-compatible fallbacks; avoid late-loading icon fonts.
- No content inserted above existing content after load (geo banners, "free shipping" bars) without reserved height.

## Fonts and CSS

```liquid
{%- # In <head>, from settings -%}
<link rel="preconnect" href="https://fonts.shopifycdn.com" crossorigin>
{{ settings.type_body_font | font_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: true }}
{% style %}
  {{ settings.type_body_font | font_face: font_display: 'swap' }}
  {{ settings.type_body_font | font_modify: 'weight', 'bold' | font_face: font_display: 'swap' }}
{% endstyle %}
```

- Preload only the one or two font files used above the fold; guard `font_modify` results (nil when the weight does not exist).
- Critical CSS small and in `<head>`; section-specific CSS loaded with its section (`{% stylesheet %}`, a per-section asset, or the bundler's split) rather than one giant file.
- Prefer system fonts when the brand allows.

## JavaScript and apps

- All theme scripts `defer` or `type="module"`. No render-blocking third-party scripts in `<head>` besides what `content_for_header` injects (which you cannot edit).
- Audit apps: uninstalled apps often leave snippets, `{% render 'app-x' %}` calls, and script tags in `theme.liquid`. Remove leftovers with the merchant's agreement.
- Prefer app embeds and app blocks (removable from the editor) over pasted script tags. Load chat widgets, reviews and UGC on interaction or idle.
- Do not ship a slider library for one carousel; CSS scroll-snap plus a small component is enough.
- INP: variant change and add-to-cart handlers must be short; yield (`await` a microtask/`scheduler.yield` where available) before heavy DOM work, avoid layout thrash, debounce input.
- Measure with field data (CrUX, Shopify's web performance report in admin) plus Lighthouse on mobile for home, collection, product, cart. Compare against the theme baseline before blaming code.

## Accessibility patterns (summary)

Full markup in `references/ecommerce-a11y-patterns.md`.

- Product card: one link (product title) is the tab stop; a pseudo-element stretches its hit area over the card. Secondary actions (quick add) are real buttons with names including the product title; never `tabindex="-1"` on something sighted keyboard users can see.
- Price: sale and regular prices labelled in text for screen readers ("Regular price", "Sale price") via translations; "Sold out" and "Sale" badges are text, not color alone.
- Variant picker: each option is a `<fieldset>` + `<legend>`, values are native radio inputs (visually styled as buttons or swatches); unavailable values stay focusable and are announced ("Sold out" / "Unavailable"), swatches have text names.
- Gallery: thumbnails are buttons with `aria-current` / pressed state; main media change announced politely; zoom/lightbox is a modal dialog; video has controls and no autoplay with sound; 3D/AR via Shopify's model viewer buttons.
- Filters: disclosure buttons (`aria-expanded`) wrapping `<fieldset>` groups; price range has labelled inputs; result count in a polite live region; applied filters removable via buttons with names ("Remove filter: Red").
- Cart drawer: native `<dialog>` opened with `showModal()`, labelled heading, close button first, focus returns to trigger, `Escape` closes. Line item quantity steppers have labelled buttons ("Increase quantity for X") and a labelled input; remove buttons include the product name.
- Announcements: one polite live region for cart and filter updates, created at page load (not injected with content).
- WCAG 2.2 specifics: focus not obscured by sticky headers or drawers (2.4.11, use `scroll-padding-top`), target size at least 24 x 24 CSS px for swatches, steppers and close buttons (2.5.8), slider/carousel and range filters operable without dragging (2.5.7), consistent help placement (3.2.6).
- Motion: honor `prefers-reduced-motion` for marquees, parallax, autoplay; any autoplay has a visible pause control.
- Language: `<html lang="{{ request.locale.iso_code }}">`; skip link to `#MainContent`; one `h1` per page (product title on PDP, collection title on PLP).

## AI slop tells

- `loading="lazy"` on the hero, or `fetchpriority="high"` on every image.
- `| img_url` or raw `<img src>` without width/height/srcset; `sizes="100vw"` on a 4-column grid card.
- Google Fonts `<link>` added beside the theme's `font_picker` settings; render-blocking `script_tag` in `<head>`.
- Variant buttons as `<div onclick>` or `<button>` lists with no group semantics; swatches with only a background color.
- Product cards where image, title, price and button are four separate links to the same URL.
- Cart drawer built from a `<div>` with no focus management; `aria-live` regions injected together with their content.
- `aria-label` on everything, or ARIA roles overriding native semantics (`role="button"` on `<a href>`).

## Done checklist

- [ ] LCP image eager + `fetchpriority="high"`, not lazy; all other images lazy with accurate `sizes`.
- [ ] No layout shift from images, app blocks, banners or fonts (CLS under 0.1 on key templates).
- [ ] Scripts deferred; leftover app code removed; no duplicate libraries; INP verified on variant change and add to cart.
- [ ] Fonts from theme settings with `swap`; at most two font preloads.
- [ ] Product card, price, variant picker, gallery, filters and cart drawer match the patterns reference.
- [ ] Keyboard-only pass: visible focus, logical order, no traps, focus not obscured, Escape closes overlays.
- [ ] Screen reader spot check (VoiceOver or NVDA) of add to cart and filtering announcements.
- [ ] axe/Lighthouse a11y clean on home, collection, product, cart, search; contrast checked for every color scheme.

Related: `shopify-liquid`, `shopify-storefront-js`, `sumi:performance`, `sumi:a11y`, `sumi:css-architecture`.
