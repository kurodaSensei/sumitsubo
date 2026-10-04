---
name: nuxt-architecture
description: Structure and conventions for Nuxt 4 (and late Nuxt 3) apps - app/ srcDir, shared/ and server/ boundaries, layers, auto-import discipline, composables vs utils vs Pinia stores, Nitro server routes, runtimeConfig, routeRules hybrid rendering, error handling and end-to-end typing. Use when creating or reorganizing a Nuxt project, adding pages/composables/stores/server routes, or editing nuxt.config.ts, app.config.ts, app/**, server/**, shared/**, layers/**, middleware or plugins.
---

# Nuxt Architecture

Nuxt gives you a lot for free. The job is to keep that free stuff from becoming an implicit, untyped,
everything-imports-everything ball of mud. Structure follows *where code runs* (client, server, both)
and *who owns state* (component, page, app).

## Core principles

1. **Runtime boundary is the primary axis.** `app/` runs in the browser and during SSR. `server/` runs
   only in Nitro. `shared/` is pure, isomorphic code (types, schemas, pure functions) usable by both.
   Never import from `server/` into `app/` or the reverse.
2. **Smallest owner wins.** State lives in the component until two siblings need it, then in a
   composable/page, then `useState`, and only then in a Pinia store.
3. **Auto-imports are a convenience, not an architecture.** Only `composables/`, `utils/` and
   `components/` are auto-scanned. Do not widen `imports.dirs` to every folder.
4. **Typed end to end.** Server handlers return typed data, `$fetch`/`useFetch` infer it, validation
   schemas in `shared/` are the single source of truth for shapes. No `any`, no `as unknown as`.
5. **Render mode is a per-route decision** made in `routeRules`, not a global default left on autopilot.

## Directory layout (Nuxt 4)

```
app/
  assets/ components/ composables/ layouts/ middleware/ pages/ plugins/ utils/
  app.vue  app.config.ts  error.vue
server/
  api/        # /api/* handlers
  routes/     # non-/api endpoints (sitemap, webhooks, feeds)
  middleware/ # Nitro middleware (runs on every request - keep tiny)
  utils/      # server-only helpers, auto-imported inside server/
shared/
  types/  utils/  schemas/   # isomorphic; auto-imported in app and server (verify per version)
layers/       # local layers auto-registered from ~/layers (Nuxt 3.12+/4)
nuxt.config.ts
```

Group by feature *inside* these folders once a domain has 4+ files: `components/booking/`,
`composables/booking/` (component names become `BookingCalendar`). Do not invent a parallel
`src/features/` tree that fights Nuxt's conventions. See `references/layout-and-layers.md`.

## What goes where

| Kind | Folder | Rule |
| --- | --- | --- |
| Pure function, no Vue/Nuxt context | `shared/utils` or `app/utils` | Unit-testable without mounting anything |
| Reactive logic using `ref`/`useFetch`/`useRoute` | `app/composables` | Name `useX`, returns refs + functions, call only in setup/plugins/middleware |
| Cross-page client state (cart, session UI, wizard spanning routes) | Pinia store | Setup-store syntax, one domain per store |
| Request-scoped SSR-safe shared value | `useState('key')` | Never module-level `ref()` |
| Secrets, third-party API calls, DB admin access | `server/` | Exposed via `/api/*` with validation |
| Types/schemas both sides use | `shared/` | No imports from `#app`, `h3`, or DOM |

**DON'T** put module-level reactive state in a composable file:

```ts
// BAD: shared across every SSR request -> cross-user data leak
const user = ref<User | null>(null)
export const useUser = () => user
```

**DO** use `useState` (request-scoped on the server, hydrated on the client):

```ts
export const useUser = () => useState<User | null>('user', () => null)
```

### Pinia: only when earned

Use Pinia when state is shared across routes *and* has actions/derived values worth centralizing.
A store wrapping a single `useFetch` is noise. Use setup stores, return everything you want
devtools/SSR to see, and never call `useRoute`/`useFetch` at store definition top level unless you
understand the injection context.

```ts
export const useCartStore = defineStore('cart', () => {
  const lines = ref<CartLine[]>([])
  const total = computed(() => lines.value.reduce((s, l) => s + l.qty * l.unitPrice, 0))
  function add(line: CartLine) { /* ... */ }
  return { lines, total, add }
})
```

## Server routes (Nitro)

- One file per method: `server/api/projects/[id].get.ts`, `[id].patch.ts`.
- Validate every input with a schema from `shared/schemas` (Zod/Valibot):
  `await readValidatedBody(event, ProjectPatch.parse)`, `getValidatedQuery`, `getValidatedRouterParams`.
- Throw `createError({ statusCode, statusMessage })` with a safe message; never leak stack traces or
  upstream error bodies. (h3 v2 may rename fields to `status`/`statusText` - verify against current docs.)
- Return plain serializable objects. Let inference flow to `useFetch('/api/projects/1')`.
- Use `defineCachedEventHandler` / `cachedFunction` for expensive, cacheable reads with an explicit
  `maxAge` and `getKey`.
- Server-only helpers (`requireUser(event)`, DB clients) live in `server/utils`.

```ts
// server/api/projects/[id].patch.ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { id } = await getValidatedRouterParams(event, IdParam.parse)
  const patch = await readValidatedBody(event, ProjectPatch.parse)
  return updateProject(user.uid, id, patch) // typed Project
})
```

## runtimeConfig vs app.config

- `runtimeConfig`: values that differ per environment, set via `NUXT_*` env vars at runtime.
  Top-level keys are server-only; `public` is shipped to the client. Never put secrets in `public`.
- `app.config.ts`: build-time, public, non-secret app settings (theme flags, nav). Reactive, typed.
- Never read `process.env` inside `app/` code. Inside `server/`, prefer `useRuntimeConfig(event)`.

```ts
runtimeConfig: {
  stripeSecret: '',            // NUXT_STRIPE_SECRET
  public: { siteUrl: '' },     // NUXT_PUBLIC_SITE_URL
},
```

## Rendering: routeRules

Decide per route and write it down:

```ts
routeRules: {
  '/':            { prerender: true },
  '/blog/**':     { isr: 3600 },          // CDN-cached, revalidated (platform support varies)
  '/products/**': { swr: 600 },
  '/app/**':      { ssr: false },          // authenticated dashboard, SPA is fine
  '/api/public/**': { cache: { maxAge: 300 }, cors: true },
  '/old-path':    { redirect: { to: '/new-path', statusCode: 301 } },
},
```

Marketing/content pages: prerender or ISR for LCP. Auth-only dashboards: `ssr: false` avoids
hydration complexity and auth-on-server plumbing. Data and SEO details: `nuxt-data-ssr`.

## Error handling

- Pages: `throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })`
  when data is missing, so the status code is correct for crawlers.
- `app/error.vue` renders full-page errors; offer `clearError({ redirect: '/' })`.
- `<NuxtErrorBoundary>` around risky islands (third-party widgets) so one failure does not blank the page.
- Composables return `{ data, error, status }`; components render the error state. No silent `catch {}`.
- Log server errors with context (route, user id), never PII payloads.

## Plugins and middleware

- Plugins run on every app boot: keep them few and fast. Use `.client.ts`/`.server.ts` suffixes and
  `parallel: true` when they are independent. No data fetching in plugins unless truly global.
- Route middleware: auth guards and redirects only. Named middleware via `definePageMeta`; avoid
  global middleware that fetches.

## Typing

- `nuxi typecheck` (vue-tsc) runs in CI. `strict: true`.
- Type `definePageMeta`, `useState<T>`, `useRuntimeConfig()` (augment if needed), `app.config` schema.
- Infer server response types; never re-declare the same interface on the client. See `sumi:js-ts`.

## Anti-patterns (AI slop tells)

- `src/`-style re-architecture, `services/`, `helpers/`, `lib/`, `managers/` folders all doing the same thing.
- Adding every folder to `imports.dirs` "for convenience"; mystery globals nobody can trace.
- A Pinia store per page, each wrapping one fetch.
- Module-level `ref()` in composables (SSR state leak).
- Secrets in `runtimeConfig.public` or `process.env.X` in components.
- Server handlers with no validation, returning `any`, catching errors and returning `{ success: false }` with 200.
- Global `ssr: false` because one component touched `window`.
- Barrel `index.ts` files re-exporting auto-imported code.
- Plugins that `await $fetch(...)` on every page load.

## Done checklist

- [ ] Code sits in the correct runtime folder (`app/`, `server/`, `shared/`); no cross imports.
- [ ] No module-level reactive state; shared state uses `useState` or a justified Pinia store.
- [ ] Every server route validates input with a shared schema and returns typed data.
- [ ] Secrets only in private `runtimeConfig`; nothing secret in `public` or `app.config`.
- [ ] `routeRules` declares the render strategy for each route group.
- [ ] Missing data throws `createError` with the right status; `error.vue` exists.
- [ ] `nuxi typecheck` passes with `strict`, zero `any`.
- [ ] New dependency or layer justified; bundle impact checked (`sumi:performance`).
