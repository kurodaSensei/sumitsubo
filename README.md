# Sumitsubo

> **Sumitsubo** (墨壺) is the Japanese carpenter's ink line: it marks the true line before any cut is made. This framework does the same — direction first, then the work. Short name and command prefix: **sumi** (墨, ink).

An opinionated AI framework for web design and development with **Claude Code**. It encodes how a senior design engineer works: process that scales with the request, code quality without slop, accessibility and performance as acceptance criteria, and — above all — **design that doesn't look like every other AI-generated site**.

## What's inside

| Plugin | What it gives you |
|---|---|
| `sumi` | Adaptive workflow (T0 direct → T1 delegated → T2 feature file), ~400-line slice budget, risk gates, receipt-based reviews with context-free lenses (correctness, a11y, performance, security), standards for HTML, CSS, JS/TS, a11y (WCAG 2.2 AA) and performance (Core Web Vitals), git and secret guard hooks. |
| `sumi-design` | Creative-direction process (brief → anti-references → three divergent directions → DESIGN.md), anti-slop catalog, cross-project **design ledger** so you never repeat fonts/palettes/layouts across clients, token system with contrast checker, motion rules, design lens, Claude Design bridge. Orchestrates Impeccable, Taste and Emil Kowalski's skills. |
| `sumi-nuxt` | Nuxt 4 + Vue 3.5 + Firebase/Firestore + Tailwind v4. |
| `sumi-react` | React 19 + Next.js App Router, caching, Server Actions, testing. |
| `sumi-shopify` | Online Store 2.0 themes: Liquid, sections/blocks, storefront JS, performance and e-commerce a11y. |
| `sumi-wordpress` | Native block themes (Gutenberg/FSE), no build: theme.json design system, templates and patterns, dynamic blocks with plain-JS editors, core APIs over plugins, token audits. |

## Install

```bash
# in Claude Code
/plugin marketplace add <github-user>/sumitsubo        # or a local path: /plugin marketplace add ~/AI\ Setup/sumitsubo
/plugin install sumi-design@sumitsubo                  # installs sumi + all companions as dependencies
/plugin install sumi-nuxt@sumitsubo                    # plus the stack packs you use
```

Then, in each project:

```
/sumi:init            # detect stack, write the managed CLAUDE.md block, create .sumi/
/sumi-design:deps          # verify companions and find leftover duplicates
/sumi-design:direction     # new UI project: brief → 3 directions → DESIGN.md
/sumi:feature <idea>  # large work: single feature file with criteria and evidence
/sumi:review          # review the current slice with context-free lenses
/sumi:ship            # final gate and PR draft
```

## Companions

Installing `sumi` and `sumi-design` also installs, as dependencies, curated pieces of Impeccable, Ponytail, Taste, Emil Kowalski's skills and Superpowers, referenced from their upstream repos (see [THIRD-PARTY.md](THIRD-PARTY.md)). Sumitsubo decides when each one is used; the full install adds about 6k tokens of always-on context.

## Principles

1. **Process must be justified.** Trivial requests are done directly; uncertainty is refuted with evidence before asking; large work gets one organic feature file, not a pile of specs.
2. **Small houses, not Eiffel towers.** ~400 changed lines per slice; the best solution within the constraint.
3. **Done means verified.** Every task needs evidence: tests run, axe results, Lighthouse numbers, screenshots.
4. **Fresh eyes.** Reviews run in subagents that see the diff and a factual lineage, never the author's reasoning.
5. **Nothing visual by default.** Every font, color, radius and animation traces back to DESIGN.md, which comes from a deliberate direction, checked against your own past work.
6. **Deterministic where possible.** Hooks and scripts (git guards, secret scan, ledger, contrast) do what should never depend on a model's mood.

## Repository layout

```
.claude-plugin/marketplace.json
plugins/<plugin>/
  .claude-plugin/plugin.json
  skills/<skill>/SKILL.md (+ references/, scripts/)
  agents/*.md      commands/*.md      hooks/hooks.json      templates/
scripts/validate.mjs
docs/GUIA.md (Spanish guide)   docs/ARCHITECTURE.md
```

## Development

```bash
node scripts/validate.mjs           # structure, frontmatter, references
claude plugin validate .            # official marketplace validation
claude plugin validate --strict plugins/sumi
```

## Credits

Concepts inspired by Gentle AI (Gentleman Programming). Design companions are separate projects with their own licenses — see [THIRD-PARTY.md](THIRD-PARTY.md). Sumitsubo itself is MIT licensed.
