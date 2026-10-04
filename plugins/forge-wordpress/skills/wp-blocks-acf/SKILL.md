---
name: wp-blocks-acf
description: Build Gutenberg custom blocks (block.json apiVersion 3, @wordpress/scripts, dynamic render.php, viewScript/viewScriptModule, metadata-collection registration) and ACF blocks (block.json with acf key, blockVersion 3), plus ACF field groups as code (acf-json sync), field naming conventions, and client editing UX (defaults, instructions, locking, patterns). Use when creating or editing block.json, render.php, edit.js/index.js under blocks/, acf-json/**, ACF field groups, acf_register_block_type or register_block_type calls, block patterns, or any **/blocks/**/*.{php,js,jsx,ts,tsx,scss}.
---

# Custom Blocks and ACF

Blocks are the client's editing surface: design for the editor as much as the front end. Related: `wp-theme-architecture` (theme.json, enqueue), `wp-security-performance` (escaping), `forge-core:a11y`, `forge-core:js-ts`, `forge-core:css-architecture`.

## 1. Choose the block type

| Need | Use |
|---|---|
| Arrangement of core blocks, no new data | Block pattern (`patterns/*.php`) or synced pattern - no code block needed |
| Variation of a core block (preset classes/attrs) | Block variation or block style (`register_block_style`) |
| Content-editable block, markup rarely changes | Native block, dynamic render (`render.php`) |
| Data from fields, PHP-heavy markup, team is PHP-first | ACF block |
| Block that queries posts / depends on site state | Dynamic block (never static `save()`) |
| Interactive front-end behavior | Interactivity API or a small `viewScriptModule` |

Prefer dynamic rendering (`save` returns `null` / uses `render`) for anything whose markup may evolve: static `save()` output changes cause "block validation failed" errors and need `deprecated` entries.

## 2. Native block with @wordpress/scripts

```
blocks/testimonial/
  block.json  index.js  edit.js  render.php  style.scss  editor.scss  view.js (optional)
```
```json
{
  "$schema": "https://schemas.wp.org/trunk/block.json",
  "apiVersion": 3,
  "name": "acme/testimonial",
  "title": "Testimonial",
  "category": "text",
  "description": "Customer quote with name and role.",
  "textdomain": "acme",
  "attributes": {
    "quote": { "type": "string", "default": "" },
    "name":  { "type": "string", "default": "" }
  },
  "supports": { "html": false, "align": ["wide"], "color": { "background": true, "text": false }, "spacing": { "padding": true } },
  "editorScript": "file:./index.js",
  "editorStyle": "file:./index.css",
  "style": "file:./style-index.css",
  "viewScriptModule": "file:./view.js",
  "render": "file:./render.php"
}
```
Dynamic blocks store attributes as plain comment-delimiter values (no `source` selectors): there is no saved markup to parse. Keep `supports` minimal and aligned with theme.json tokens.

`render.php` (receives `$attributes`, `$content`, `$block`):
```php
<?php
$quote = $attributes['quote'] ?? '';
if ('' === $quote) { return; }
?>
<figure <?php echo get_block_wrapper_attributes(['class' => 'testimonial']); ?>>
  <blockquote><p><?php echo wp_kses_post($quote); ?></p></blockquote>
  <?php if (!empty($attributes['name'])) : ?>
    <figcaption><?php echo esc_html($attributes['name']); ?></figcaption>
  <?php endif; ?>
</figure>
```
`edit.js` uses `useBlockProps()`, `RichText`, `InspectorControls`, components from `@wordpress/components`, strings via `__()` from `@wordpress/i18n`. Use `ServerSideRender` only as a last resort (slow, poor editing UX).

Build: `wp-scripts build --webpack-src-dir=blocks --output-path=build/blocks` (add `--blocks-manifest` to emit a manifest). Register once:
```php
add_action('init', function (): void {
    $dir = get_theme_file_path('build/blocks');
    if (function_exists('wp_register_block_types_from_metadata_collection')) {   // WP 6.8+
        wp_register_block_types_from_metadata_collection($dir, "$dir/blocks-manifest.php");
        return;
    }
    foreach (glob("$dir/*/block.json") as $json) { register_block_type(dirname($json)); }
});
```
Verify flags and the collection API against developer.wordpress.org for the target WP version.

## 3. ACF blocks

Register through block.json, not the legacy `acf_register_block_type()`:
```json
{
  "apiVersion": 3,
  "name": "acme/feature-grid",
  "title": "Feature grid",
  "category": "design",
  "icon": "grid-view",
  "supports": { "align": ["wide", "full"], "anchor": true, "jsx": true },
  "acf": { "blockVersion": 3, "mode": "preview", "renderTemplate": "render.php" },
  "example": { "attributes": { "data": { "heading": "Why clients pick us" } } }
}
```
`blockVersion: 3` (ACF 6.6+) changes editing UX and field storage behavior; confirm the current options (mode, inline editing, `usePostMeta`) against advancedcustomfields.com docs before relying on them. Register with `register_block_type(__DIR__ . '/blocks/feature-grid')`.

ACF render template:
```php
<?php
/** @var array $block  @var bool $is_preview  @var int|string $post_id */
$heading = get_field('heading');
$items   = get_field('items') ?: [];
$attrs   = get_block_wrapper_attributes(['class' => 'feature-grid']);
if (!$items && $is_preview) { echo '<p class="acf-placeholder">' . esc_html__('Add features in the sidebar.', 'acme') . '</p>'; return; }
?>
<section <?php echo $attrs; ?>>
  <?php if ($heading) : ?><h2><?php echo esc_html($heading); ?></h2><?php endif; ?>
  <ul role="list">
    <?php foreach ($items as $item) : ?>
      <li><?php echo esc_html($item['title']); ?></li>
    <?php endforeach; ?>
  </ul>
</section>
```
Use `<InnerBlocks />` (with `supports.jsx: true`) for editable rich content instead of WYSIWYG fields. For Timber projects, render with `Timber::render('blocks/feature-grid.twig', [...])` from render.php.

## 4. ACF field groups as code

- Enable Local JSON: create `acf-json/` in the theme (or site plugin); ACF saves and loads there. Commit it; after deploy, apply pending changes from ACF's field group Sync screen (or keep groups loading from JSON only). Verify current sync tooling against advancedcustomfields.com. Optionally relocate with `acf/settings/save_json` and `acf/settings/load_json`.
- Never edit field groups only in a production admin. Change locally, commit JSON, sync.
- Field groups in PHP (`acf_add_local_field_group`) are fine for generated or plugin-shipped fields, but pick one source of truth per group.
- Do not hand-edit `key` values; keys are the identity. Changing a field `name` orphans existing data - write a migration (WP-CLI command) if renaming.

Naming:
- Field names: snake_case, scoped and specific (`hero_heading`, `cta_link`), never `title`, `image`, `text` collisions with core/meta.
- Group keys/titles: `group_<context>` and human titles the client recognizes ("Homepage hero", not "Hero v2 FINAL").
- Flexible content layout names: snake_case, permanent after launch.
- Return formats: images `id` (then render with `wp_get_attachment_image` for srcset), links `array`, post objects `id` for batch loading.

## 5. Client editing UX

- Every field has `instructions` written for a non-developer: what it does, where it shows, recommended length or image size and ratio.
- Sensible `default_value`s and `placeholder`s; mark only truly required fields `required`.
- Use `conditional_logic` to hide irrelevant fields; tabs/accordions for groups with more than about 8 fields.
- Limit choices: select/radio/button-group mapped to design tokens, not free color pickers or font sizes.
- Provide `example` data in block.json so the inserter preview is meaningful.
- Lock what must not move: `"lock": { "move": true, "remove": true }`, `templateLock` in patterns/CPT templates, `allowed_block_types_all` per post type.
- Ship starter patterns for common page types so clients compose instead of build from scratch.
- Image fields: require alt text at the media level, and let the editor mark decorative images. See `forge-core:a11y`.

## 6. AI slop tells

- Static `save()` for markup that will change; no `deprecated` when changing it.
- `echo $attributes['x']` or `the_field()` without escaping; `get_block_wrapper_attributes()` missing (breaks supports, alignment, anchors).
- Legacy `acf_register_block_type()` with inline callbacks in functions.php for new work.
- Hand-listing `wp-blocks`, `wp-element` dependencies instead of using the generated `.asset.php`.
- Invented block supports keys or block.json fields; `apiVersion: 2` on new blocks without reason.
- WYSIWYG field for everything; field names like `text1`, `image_2`.
- Field groups exist only in the database; no `acf-json/` committed.
- `ServerSideRender` used as the editing experience for a simple block.

## Done checklist

- [ ] Simplest mechanism chosen (pattern / style / variation before custom block).
- [ ] block.json valid against schema, apiVersion 3, textdomain set, supports minimal and token-aligned.
- [ ] Dynamic render escapes every value and uses `get_block_wrapper_attributes()`.
- [ ] Assets declared in block.json so they load only when the block is present.
- [ ] ACF blocks registered via block.json; field groups in committed `acf-json/`.
- [ ] Field names snake_case and specific; instructions, defaults, conditional logic in place.
- [ ] Editor preview matches front end; empty state is helpful in the editor and silent on the front end.
- [ ] Block keyboard/screen-reader checked in editor and front end (`forge-core:a11y`).
