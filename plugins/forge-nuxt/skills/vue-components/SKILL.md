---
name: vue-components
description: Writing Vue 3.5+ components with <script setup lang="ts"> - typed defineProps/defineEmits/defineModel/defineSlots, reactivity correctness (destructuring, shallowRef, computed over watch), provide/inject, component size and responsibility, accessible headless patterns. Use when creating, refactoring or reviewing any *.vue file or a component-level composable, or when fixing reactivity bugs, prop drilling, or oversized components.
---

# Vue Components

A good Vue component is small, typed, derives instead of synchronizes, and is accessible by default.
Most bugs in Vue codebases come from copying React mental models (effects everywhere) or from
losing reactivity while trying to be clever.

## Core principles

1. **Derive, don't sync.** If a value can be computed from other state, it is a `computed`, never a
   `ref` updated by a `watch`.
2. **One responsibility per component.** Data loading, layout, and interaction widgets are separate
   concerns. A page orchestrates; leaf components render props and emit intent.
3. **Types are the API.** Props, emits, models and slots are typed with TS generics. No runtime
   object syntax, no `any`, no `PropType` gymnastics.
4. **Semantic HTML first, ARIA second.** A `<button>` beats `<div role="button" tabindex="0">`.
   Accessibility rules: `forge-core:a11y`.
5. **Props down, events up, inject for genuinely ambient context.** Not a global store for everything.

## Component skeleton

```vue
<script setup lang="ts">
type Size = 'sm' | 'md' | 'lg'

const { label, size = 'md', disabled = false } = defineProps<{
  label: string
  size?: Size
  disabled?: boolean
}>()

const emit = defineEmits<{ select: [id: string] }>()
const open = defineModel<boolean>('open', { default: false })

defineSlots<{ default(): any; icon?(props: { size: Size }): any }>()
</script>
```

Order inside `<script setup>`: types, props/emits/model/slots, injections, local state, computed,
functions, watchers (if any), lifecycle. Keep it readable top to bottom.

## Props and models

- Vue 3.5 reactive props destructure is safe: destructured props stay reactive *inside the template
  and computed/watch getters*. Passing `size` into a plain function call captures the current value;
  pass a getter `() => size` to composables instead.
- Use `defineModel` for two-way bindings instead of `modelValue` + `update:modelValue` boilerplate.
  Multiple models: `defineModel('open')`, `defineModel('query')`.
- Never mutate a prop. If you need a local editable copy (a form draft), copy explicitly and name it
  `draft`, with a clear reset/commit flow.
- Boolean props default to `false` and are named as adjectives (`disabled`, `loading`), not `isDisabled`.
- Prefer a discriminated union over a bag of optional booleans:
  `variant: 'primary' | 'ghost'` beats `primary?: boolean; ghost?: boolean`.

## Reactivity rules

```ts
// BAD: destructuring a reactive() / store loses reactivity
const { count } = useCounterStore()
// GOOD
const { count } = storeToRefs(useCounterStore())

// BAD: watch to keep derived state in sync
const fullName = ref('')
watch([first, last], () => { fullName.value = `${first.value} ${last.value}` })
// GOOD
const fullName = computed(() => `${first.value} ${last.value}`)

// Large immutable data (API lists, chart series, map features): avoid deep proxying
const rows = shallowRef<Row[]>([])
rows.value = await fetchRows()         // replace, don't mutate in place
```

- `ref` by default; `reactive` rarely (form objects you never destructure or reassign).
- `shallowRef` / `markRaw` for big lists, third-party instances (map, chart, editor), class instances.
- `watch` is for side effects tied to state changes (sync to URL, analytics, imperative APIs). Use
  `onWatcherCleanup` (3.5) or the `onCleanup` arg to cancel stale async work.
- `watchEffect` only for short effects whose dependencies are obvious; prefer explicit `watch` sources.
- `computed` must be pure: no fetching, no mutations, no `emit`.
- Template refs: `useTemplateRef<HTMLInputElement>('input')` (3.5).
- Stable ids for label/aria wiring: `useId()` (SSR-safe), never `Math.random()`.

## Composition: slots, provide/inject

- Use slots to let parents control rendering instead of adding props for every variation.
  Scoped slots expose data: `<slot name="row" :item="item" />`.
- Compound components (Tabs, Accordion, Menu) share state via `provide`/`inject` with a typed
  `InjectionKey`, and throw a clear error when used outside the parent:

```ts
// tabs-context.ts
export interface TabsContext { active: Ref<string>; select(id: string): void }
export const TabsKey: InjectionKey<TabsContext> = Symbol('Tabs')
export function useTabsContext() {
  const ctx = inject(TabsKey)
  if (!ctx) throw new Error('<TabsTab> must be used inside <Tabs>')
  return ctx
}
```

- Prop drilling more than two levels for the same value is the signal to use a slot or inject,
  not a Pinia store.

## Size and responsibility

- Target < 150 lines per SFC (template + script). Past ~250, split. A component with more than ~8
  props or several unrelated `v-if` branches is doing too much.
- Extract when a block has its own state or is reused; do not extract purely presentational 6-line
  fragments into separate files "for cleanliness".
- Move logic, not markup, into composables: `useCombobox()`, `useDisclosure()`, `usePagination()`.
- List items get a stable `:key` from data identity, never the index when the list can reorder.

## Accessible, headless patterns

Interactive widgets (combobox, dialog, menu, tabs, listbox) are hard to get right. Prefer a proven
headless library (Reka UI, or the project's existing one) styled with Tailwind, over hand-rolled
ARIA. If you hand-roll, follow the WAI-ARIA Authoring Practices pattern exactly: roles, states,
keyboard map, focus management, and test with keyboard + screen reader. Patterns and examples:
`references/patterns.md`.

Non-negotiables:
- Every input has a programmatic label. Error text linked via `aria-describedby`.
- Dialogs trap focus, restore focus on close, close on Escape, and use `<dialog>` or a library.
- Icon-only buttons have an accessible name. Decorative SVGs get `aria-hidden="true"`.
- Visible focus styles; never `outline: none` without a replacement.
- Respect `prefers-reduced-motion` in `<Transition>` usage.

## Anti-patterns (AI slop tells)

- `watch` + `ref` reproducing what one `computed` would do; `useEffect`-style "on mount, fetch,
  set state" instead of `useFetch`/`useAsyncData`.
- `deep: true` watchers on large objects to "be safe".
- `any` in props/emits, or runtime `props: { foo: Object }` with no type.
- 500-line SFCs mixing fetching, formatting, layout and modal logic.
- `<div @click>` as buttons, missing labels, `v-html` on user content.
- `index` as `:key` in sortable/filterable lists.
- Wrapping every primitive in a component (`<AppText>`, `<AppBox>`) with no behavior.
- Emitting events named `change`/`update` with an untyped payload instead of intent names (`select`, `remove`).
- Global event buses (`mitt`) for parent-child communication.
- `nextTick` sprinkled to "fix" timing bugs that are really derived-state bugs.

## Done checklist

- [ ] `<script setup lang="ts">`; props/emits/model/slots typed via generics; zero `any`.
- [ ] No derived state stored in refs; every `watch` is a genuine side effect with cleanup if async.
- [ ] Large/third-party data in `shallowRef`/`markRaw`.
- [ ] Component has one responsibility and fits the size budget; logic extracted to composables.
- [ ] Semantic elements, labels, keyboard support, visible focus (`forge-core:a11y`).
- [ ] Stable keys from data identity; ids from `useId()`.
- [ ] Styling uses tokens/utilities per `tailwind-craft`; no inline magic values.
