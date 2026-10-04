---
name: react-components
description: React 19 component design - composition over configuration, hooks rules, when NOT to use useEffect, useActionState/useOptimistic/useFormStatus/use(), ref as a prop, React Compiler implications (no manual memo spam), state colocation, controlled vs uncontrolled forms, accessible headless primitives (Radix, React Aria) vs hand-rolled widgets, typed props. Use when writing or reviewing *.tsx/*.jsx components, custom hooks (use*.ts), forms, context providers, component APIs or design-system primitives in components/**, or when refactoring large components or effect-heavy code.
---

# React components (React 19)

Target: React 19.2, TypeScript strict, React Compiler enabled where possible. Styling via Tailwind with tokens from `DESIGN.md` (`sumi:css-architecture`). Effect decision table and refactors: `references/effects.md`.

## Principles

1. **A component does one job.** If you need "and" to describe it, split it. ~150 lines is a review trigger, not a target.
2. **Compose, don't configure.** Prefer `children` and slots over boolean/prop explosions.
3. **Derive, don't sync.** Anything computable from props/state is computed during render.
4. **State lives as low as possible, as high as necessary.** Lift only to the nearest common owner; prefer URL state for shareable UI state (filters, tabs, pagination).
5. **Semantics first.** Native elements before ARIA; proven headless primitives before hand-rolled widgets (`sumi:a11y`).
6. **Let the compiler optimize.** Write plain code; profile before memoizing.

## Composition over configuration

DON'T:
```tsx
<Card title="Plan" subtitle="Pro" showIcon iconPosition="left" footerButtons={[...]} variant="highlight" />
```

DO:
```tsx
<Card tone="highlight">
  <Card.Header>
    <Card.Title>Plan</Card.Title>
    <Card.Description>Pro</Card.Description>
  </Card.Header>
  <Card.Footer><Button>Upgrade</Button></Card.Footer>
</Card>
```

- Variants via a typed map (`cva` or a plain `Record<Variant, string>`), not ad-hoc ternaries in `className`. Merge with `cn()` (clsx + tailwind-merge).
- Accept `className` and spread remaining native props on the root element so consumers can extend.
- Type props from the element: `ComponentProps<'button'> & { tone?: Tone }`. No `any`, no `React.FC` (`sumi:js-ts`).
- Polymorphism: prefer an `asChild` slot (Radix `Slot`) over generic `as` props with complex typing.

## Refs (React 19)

`ref` is a regular prop for function components. Do not use `forwardRef` in new code.

```tsx
export function Input({ ref, className, ...props }: ComponentProps<'input'>) {
  return <input ref={ref} className={cn('input', className)} {...props} />;
}
```

Ref callbacks may return a cleanup function. Use refs for DOM access and imperative escape hatches, not for state that renders.

## Effects: you probably don't need one

`useEffect` is for **synchronizing with an external system** (DOM APIs, subscriptions, non-React widgets, network connections). Not for:

| Instead of an effect to... | Do this |
|---|---|
| Derive state from props/state | Compute in render (`const total = items.reduce(...)`) |
| React to a user action | Put the logic in the event handler |
| Reset state when a prop changes | `key={id}` on the component |
| Fetch initial data | Server Component, or `use(promise)`; TanStack Query for client-driven data |
| Notify parent of a change | Call the parent callback in the same handler |
| Subscribe to an external store | `useSyncExternalStore` |
| Read latest props inside an effect without re-subscribing | `useEffectEvent` (19.2) |

DON'T:
```tsx
const [fullName, setFullName] = useState('');
useEffect(() => setFullName(`${first} ${last}`), [first, last]);
```
DO:
```tsx
const fullName = `${first} ${last}`;
```

Every effect that remains: correct dependency list (no lint suppression), cleanup for subscriptions/timers/listeners, idempotent under Strict Mode double-invoke.

## Hooks rules

- Call hooks at the top level, unconditionally. Exception: `use()` may be called conditionally.
- Custom hooks encapsulate a reusable *behavior* (`useMediaQuery`, `useDebouncedValue`), not "move code out of the component". A hook that only wraps one `useState` is noise.
- Name hooks `useX`; return tuples for 2 values, objects beyond that.

## Forms and actions

- Default to **uncontrolled** inputs + `<form action={fn}>` + `FormData`. Works before hydration, no state per keystroke.
- Controlled inputs only when the UI reacts to every keystroke (live formatting, dependent fields, instant search).
- `useActionState(action, initial)` -> `[state, formAction, isPending]` for results and errors.
- `useFormStatus()` inside a child of the form for pending UI.
- `useOptimistic` for instant feedback; the server result reconciles it.
- Large client-side forms with complex validation: React Hook Form + zod resolver is acceptable; still submit through a Server Action.
- Every input has a visible `<label>`; errors linked via `aria-describedby`; `aria-invalid` on failure; status messages in a polite live region. Full example: the `next-data-caching` skill, `references/server-actions.md` (in this plugin: `${CLAUDE_PLUGIN_ROOT}/skills/next-data-caching/references/server-actions.md`).

## use() and Suspense

- `use(promise)` unwraps a promise created on the server (passed as a prop) or a cached one. Never create the promise during client render - it will be new every render.
- `use(Context)` replaces `useContext` and can be conditional.
- Pair with `<Suspense>` and an error boundary at a meaningful level.

## React Compiler

- With the compiler on (`reactCompiler: true` in `next.config`, verify flag location for your version), components and hooks are memoized automatically.
- Do not add `useMemo`, `useCallback` or `memo` by reflex. Keep them only where the profiler proves a cost, or where referential identity is a contract (e.g. effect deps of a third-party hook) - comment why.
- The compiler requires the Rules of React: no mutating props/state, no reading refs during render, pure render. Run `eslint-plugin-react-hooks` (recommended config includes compiler rules) and fix, do not suppress.
- `'use no memo'` opts a component out temporarily; leave a TODO with the reason.

## State and context

- Server state is not client state: data from the server stays in Server Components or a query cache, not copied into `useState`.
- Context is for low-frequency, widely needed values (theme, session, locale). Split contexts by update frequency. Do not use one global context as a store.
- Prop drilling 2 levels is fine. Beyond that: composition (pass the rendered element as `children`) before context; a store (Zustand) only for genuinely shared, high-frequency client state.
- `useReducer` when state transitions are related and named; a discriminated union for status (`idle | loading | success | error`) instead of multiple booleans.

## Accessible primitives

- Use Radix UI, React Aria Components or Base UI for dialog, popover, menu, combobox, tabs, tooltip, select, slider. Style them with tokens.
- Hand-roll only trivial widgets (disclosure via `<details>`/button + `aria-expanded`). Never a `div` with `onClick`: use `<button>`; links navigate, buttons act.
- Verify: focus trap and return in dialogs, Escape closes, roving focus in menus/tabs, visible focus ring (2.4.7/2.4.11), target size >= 24px (2.5.8). See `sumi:a11y`.

## Lists and keys

- Keys are stable IDs from data, never array index for reorderable/filterable lists, never `Math.random()`.
- Empty, loading and error states are part of the component contract, not afterthoughts.

## AI slop tells

- `useEffect` + `setState` to derive values or "sync" props into state.
- `useMemo`/`useCallback` around every value and handler; `memo()` on every component.
- `forwardRef` in new React 19 code; `React.FC<Props>`; `props: any`.
- 400-line components mixing fetching, formatting, layout and modals.
- Ten boolean props (`isPrimary`, `isLarge`, `hasIcon`...) instead of variants/composition.
- `<div onClick>` buttons, placeholder-as-label, icon buttons without accessible names.
- `isLoading`, `isError`, `isSuccess` booleans that can contradict each other.
- Hard-coded colors/spacing instead of `DESIGN.md` tokens.
- `// eslint-disable-next-line react-hooks/exhaustive-deps`.

## Done checklist

- [ ] No effect that derives state, handles an event, or fetches initial data.
- [ ] No unjustified `useMemo`/`useCallback`/`memo`; lint clean with hooks/compiler rules.
- [ ] Props typed from native elements; no `any`; `className` and rest props forwarded.
- [ ] Interactive widgets built on native elements or a headless primitive; keyboard and screen-reader checked.
- [ ] Forms: labels, linked errors, pending state, live status; work without JS where feasible.
- [ ] State colocated; URL state for shareable UI; no copied server state.
- [ ] Styles use tokens; no magic values.
