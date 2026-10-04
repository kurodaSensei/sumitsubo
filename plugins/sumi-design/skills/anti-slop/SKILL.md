---
name: anti-slop
description: Catalog of AI-default design and copy tells — the patterns that make generated interfaces look interchangeable — with what to do instead. Use when generating or reviewing any UI, landing page, mockup, component styling or marketing copy, when writing anti-references, and when a design "looks like every other AI site".
---

# Anti-Slop Catalog

A pattern is slop when it is chosen by default rather than by intent. Any item below is allowed only if DESIGN.md explicitly justifies it for this brand. Otherwise, replace it.

## Layout tells

| Tell | Instead |
|---|---|
| Centered hero: pill badge → giant headline → subtitle → two buttons → screenshot | Compose from the direction's layout system: asymmetric, editorial, product-led, or content-first. Let the hero do one thing. |
| Three feature cards with an icon in a tinted rounded square | Show the actual product, a comparison, a sequence, a single strong claim with proof, or a list with real detail. |
| Bento grid for everything | Use bento only when items are truly heterogeneous and comparable in importance. |
| Identical section rhythm (same padding, same centered heading + grid, repeated 8×) | Vary density and composition by content: a full-bleed moment, a tight list, a quote set in display type. |
| Logo cloud in grayscale right after the hero, by reflex | Social proof where it supports a decision, with specifics (numbers, named results). |
| Pricing: three cards, middle one "Most popular" and scaled up | Design around how this client actually sells; consider a table, a calculator, or a single plan explained well. |
| FAQ accordion + giant CTA band + four-column footer as default ending | End with what the user needs next. |

## Visual tells

| Tell | Instead |
|---|---|
| Purple-to-blue (or teal-to-violet) gradients, gradient text headlines | Color strategy from the direction; gradients only if they come from the brand or imagery. |
| Glassmorphism, frosted cards on blurry blobs | A deliberate depth model (borders, tonal layers, one elevation). |
| Inter / Geist / system-ui as the whole identity | A type pairing chosen for the brand voice; system fonts only as a deliberate utilitarian choice. |
| Same 8–12px radius and soft shadow on every element | Shape language by role (e.g. sharp containers, round controls) defined in tokens. |
| Pure #000 on #fff or gray text on colored backgrounds | Tinted neutrals derived from the palette; contrast-checked text roles. |
| Emoji or generic line icons as decoration (sparkles, rockets, lightning) | Icons only where they aid scanning; custom or consistent set; no decorative emoji. |
| Abstract 3D blobs, mesh gradients, random stock "team laughing at laptop" | Real product, real people, purposeful illustration with a specified style, or typography. |
| Dark mode with neon accents as "premium" | Premium comes from restraint, typography and spacing — in either theme. |
| Over-animated: everything fades up on scroll, bouncy hover scales | Motion with purpose (`sumi-design:motion`): feedback, continuity, hierarchy. |
| Dribbble-style dashboards: donut charts, random sparkline cards, fake KPIs | Show the data the user needs to decide, in the most legible form. |

## Copy tells

- "Unlock", "Elevate", "Seamless", "Supercharge", "Empower", "Revolutionize", "Next-generation", "All-in-one", "Effortlessly", "Your ultimate…", "Say goodbye to…".
- Triplets by reflex ("Fast. Simple. Powerful.").
- Headlines that could describe any product. Test: swap in a competitor's name — if it still works, rewrite.
- Fake testimonials and invented stats. Use real ones or leave a clearly marked placeholder for the client.
- Exclamation marks and emoji in UI copy; buttons labelled "Get started" everywhere. Buttons say what happens ("Book a fitting", "See the menu").

## Engineering tells that show up visually

- Placeholder content shipped (lorem, "Feature one", gray boxes).
- Inconsistent spacing values; elements almost aligned.
- Icons from three different sets; mismatched stroke widths.
- Hover states without focus states; cursor pointer on non-interactive things.
- Images stretched or cropped through faces; text over images without a contrast treatment.

## Quick self-test before showing any design

1. Could this be a template for any company in another industry? → not done.
2. Name the signature element. If you can't, there isn't one.
3. Point to where every font, color and radius comes from in DESIGN.md.
4. Read the headline with a competitor's name. Still true? Rewrite.
5. Squint: is there a clear hierarchy and one focal point per view?
6. Keyboard through it: visible focus everywhere?
