# Escaping matrix and query recipes

## Escape by output context

| Context | PHP | Twig (Timber) |
|---|---|---|
| Text node | `esc_html()` | `\|e('esc_html')` (or autoescape) |
| HTML attribute value | `esc_attr()` | `\|e('html_attr')` |
| URL in href/src/action | `esc_url()` | `\|e('esc_url')` |
| URL stored to DB / used in redirect or HTTP call | `esc_url_raw()` / `sanitize_url()` | n/a (do it in PHP) |
| Textarea content | `esc_textarea()` | `\|e('esc_html')` |
| Rich editor HTML | `wp_kses_post()` | `\|e('wp_kses_post')` |
| Restricted HTML (e.g. only links, em) | `wp_kses($html, ['a' => ['href' => true], 'em' => []])` | prepare in PHP |
| Data for JS | `wp_json_encode()` inside `wp_add_inline_script()` or `wp_localize_script()` | prepare in PHP |
| Translated text | `esc_html__()`, `esc_attr__()`, `esc_html_e()` | `__()` then escape |
| SVG inline icons | own sanitized file contents or `wp_kses` with an SVG allow-list | `icon()` function marked `is_safe` that escapes internally |
| Block wrapper | `get_block_wrapper_attributes()` (already escaped) | n/a |

Escape at the point of echo, even for values you think are safe (option values, post titles, term names can contain markup).

## Sanitize by input type

| Input | Function |
|---|---|
| Single-line text | `sanitize_text_field()` |
| Multi-line text | `sanitize_textarea_field()` |
| Slug/key | `sanitize_key()` / `sanitize_title()` |
| Email | `sanitize_email()` then `is_email()` |
| Integer ID | `absint()` |
| Enum | `in_array($v, ALLOWED, true) ? $v : DEFAULT` |
| Color hex | `sanitize_hex_color()` |
| HTML | `wp_kses_post()` / `wp_kses()` |
| Filename | `sanitize_file_name()` |
| Array of IDs | `array_map('absint', (array) $ids)` then `array_filter` |

## Query recipes

Paginated archive: modify the main query, do not add a second one.
```php
add_action('pre_get_posts', function (WP_Query $q): void {
    if (is_admin() || !$q->is_main_query()) { return; }
    if ($q->is_post_type_archive('event')) {
        $q->set('posts_per_page', 12);
        $q->set('meta_key', 'event_start');
        $q->set('orderby', 'meta_value');
        $q->set('order', 'ASC');
    }
});
```

Related posts list (no pagination, IDs then batch):
```php
$ids = get_posts([
    'post_type' => 'post', 'posts_per_page' => 4, 'post__not_in' => [$post_id],
    'category__in' => wp_get_post_categories($post_id), 'fields' => 'ids',
    'no_found_rows' => true, 'ignore_sticky_posts' => true,
]);
_prime_post_caches($ids, true, true); // posts + terms + meta in few queries
```

Prepared SQL with IN():
```php
$ids = array_map('absint', $ids);
$in  = implode(',', array_fill(0, count($ids), '%d'));
$rows = $wpdb->get_results($wpdb->prepare(
    "SELECT post_id, meta_value FROM {$wpdb->postmeta} WHERE meta_key = %s AND post_id IN ($in)",
    array_merge(['event_start'], $ids)
));
```

Cached expensive computation with invalidation:
```php
function acme_upcoming_event_ids(): array {
    $ids = wp_cache_get('upcoming', 'acme_events');
    if (false === $ids) {
        $ids = get_posts([/* bounded args */ 'fields' => 'ids', 'no_found_rows' => true]);
        wp_cache_set('upcoming', $ids, 'acme_events', HOUR_IN_SECONDS);
    }
    return $ids;
}
add_action('save_post_event', fn() => wp_cache_delete('upcoming', 'acme_events'));
```
Without a persistent object cache, `wp_cache_*` only lasts one request; use a transient when cross-request caching is needed and no persistent cache is guaranteed.

## Audit commands

- `wp option list --autoload=on --format=total_bytes` (verify flag names with `wp help option list`)
- `wp db query "SELECT option_name, LENGTH(option_value) s FROM $(wp db prefix)options WHERE autoload IN ('yes','on','auto-on') ORDER BY s DESC LIMIT 20"`
- `wp plugin list --status=active` - challenge each plugin: needed, maintained, loads assets only where used?
- `wp cron event list` - look for runaway or orphaned events.
