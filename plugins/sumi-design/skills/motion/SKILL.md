---
name: motion
description: Motion and interaction craft rules for Sumitsubo projects — when motion is justified, duration and easing by intent, what to animate, entry/exit with CSS (@starting-style, view transitions), springs, gesture feedback, performance and reduced-motion policy. Defers to Emil Kowalski's skills for deep motion work when installed. Use when adding transitions, animations, hover/press feedback, page transitions, scroll effects or when reviewing motion that feels slow, cheap or excessive.
---

# Motion

Motion exists to explain change: feedback (it worked), continuity (where did that come from), hierarchy (look here). If an animation does none of these, remove it. For deeper craft, load Emil Kowalski's `emil-design-eng` (and `review-animations` for audits) when installed.

## Defaults (tokens in DESIGN.md)

| Intent | Duration | Easing |
|---|---|---|
| Press / hover feedback | 80–150 ms | ease-out |
| Small UI (dropdown, tooltip, toggle) | 150–220 ms | ease-out on enter, faster ease-in on exit |
| Medium surfaces (drawer, modal, sheet) | 220–320 ms | strong ease-out or a critically damped spring |
| Large / page transitions | 300–450 ms | ease-in-out; never block input |

- Exits are faster than entries (roughly 70–80%).
- Use custom cubic-bezier curves named by intent (`--ease-enter`, `--ease-exit`, `--ease-move`); the built-in `ease` and `linear` rarely feel right for UI.
- No bounce/elastic by default; overshoot only when the brand's motion personality calls for it.
- Frequently repeated interactions (typing, toggling in lists, keyboard navigation) get little or no animation.

## What to animate

- `transform` and `opacity` only (GPU-friendly). Never width/height/top/left/margin; use transforms or FLIP / View Transitions for layout changes.
- Animate from the origin of the trigger (`transform-origin` at the button for popovers).
- Stagger lists lightly (20–40 ms per item, cap total) or not at all.
- Scroll-driven effects only for narrative pages and only if they still read without motion.

## Techniques

- Entry/exit for dialogs, popovers and `display` toggles: `@starting-style` + `transition-behavior: allow-discrete`.
- Route and state transitions: View Transitions API (`document.startViewTransition`, framework integrations) as progressive enhancement.
- Interruptible interactions (drag, swipe, sheets): springs (Motion/`motion` library, or CSS `linear()` approximations) so motion follows the gesture.
- Press feedback: subtle scale (0.97–0.98), or a color/background change (cheap on small elements, the one exception to transform/opacity); respond within one frame.

## Reduced motion (mandatory)

Under `prefers-reduced-motion: reduce`: remove parallax, large translations, auto-playing animation and scroll-jacking; keep short opacity fades and instant state changes. Provide pause controls for anything that loops longer than 5 s.

## Performance

- No animation library for what CSS can do. Load heavier motion code only on routes that use it.
- Test on a throttled mid-tier phone; dropped frames mean simplify.
- Avoid animating large blurred or shadowed layers; prefer opacity on a pre-rendered layer.

## Slop tells

Everything fading up on scroll; hover scale on every card; 600 ms+ UI transitions; spinners where skeletons or optimistic UI fit; motion that ignores reduced-motion settings.

## Done checklist

- [ ] Each animation has a stated purpose (feedback, continuity, hierarchy).
- [ ] Durations and easings come from tokens; exits faster than entries.
- [ ] Only transform/opacity animated; smooth on throttled mobile.
- [ ] Reduced-motion behavior verified.
