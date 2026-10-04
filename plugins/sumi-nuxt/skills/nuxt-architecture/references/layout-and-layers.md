# Layout, feature grouping and layers

## Feature grouping inside Nuxt conventions

Keep Nuxt's top-level folders and group by domain inside them:

```
app/components/booking/Calendar.vue        -> <BookingCalendar>
app/components/booking/SlotPicker.vue      -> <BookingSlotPicker>
app/composables/booking/useAvailability.ts -> auto-imported? only if nested scan enabled
app/pages/booking/[serviceId].vue
server/api/booking/slots.get.ts
shared/schemas/booking.ts
```

Nested composables are NOT auto-imported by default (only top-level files and `index.ts` in
subfolders). Options, in order of preference:

1. Keep composables flat with a domain prefix: `useBookingAvailability.ts`.
2. Explicit import from the nested path (clear provenance, fine for feature-private code).
3. Add a single scan pattern: `imports: { dirs: ['composables/**'] }` - only if the team agrees.

## When to use layers

A layer is a partial Nuxt app (its own `nuxt.config.ts`, components, composables, server routes)
merged into the host. Use one when:

- Several client sites share a base (auth, UI kit, analytics, legal pages). Publish as a git/npm layer
  and `extends: ['github:org/base-layer#v1.2.0']` - pin a tag, never a moving branch.
- A large app has clearly separable domains (admin vs storefront) and you want enforced boundaries.

Do not use a layer for one-off code organization in a small app; folders are enough.

Rules:
- Layers own their `runtimeConfig` defaults; the host overrides via env.
- Prefix layer components (`components: [{ path: './components', prefix: 'Base' }]`) to avoid
  name collisions and make provenance obvious.
- Resolve layer-relative paths with `fileURLToPath(new URL('./x', import.meta.url))`, never relative
  strings that break when consumed.
- Document the layer's public surface (components, composables, config keys) in its README.

## Composable shape

```ts
// app/composables/useProjectList.ts
export function useProjectList(filters: MaybeRefOrGetter<ProjectFilters>) {
  const query = computed(() => toValue(filters))
  const { data, status, error, refresh } = useFetch('/api/projects', {
    query,
    key: () => `projects:${JSON.stringify(query.value)}`, // reactive keys: verify support in your version
    default: () => [],
  })
  const isEmpty = computed(() => status.value === 'success' && data.value.length === 0)
  return { projects: data, status, error, isEmpty, refresh }
}
```

- Accept `MaybeRefOrGetter<T>` and normalize with `toValue`, so callers can pass a ref, getter or value.
- Return refs (not `reactive()`), so callers can destructure.
- No side effects at import time.

## Server utils pattern

```ts
// server/utils/auth.ts
export async function requireUser(event: H3Event) {
  const token = getHeader(event, 'authorization')?.replace(/^Bearer /, '')
  if (!token) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const decoded = await verifyIdToken(token) // firebase-admin, server-only
  return decoded
}
```

Server utils are auto-imported inside `server/` only. Keep firebase-admin and other heavy SDKs there.

## nuxt.config.ts baseline

```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',   // set when the project is created, bump deliberately
  future: { compatibilityVersion: 4 }, // only needed on Nuxt 3.x opting into v4 behavior
  devtools: { enabled: true },
  typescript: { strict: true, typeCheck: false }, // run vue-tsc in CI instead of dev
  modules: ['@nuxt/image', '@nuxt/fonts', '@pinia/nuxt'],
  routeRules: { /* per-route render strategy */ },
  runtimeConfig: { public: {} },
})
```

Every module added must earn its place: it ships code, adds build time and becomes a maintenance
dependency. Check it supports the current Nuxt major before installing.
