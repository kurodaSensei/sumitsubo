---
name: html
description: Modern semantic HTML standards — native elements before JavaScript (dialog, details, popover, search, form validation), document structure, landmarks, forms, media, metadata and ID conventions. Use when writing or reviewing markup in any template language (*.html, *.vue templates, *.jsx/*.tsx JSX, *.liquid, *.twig, *.php templates) or deciding whether a UI behavior needs JavaScript at all. Framework-agnostic baseline; stack pack skills take precedence for stack specifics.
---

# HTML — Semantic First, Platform First

The browser already ships accessible, keyboard-ready, performant components. Use them before writing JavaScript, and before reaching for a library.

## Document

- `<html lang="…">` always; `<title>` unique per page; one `<h1>` per page.
- `<meta name="viewport" content="width=device-width, initial-scale=1">` — never disable zoom.
- Landmarks: one page-level `<header>` (banner), `<nav>` (labelled if more than one), one `<main id="main">`, `<footer>`; `<aside>` for complementary content. A skip link to `#main` is the first focusable element.
- Headings form an outline; never skip levels for visual size. Size is CSS's job.

## Native elements to prefer

| Need | Use | Not |
|---|---|---|
| Modal | `<dialog>` + `showModal()` (focus trap, Esc, inert background built in) | div overlay + custom trap |
| Disclosure / accordion | `<details><summary>`; `name` attribute for exclusive groups | div + click handler |
| Tooltip, menu, popover | `popover` attribute + `popovertarget` (light dismiss, top layer) | absolutely positioned div + outside-click JS |
| Anchoring popovers | CSS anchor positioning (progressive enhancement) | JS positioning libs for simple cases |
| Search region | `<search>` wrapping the form | div role="search" |
| Navigation action | `<a href>` | `<div onclick>` / `<button>` that navigates |
| In-page action | `<button type="button">` | `<a href="#">` / div |
| Progress / meters | `<progress>`, `<meter>` | styled divs without semantics |
| Calculated output | `<output for="…">` | span |
| Autocomplete hints | `<datalist>` for simple cases | custom combobox when native is enough |

## Forms

- Every control has a visible `<label for>`; placeholders are hints, never labels.
- Use the right `type` (`email`, `tel`, `url`, `number`, `date`, `search`) and `inputmode` / `autocomplete` tokens (`email`, `given-name`, `postal-code`, `one-time-code`, `cc-number`) — they drive mobile keyboards and autofill.
- Native validation (`required`, `pattern`, `min`, `max`, `minlength`) first; enhance messages with the Constraint Validation API. Errors are text tied with `aria-describedby`, not color alone.
- Group related controls with `<fieldset><legend>` (radio groups, address blocks).
- Buttons inside forms declare `type` explicitly.

## Media

- `<img>` always has `width`/`height` (or CSS `aspect-ratio`) to prevent layout shift, meaningful `alt` (empty `alt=""` when decorative), `loading="lazy"` below the fold, `fetchpriority="high"` on the LCP image only.
- Responsive images: `srcset` + `sizes`, or `<picture>` for art direction and modern formats (AVIF/WebP).
- Inline SVG icons: `aria-hidden="true"` when decorative; `role="img"` + `<title>` when meaningful. Use `currentColor`.
- `<video>`: captions track, no autoplay with sound, `playsinline`, a poster.

## IDs and attributes

- IDs only for label/ARIA wiring, fragment targets and form association; never for styling. Make them unique per page (prefix with component + instance in loops).
- Data attributes for JS hooks (`data-cart-drawer`), classes for styling. Don't couple JS to styling classes.
- Boolean attributes are present/absent (`hidden`, `disabled`, `inert`), not `="false"`.

## Slop tells

- `div` soup with click handlers; `role="button"` on a div when `<button>` works.
- ARIA added to native elements that already have the semantics (`<button role="button">`, `<nav role="navigation">` in new code).
- Placeholder-as-label, missing `alt`, `<br>` for spacing, empty links/buttons with only an icon and no accessible name.
- Custom JS modals, accordions and tooltips when native elements cover the case.

## Done checklist

- [ ] Validates (no duplicate IDs, no invalid nesting such as interactive inside interactive).
- [ ] Every interactive element is a native control or has full keyboard + ARIA support.
- [ ] Every image has correct `alt` and dimensions; LCP image prioritized.
- [ ] Forms: labels, types, autocomplete, accessible errors.
- [ ] Heading outline makes sense read alone.
