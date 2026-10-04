# DESIGN.md — <Project>

> Source of truth for every visual decision. Code uses these tokens only. Change this file first, then the code.

## 1. Direction
- Concept:
- Brand tensions:
- Signature element (where it appears):
- Motion personality:
- Anti-references: <short list>
- Taste dials (if used): DESIGN_VARIANCE <n> · MOTION_INTENSITY <n> · VISUAL_DENSITY <n>

## 2. Typography
| Role | Family (fallback stack) | Weights | Notes |
|---|---|---|---|
| Display | | | |
| Body | | | |
| UI / labels | | | |
| Mono / numerals | | | tabular-nums for prices and tables |

Loading: <self-hosted WOFF2, preload only above-the-fold files, metric-matched fallbacks>

Scale (fluid, ratio <r>):
| Token | Size (clamp) | Line height | Tracking |
|---|---|---|---|
| --text-display | | | |
| --text-h1 | | | |
| --text-h2 | | | |
| --text-h3 | | | |
| --text-body | | | |
| --text-small | | | |

## 3. Color
Primitives (OKLCH):
| Token | Value |
|---|---|
| | |

Roles:
| Role | Light | Dark |
|---|---|---|
| --color-surface | | |
| --color-surface-raised | | |
| --color-text | | |
| --color-text-muted | | |
| --color-border | | |
| --color-accent | | |
| --color-accent-contrast | | |
| --color-focus | | |
| --color-success / warning / danger / info | | |

Contrast (from contrast.mjs):
| Pair | Light | Dark | Min |
|---|---|---|---|
| text on surface | | | 4.5 |
| text-muted on surface | | | 4.5 |
| accent-contrast on accent | | | 4.5 |
| focus on surface | | | 3 |
| border on surface (UI boundary) | | | 3 |

## 4. Spacing
Scale: <e.g. 4, 8, 12, 16, 24, 32, 48, 64, 96, 128>
Layout: --space-section-block · --space-gutter · --space-stack-sm|md|lg

## 5. Shape & depth
| Token | Value | Used for |
|---|---|---|
| --radius-container | | |
| --radius-control | | |
| --radius-media | | |
| --border-width | | |
| --elevation-1 | | |

## 6. Layout
- Grid:
- Max widths: content <65ch>, wide <…>, full bleed rules
- Breakpoints:
- Container queries for:

## 7. Motion
| Token | Value |
|---|---|
| --motion-instant | 100ms |
| --motion-quick | 180ms |
| --motion-standard | 280ms |
| --ease-enter | cubic-bezier(…) |
| --ease-exit | cubic-bezier(…) |
| --ease-move | cubic-bezier(…) |
Reduced motion: <policy>

## 8. Iconography & imagery
- Icon set / stroke / sizes:
- Photography treatment / aspect ratios:
- Illustration style:

## 9. Accessibility rules
- Focus ring: <width, offset, color token>
- Minimum target: 24×24 (44×44 on touch-first UI)
- Contrast minimums: as section 3
- Motion limits: as section 7

## 10. Components
| Component | Variants | Tokens used | Notes |
|---|---|---|---|
| Button | primary, secondary, ghost | | |

## Changelog
- <yyyy-mm-dd> Direction approved.
