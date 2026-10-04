---
name: wp-custom-blocks
description: Custom Gutenberg blocks without a build step — dynamic blocks with block.json (apiVersion 3) and render.php, editor scripts in plain JavaScript (wp.element.createElement), a shared config-driven editor with ServerSideRender preview for section blocks, InnerBlocks for WYSIWYG bodies, repeaters, media pickers, escaping and accessibility in render.php. Use when creating or editing blocks/*/block.json, render.php, block editor JS, or when a section of a native block theme must be editable by the client.
---

# Custom Blocks (dynamic, no build)

Every custom section is a **dynamic block**: attributes in `block.json`, markup in `render.php` (server-rendered, always current, easy to change), and a lightweight editor in plain JS. No JSX, no `@wordpress/scripts`, no node_modules in the theme.

## Anatomy

```
blocks/<name>/
  block.json     metadata + attributes (+ editorScript handle)
  render.php     the real markup
  index.js       only when the block needs its own editor (rich inline editing, InnerBlocks)
blocks/sections-editor.js   one shared editor for simple section blocks (config-driven)
```

`block.json`:
- `"apiVersion": 3`, `"name": "{theme}/<name>"`, `"category": "{theme}"`, `"textdomain": "{theme}"`, human `title` and `description` in the client's language.
- Typed attributes with sensible defaults written as real content (the block must look finished the moment it is inserted).
- `"supports": { "html": false, "align": ["wide"|"full"], "anchor": true }` as needed; `"reusable": false` for page-specific sections.
- `"render": "file:./render.php"`, `"editorScript": "<registered-handle>"`.

Registration in `inc/setup.php` on `init`: `wp_register_script( handle, …/index.js, [ 'wp-blocks','wp-element','wp-block-editor','wp-components','wp-i18n' (+ 'wp-server-side-render') ], VERSION, true )`, then `register_block_type( DIR . '/blocks/<name>' )`.

## render.php rules

- Read each attribute with a default (`$attributes['title'] ?? ''`); validate enums against an allow-list (`'split' === $x ? 'split' : 'overlay'`); clamp numbers.
- Wrapper via `get_block_wrapper_attributes( [ 'class' => '{theme}-<name> alignwide …' ] )` so anchors, alignment and editor classes work.
- Escape every output: `esc_html` for text, `esc_url` for links and images, `esc_attr` for attributes, `wp_kses_post` only for fields that legitimately allow inline markup. Helpers returning trusted SVG are the only `phpcs:ignore` exceptions, with the reason inline.
- Styles from tokens: `var(--wp--preset--spacing--48)`, `var(--wp--custom--radius--lg)`. Computed values (e.g. an overlay gradient from a color + intensity) are calculated in PHP and mirrored in the editor preview.
- Semantics and a11y: real headings in order, decorative elements `aria-hidden="true"`, buttons vs links correct, accessible names on icon links, "opens in new tab" text for `target="_blank"`.
- Images: `<picture>` with a mobile `<source>` for art direction; the hero image `loading="eager" fetchpriority="high"`, everything else lazy with dimensions.
- No queries in loops; when a block lists posts, query once with the needed fields.

## Editor patterns

**1. Shared config-driven editor (most section blocks).** One `sections-editor.js` holds a `CONFIG` map: block name → list of fields (`{ key, label }`, `type: 'select'` with options, `repeater: true` with `item` fields and a `blank` item). It renders inspector controls from the config and previews with `ServerSideRender`, so the editor shows exactly what `render.php` outputs. Adding a section = block.json + render.php + one CONFIG entry.

**2. Own editor with inline editing.** For hero-like blocks: `RichText` for headlines in the canvas, `MediaUpload` inside `MediaUploadCheck` for desktop/mobile images (store both `id` and `url`), controls in `InspectorControls` panels. Mirror any computed style from render.php for the preview.

**3. InnerBlocks for rich bodies.** Legal pages, info pages: the block's own fields (hero, CTA) live in the inspector; the body is `InnerBlocks` with a starter `TEMPLATE` of core headings and paragraphs, so the client gets the normal editor (bold, links, lists). `save` returns `InnerBlocks.Content`; render.php prints its parts around `$content`. Parent/child blocks (`info-page` → `info-section`) restrict children with `allowedBlocks`.

All editor strings through `wp.i18n.__( '…', '{theme}' )`.

## Reuse before creating

1. Core block + theme.json style or a registered block style variation.
2. A pattern composed of core blocks.
3. Only then a custom dynamic block. Name it after the content ("steps", "destino-card"), not the layout ("three-columns").

## Slop tells

- A build toolchain added to the theme just for one block; JSX in a no-build theme.
- Static blocks (`save` with markup) for sections the design will change — every markup change breaks validation.
- Unescaped attributes; `wp_kses_post` on everything; inline hardcoded colors.
- Editor preview that doesn't match the front (no ServerSideRender, no mirrored styles).
- Blocks with empty defaults that look broken when inserted.

## Done checklist

- [ ] block.json valid, typed attributes with real defaults, correct supports.
- [ ] render.php escapes everything and uses tokens only.
- [ ] Editor preview equals the front; strings translatable.
- [ ] Keyboard and screen reader check on the rendered block (`sumi:a11y`).
- [ ] A pattern exists if the block is meant to be inserted with default content.
