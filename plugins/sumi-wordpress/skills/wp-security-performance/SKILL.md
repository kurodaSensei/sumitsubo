---
name: wp-security-performance
description: WordPress security and performance baseline - validate/sanitize input, escape output late by context (esc_html, esc_attr, esc_url, wp_kses), nonces plus capability checks, $wpdb->prepare, REST/AJAX permission callbacks, file uploads; WP_Query discipline (no_found_rows, fields, update_*_cache), transients and object cache, image sizes/srcset, autoloaded options, plugin bloat, Query Monitor, Core Web Vitals. Use when writing or reviewing any **/*.php, **/*.twig, REST routes, admin-ajax handlers, forms, WP_Query/get_posts, $wpdb, options, cron, or when auditing speed, LCP/INP/CLS, or security of a WP site.
---

# WordPress Security and Performance

Two rules carry most of the weight: sanitize on input, escape on output (late, by context); and never ask the database for more than the page renders. Related: `sumi:performance`, `sumi:a11y`, `sumi:js-ts`. Escaping matrix and query recipes: `references/escaping-and-queries.md`.

## 1. Input: validate, then sanitize

- Validate shape first (allow-lists, `absint`, `in_array($v, $allowed, true)`, `is_email`, `rest_validate_value_from_schema`), reject on failure; sanitize what passes.
- Read superglobals once, unslashed: `$name = sanitize_text_field(wp_unslash($_POST['name'] ?? ''));`
- Pick the specific sanitizer: `sanitize_text_field`, `sanitize_textarea_field`, `sanitize_email`, `sanitize_key`, `sanitize_title`, `sanitize_file_name`, `esc_url_raw` (for storage), `absint`/`intval`, `wp_kses_post` (rich HTML), `rest_sanitize_boolean`.
- Never trust `$_REQUEST`, `$_SERVER['HTTP_*']`, cookies, or block attributes.

## 2. Output: escape late, by context

DO:
```php
<a href="<?php echo esc_url($link['url']); ?>" class="<?php echo esc_attr($class); ?>">
  <?php echo esc_html($link['title']); ?>
</a>
<div><?php echo wp_kses_post($rich_text); ?></div>
<script>const cfg = <?php echo wp_json_encode($cfg); ?>;</script> <!-- only inside wp_add_inline_script -->
<?php printf(esc_html__('%d results', 'acme'), (int) $count); ?>
```
DON'T: `echo $var;`, `echo get_field('x');`, `the_field()` on user-editable text, `esc_html` inside `href`, escaping early then storing, `esc_attr` on a full HTML fragment. Twig: see `wp-timber-twig` section 4.

## 3. Authorization: nonce + capability, every state change

```php
// form
wp_nonce_field('acme_save_settings', '_acme_nonce');

// handler
if (!current_user_can('manage_options')) { wp_die(esc_html__('Not allowed.', 'acme'), 403); }
check_admin_referer('acme_save_settings', '_acme_nonce');
```
- Nonces prove intent, not permission: always pair with `current_user_can()` using the narrowest capability (`edit_post` with the post ID, not `edit_posts`).
- admin-ajax: `check_ajax_referer()` + capability; `wp_ajax_nopriv_*` handlers must be safe for anonymous users (rate-limit, no data leaks).
- REST: every route defines `permission_callback`; `'__return_true'` only for genuinely public read endpoints, with a comment. Define `args` with `type`, `required`, `sanitize_callback`, `validate_callback`.
```php
register_rest_route('acme/v1', '/favorites/(?P<id>\d+)', [
    'methods'             => WP_REST_Server::CREATABLE,
    'callback'            => [$this, 'add'],
    'permission_callback' => fn(WP_REST_Request $r) => current_user_can('read') && get_post_status((int) $r['id']) === 'publish',
    'args'                => ['id' => ['type' => 'integer', 'required' => true, 'minimum' => 1]],
]);
```

## 4. Database

- Prefer WP APIs (`WP_Query`, `get_post_meta`, `update_option`) over raw SQL.
- Raw SQL always via `$wpdb->prepare()` with placeholders (`%d`, `%s`, `%f`, `%i` for identifiers in WP 6.2+). `IN()` lists: build placeholders with `implode(',', array_fill(0, count($ids), '%d'))`.
- Use `$wpdb->prefix` / `$wpdb->posts`, never a hardcoded `wp_`.
- Custom tables: create with `dbDelta()` on activation, version the schema in an option.

## 5. Other hardening

- Files: `wp_handle_upload()` with an explicit `mimes` allow-list; never trust extension or client MIME; never write to the theme directory at runtime.
- Redirects: `wp_safe_redirect()` + `exit`. Remote calls: `wp_remote_get/post` with timeouts, check `is_wp_error` and response code; `wp_safe_remote_*` for user-supplied URLs.
- No secrets in the theme/repo; use `wp-config.php` constants or env vars. `DISALLOW_FILE_EDIT` true in production.
- Do not reveal versions or debug output in production (`WP_DEBUG_DISPLAY` false). Keep plugins few, maintained, updated.
- `ABSPATH` guard at top of directly-loadable PHP files.

## 6. Query discipline

DO:
```php
$q = new WP_Query([
    'post_type'              => 'event',
    'posts_per_page'         => 6,             // always bounded
    'no_found_rows'          => true,          // skip SQL_CALC_FOUND_ROWS when not paginating
    'ignore_sticky_posts'    => true,
    'update_post_term_cache' => false,         // only if terms are not rendered
    'fields'                 => 'ids',         // when you only need IDs
]);
```
DON'T: `query_posts()` (ever); `posts_per_page => -1` on unbounded data; `meta_query` on unindexed values for front-end lists at scale (use a taxonomy instead); `get_field()` / `get_post_meta()` / `get_the_terms()` per item on large lists without priming caches (`update_meta_cache('post', $ids)`, `_prime_post_caches($ids)`); `orderby => rand`; queries inside template loops; modifying the main query with a second query instead of `pre_get_posts`.

## 7. Caching

- Object cache first: `wp_cache_get/set` with a group; with a persistent backend (Redis/Memcached) it survives requests. Transients for expensive remote or computed data (`set_transient('acme_feed', $data, HOUR_IN_SECONDS)`); invalidate on the event that changes the data (`save_post_{type}`), not only by expiry.
- Keep autoloaded options small: register big options with `autoload` false (`update_option($k, $v, false)`); audit `wp_options` autoload size.
- Full-page caching is the host's or plugin's job; make it work by avoiding per-user output in cached pages (load personalized fragments via REST/JS).
- Avoid `WP_Cron` for heavy work on high-traffic sites without a real cron hitting `wp-cron.php`; use Action Scheduler for queued jobs.

## 8. Front-end performance and Core Web Vitals

- LCP: hero image via `wp_get_attachment_image()` with correct `sizes`, `fetchpriority="high"` and no lazy loading on the LCP image (core adds lazy loading by default - override for the hero via the `wp_get_loading_optimization_attributes` filter or explicit attrs; verify against developer.wordpress.org). Register real image sizes (`add_image_size`) matching layouts; serve WebP/AVIF.
- CLS: width/height on every image/iframe/embed; reserve space for ads, embeds, cookie banners; `font-display: swap` with metric-matched fallbacks; no late-injected banners pushing content.
- INP: little JS, deferred; no jQuery for new code; break up long tasks; avoid heavy sliders and page-builder runtimes; third-party scripts loaded on interaction or with `async`.
- Ship less: dequeue unused plugin CSS/JS per page, avoid multiple plugins doing the same job, remove emoji/embeds scripts if unused, self-host fonts.
- Measure: Query Monitor (queries, hooks, HTTP calls, duplicate queries) in dev; Lighthouse/PageSpeed and CrUX field data for CWV; test as logged-out user with caches warm and cold. See `sumi:performance`.

## 9. AI slop tells

- Unescaped `echo` of fields, attributes, or `$_GET` values; `esc_html` used for URLs.
- Form handlers with no nonce or no capability check; REST routes missing `permission_callback`.
- String-concatenated SQL; hardcoded `wp_` prefix.
- `query_posts`, `posts_per_page => -1`, `get_field` in loops, `orderby rand` on the homepage.
- Inline `<script>` blocks in templates with interpolated PHP values.
- "Install plugin X" for something a filter does; plugin stacks with overlapping caching/optimization plugins.
- `sanitize_text_field` used as an output escaper; `wp_kses_post` on attribute values.

## Done checklist

- [ ] Every input validated and sanitized with the specific function; superglobals unslashed.
- [ ] Every output escaped late with the right context function (or Twig strategy).
- [ ] Every state change checks nonce and the narrowest capability; every REST route has a real `permission_callback` and typed args.
- [ ] All SQL prepared; no hardcoded table prefixes.
- [ ] Queries bounded, `no_found_rows` where not paginating, caches primed, no queries in loops.
- [ ] Expensive work cached with explicit invalidation; autoloaded options lean.
- [ ] LCP image prioritized, all media dimensioned, JS deferred; Query Monitor clean (no duplicates, no slow queries).
- [ ] PHPCS `WordPress.Security` sniffs pass.
