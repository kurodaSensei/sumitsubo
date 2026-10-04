---
name: shopify-theme-architecture
description: Online Store 2.0 theme structure and workflow - directory roles, JSON templates and alternate templates, section groups, the section vs theme block vs snippet decision, settings_schema.json, locales and schema translation keys, Shopify CLI (theme dev, push to unpublished themes, pull, theme check), and git workflow that survives customizer edits to JSON. Use when creating or reorganizing theme files, deciding where a component belongs, editing templates/*.json, sections/*-group.json, config/settings_schema.json, config/settings_data.json, locales/*.json, layout/theme.liquid, .shopifyignore, or when running shopify theme commands, deploying, or resolving JSON merge conflicts.
---

# Shopify Theme Architecture (OS 2.0)

Applies to any Online Store 2.0 theme: Dawn-derived, Horizon-style theme-block themes, or fully custom, with or without a bundler that emits into `assets/`. Detect which before writing code: read `layout/theme.liquid`, list `blocks/`, check `package.json` for a build step.

## Directory roles

| Path | Holds | Rules |
|---|---|---|
| `layout/` | `theme.liquid` (+ `password.liquid`, optional alt layouts) | Must output `{{ content_for_header }}` in `<head>` and `{{ content_for_layout }}` in `<body>`. Keep thin. |
| `templates/*.json` | Section composition per page type | JSON over `.liquid`. `customers/*`, `gift_card.liquid` stay Liquid where required. |
| `sections/*.liquid` | Merchant-placeable modules with `{% schema %}` | One job per section. |
| `sections/*-group.json` | Section groups (header, footer, overlays) | Rendered by `{% sections 'header-group' %}` in the layout. |
| `blocks/*.liquid` | Theme blocks, reusable across sections, nestable | Only in themes that adopt theme blocks. |
| `snippets/*.liquid` | Code-only partials via `{% render %}` | No schema, no merchant settings of their own. |
| `config/settings_schema.json` | Global theme settings definition | Source-controlled, edited by devs. |
| `config/settings_data.json` | Saved values for global settings | Written by the customizer. Treat as merchant data. |
| `locales/` | `*.default.json` storefront strings, `*.schema.json` editor strings | Every visible string lives here. |
| `assets/` | Flat directory (no subfolders) of CSS, JS, SVG, fonts | If a bundler emits here, edit the source, never the output. |

## Where does it belong?

| Need | Use |
|---|---|
| Full-width page module the merchant adds, removes, reorders | Section |
| Repeatable or rearrangeable content inside one section only | Section-local block (defined in that section's schema) |
| Component reused across many sections, possibly nested (heading, button, image, group) | Theme block in `blocks/` |
| Fixed child a section always renders, still editable | Static block: `{% content_for 'block', type: 'x', id: 'y' %}` |
| Markup reused by code, no merchant settings (price, icon, product card internals) | Snippet |
| Site-wide token (colors, type scale, radius, spacing) | `settings_schema.json` |
| Header, announcement bar, footer | Section group |
| Per-product or per-page structured data | Metafield or metaobject, not a section setting |

Rules: a section either accepts theme blocks (`@theme`) or defines local blocks; do not mix both in one schema. If the theme has no `blocks/` folder, do not introduce theme blocks without asking: it changes the authoring model for every section.

## JSON templates

- `sections` map: arbitrary unique IDs to `{ "type", "settings", "blocks", "block_order" }`. `order` lists section IDs top to bottom.
- `block_order` must list every block ID present; omitted blocks are dropped or reordered unexpectedly.
- Alternate templates: `product.preorder.json`, `page.contact.json`. Merchant assigns them per resource in admin. Create one only when layout genuinely differs; prefer settings or metafield-driven conditionals for small variations.
- Templates hold defaults and saved merchant edits at once. After the theme is live, the customizer owns them (see git workflow).
- Section `"disabled": true` hides without deleting; keep it rather than removing merchant content.

## Global settings (`config/settings_schema.json`)

- First entry is `theme_info` (name, version, author, docs and support URLs). Use the owner's or client's details, never a placeholder company.
- Group into categories merchants recognize: Logo and favicon, Colors / color schemes, Typography, Layout, Buttons, Product cards, Cart, Social media.
- Prefer `color_scheme_group` + per-section `color_scheme` over a dozen loose color pickers when the theme supports schemes.
- Read in Liquid as `settings.<id>`. Expose them to CSS once (a `css-variables` snippet or `{% style %}` in the layout), then consume custom properties everywhere. See `forge-core:css-architecture`.
- Never rename or remove an existing setting ID on a live theme without a migration: saved values in `settings_data.json` and templates silently orphan.

## Locales

- Storefront strings: `{{ 'products.product.add_to_cart' | t }}`, keys in `locales/en.default.json` (or the store's default language file).
- Editor strings: `"label": "t:settings.heading"` resolving in `locales/en.default.schema.json`. Use translation keys for schema text in themes meant for multiple languages or the Theme Store; plain sentence-case strings are acceptable in a single-language custom theme if the existing code does that. Match the codebase.
- Keys are snake_case, grouped by feature, shallow (2 to 3 levels). Interpolate, never concatenate: `'cart.items_count' | t: count: cart.item_count` with `one`/`other` plural keys.
- Add keys to the default locale; flag missing keys in other locales instead of machine-translating silently.

## Shopify CLI workflow (summary)

```bash
shopify theme dev --store my-store            # local preview with hot reload, uses a dev theme
shopify theme check                           # lint Liquid, JSON, schema, a11y and perf rules
shopify theme push --unpublished              # new unpublished theme for review
shopify theme push --theme <id>               # update a known unpublished/staging theme
shopify theme pull --theme <id> --only 'templates/*.json' --only 'sections/*-group.json' --only config/settings_data.json
shopify theme share                           # throwaway preview link
```

Non-negotiables:
- Never push to the live (published) theme. Never use `--allow-live` unless the owner explicitly asks for that exact command in this session.
- Before every push to a theme the merchant may have edited, pull its JSON first or push with `--nodelete` plus `--ignore` for JSON files, so customizer edits are not overwritten.
- Run `shopify theme check` before pushing; fix errors, justify any disabled check in `.theme-check.yml`.
- Full flags, `.shopifyignore`, GitHub integration and conflict resolution: `references/cli-git-workflow.md`.

## AI slop tells (reject in review)

- A `.liquid` template created where a JSON template works.
- A giant monolith section (hero + features + testimonials + newsletter) instead of composable sections or blocks.
- New global settings for one-off section concerns, or section settings duplicating global tokens.
- Snippet with its own `{% schema %}`; section with no `presets` that the merchant cannot add.
- Files placed in `assets/subfolder/` (not supported) or edits to bundler output.
- `theme_info` with an invented author, or setting IDs renamed for "consistency" on a live theme.
- Customizer JSON (`settings_data.json`, templates) overwritten from a stale local copy.

## Done checklist

- [ ] Component sits at the right level (section / block / static block / snippet) per the table above.
- [ ] Templates are JSON; `order` and `block_order` reference only existing IDs.
- [ ] New sections have `presets` (if addable) and `enabled_on`/`disabled_on` where placement matters.
- [ ] All visible and editor strings resolve through locales (or match the theme's existing single-language convention).
- [ ] No setting ID removed or renamed without migration notes.
- [ ] `shopify theme check` passes; preview via `theme dev` or an unpublished theme, never live.
- [ ] Remote JSON pulled before push; diff of `templates/` and `config/settings_data.json` reviewed.

Related: `shopify-liquid`, `shopify-sections-blocks`, `shopify-storefront-js`, `shopify-performance-a11y`.
