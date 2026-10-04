---
name: wp-timber-twig
description: Timber 2.x + Twig 3 for classic WordPress themes - thin PHP controllers building context, Timber\Post/Term/Image APIs, class maps, layouts/partials/sections, custom Twig functions and filters, escaping (autoescape is off by default), ACF data in Twig, flexible-content section builder, and anti-patterns (Timber 1 APIs, logic in templates, queries in loops). Use when editing **/*.twig, **/views/**, Timber controllers (index.php, single.php, page.php, archive.php), Timber\Site subclasses, timber/* filters, or composer.json requiring timber/timber.
---

# Timber 2 + Twig 3

PHP prepares data; Twig renders it. Most online examples and model memory are Timber 1.x - treat any API not listed here or in `references/timber-api.md` as suspect and verify against timber.github.io/docs/v2 before using. Related: `wp-security-performance`, `sumi:a11y`, `sumi:css-architecture`.

## 1. Controllers: thin, explicit context

DO:
```php
// single-event.php
use Timber\Timber;

$context          = Timber::context();          // includes `post` on singular, `posts` on archives
$event            = $context['post'];           // already an \Acme\Theme\Models\Event via class map
$context['related'] = $event->related(3);       // query lives in the model, not in Twig
Timber::render(['single-event.twig', 'single.twig'], $context);
```
DON'T: `new TimberPost()`, `new Timber\Post()`, `Timber::get_context()`, `TimberHelper::` (all Timber 1). Don't run `get_field()` inside a Twig loop. Don't build HTML strings in PHP and print them with `|raw`.

Rules:
- `Timber::context()` for template context; `Timber::get_post()`, `Timber::get_posts($args)` (returns a `PostQuery` / collection), `Timber::get_term()`, `Timber::get_terms()`, `Timber::get_menu('location')`, `Timber::get_image($id)`.
- Global context (menus, options, site settings) goes in one place: a `timber/context` filter or `Timber\Site::add_to_context()`. Cache expensive global values.
- Pass template fallbacks as an array; Twig file names mirror WP hierarchy.

## 2. Models via class map

Put derived data and queries on post classes, not in templates:
```php
add_filter('timber/post/classmap', fn(array $map): array => $map + [
    'event' => \Acme\Theme\Models\Event::class,
]);

namespace Acme\Theme\Models;
final class Event extends \Timber\Post {
    public function starts_at(): ?\DateTimeImmutable {
        $raw = $this->meta('event_start');                     // ACF date_time_picker return format Y-m-d H:i:s
        return $raw ? new \DateTimeImmutable($raw, wp_timezone()) : null;
    }
    public function related(int $n): iterable {
        return \Timber\Timber::get_posts([
            'post_type' => 'event', 'posts_per_page' => $n, 'post__not_in' => [$this->ID],
            'no_found_rows' => true, 'ignore_sticky_posts' => true,
        ]);
    }
}
```
Twig: `{{ post.starts_at|date('M j, Y') }}`. Same idea for `timber/term/classmap`.

## 3. Views layout

```
views/
  layouts/base.twig        # html shell, {{ function('wp_head') }}, {{ function('wp_footer') }}
  partials/                # kebab-case, documented params
  sections/                # one file per flexible-content layout, file name == layout name
  templates/ or root       # page-level templates extending base
```
Base layout:
```twig
<!doctype html>
<html {{ site.language_attributes }}>
<head>
  <meta charset="{{ site.charset }}">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {{ function('wp_head') }}
</head>
<body class="{{ body_class }}">
  {{ function('wp_body_open') }}
  <a class="skip-link screen-reader-text" href="#main">{{ __('Skip to content', 'acme') }}</a>
  {% include 'partials/site-header.twig' %}
  <main id="main">{% block content %}{% endblock %}</main>
  {% include 'partials/site-footer.twig' %}
  {{ function('wp_footer') }}
</body>
</html>
```
Partials start with a doc comment listing params and defaults; pass data explicitly with `include('partials/card.twig', { post: item }, with_context = false)` so partials do not depend on ambient variables.

## 4. Escaping in Twig

Timber does not enable Twig autoescape by default. Choose one policy per project and apply it everywhere:
- Preferred: enable autoescape (`add_filter('timber/twig/environment/options', fn($o) => $o + ['autoescape' => 'html'])`) and mark trusted HTML explicitly. Verify the option name against the Timber 2 docs for your version.
- Either way, escape by context with WordPress escapers, which Timber exposes as Twig escaping strategies:
```twig
<a href="{{ link.url|e('esc_url') }}">{{ link.title|e('esc_html') }}</a>
<img src="{{ img.src('large')|e('esc_url') }}" alt="{{ img.alt|e('html_attr') }}">
<div class="prose">{{ section.body|e('wp_kses_post') }}</div>
{{ post.content }}   {# already filtered through the_content; do not add |wpautop #}
```
- `|raw` only on values you produced and sanitized in PHP (and with a comment why). Never on ACF text/textarea/URL fields or anything user-editable.
- `|sanitize` is `sanitize_title` (slug), not an XSS escape.

## 5. ACF in Twig

- With ACF active, Timber 2 routes `post.meta('field')` through ACF so values come back formatted (including repeaters and groups as arrays). Confirm behavior for your Timber/ACF versions; image/post-object fields return raw IDs or arrays depending on the field's return format, so wrap them: `get_image(section.image)` or `Timber::get_image()` in PHP.
- Options pages: load once into global context (`get_field('footer', 'option')`), not per partial.
- Complex structures (flexible content, nested repeaters, relationships) are prepared in the controller or model so you can normalize, cast, and batch-load related posts before rendering.

## 6. Flexible-content section builder

```php
// page-builder.php (Template Name: Page Builder)
$context = Timber::context();
$context['sections'] = array_map(
    [\Acme\Theme\Sections::class, 'prepare'],           // per-layout normalization + batch queries
    get_field('sections', $context['post']->ID) ?: []
);
Timber::render('templates/page-builder.twig', $context);
```
```twig
{% for section in sections %}
  {% include 'sections/' ~ section.acf_fc_layout ~ '.twig'
     ignore missing with { section: section, index: loop.index } only %}
{% endfor %}
```
- Layout names are a stable contract: snake_case, never renamed after launch (content breaks silently). Keep a whitelist in `Sections::prepare()` rather than trusting arbitrary layout names in include paths.
- Each section renders exactly one landmark-appropriate wrapper and one heading level that fits the outline (first section may be the `h1`, others `h2`) - expose a heading-level option if needed. See `sumi:a11y`.
- Each section owns its CSS file and optional JS module; load JS only when the section is present.
- In dev, render a visible placeholder for an unknown layout; in production, skip and log.

## 7. Custom functions and filters

```php
add_filter('timber/twig', function (\Twig\Environment $twig): \Twig\Environment {
    $twig->addFunction(new \Twig\TwigFunction('icon', [\Acme\Theme\Icons::class, 'render'], ['is_safe' => ['html']]));
    $twig->addFilter(new \Twig\TwigFilter('reading_time', [\Acme\Theme\Text::class, 'readingTime']));
    return $twig;
});
```
Only mark `is_safe` when the callable escapes its own output. Prefer a named Twig function over `function('arbitrary_php')` calls scattered through templates. Use `{% apply shortcodes %}...{% endapply %}` for shortcode content.

## 8. AI slop tells

- Timber 1 syntax: `TimberPost()`, `Timber::get_context()`, `{{ post.get_field('x') }}`, `post.acf.x`, `{% cache %}` tags.
- `{{ wp_head() }}` instead of `{{ function('wp_head') }}`.
- `{{ fn('get_field', 'x', item.id) }}` inside `{% for %}` (N+1 meta/query per row).
- `get_posts()` / `Timber::get_posts()` called from Twig with ad-hoc args.
- Missing escaping on attributes and URLs; `|raw` sprinkled to "fix" encoded entities.
- Inline `<script>`/`<style>` blocks in sections; hardcoded colors instead of tokens.
- Invented filters (`|image`, `|acf`, `|do_shortcode`) - if it is not in Twig core, Timber, or registered in `timber/twig`, it does not exist.

## Done checklist

- [ ] No Timber 1 APIs; controllers only build context and render.
- [ ] Queries and derived data live in models/services; no queries or `get_field` in loops.
- [ ] Escaping policy applied: URLs `esc_url`, attributes `esc_attr`, rich text `wp_kses_post`; every `|raw` justified.
- [ ] Partials documented and receive explicit data (`only` / `with_context = false`).
- [ ] Flexible layouts whitelisted, snake_case, one heading level per section, per-section assets.
- [ ] Global context computed once; Query Monitor shows no duplicate queries for the page.
- [ ] `WP_DEBUG` on with Twig `debug` enabled locally only; no `dump()` left in templates.
