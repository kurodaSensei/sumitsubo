# Accessible widget recipes

Use the native element when one exists. These recipes cover the rest. Keyboard columns list required keys.

## Disclosure (show/hide, FAQ, mobile nav toggle)
- Prefer `<details><summary>`. Custom: `<button aria-expanded="false" aria-controls="panel-id">` + panel with `hidden`.
- Keys: Enter/Space toggles. Optional Esc closes when the panel overlays content.

## Accordion
- Each header is a heading containing a button (`<h3><button aria-expanded aria-controls>`). Panels optionally `role="region"` + `aria-labelledby` (only when few panels).
- Exclusive groups: native `<details name="group">`.

## Site navigation with dropdowns
- `<nav aria-label="Main">` + list of links; submenus toggled by a `<button aria-expanded>` next to (or as) the parent item. NOT `role="menu"` / `menubar` — those are for application menus.
- Keys: Tab moves through items; Enter/Space opens; Esc closes and returns focus to the toggle. Close on focus leaving the submenu.
- Mark the current page with `aria-current="page"`.

## Tabs
- `role="tablist"` (labelled) > `role="tab"` buttons with `aria-selected`, `aria-controls`; panels `role="tabpanel"` + `aria-labelledby`, `tabindex="0"` if the panel has no focusable content.
- Roving tabindex: only the active tab is in the tab order. Keys: ←/→ move (wrap), Home/End, Enter/Space activates (or automatic activation if panels are cheap).
- If tabs change the URL or are long content sections, consider plain links + headings instead.

## Modal dialog / drawer (cart, filters, menus on mobile)
- `<dialog>` + `showModal()`; label with `aria-labelledby` to its heading. Close button with an accessible name.
- On open: focus the first meaningful control (or the dialog heading for content-heavy dialogs). On close: return focus to the trigger.
- Background is inert (native with showModal). Body scroll locked. Esc closes. Avoid nested modals.
- Drawers are dialogs that slide; the motion must respect reduced motion.

## Non-modal popover (tooltips, quick menus)
- `popover` attribute: `popover="auto"` for light-dismiss menus, `popover="hint"`/manual for tooltips where supported.
- Tooltips: trigger has `aria-describedby` to the tooltip text; show on hover AND focus; Esc hides; never put interactive content in a tooltip.

## Menu button (actions menu, not navigation)
- `<button aria-haspopup="menu" aria-expanded>` + `role="menu"` with `role="menuitem"` children. Keys: ↑/↓, Home/End, Enter activates, Esc closes, type-ahead optional. Only for app-like action lists.

## Combobox / autocomplete / predictive search
- Input `role="combobox"` `aria-expanded` `aria-controls="listbox-id"` `aria-autocomplete="list"`; popup `role="listbox"` with `role="option"` items; `aria-activedescendant` tracks the highlighted option while focus stays in the input.
- Keys: ↓/↑ move, Enter selects, Esc closes (second Esc clears), typing filters. Announce result counts in a polite live region.
- Prefer a well-tested library (React Aria, Headless UI, Radix, Reka UI) for complex comboboxes.

## Carousel / slider of content
- Container `role="region"` + `aria-roledescription="carousel"` + label; slides `role="group"` + `aria-roledescription="slide"` + "n of N" labels.
- Previous/next buttons with names; visible pause/play if it autoplays (prefer no autoplay). Pause on hover and on focus within.
- Off-screen slides are `inert` or hidden from AT. Scroll-snap based carousels must keep keyboard access to every slide.

## Range slider
- Native `<input type="range">` with label and `aria-valuetext` for human values ("$40"). Dual-thumb price filters: two range inputs or a tested library, plus number inputs as alternative.

## Toast / snackbar / status
- Persistent `role="status"` container in the DOM from page load; inject message text. Errors use `role="alert"`.
- Stay ≥ 5 s plus reading time, pause on hover/focus, dismiss button for persistent ones. Never put the only path to an action inside a toast.

## Product card (e-commerce)
- `<article>` labelled by the product title. One primary link (the title) stretched over the card with a pseudo-element; secondary actions (quick add, wishlist) are real buttons placed above the stretched link in stacking order, visible on focus as well as hover.
- Price: sale + original announced clearly ("Sale price $40, regular price $60"), not only strikethrough.

## Filters (faceted search)
- Each facet: disclosure button + `fieldset/legend` of checkboxes/radios. Apply immediately with a polite live region announcing the result count, or with an explicit Apply button on mobile drawers.
- Active filters listed as removable buttons ("Remove filter: Blue").

## Data table
- Real `<table>` with `<caption>`, `<th scope="col|row">`. Sortable headers: button inside `<th>` + `aria-sort` on the active column. Responsive: horizontal scroll container with `tabindex="0"`, `role="region"` and a label — don't turn tables into div grids.

## Skip link
- First focusable element; visible on focus; targets `<main id="main" tabindex="-1">`.
