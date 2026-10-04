# Schema Reference

Condensed from the platform docs. Limits and newer keys change; verify against shopify.dev when a value matters.

## Section schema keys

| Key | Notes |
|---|---|
| `name` | Editor title. Required. Supports `t:` keys. |
| `tag` | Wrapper element (default `div`): `article`, `aside`, `div`, `footer`, `header`, `section`. |
| `class` | Extra classes on the `shopify-section` wrapper. |
| `limit` | Max instances per template / group (1 or 2). |
| `settings` | Array of settings (below). IDs unique within the section. |
| `blocks` | Local block definitions, or `@theme` / `@app` / specific theme block types. Not both local and `@theme`. |
| `max_blocks` | Cap on top-level blocks (platform max 50). |
| `presets` | Makes the section addable; each has `name`, optional `category`, `settings`, `blocks` (array or object + `block_order`). |
| `default` | Defaults for a section rendered statically with `{% section 'name' %}` (legacy pattern). |
| `enabled_on` / `disabled_on` | `{ "templates": [...], "groups": [...] }`. Use one, not both. Template values include `*`, `index`, `product`, `collection`, `list-collections`, `page`, `blog`, `article`, `search`, `cart`, `404`, `password`, `gift_card`, `metaobject`, `customers/*`. Groups: `header`, `footer`, `aside`, or custom group types (verify). |
| `locales` | Inline translations for portable sections; prefer theme locale files. |

## Theme block schema keys

| Key | Notes |
|---|---|
| `name` | Required. |
| `tag` | Any element name, or `null` for no wrapper (then output `block.shopify_attributes` yourself). |
| `class` | Added to the wrapper. |
| `settings` | Same setting types as sections. |
| `blocks` | Nested accepts: `@theme`, `@app`, or specific types. |
| `presets` | Required for the block to appear in the picker. Presets can include nested blocks and settings. |

Section-local block entries take `type`, `name`, `settings`, optional `limit` per type.

## Setting attributes (input settings)

`type`, `id`, `label` required. Optional: `default`, `info`, `placeholder` (text-like), `visible_if`.

`visible_if` syntax: `"{{ section.settings.layout == 'split' }}"` or `"{{ block.settings.show_button }}"`. It hides, it does not clear the value; your Liquid must still ignore irrelevant values. Not supported on resource pickers and `color_scheme_group` (verify).

## Setting types

Sidebar (no `id`): `header` (`content`, optional `info`), `paragraph` (`content`).

| Group | Types | Key extras / gotchas |
|---|---|---|
| Text | `text`, `textarea`, `inline_richtext`, `richtext`, `html`, `liquid` | `richtext` default must be wrapped in `<p>`; `inline_richtext` has no paragraphs; `html`/`liquid` are escape hatches, avoid for normal content. |
| Number | `number`, `range` | `range` needs `min`, `max`, `default`; `step` and `unit` optional; the platform caps the number of steps (verify, historically 101). |
| Choice | `checkbox`, `select`, `radio`, `text_alignment` | `select`/`radio` need `options: [{ value, label }]`; `select` options can have `group`. `checkbox` default must be boolean. |
| Media | `image_picker`, `video`, `video_url` | `video_url` needs `accept: ["youtube", "vimeo"]`. `image_picker` returns an image object; guard blank. |
| Color | `color`, `color_background`, `color_scheme`, `color_scheme_group` | `color` default must be a hex; `color_background` returns CSS gradient strings. Scheme groups live in settings_schema only. |
| Type | `font_picker` | `default` required, e.g. `assistant_n4`; load with `font_face`. |
| Navigation | `link_list`, `url` | `url` cannot have a non-empty default except `/collections` or `/collections/all` (verify). |
| Resources | `product`, `product_list`, `collection`, `collection_list`, `blog`, `page`, `article`, `article_list`, `metaobject`, `metaobject_list` | No `default`. Lists accept `limit` (max 50). Metaobject pickers need `metaobject_type`. |

There is no `toggle`, `slider`, `image`, `boolean`, `color_picker`, `dropdown`, `json` or `markdown` setting type.

## Presets with nested theme blocks

```json
"presets": [
  {
    "name": "t:blocks.card.presets.image_card",
    "category": "t:categories.layout",
    "settings": { "padding": 24 },
    "blocks": {
      "media": { "type": "image" },
      "body": {
        "type": "group",
        "blocks": {
          "title": { "type": "heading", "settings": { "text": "Card title" } },
          "cta":   { "type": "button" }
        },
        "block_order": ["title", "cta"]
      }
    },
    "block_order": ["media", "body"]
  }
]
```

Use the object form with `block_order` when you need stable IDs or must populate static blocks (add `"static": true` to entries that correspond to `content_for 'block'` calls; verify current syntax).

## Global settings file shape

```json
[
  { "name": "theme_info", "theme_name": "...", "theme_version": "1.0.0", "theme_author": "...", "theme_documentation_url": "...", "theme_support_url": "..." },
  { "name": "t:settings_schema.colors.name", "settings": [ { "type": "color_scheme_group", "id": "color_schemes", "definition": [ ... ], "role": { ... } } ] },
  { "name": "t:settings_schema.typography.name", "settings": [ { "type": "font_picker", "id": "type_body_font", "label": "t:settings.body_font", "default": "assistant_n4" } ] }
]
```

Access as `settings.<id>`; color schemes via `settings.color_schemes[scheme_id].settings.<role>`.

## Label style quick table

| Do | Don't |
|---|---|
| Products per row | How many products should be displayed in each row |
| Show rating | Show Rating / Enable or disable rating stars |
| Subheading | Subheading text field |
| Overlay opacity | Adjust the opacity of the dark overlay on the image |
| Desktop layout (with `info` for detail) | Layout (desktop only, mobile always stacks) |
