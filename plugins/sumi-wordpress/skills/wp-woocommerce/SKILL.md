---
name: wp-woocommerce
description: WooCommerce customization done safely - hooks and filters over template overrides, minimal versioned overrides, CRUD objects (wc_get_product, wc_get_orders) and HPOS compatibility, Cart/Checkout blocks vs classic shortcodes (Store API, additional checkout fields), extending product data, emails, and storefront performance (cart fragments, asset scoping, product query cost). Use when editing **/woocommerce/**/*.php template overrides, code using woocommerce_* hooks, WC_Product/WC_Order, checkout or cart customizations, payment/shipping integrations, or diagnosing a slow WooCommerce store.
---

# WooCommerce

WooCommerce changes fast and supports two checkout stacks; every customization must survive updates. Related: `wp-security-performance`, `wp-blocks-acf`, `sumi:a11y`, `sumi:performance`.

## 1. Hooks first, overrides last

Order of preference: (1) settings/blocks configuration, (2) action/filter, (3) block or pattern customization, (4) template override.

DO:
```php
// Move price below title on single product: re-hook instead of overriding the template.
add_action('init', function (): void {
    remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_price', 10);
    add_action('woocommerce_single_product_summary', 'woocommerce_template_single_price', 6);
});

add_filter('woocommerce_product_tabs', function (array $tabs): array {
    unset($tabs['reviews']);
    return $tabs;
});
```
DON'T: copy `single-product/price.php` to change one class; copy whole `templates/` folders; edit files in `plugins/woocommerce/`.

Overrides, when unavoidable:
- Copy only the specific file to `yourtheme/woocommerce/<same path>`, keep the `@version` header, change the minimum.
- After every WooCommerce update, check WooCommerce > Status > Templates for outdated overrides and diff against the new core file.
- Block themes: single product, archive, cart, and checkout are block templates; override via `templates/single-product.html` etc. and blocks, not PHP templates (verify which templates are block-based for your WC version).

## 2. Data access: CRUD only, HPOS-safe

```php
add_action('before_woocommerce_init', function (): void {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('cart_checkout_blocks', __FILE__, true);
    }
});

$order = wc_get_order($order_id);
$order->update_meta_data('_acme_gift_note', sanitize_textarea_field($note));
$order->save();

$orders = wc_get_orders(['status' => ['wc-processing'], 'limit' => 50, 'return' => 'ids']);
```
- Orders live in custom tables under HPOS: never `get_post_meta($order_id, ...)`, `WP_Query` with `post_type => shop_order`, or direct `wp_posts` SQL for orders.
- Products: `wc_get_product()`, `wc_get_products()`, `$product->get_price()`, `$product->get_meta()`; set via setters then `save()`. Avoid `update_post_meta` on product prices (lookup tables and caches go stale).
- Hook into `woocommerce_new_order`, `woocommerce_order_status_{from}_to_{to}`, `woocommerce_payment_complete` rather than `save_post`.
- Admin screens: use `wc_get_page_screen_id('shop-order')` for HPOS-aware screen checks (verify against WooCommerce developer docs).

## 3. Cart and Checkout: blocks vs classic

New stores default to Cart/Checkout blocks. Classic PHP hooks such as `woocommerce_checkout_fields`, `woocommerce_before_checkout_form`, `woocommerce_review_order_*` do not run in the block checkout.

| Need | Block checkout | Classic shortcode |
|---|---|---|
| Extra field (gift note, VAT ID) | Additional Checkout Fields API `woocommerce_register_additional_checkout_field()` (WC 8.9+) | `woocommerce_checkout_fields` filter + save on `woocommerce_checkout_create_order` |
| Custom data in cart/checkout UI | Store API `ExtendSchema` / `woocommerce_store_api_register_endpoint_data` + JS slot/fill | template hooks |
| Fees, discounts | `woocommerce_cart_calculate_fees` (server, works for both) | same |
| Validation | Store API checkout validation / field `validate_callback` | `woocommerce_after_checkout_validation` |

Confirm which checkout the site uses before writing code; document it. Verify block extensibility APIs against developer.woocommerce.com, they evolve per release. Do not reintroduce the classic shortcode just to reuse old snippets without client agreement.

## 4. Product data and admin UX

- Custom product fields: `woocommerce_product_options_general_product_data` + `woocommerce_admin_process_product_object` (receives the product object; set meta on it, no direct post meta), or ACF field groups targeted to product post type for content-only fields.
- Use product attributes/taxonomies for filterable data, not meta.
- Labels, help tips (`desc_tip`), and sane defaults for store managers; no fields they cannot understand.

## 5. Emails and strings

- Customize emails with `woocommerce_email_*` hooks and the email settings/block email editor where available; override email templates only for structural changes.
- Change strings with targeted filters or translation files, not a global `gettext` filter that runs on every string (slow).

## 6. Storefront performance

- Product loops: use `wc_get_products()` with `limit`, `return => 'ids'` where possible; avoid `meta_query` on price (use the product lookup tables / built-in ordering).
- Cart fragments (`wc-cart-fragments`): only load where a live mini-cart needs it; with block mini-cart it is usually unnecessary. Verify current core behavior before dequeuing.
- Scope WooCommerce assets: do not load cart/checkout scripts on content pages; avoid plugins that enqueue everywhere.
- Page cache must exclude cart, checkout, my-account and respect `woocommerce_items_in_cart` / session cookies.
- Use Action Scheduler (`as_enqueue_async_action`) for slow post-order work (ERP sync, emails to third parties), never inline during checkout.
- Product images: define WooCommerce image sizes to match the design (`woocommerce_get_image_size_*` / Customizer), regenerate thumbnails after changes; dimensioned images to prevent CLS on archives.
- Keep the plugin count low; each payment/shipping/marketing plugin adds scripts to checkout, the most conversion-sensitive page.

## 7. Accessibility and trust

- Checkout errors announced and associated with fields; visible focus; labels on every input; quantity buttons with accessible names. See `sumi:a11y`.
- Prices formatted with `wc_price()`; never hardcode currency symbols or decimal separators.
- Escape all product/order data on output; nonces + capability checks on any custom order/product admin action.

## 8. AI slop tells

- Copying entire WooCommerce template folders into the theme; overrides with stale `@version`.
- `get_post_meta($order_id, '_billing_email', true)` or `WP_Query` for orders (breaks under HPOS).
- Classic checkout hooks added to a block-checkout store and "it does not show up".
- Hardcoded `$` and number formats; `update_post_meta` for `_price`.
- Global `gettext` filters for one label; jQuery `$(document.body).on('updated_checkout')` hacks in block checkout.
- Heavy synchronous API calls in `woocommerce_thankyou` or checkout hooks.
- Invented hooks (`woocommerce_after_cart_total_row`) - confirm hook names in the WooCommerce source or docs.

## Done checklist

- [ ] Hooks/filters used wherever possible; each override is minimal, justified, and `@version`-current.
- [ ] HPOS (and blocks, if applicable) compatibility declared; all order/product access via CRUD.
- [ ] Checkout stack identified; customization uses the matching API (block extensibility vs classic hooks).
- [ ] Store manager fields have labels, help, defaults; filterable data uses taxonomies/attributes.
- [ ] WooCommerce assets and cart fragments scoped; cache exclusions correct; slow work queued.
- [ ] Prices via `wc_price()`; all output escaped; admin actions protected by nonce + capability.
- [ ] Checkout keyboard- and screen-reader-tested; error states announced.
- [ ] Tested after a WooCommerce minor update on staging (Status > Templates clean).
