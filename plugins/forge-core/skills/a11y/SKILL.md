---
name: a11y
description: Accessibility to WCAG 2.2 AA as an acceptance criterion — semantics, keyboard and focus management, names and descriptions, contrast and non-color cues, motion, forms and errors, dynamic updates, target size, and testing with axe plus manual keyboard and screen reader passes. Use when building or reviewing any UI component, page, form, modal, menu, carousel or interactive widget in any stack, and before shipping visual work.
---

# Accessibility — WCAG 2.2 AA

Accessibility is part of "done", not a later audit. Native HTML gets you most of the way (`forge-core:html`); this skill covers the rest. Widget recipes are in `references/patterns.md`.

## The five questions for every component

1. **What is it?** Correct role: native element, or ARIA role that matches a known pattern. No ARIA is better than wrong ARIA.
2. **What is it called?** Accessible name from visible text, `<label>`, `aria-labelledby`, or `aria-label` (last resort; must match visible text when there is some — WCAG 2.5.3).
3. **What state is it in?** `aria-expanded`, `aria-pressed`, `aria-selected`, `aria-current`, `aria-invalid`, `aria-busy`, `disabled` — kept in sync with the UI.
4. **Can I operate it with a keyboard alone?** Tab reaches it, Enter/Space activates, Esc dismisses, arrows move within composite widgets, focus is always visible and never trapped (except inside modals).
5. **Will I notice when it changes?** Focus moves deliberately or a live region announces the change.

## Keyboard and focus

- Logical tab order = DOM order. Never `tabindex` > 0. `tabindex="-1"` only for programmatic focus targets.
- Visible `:focus-visible` indicator (2.4.7). House rule, stricter than AA and aligned with AAA 2.4.13: ≥ 2px and ≥ 3:1 against adjacent colors. Never obscured by sticky headers (2.4.11 — use `scroll-padding-top`).
- Modals: focus moves in on open, is contained, Esc closes, focus returns to the trigger. Native `<dialog>.showModal()` does this; otherwise apply `inert` to the rest of the page.
- After route changes in SPAs, move focus to the main heading (or announce the page title) and update `document.title`.
- After deleting or filtering items, place focus somewhere sensible (next item, list heading), never on `<body>`.
- Hover-only content must also appear on focus, be dismissible (Esc) and hoverable (1.4.13).

## Perceivable

- Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24px or ≥ 18.66px bold); UI component boundaries, icons and focus rings ≥ 3:1. Check every token pair in light and dark themes, including text on images and gradients.
- Never color alone for meaning (errors, links in body text, chart series, status): add text, icons or patterns.
- Text resizes to 200% and reflows at 320 CSS px with no loss (1.4.10). No text in images.
- Media: captions for video, transcripts for audio, no autoplay with sound, pause control for anything moving > 5 s (2.2.2).
- Motion: honor `prefers-reduced-motion`; nothing flashes more than 3 times per second.

## Operable (WCAG 2.2 additions to remember)

- **Target size** ≥ 24×24 CSS px or sufficient spacing (2.5.8); aim for 44×44 on touch-first UI.
- **Dragging** has a single-pointer alternative (2.5.7): reorder lists also via buttons or keyboard.
- **Focus not obscured** by sticky bars or cookie banners (2.4.11).
- **Consistent help**: contact/help links in the same place across pages (3.2.6).
- **Redundant entry**: don't ask for the same info twice in a flow; autofill it (3.3.7).
- **Accessible authentication**: no cognitive tests; allow paste and password managers (3.3.8).

## Forms

- Labels visible and programmatically associated; required fields indicated in text (not only `*`).
- Errors: describe the problem and the fix in text, link via `aria-describedby`, set `aria-invalid="true"`, and on submit move focus to an error summary or the first invalid field.
- Group radios/checkboxes with `fieldset/legend`. Use `autocomplete` tokens for personal data.
- Don't validate on every keystroke with announcements; validate on blur/submit.

## Dynamic content

- Status messages ("Added to cart", "3 results") via a persistent `role="status"` (polite) region that exists before the update. `role="alert"` only for urgent errors.
- Loading: `aria-busy="true"` on the updating region and a text status; skeletons are `aria-hidden`.
- Infinite scroll needs a reachable footer and a "load more" alternative.

## Content

- One `<h1>`, no skipped levels, descriptive headings and link text ("View pricing plans", not "Click here"; repeated "Read more" gets context via visually hidden text).
- Images: alt describes purpose. Decorative → `alt=""`. Functional (inside links/buttons) → describe the action. Complex (charts) → short alt + longer text nearby.
- Language set on `<html>` and on passages in another language (`lang` attribute).
- Visually hidden utility (`.sr-only`) for extra context; never hide focusable elements with it.

## Testing (required evidence)

1. **Automated**: axe (browser extension, `@axe-core/playwright`, or Lighthouse a11y) → 0 critical/serious on affected views. Automation catches ~30–40%; it is the floor, not the bar.
2. **Keyboard pass**: complete the main task with Tab/Shift+Tab/Enter/Space/Esc/arrows only; focus always visible and logical.
3. **Zoom/reflow**: 200% zoom and 320px width.
4. **Screen reader smoke test** for new widgets: VoiceOver (Safari) or NVDA (Firefox/Chrome) — name, role and state announced correctly.
5. **Contrast**: check new token pairs (forge-design `contrast.mjs`).

## Slop tells

- `aria-label` on everything, often duplicating visible text or contradicting it.
- `role="menu"` for site navigation (use a disclosure pattern); `role="button"` on divs.
- `outline: none` with no replacement; focus lost after closing a modal.
- Icon-only buttons with no accessible name; "Click here" links.
- Carousels that autoplay without pause; toasts that vanish before they can be read.

## Done checklist

- [ ] Five questions answered for every new interactive element.
- [ ] axe clean (0 serious/critical) on affected views — evidence recorded.
- [ ] Full keyboard path works; focus visible, logical, never lost or obscured.
- [ ] Contrast verified for all new color pairs in all themes.
- [ ] Reduced motion, 200% zoom and 320px reflow checked.
