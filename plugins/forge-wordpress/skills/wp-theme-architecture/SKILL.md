---
name: wp-theme-architecture
description: Decide and structure a WordPress theme - block theme (theme.json, templates, parts, patterns) vs classic theme with Timber/Twig; thin functions.php with Composer PSR-4 classes; correct asset enqueueing (versions, deps, defer/module strategy); child themes; local dev (wp-env, LocalWP) and WP-CLI. Use when creating or restructuring a theme, touching functions.php, theme.json, style.css headers, composer.json, enqueue code, build config for a theme, or files matching **/wp-content/themes/**, **/functions.php, **/inc/**/*.php, **/src/**/*.php, templates/*.html, parts/*.html, patterns/*.php.
---

# WordPress Theme Architecture

Pick the architecture deliberately, keep bootstrap thin, load assets through WordPress APIs. Related: `forge-core:css-architecture`, `forge-core:js-ts`, `forge-core:performance`, `forge-core:a11y`.

## 1. Choose the approach first

| Signal | Block theme (FSE) | Classic + Timber/Twig |
|---|---|---|
| Client wants to edit layouts, headers, footers visually | Yes | Limited (ACF sections) |
| Design system expressible as tokens (color, type, spacing) | theme.json does it natively | Manual CSS vars |
| Heavy custom data views, complex conditional markup | Possible via dynamic blocks | Natural fit |
| Existing codebase is Timber/ACF flexible content | Migration cost | Stay |
| Long-term maintainability by other WP devs | Core-aligned, future-proof | Needs Timber knowledge |

Default for new builds: block theme + custom/ACF blocks. Choose Timber when the project is data-heavy, already Timber-based, or the team standardizes on it. Hybrid is valid: classic theme with `theme.json` for editor tokens and block support. State the choice and its tradeoff in the PR or README; do not mix paradigms silently.

## 2. Structure

Block theme:
```
theme/
  style.css            # header only (Theme Name, Text Domain, Requires at least, Requires PHP)
  theme.json           # tokens, layout, block settings, editor restrictions
  functions.php        # require autoload + bootstrap, nothing else
  templates/ parts/ patterns/ styles/   # styles/ = style variations
  src/ (PHP classes)  assets/src/ (JS/CSS source)  build/ (compiled, gitignored or committed per deploy)
  blocks/<name>/block.json
```
Classic + Timber:
```
theme/
  functions.php  composer.json  style.css  theme.json (optional, editor tokens)
  index.php single.php page.php archive.php 404.php   # thin controllers
  src/           # PSR-4 classes: Theme, Assets, PostTypes, Taxonomies, TwigExtensions, Acf...
  views/         # layouts/, partials/, sections/, templates/
  assets/src -> assets/dist
```

## 3. functions.php is a bootstrap

DO:
```php
<?php
declare(strict_types=1);
defined('ABSPATH') || exit;

require_once __DIR__ . '/vendor/autoload.php';

( new \Acme\Theme\Theme() )->boot(); // registers each module's hooks
```
```php
namespace Acme\Theme;

final class Theme {
    public function boot(): void {
        foreach ([ new Assets(), new Setup(), new PostTypes(), new Editor() ] as $module) {
            $module->register(); // each class adds its own add_action/add_filter calls
        }
    }
}
```
DON'T: 2,000-line functions.php; closures that cannot be unhooked by a child theme; logic running at file load instead of on a hook; un-prefixed global functions (`function get_hero()` collides).

Rules: one responsibility per class; register CPTs/taxonomies on `init`; theme supports on `after_setup_theme`; prefix every global (functions, options, handles, hooks) with the theme slug; `composer.json` uses `"autoload": {"psr-4": {"Acme\\Theme\\": "src/"}}` and `"config": {"platform": {"php": "8.2"}}` matched to production PHP. CPTs and data that must survive a theme switch belong in a small site plugin or mu-plugin, not the theme.

## 4. Enqueue properly

DO:
```php
add_action('wp_enqueue_scripts', function (): void {
    $asset = require get_theme_file_path('build/main.asset.php'); // deps + version from wp-scripts
    wp_enqueue_style('acme-main', get_theme_file_uri('build/main.css'), [], $asset['version']);
    wp_enqueue_script('acme-main', get_theme_file_uri('build/main.js'), $asset['dependencies'], $asset['version'], [
        'in_footer' => true,
        'strategy'  => 'defer',
    ]);
});
```
- Version every asset from a build hash or `filemtime()`; never `null` or a hardcoded `'1.0'` that never changes.
- Use `strategy => defer|async` (WP 6.3+) instead of hand-written `<script defer>`. ES modules: `wp_register_script_module()` / `wp_enqueue_script_module()` (WP 6.5+; verify against developer.wordpress.org).
- Load conditionally (`is_singular('product')`, block presence via `has_block()`, or block.json `viewScript`/`style` so core loads per-block assets only when the block renders).
- Pass data with `wp_add_inline_script($handle, 'const acmeData = ' . wp_json_encode($data) . ';', 'before')`, not inline `<script>` tags in templates.
- Dequeue what you do not use (block library CSS for classic themes only if verified unused, emoji scripts, plugin assets on pages that do not need them).

DON'T: hardcode `<script src="...">` or `<link>` in header.php/Twig layouts (breaks dependency graph, caching plugins, CSP, child themes); load jQuery for one selector; enqueue on `init`.

Vite/other bundlers: read the manifest in PHP and enqueue the hashed file; see `references/enqueue-and-build.md`.

## 5. theme.json essentials

- `"version": 3` (WP 6.6+); define `settings.color.palette`, `settings.typography.fontSizes` (fluid), `fontFamilies` with local `fontFace` (self-host, `font-display: swap`), `settings.spacing.spacingSizes`, `settings.layout.contentSize/wideSize`.
- Restrict for clients: `"color": {"custom": false, "customGradient": false}`, `"typography": {"customFontSize": false}`, disable unused block supports per block under `settings.blocks`.
- Use generated presets in CSS (`var(--wp--preset--color--primary)`) so editor and front end share one source of truth.
- Lock structure where needed: `templateLock` in patterns/templates, `"lock"` attributes, and the `allowed_block_types_all` filter to hide irrelevant blocks.

## 6. Child themes

Use a child theme only to customize a third-party parent. Enqueue the child stylesheet with the parent handle as dependency; override templates by copying the minimum; prefer hooks/filters over template copies. Never edit a vendor theme in place. For your own theme, do not ship a child theme "just in case".

## 7. Local dev and tooling

- `@wordpress/env` (`npx wp-env start`, `.wp-env.json` pins core, PHP, plugins, theme mapping) for reproducible Docker envs; LocalWP for quick GUI sites. Commit the env config, not the database.
- WP-CLI for anything repeatable: `wp scaffold`, `wp post generate`, `wp search-replace --dry-run`, `wp cache flush`, `wp rewrite flush`, `wp i18n make-pot`. Prefer a CLI command or migration class over "click this in admin" instructions.
- Quality gates: PHP_CodeSniffer with WordPress-Coding-Standards (`WordPress-Extra` + `WordPress.Security`), PHPStan with `szepeviktor/phpstan-wordpress`, `@wordpress/scripts` lint-js/lint-style. Run them in CI.
- `WP_DEBUG`, `WP_DEBUG_LOG`, `SCRIPT_DEBUG` on locally; zero notices is the bar. Query Monitor installed in dev.
- `WP_ENVIRONMENT_TYPE` and `wp_get_environment_type()` to gate dev-only behavior.

## 8. AI slop tells (reject in review)

- Giant functions.php, everything a global function, no namespace.
- `<script>`/`<link>` tags hardcoded in templates; `wp_enqueue_script` with `ver => null` or `time()` in production.
- Invented hooks (`theme_after_header_init`), invented functions (`wp_get_theme_option()`), or Timber 1 APIs in a Timber 2 project. If unsure an API exists, check developer.wordpress.org or the code before using it.
- `query_posts()` anywhere. `extract()` on arrays. `@` error suppression.
- Registering CPTs inside the theme when the content must outlive the theme.
- Bundling page-builder plugins or ten utility plugins for what 20 lines of code do.
- Mixed paradigms: half Gutenberg blocks, half ACF flexible content, with no documented reason.

## Done checklist

- [ ] Architecture choice (block / Timber / hybrid) documented with reason.
- [ ] functions.php only bootstraps; classes are namespaced, autoloaded, one concern each.
- [ ] All globals prefixed; text domain matches theme slug; strings translatable.
- [ ] Every asset enqueued via API with real version, correct deps, footer + defer/module strategy, loaded only where used.
- [ ] theme.json tokens drive both editor and front end; client-facing controls restricted to the design system.
- [ ] `style.css` header declares `Requires at least` and `Requires PHP`.
- [ ] wp-env/LocalWP config committed; PHPCS (WPCS) and PHPStan pass; no PHP notices with WP_DEBUG on.
- [ ] No hardcoded asset tags, no `query_posts`, no invented APIs.
