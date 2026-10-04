---
title: <Feature name>
status: active        # active | blocked | done
created: <yyyy-mm-dd>
risk: medium          # low | medium | high
delivery: single      # single | chained-prs | slices-to-main
---

# <Feature name>

## Goal
<One paragraph: what we are building and the outcome for the user/client.>

## Why
<The problem it solves. Business or user reason.>

## Scope
- <In scope item>

## Non-goals (do NOT build)
- <Explicitly excluded item — guards against over-engineering>

## Constraints
- <Stack versions, budgets, deadlines, browser support, a11y level, performance budget>

## Decisions
| # | Decision | Why | Date |
|---|---|---|---|
| 1 | | | |

## Plan
Line forecast: <~N changed lines> → <single slice | N slices>

### Phase 1 — <name>
- [ ] 1.1 <task> — evidence:
- [ ] 1.2 <task> — evidence:

### Phase 2 — <name>
- [ ] 2.1 <task> — evidence:

## Acceptance criteria
- [ ] <Checkable criterion: command, test, metric or screenshot>
- [ ] Accessibility: axe reports 0 serious/critical issues on affected views; full keyboard path works
- [ ] Performance (lab, mid-tier mobile): LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms as the INP proxy (INP ≤ 200 ms is verified in field data or a Lighthouse timespan run)

## Process log
- <yyyy-mm-dd> Created. <Initial findings>

## Evidence
- <task id>: <command + result | screenshot path | metric>

## Follow-ups (out of scope, noted for later)
-
