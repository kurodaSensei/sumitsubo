# Vue component patterns (extended)

## Generic components

```vue
<script setup lang="ts" generic="T extends { id: string }">
const { items, selectedId } = defineProps<{ items: T[]; selectedId?: string }>()
const emit = defineEmits<{ select: [item: T] }>()
defineSlots<{ item(props: { item: T; selected: boolean }): any }>()
</script>

<template>
  <ul role="listbox" :aria-activedescendant="selectedId ? `opt-${selectedId}` : undefined">
    <li
      v-for="item in items"
      :id="`opt-${item.id}`"
      :key="item.id"
      role="option"
      :aria-selected="item.id === selectedId"
      @click="emit('select', item)"
    >
      <slot name="item" :item="item" :selected="item.id === selectedId" />
    </li>
  </ul>
</template>
```

Note: a real listbox also needs keyboard navigation (arrow keys, Home/End, typeahead) and focus
management. Prefer a headless library unless you implement and test the full pattern.

## Disclosure composable (logic without markup)

```ts
export function useDisclosure(initial = false) {
  const open = ref(initial)
  const id = useId()
  const triggerProps = computed(() => ({
    'aria-expanded': open.value,
    'aria-controls': id,
    onClick: () => { open.value = !open.value },
  }))
  const panelProps = computed(() => ({ id, hidden: !open.value }))
  return { open, triggerProps, panelProps }
}
```

```vue
<button type="button" v-bind="triggerProps">Details</button>
<div v-bind="panelProps">...</div>
```

## Async side effect with cancellation

```ts
const query = defineModel<string>('query', { default: '' })
const results = shallowRef<Result[]>([])

watch(query, async (q) => {
  if (q.length < 2) { results.value = []; return }
  const controller = new AbortController()
  onWatcherCleanup(() => controller.abort())
  results.value = await $fetch('/api/search', { query: { q }, signal: controller.signal })
})
```

Vue has no built-in debounce option. For debounced search use `watchDebounced` from VueUse; the
snippet above shows cancellation only.

## Form draft pattern

```ts
const { project } = defineProps<{ project: Project }>()
const emit = defineEmits<{ save: [patch: ProjectPatch]; cancel: [] }>()

const draft = ref<ProjectPatch>({ name: project.name, budget: project.budget })
const dirty = computed(() =>
  draft.value.name !== project.name || draft.value.budget !== project.budget)

watch(() => project.id, () => {          // reset only when the entity changes
  draft.value = { name: project.name, budget: project.budget }
})
```

This is one of the few legitimate prop-to-ref copies: it is explicit, named, and resets on identity change.

## Accessible form field

```vue
<script setup lang="ts">
const { label, error, hint } = defineProps<{ label: string; error?: string; hint?: string }>()
const value = defineModel<string>({ required: true })
const id = useId()
const describedBy = computed(() =>
  [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div>
    <label :for="id">{{ label }}</label>
    <input :id="id" v-model="value" :aria-invalid="!!error" :aria-describedby="describedBy" />
    <p v-if="hint" :id="`${id}-hint`">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`">{{ error }}</p>
  </div>
</template>
```

## Splitting a giant component

Signs: many `v-if` modes, more than one fetch, a modal and a table in the same file, a `methods`
section longer than the template.

Steps:
1. Identify state owners: which state does each region need? Draw it.
2. Extract leaf presentational components first (props in, emits out).
3. Extract logic into composables (`useProjectFilters`, `useBulkSelection`).
4. The original becomes an orchestrator: fetches, wires composables, passes props.
5. Verify no behavior change (tests or a manual keyboard + screen reader pass).

## Lazy and async components

- Prefix with `Lazy` in Nuxt (`<LazyChartPanel v-if="showChart" />`) to code-split heavy, below-fold
  or conditional components.
- Nuxt supports lazy hydration strategies on `Lazy*` components (e.g. `hydrate-on-visible`,
  `hydrate-on-idle`); verify availability for your Nuxt version before relying on it.
- `defineAsyncComponent` with `loadingComponent`/`errorComponent` outside Nuxt auto-imports.
