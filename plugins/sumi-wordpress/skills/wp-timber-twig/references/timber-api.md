# Timber 2 quick reference

Verify unfamiliar members against timber.github.io/docs/v2 before using them. When this list and the docs disagree, the docs win.

## PHP

| Need | Timber 2 |
|---|---|
| Template context | `Timber::context()` |
| Render / compile | `Timber::render($tpl, $ctx)`, `Timber::compile($tpl, $ctx)` (returns string) |
| Current or specific post | `Timber::get_post()`, `Timber::get_post($id)` |
| Query posts | `Timber::get_posts($wp_query_args)` (collection; iterate, `->pagination()`) |
| Terms | `Timber::get_term($id)`, `Timber::get_terms($args)` |
| Menu | `Timber::get_menu('location-or-slug')` |
| Image / attachment | `Timber::get_image($id)`, `Timber::get_attachment($id)` |
| User | `Timber::get_user($id)` |
| Class maps | filters `timber/post/classmap`, `timber/term/classmap` |
| Global context | filter `timber/context` or subclass `Timber\Site` with `add_to_context()` |
| Twig environment | filter `timber/twig` (add functions/filters), `timber/twig/environment/options` (autoescape, debug, cache) |
| Template locations | `Timber::$dirname = ['views']` or the `timber/locations` filter |
| Fragment cache | `Timber::compile($tpl, $ctx, $expires, $mode)` or a transient you manage; there is no `{% cache %}` tag by default |

## Twig objects

```twig
{{ post.ID }} {{ post.title }} {{ post.link }} {{ post.slug }} {{ post.post_type }}
{{ post.content }}  {{ post.excerpt({ words: 30, read_more: false }) }}
{{ post.date('F j, Y') }} {{ post.modified_date }}
{{ post.thumbnail.src('large') }} {{ post.thumbnail.alt }} {{ post.thumbnail.srcset }}
{{ post.terms('category') }} {{ post.author.name }} {{ post.parent.title }} {{ post.children }}
{{ post.meta('field_name') }}
{{ term.name }} {{ term.link }} {{ term.posts }}
{{ site.name }} {{ site.url }} {{ site.link }} {{ site.theme.link }} {{ site.language_attributes }}
{% for item in menu.items %}{{ item.title }} {{ item.link }} {{ item.current }} {{ item.children }}{% endfor %}
```
`post.excerpt` signature and image `srcset`/`sizes` helpers changed between versions - verify.

## Twig functions (Timber)

`get_post`, `get_posts`, `get_term`, `get_terms`, `get_image`, `get_attachment`, `get_user`, `get_menu`, `function('php_fn', ...args)` / `fn(...)`, `__()`, `_e`, `_x`, `_n`.
Use `get_posts` in Twig only for trivial, cached, non-looped cases; prefer the controller.

## Filters (Timber)

`resize(w, h)`, `letterbox`, `tojpg`, `towebp` (image ops, generate files on first request - prefer registered WP image sizes and srcset), `excerpt(words)`, `truncate(words)`, `wpautop`, `sanitize` (slug), `shortcodes` (with `apply`), `relative`, `time_ago`, `pluck(key)`, `wp_list_filter`, `array`, `list`, `date` (localized). Escaping strategies: Timber registers WordPress escapers such as `e('esc_url')`, `e('esc_html')`, `e('esc_js')`, `e('wp_kses_post')` (verify the exact list for your Timber version); for attributes use Twig's native `e('html_attr')` or register `esc_attr` via the `timber/twig` filter.

## Timber 1 to 2 migration traps

| Timber 1 | Timber 2 |
|---|---|
| `new Timber\Post($id)` / `new TimberPost()` | `Timber::get_post($id)` |
| `Timber::get_context()` | `Timber::context()` |
| `new Timber\PostQuery($args)` | `Timber::get_posts($args)` |
| `new Timber\Menu('primary')` | `Timber::get_menu('primary')` |
| `new Timber\Image($id)` / `TimberImage()` in Twig | `Timber::get_image($id)` / `get_image(id)` |
| `$post->get_field('x')` / `post.get_field` | `$post->meta('x')` |
| `Timber\Helper::transient` | `Timber\Helper::transient` still exists; check signature |
| `timber_context` filter | `timber/context` |
| `get_twig` filter | `timber/twig` |

## Image output pattern (accessible, CLS-safe)

```twig
{% set img = get_image(section.image) %}
{% if img %}
  <img src="{{ img.src('large')|e('esc_url') }}"
       srcset="{{ img.srcset('large')|e('html_attr') }}"
       sizes="(min-width: 64rem) 50vw, 100vw"
       width="{{ img.width }}" height="{{ img.height }}"
       alt="{{ img.alt|e('html_attr') }}"
       loading="{{ index == 1 ? 'eager' : 'lazy' }}"
       {% if index == 1 %}fetchpriority="high"{% endif %}>
{% endif %}
```
Alternative: `{{ function('wp_get_attachment_image', id, 'large', false, { sizes: '...' }) }}` - core handles srcset, dimensions, lazy loading, and decoding.
