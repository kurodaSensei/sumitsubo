---
name: wp-block-theme
description: Native WordPress block theme (FSE) architecture with no build step and no page builders — theme.json v3 as the design system, HTML templates and template parts, PHP patterns, functions.php split into inc/ by concern, self-hosted fonts, editor/front parity, versioning and database backups for Site Editor content. Use when creating or changing a WordPress theme, editing theme.json, templates/*.html, parts/*.html, patterns/*.php, functions.php or inc/*.php, or when the user mentions Gutenberg, FSE, block theme or Site Editor.
---

# WordPress Block Theme (native, no build)

The house approach: a pure block theme. No Timber, no ACF, no Elementor or page builders, no build toolchain. Gutenberg and theme.json do the heavy lifting; custom dynamic blocks (`wp-custom-blocks`) cover what core blocks can't. The client edits everything in the block editor and Site Editor.

## Structure

```
style.css            theme header only (Version drives cache-busting)
theme.json           the design system (v3)
functions.php        constants + require_once of inc/*, nothing else
inc/
  setup.php          supports, textdomain, enqueue, editor styles, block styles, pattern category, block registration
  performance.php    head cleanup, preloads, conditional plugin assets (see wp-performance-audit)
  cpt.php            post types, taxonomies, meta boxes (see wp-native-features)
  settings.php       Settings API page for site-wide options
  schema.php         JSON-LD
  icons.php          inline SVG icon helper
  media.php          upload rules (e.g. safe SVG)
templates/           *.html block templates (index, front-page, page, single-<cpt>, archive-<cpt>, taxonomy, 404 + custom)
parts/               header.html, footer.html (thin: reference a pattern)
patterns/            *.php patterns with translatable content
blocks/<name>/       custom dynamic blocks (block.json + render.php [+ index.js])
assets/css/app.css   only what theme.json cannot express
assets/js/           small vanilla scripts, deferred
assets/fonts/        self-hosted WOFF2
languages/           .pot/.po/.mo
bin/                 token audit scripts (wp-performance-audit)
database/            DB dump + README for content that lives in the DB
```

`functions.php` defines `{THEME}_VERSION` (from `wp_get_theme()->get('Version')`), `{THEME}_DIR`, `{THEME}_URI` and requires each `inc/` file. One concern per file; no logic in functions.php.

## theme.json is the design system

Every token in `DESIGN.md` (from `sumi-design`) maps here, and code uses the generated custom properties only.

- `"version": 3`, `appearanceTools: true`, `useRootPaddingAwareAlignments: true`, `layout.contentSize` / `wideSize`.
- `color.palette`: semantic slugs (`base`, `surface`, `primary`, `text-soft`, `border`, `offer`…); disable defaults (`defaultPalette`, `defaultGradients`, `defaultDuotone: false`) so editors only see brand colors.
- `typography.fontFamilies` with `fontFace` entries pointing at `assets/fonts/*.woff2` (WP generates `@font-face`; never duplicate it in CSS); `fontSizes` with `fluid: {min, max}`; disable default sizes.
- `spacing.spacingSizes` named by value (`4, 8, 12, 16, 24, 32, 48, 64`) so the scale reads the same in code and in the editor.
- `custom`: anything without a core preset — `radius.{xs…pill}`, fluid section rhythm (`space.flow*` with `clamp()`), status colors, third-party brand colors. Consumed as `var(--wp--custom--radius--lg)`.
- `styles`: global element styles (links, headings, buttons) and block styles. Prefer declaring a default here over CSS.
- `templateParts` (header/footer with area) and `customTemplates` (e.g. `page-no-title`, full-width info page) declared explicitly.

## CSS: only the gap

`assets/css/app.css` starts with a comment stating the rule: only what theme.json can't cover, no duplicated tokens.
- Theme-scoped helpers in `:root` with the theme prefix (`--{theme}-header-h`, `--{theme}-container`), and derived tones via `color-mix()` from palette variables — not new hex values.
- BEM with the theme prefix for custom blocks: `.{theme}-hero`, `.{theme}-hero__title`, `.{theme}-hero--split`.
- Enqueue on the front and `add_editor_style( 'assets/css/app.css' )` so the editor looks like the site.

## Templates, parts and patterns

- Templates are thin: header part → `<main id="main">` group (constrained layout) → content → footer part. Give `main` the skip-link target.
- Parts reference a pattern (`<!-- wp:pattern {"slug":"{theme}/header"} /-->`) so markup lives in PHP where strings are translatable.
- Patterns carry the default content of custom blocks: build the attributes array with `__()` strings, `wp_json_encode(..., JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)` and print the block comment. Header fields: `Title`, `Slug`, `Categories` (the theme's category), `Block Types`, `Description`.
- Register one pattern category for the theme. Register `core/button` (and other core) block style variations for design-system variants instead of custom button blocks.

## Content that lives in the database

Pages, menus, options and template parts customized in the Site Editor live in the DB, not in files. Keep `database/<site>.sql` plus a README with restore commands (`wp db import …`) and what it contains. Never commit credentials or user data you don't need; sanitize dumps for public repos.

## Versioning and i18n

- Bump `Version` in `style.css` on every deploy; it versions every enqueued asset.
- Text domain = theme slug; all strings in PHP and editor JS through `__()` / `wp.i18n.__`; ship `.pot` + `.po/.mo`. Multilingual content via Polylang (or the client's choice), not hardcoded.

## Comments: mark deliberate simplicity

When you consciously choose the simple path, leave a `ponytail:` comment saying what was simplified and when to extend it ("ponytail: fixed map of 6 categories, no term-meta UI; add one if the client needs to edit them"). It keeps scope honest and tells the next person where the seams are.

## Slop tells

- Timber/Twig, ACF, or a page builder added to a native block theme.
- Hardcoded hex, px font sizes or spacing in CSS or render.php instead of `--wp--preset--*` / `--wp--custom--*`.
- `@font-face` duplicated in CSS; Google Fonts loaded from their CDN.
- Giant functions.php; markup strings hardcoded in parts instead of translatable patterns.
- Default WP palette and font sizes left enabled next to the brand tokens.

## Done checklist

- [ ] All visual values come from theme.json; `bin/` audits pass.
- [ ] Editor and front look the same (fonts, colors, spacing).
- [ ] Templates for every content type in use, including 404 and archives.
- [ ] Strings translatable; `.pot` regenerated.
- [ ] Version bumped; DB dump updated when Site Editor content changed.
