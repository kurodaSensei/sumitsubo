---
name: shopify-liquid
description: Shopify Liquid authoring - syntax and evaluation pitfalls, render vs include, LiquidDoc {% doc %} for snippets and blocks, whitespace control, the liquid tag, loop performance and pagination, metafields and metaobjects, responsive images with image_url and image_tag, money and translation filters. Use when writing or reviewing any .liquid file (sections/**/*.liquid, blocks/**/*.liquid, snippets/**/*.liquid, layout/*.liquid, templates/**/*.liquid), when output is wrong or blank, when a filter or object might not exist, or when a page renders slowly on the server.
---

# Shopify Liquid

Liquid is a small, safe template language with Shopify-specific objects, tags and filters. Most AI errors here are invented APIs and logic that assumes a general-purpose language. If unsure a filter, object or property exists, check `references/liquid-quick-reference.md`, then verify against shopify.dev. Never guess.

## Syntax rules that bite

- No parentheses in conditions. `and`/`or` evaluate right to left. Nest `if` blocks or precompute booleans with `assign`.
- No ternary, no `!`, no `&&`. Use `unless`, `!=`, `and`.
- `contains` works on strings and arrays of strings only, not on arrays of objects. Use `where` / `has` / `find` for objects.
- Truthiness: only `nil` and `false` are falsy. `''`, `0`, `[]` are truthy. Test content with `!= blank`; test arrays with `.size > 0`.
- `| default:` replaces `false` too. For checkboxes use `| default: true, allow_false: true` or test `== false` explicitly.
- Integer math truncates: `{{ 7 | divided_by: 2 }}` is `3`. Use `2.0` for a float.
- Prices are integers in cents (subunits). Format with `money` filters; never divide by 100 manually.
- Loop helpers are `forloop.index`, `forloop.index0`, `forloop.first`, `forloop.last`, `forloop.length`. There is no `loop.index`, no `@index`.
- `for` has `limit:`, `offset:`, `reversed` and an `{% else %}` branch for empty arrays.
- Assigned variables in a section are global to that file; inside a snippet they stay local.

## render, not include

```liquid
{%- # DO: explicit inputs, isolated scope -%}
{% render 'product-card', product: product, show_vendor: section.settings.show_vendor %}
{% render 'product-card' for section.settings.collection.products as product %}

{%- # DON'T: include is deprecated and leaks scope -%}
{% include 'product-card' %}
```

A rendered snippet cannot see the caller's variables (except globals like `settings`, `request`, `shop`). Pass everything it needs. `render` cannot take a variable as the snippet name.

## Document snippets and blocks with LiquidDoc

```liquid
{% doc %}
  Renders a product price with sale and unit price states.

  @param {product} product - Product to price
  @param {boolean} [show_compare] - Show compare-at price when on sale. Default: true
  @param {string} [class] - Extra classes on the wrapper

  @example
  {% render 'price', product: product, show_compare: false %}
{% enddoc %}
```

Bracketed names are optional. Theme check and editors use this for autocomplete and argument validation. Give every optional param a documented default and apply it with `default`.

## Whitespace and multi-line logic

Use `{%- -%}` / `{{- -}}` around logic to keep HTML clean. Use `{% liquid %}` for blocks of assignments; inside it, one tag per line, no delimiters, `echo` for output.

```liquid
{%- liquid
  assign product = section.settings.product | default: product
  assign on_sale = false
  if product.compare_at_price > product.price
    assign on_sale = true
  endif
-%}
```

Inline comments: `{% # note %}`. Block comments: `{% comment %}...{% endcomment %}`.

## Escaping

- Plain-text settings and customer input: `{{ block.settings.heading | escape }}`.
- `richtext` / `inline_richtext` settings: output raw (already sanitized HTML).
- Values into attributes: `escape`. Values into inline JSON: `| json` (never hand-build JSON strings).

## Performance on the server

Liquid renders on every uncached request; slow Liquid means slow TTFB and worse LCP.

- Never nest loops over large collections (`for product in collection.products` inside `for collection in collections`). Precompute with `where`, `map`, `uniq`, or move the data to a metafield/metaobject.
- Iterating `collection.products` without `paginate` yields at most 50 items. Use `{% paginate collection.products by section.settings.per_page %}`; respect the platform's page-size cap (verify current maximum on shopify.dev).
- Use `limit:` on every loop that feeds a fixed-size UI (carousel of 8 renders 8, not 50).
- `all_products['handle']` is rate-limited per page (verify current limit); prefer a `product` or `product_list` setting.
- Avoid re-rendering the same snippet with identical inputs; `capture` once and output twice.
- Profile with `shopify theme profile` or the Theme Inspector (verify current tooling) before micro-optimizing.

## Images

```liquid
{%- # DO: responsive, sized, explicit loading -%}
{{ section.settings.image
  | image_url: width: 2400
  | image_tag:
    widths: '480, 800, 1200, 1600, 2400',
    sizes: '(min-width: 990px) 50vw, 100vw',
    loading: 'lazy',
    class: 'media__img',
    alt: section.settings.image.alt
}}

{%- # DON'T: deprecated filter, no srcset, no dimensions, hardcoded alt -%}
<img src="{{ section.settings.image | img_url: 'master' }}" alt="image">
```

- `image_url` needs `width:` and/or `height:` (max 5760). `image_tag` emits `width`/`height` and a `srcset`, which prevents CLS.
- `sizes` must describe the real rendered width, or the browser downloads oversized files.
- Above-the-fold hero: `loading: 'eager', fetchpriority: 'high'` (optionally `preload: true` for one image). Everything else: lazy. See `shopify-performance-a11y`.
- Always guard: `{% if image != blank %}...{% else %}{{ 'image' | placeholder_svg_tag: 'placeholder' }}{% endif %}`.
- Alt text: `image.alt` from the media library; decorative images get `alt: ''`.

## Metafields and metaobjects

```liquid
{%- assign care = product.metafields.custom.care_instructions -%}
{% if care != blank %}
  <div class="rte">{{ care | metafield_tag }}</div>
{% endif %}

{%- # List and reference types: use .value -%}
{% for item in product.metafields.custom.features.value %}{{ item | escape }}{% endfor %}
{%- assign size_chart = product.metafields.custom.size_chart.value -%}
{{ size_chart.title.value }}

{%- # Metaobject entry by type and handle (global metaobjects object) -%}
{%- assign faq = metaobjects.faq_group['shipping'] -%}
```

Never invent a namespace/key. Ask for (or read from the store or existing code) the exact definition and type. Remember merchants can connect section settings to metafields as dynamic sources, so a setting value may be empty per resource: always guard.

## Translations

Every customer-facing string uses `| t`. Interpolate, do not concatenate. Use `count:` for plurals.

```liquid
{{ 'products.product.sold_out' | t }}
{{ 'cart.items_count' | t: count: cart.item_count }}
{%- # DON'T -%} <button>Add to cart</button>  {{ cart.item_count }} items
```

## AI slop tells

- Invented filters: `| format_money`, `| currency`, `| image_resize`, `| truncate_html`, `| json_parse`, `| to_string`, `| slugify` (Liquid has `handleize`).
- Invented objects or properties: `product.reviews`, `product.rating` without a metafield, `variant.stock`, `cart.subtotal` (it is `cart.total_price` / `cart.items_subtotal_price`), `forloop.count`.
- Deprecated APIs: `img_url`, `img_tag`, `product_img_url`, `include`. (`| within` for collection-aware product URLs: verify current guidance on shopify.dev before using it.)
- JavaScript-isms: `&&`, `||`, ternaries, `.length` (it is `.size`), `===`, `null` checks instead of `blank`.
- Hardcoded English strings, currency symbols, or `| divided_by: 100` on prices.
- `{% break %}` used outside a loop to "return" from a snippet.

## Done checklist

- [ ] Every filter, tag and object exists (quick reference or shopify.dev); no deprecated APIs.
- [ ] Snippets use `render` with explicit params and a `{% doc %}` header.
- [ ] Strings via `| t`; prices via `money*`; user text escaped.
- [ ] Loops bounded (`limit`, `paginate`); no nested loops over large arrays.
- [ ] Images via `image_url` + `image_tag` with `widths`, accurate `sizes`, loading strategy, alt.
- [ ] Metafield access guarded with `!= blank`; namespaces/keys confirmed, not guessed.
- [ ] `shopify theme check` clean for touched files.

Related: `shopify-theme-architecture`, `shopify-sections-blocks`, `forge-core:performance`.
