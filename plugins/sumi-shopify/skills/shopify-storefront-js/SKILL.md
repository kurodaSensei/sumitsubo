---
name: shopify-storefront-js
description: Storefront JavaScript for Shopify themes - vanilla JS and Web Components, progressive enhancement over Liquid forms, Section Rendering API, Cart AJAX API (add, change, update, bundled section rendering for cart drawer and counters), predictive search, variant selection with URL and media sync, theme editor events, debouncing and race handling, aria-live announcements, and loading scripts without blocking. Use when writing or reviewing assets/*.js, src/**/*.{js,ts}, custom elements, cart drawer, quick add, quantity steppers, facets/filters, predictive search, variant pickers, or when a section must refresh without a full page load.
---

# Shopify Storefront JavaScript

Default to server-rendered Liquid plus small Web Components that enhance it. Liquid renders HTML; JS asks Shopify for fresh HTML (Section Rendering API) instead of rebuilding markup from JSON. General JS/TS standards: `sumi:js-ts`.

## Principles

- Vanilla JS, ES modules, no jQuery, no framework runtime on the storefront unless the project already ships one. A carousel or dialog library is acceptable only if the project already uses it; prefer native `<dialog>`, `<details>`, CSS scroll-snap.
- Progressive enhancement: the product form is a real `{% form 'product' %}` that posts without JS; the cart page works without the drawer; filters are a GET form.
- One custom element per behavior, scoped to its subtree. No global singletons reaching across the DOM by class name.
- Load with `<script src="{{ 'x.js' | asset_url }}" defer></script>` or `type="module"`. Never `script_tag` (no defer), never inline `<script>` inside loops or per block instance.
- URLs from `window.Shopify.routes.root` (or `routes.*` Liquid objects passed via data attributes) so multi-language/market paths work.
- Strings from Liquid (`data-*` attributes or a single JSON blob rendered with `| t` and `| json`), never hardcoded English in JS.

## Web Component pattern

```js
class QuantityInput extends HTMLElement {
  #input; #abort;
  connectedCallback() {
    this.#input = this.querySelector('input[type="number"]');
    this.#abort = new AbortController();
    this.addEventListener('click', this.#onClick, { signal: this.#abort.signal });
  }
  disconnectedCallback() { this.#abort.abort(); }
  #onClick = (event) => {
    const button = event.target.closest('button[name]');
    if (!button) return;
    button.name === 'plus' ? this.#input.stepUp() : this.#input.stepDown();
    this.#input.dispatchEvent(new Event('change', { bubbles: true }));
  };
}
if (!customElements.get('quantity-input')) customElements.define('quantity-input', QuantityInput);
```

Guard `customElements.define` (sections re-render in the editor and scripts may load twice). Clean up listeners in `disconnectedCallback`; sections are replaced wholesale.

## Section Rendering API

```js
async function fetchSection(sectionId, url = window.location.pathname) {
  const target = new URL(url, window.location.origin);
  target.searchParams.set('section_id', sectionId);
  const res = await fetch(target, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`Section ${sectionId}: ${res.status}`);
  return new DOMParser().parseFromString(await res.text(), 'text/html');
}
```

- `?section_id=x` returns one section's HTML; `?sections=a,b` returns JSON `{ id: html }` (capped number of sections per request; verify, historically 5).
- Use the section's runtime id (`section.id`, exposed via `data-section-id`) for template sections; group sections have generated ids too.
- Replace the smallest stable subtree, preserve focus (store `document.activeElement`'s identifier and restore it), and announce the change.

## Cart AJAX API

```js
const root = window.Shopify.routes.root;
async function addToCart(formData, sectionIds = []) {
  if (sectionIds.length) formData.append('sections', sectionIds.join(','));
  formData.append('sections_url', window.location.pathname);
  const res = await fetch(`${root}cart/add.js`, { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.description || data.message), { status: res.status, data });
  return data; // line item(s) + data.sections when requested
}
```

- Endpoints: `cart.js` (GET), `cart/add.js`, `cart/change.js` (`id` = line item key, `quantity`), `cart/update.js` (`updates`, `note`, `attributes`), `cart/clear.js`. Use line item `key`, not variant id, for changes (same variant can appear on several lines with different properties or selling plans).
- Request bundled section rendering (`sections`) to refresh the drawer, cart icon bubble and free-shipping bar in the same round trip instead of a second fetch.
- 422 errors (sold out, quantity rule, inventory) carry a human message in `description`: show it next to the control and announce it.
- Fire a documented custom event after success (`document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }))`) so other components and apps can react. Check what the theme already dispatches before inventing names.

## Variant selection

- Option inputs are radio groups in fieldsets (see `shopify-performance-a11y`). On change, resolve the variant, update the hidden `id` input, `history.replaceState` the `?variant=` URL, and refresh price, availability, media and buy buttons.
- Prefer re-rendering via Section Rendering API with `?variant=<id>` (or option values, verify current combined-listing/option-value URL support) over shipping all variants as JSON for products with many variants.
- Never trust client-side availability alone; the cart API is the source of truth.

## Predictive search

- `GET {root}search/suggest?q=...&section_id=predictive-search` returns server-rendered HTML using the `predictive_search` object; `search/suggest.json` returns JSON. Prefer the section variant for markup parity and translations.
- Debounce input (about 250 to 300 ms), abort stale requests with `AbortController`, ignore responses for outdated queries, cache by query.
- Combobox semantics: input `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; results `role="listbox"` with `role="option"`; arrow keys, Enter, Escape. Announce result counts via a polite live region. Details: `references/ajax-apis.md`.

## Async correctness

- Debounce quantity typing; disable or mark busy (`aria-busy="true"`) controls during a request; serialize cart mutations (queue) so rapid clicks do not race.
- Always handle `!res.ok` and network failure with a visible, translated message. No silent `catch {}`.
- Abort in-flight requests on navigation or re-render.

## Theme editor support

Listen on `document` for `shopify:section:load`, `shopify:section:unload`, `shopify:section:select`, `shopify:section:deselect`, `shopify:section:reorder`, `shopify:block:select`, `shopify:block:deselect`, `shopify:inspector:activate`/`deactivate`. Custom elements usually re-initialize automatically on load; use `block:select` to open the slide, tab or drawer containing the selected block. Check `window.Shopify.designMode` for editor-only behavior.

## AI slop tells

- jQuery (`$(...)`, `$.ajax`), or a framework mounted just to toggle a class.
- Rebuilding product cards or cart line HTML in JS template literals, with hardcoded English and currency formatting, instead of Section Rendering.
- `fetch('/cart/add.js')` with a hardcoded root, no error handling, no `Accept` header, variant id used for `change.js`.
- `innerHTML` with unescaped API data (XSS) or `styled_text` treated as safe without reason.
- `setTimeout` polling for the cart, `DOMContentLoaded` wrappers that break after section reloads, global `window.myTheme = {...}` state bags.
- Listeners added in `connectedCallback` without removal; `customElements.define` without a guard.
- Inline `onclick=""` in Liquid; `<script>` inside a `{% for %}`.

## Done checklist

- [ ] Works without JS at the baseline (forms post, links navigate), JS only enhances.
- [ ] Scripts deferred or modules; no blocking scripts in `<head>`; no duplicate library loads.
- [ ] Routes via `Shopify.routes.root`; translated strings from Liquid; prices formatted server-side.
- [ ] Cart mutations use line keys, bundled `sections`, error states, busy states, serialized requests.
- [ ] DOM updates preserve focus and announce results via `aria-live`.
- [ ] Re-initializes on `shopify:section:load`; cleans up on disconnect; no editor console errors.
- [ ] No long tasks on interaction (check INP); see `sumi:performance`.

Related: `shopify-performance-a11y`, `shopify-liquid`, `sumi:js-ts`.
