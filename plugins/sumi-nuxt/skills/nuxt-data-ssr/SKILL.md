---
name: nuxt-data-ssr
description: Data fetching, SSR and hydration safety, and delivery performance in Nuxt 4 - useFetch/useAsyncData keys and options, $fetch vs useFetch, hydration mismatch prevention (client-only APIs, dates, randomness, locale), payload size, useState, caching, lazy loading and lazy hydration, SEO with useSeoMeta, @nuxt/image, @nuxt/fonts and Core Web Vitals budgets. Use when a *.vue page or composable loads data, when you see hydration mismatch warnings, slow LCP/INP/CLS, large _payload, or when touching SEO meta, images or fonts.
---

# Nuxt Data, SSR and Performance

SSR renders HTML on the server, serializes the data into a payload, and the client hydrates the same
tree. Every rule here protects one of three things: **the server and client render identical HTML**,
**data is fetched once (not twice)**, and **the user gets meaningful pixels fast**.

## Core principles

1. **Fetch in setup with `useFetch`/`useAsyncData`**, so data is fetched on the server and
   transferred in the payload. Raw `$fetch` in setup double-fetches (server, then client again).
2. **Every async data call has a deliberate key.** Same key = shared, deduplicated data across
   components (Nuxt 4 singleton data layer). Different data must never share a key.
3. **Ship only what the page renders.** Trim with `pick`/`transform` or a dedicated server endpoint.
4. **Render deterministic markup.** No time, randomness, locale or browser state in SSR output.
5. **Measure against budgets**, not vibes: LCP < 2.5s, INP < 200ms, CLS < 0.1 on a mid-range mobile
   (`sumi:performance`).

## Choosing the primitive

| Need | Use |
| --- | --- |
| Data needed for initial render, from your API | `useFetch('/api/x')` |
| Data from an SDK/function (Firestore, CMS client) | `useAsyncData('key', () => fn())` |
| User-triggered action (submit, delete, load more) | `$fetch` in an event handler |
| Non-critical data (below fold, recommendations) | `lazy: true` (+ `server: false` if not SEO-relevant) |
| Run something once per request across components | `callOnce` (verify behavior for your version) |
| Request-scoped shared value | `useState('key', init)` |

```ts
// GOOD: typed, keyed, trimmed, with explicit states
const route = useRoute()
const { data: project, status, error } = await useFetch(`/api/projects/${route.params.id}`, {
  pick: ['id', 'name', 'status', 'updatedAt'],
})
if (error.value?.statusCode === 404) throw createError({ statusCode: 404, fatal: true })
```

```ts
// BAD: double fetch, untyped, no error state
const project = ref<any>(null)
onMounted(async () => { project.value = await $fetch(`/api/projects/${id}`) })
```

### Key and option rules

- `useFetch` derives a key from URL + options. With `useAsyncData`, always pass an explicit key that
  encodes every input: `` `project:${id}` ``, `` `projects:${page}:${sort}` ``.
- Reactive params: pass refs/getters in `query`/URL so it refetches automatically. Do not add a
  `watch` that calls `refresh()` for the same thing.
- Nuxt 4 defaults: `data` is a `shallowRef` (set `deep: true` only if you mutate nested fields), and
  the empty value is `undefined`. Use `default: () => []` for list shapes.
- Use `status` (`idle | pending | success | error`) for UI states, not ad-hoc `loading` refs.
- `getCachedData` controls reuse of payload/static data across navigations; use it to avoid refetching
  stable data on client navigation. `refreshNuxtData(key)` / `clearNuxtData(key)` to invalidate.
- Never `await` multiple independent `useFetch` calls in sequence when they can run in parallel;
  combine with `Promise.all` inside one `useAsyncData`, or make the secondary ones `lazy`.

## Hydration mismatches

Root causes and fixes (full catalog in `references/hydration.md`):

| Cause | Fix |
| --- | --- |
| `window`, `localStorage`, `matchMedia` read during setup | Read in `onMounted`, or wrap in `<ClientOnly>` with a same-size fallback |
| `new Date()`, `Date.now()`, relative time ("3 min ago") | Format from a server-provided timestamp with a fixed timezone; render relative time after mount |
| `Math.random()`, `crypto.randomUUID()` for ids | `useId()` |
| `toLocaleString()` without explicit locale/timezone | `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })` with explicit args |
| Auth-dependent markup when server has no session | Forward auth (cookie) to the server, or render that region client-only with a skeleton |
| Invalid HTML nesting (`<div>` in `<p>`, `<a>` in `<a>`) | Fix the markup; the browser rewrites it and Vue sees a mismatch |
| Theme/dark mode from localStorage | Cookie-based preference or `@nuxtjs/color-mode`, which injects a pre-hydration script |

Never silence mismatches with `<ClientOnly>` around large page sections; that throws away SSR for
SEO and LCP. Use it for small, genuinely client-only islands and give it a `#fallback` of equal size
to avoid CLS.

## Payload and bundle size

- Inspect `/_payload.json` or `window.__NUXT__` on heavy pages; if it is larger than the HTML that
  renders it, you are shipping unused data. Use `pick`, `transform`, or a purpose-built endpoint.
- Never put secrets or internal fields in data returned to `useFetch`; payload is public.
- Non-serializable values (class instances, Firestore `Timestamp`, `Map`) need conversion in
  `transform` or a custom payload reducer.
- Code-split heavy components with `Lazy*` + `v-if`; consider lazy hydration (`hydrate-on-visible`,
  `hydrate-on-interaction`) for below-fold interactive islands (verify for your Nuxt version).
- Third-party scripts via `@nuxt/scripts` or deferred loading; never synchronous in `<head>`.
- Analyze with `nuxi analyze`. Every dependency over ~20 kB gzipped needs a reason.

## Caching layers

1. **routeRules** (`prerender`, `isr`, `swr`, `cache`) for whole responses at the edge/server.
2. **`defineCachedEventHandler` / `cachedFunction`** in Nitro for expensive upstream calls.
3. **Payload reuse** on the client via `getCachedData` for navigation.
4. **HTTP cache headers** on static assets (Nuxt hashes them; keep immutable caching).
Pick the outermost layer that is correct for the data's freshness needs. Authenticated, per-user data
is never cached at a shared layer.

## SEO and meta

```ts
useSeoMeta({
  title: () => project.value?.name ?? 'Project',
  description: () => project.value?.summary,
  ogTitle: () => project.value?.name,
  ogImage: () => project.value?.coverUrl,
  twitterCard: 'summary_large_image',
})
```

- `useSeoMeta` (typed) over raw `useHead({ meta })`. Use getters for reactive values.
- Set `app.head.htmlAttrs.lang` and a title template once. Canonical URLs via `useHead({ link })`.
- Correct status codes for missing content (`createError` 404) so pages are not soft-404s.
- Structured data (JSON-LD) only when it reflects visible content; consider `nuxt-schema-org`.

## Images and fonts

- `@nuxt/image`: `<NuxtImg>`/`<NuxtPicture>` with `width`/`height` (or aspect-ratio) to prevent CLS,
  `sizes` for responsive srcset, `<NuxtPicture format="avif,webp">` when you need multiple formats (`<NuxtImg>` takes a single `format`).
- The LCP image: `loading="eager"`, `fetchpriority="high"`, `preload`; never lazy-load it.
  Everything below the fold: `loading="lazy"`.
- `@nuxt/fonts`: self-hosted, subsetted, `font-display: swap`, with metric-matched fallbacks to reduce
  CLS. Limit families and weights (two families, three or four weights total is a reasonable cap).
- Font and image choices come from `DESIGN.md` tokens; do not introduce new families ad hoc.

## Anti-patterns (AI slop tells)

- `onMounted` + `$fetch` + `ref` for initial page data (React `useEffect` habit).
- `useAsyncData` without a key, or two different queries sharing one key.
- A `watch` on route params calling `refresh()` when the URL is already reactive.
- `<ClientOnly>` around the whole page to "fix hydration".
- `new Date().toLocaleDateString()` in templates.
- Returning full Firestore documents (with internal fields) to the client payload.
- Sequential awaits of independent requests causing waterfalls.
- Hero image with `loading="lazy"`, no dimensions, or a 3000px JPEG.
- Importing a whole utility library (`lodash`, `moment`) for one function.
- `ssr: false` globally to avoid thinking about hydration.

## Done checklist

- [ ] Initial-render data uses `useFetch`/`useAsyncData`; actions use `$fetch`.
- [ ] Every async call has a unique, input-complete key; UI handles `pending`, `error`, empty.
- [ ] No hydration warnings in the browser console on hard reload of every touched page.
- [ ] Payload contains only rendered fields; no secrets; non-serializable values transformed.
- [ ] LCP image is eager/high priority with dimensions; other images lazy; fonts via `@nuxt/fonts`.
- [ ] `useSeoMeta` set; correct 404 status for missing entities.
- [ ] Caching layer chosen per route; no shared caching of per-user data.
- [ ] Lighthouse/Web Vitals on mobile profile meet budgets (`sumi:performance`).
