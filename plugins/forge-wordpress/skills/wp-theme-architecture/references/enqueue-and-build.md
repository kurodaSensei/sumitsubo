# Enqueue and build integration

## @wordpress/scripts (default for block work)

`wp-scripts build` emits `build/<entry>.js`, `build/<entry>.css` and `build/<entry>.asset.php` returning `['dependencies' => [...], 'version' => '<hash>']`. Always read the asset file instead of hand-listing `wp-element`, `wp-i18n`, etc.

```php
final class Assets {
    public function register(): void {
        add_action('wp_enqueue_scripts', [$this, 'front']);
        add_action('enqueue_block_editor_assets', [$this, 'editor']);
    }

    private function entry(string $name): array {
        $file = get_theme_file_path("build/{$name}.asset.php");
        return is_readable($file) ? require $file : ['dependencies' => [], 'version' => wp_get_theme()->get('Version')];
    }

    public function front(): void {
        $a = $this->entry('main');
        wp_enqueue_style('acme-main', get_theme_file_uri('build/main.css'), [], $a['version']);
        wp_enqueue_script('acme-main', get_theme_file_uri('build/main.js'), $a['dependencies'], $a['version'], ['in_footer' => true, 'strategy' => 'defer']);
    }

    public function editor(): void {
        $a = $this->entry('editor');
        wp_enqueue_script('acme-editor', get_theme_file_uri('build/editor.js'), $a['dependencies'], $a['version'], true);
    }
}
```

Editor styles: `add_theme_support('editor-styles'); add_editor_style('build/editor.css');` (path relative to theme root). In block themes, theme.json covers most of it.

## Vite / custom bundler

Configure `build.manifest: true`, a fixed `outDir` (e.g. `dist/`), hashed filenames. In PHP:

```php
private function vite(string $entry): void {
    static $manifest = null;
    $manifest ??= json_decode((string) file_get_contents(get_theme_file_path('dist/.vite/manifest.json')), true);
    $chunk = $manifest[$entry] ?? null;
    if (!$chunk) { return; }

    foreach ($chunk['css'] ?? [] as $i => $css) {
        wp_enqueue_style("acme-{$i}", get_theme_file_uri("dist/{$css}"), [], null); // hash in filename = version
    }
    wp_enqueue_script_module('acme-app', get_theme_file_uri("dist/{$chunk['file']}"), [], null);
}
```
- With hashed filenames, `null` version is acceptable because the URL already changes; without hashes, use `filemtime()`.
- Dev server (HMR): only when `wp_get_environment_type() === 'local'` and the server responds; print the Vite client via `wp_enqueue_script_module` pointing at the dev origin. Never ship dev-server URLs to production.
- Vite emits ES modules: use the script-module API or add `type="module"` via the `script_loader_tag` filter, not a hardcoded tag.

## Defer strategy cheat sheet

| Asset | Strategy |
|---|---|
| Main site JS | footer + `defer` |
| Independent analytics/widgets | `async`, or load on interaction |
| Code depending on another deferred handle | `defer` (WP keeps order) |
| Critical above-the-fold CSS | inline small critical CSS via `wp_add_inline_style`, rest normal stylesheet |
| Fonts | self-hosted woff2, `preload` only the 1-2 above-the-fold faces via `wp_resource_hints` / `wp_preload_resources` filter (verify against developer.wordpress.org) |

Avoid the `media="print" onload` stylesheet hack for primary CSS: it causes FOUC and CLS. Use it at most for genuinely non-critical CSS.
