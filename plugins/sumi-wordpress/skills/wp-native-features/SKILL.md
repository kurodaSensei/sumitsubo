---
name: wp-native-features
description: Building site features with WordPress core APIs instead of plugins — custom post types and taxonomies exposed to the block editor, post meta with native meta boxes or register_post_meta, Settings API pages for site-wide options, JSON-LD schema, inline SVG icon helpers, safe uploads, contact forms with clean markup, i18n with Polylang, and security fundamentals. Use when adding content types, fields, options pages, structured data, forms or integrations (e.g. WhatsApp links) to a native block theme, or when tempted to install a plugin for something core can do.
---

# Native Features (core APIs over plugins)

Default to WordPress core. Every plugin is a dependency the client inherits: install one only when it does something substantial that core can't (forms delivery, multilingual content), and say why in the PR.

## Content model

- `register_post_type` / `register_taxonomy` on `init` in `inc/cpt.php`, always with `show_in_rest => true` (required for the block editor), sensible `supports`, `has_archive` and rewrite slugs in the site's language. Create `single-<cpt>.html` and `archive-<cpt>.html` templates.
- Fields: native meta boxes (`add_meta_box` + nonce + capability check + sanitize on save) or `register_post_meta` with `show_in_rest`, `single`, `type` and `sanitize_callback` when blocks need the value. No ACF.
- Small fixed lookups (category colors, icons) can be a PHP map function; mark it with a `ponytail:` comment and add term meta UI only when the client must edit it.
- Helper functions prefixed with the theme (`{theme}_...`), each documented with its return type.

## Site-wide options

Settings API page (`add_menu_page`/`add_options_page` + `register_setting` with a `sanitize_callback` + `add_settings_field`) for things like the WhatsApp number, default CTA label or advisor name. Expose getters (`{theme}_wa_number()`) so blocks never read options directly.

## Integrations as helpers

Build reusable helpers instead of repeating logic in blocks: e.g. `{theme}_wa_url( $message )` (sanitized number + `rawurlencode` message), `{theme}_tel_href()`, a screen-reader "opens in a new tab" string. Floating buttons injected via `wp_footer` with accessible names.

## Icons and media

- `{theme}_icon_svg( $slug )` returns inline SVG from a fixed map (stroke `currentColor`, `aria-hidden` on decorative use). One icon language for the whole site.
- SVG uploads only with sanitization and restricted to admins (`upload_mimes`, `wp_check_filetype_and_ext`, `wp_handle_upload_prefilter`).

## Structured data

`inc/schema.php` prints JSON-LD in `wp_head` for the business type (TravelAgency, LocalBusiness, Organization), plus per-template types (Product/Offer, FAQPage, BreadcrumbList) built from real content. Validate with Google's Rich Results test; record the evidence.

## Forms

Contact Form 7 (or the client's tool) with your own markup: disable autoformatting (`wpcf7_autop_or_not` → false) and write the form template with the theme's grid and labels. Load the plugin's assets only on pages that contain the form (`wp-performance-audit`). Labels, errors and success messages must meet `sumi:a11y`.

## i18n

Theme strings through `__()` with the theme text domain; content translation via Polylang. Patterns and block defaults are translatable, so the same theme serves every language.

## Security baseline

Escape late (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`), sanitize early (`sanitize_text_field`, `absint`, custom callbacks), nonces + `current_user_can` on every save handler and admin action, `$wpdb->prepare` for any raw query, `if ( ! defined( 'ABSPATH' ) ) exit;` at the top of every PHP file.

## Done checklist

- [ ] No plugin added for something core does; any new plugin justified.
- [ ] CPTs/taxonomies/meta visible in the block editor (`show_in_rest`).
- [ ] Every save path: nonce, capability, sanitization.
- [ ] Options read through helpers; schema validated.
