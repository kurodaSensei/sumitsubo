# Hydration mismatch catalog and fixes

## How to diagnose

1. Hard reload the page with devtools console open. Vue logs the mismatching node in dev.
2. Compare View Source (server HTML) with the Elements panel right after load.
3. Bisect: wrap suspect subtrees in `<ClientOnly>` temporarily to locate the culprit, then fix the
   cause and remove the wrapper.
4. Check for browser extensions injecting markup (test in a clean profile) before blaming code.

## Patterns

### Browser-only APIs

```ts
// BAD: crashes on server or renders different branch
const isMobile = window.innerWidth < 768

// GOOD: server and first client render agree (false), then update after mount
const isMobile = ref(false)
onMounted(() => {
  const mq = window.matchMedia('(max-width: 767px)')
  isMobile.value = mq.matches
  mq.addEventListener('change', (e) => { isMobile.value = e.matches })
})
```

Better still: solve layout differences with CSS (media/container queries) so there is no JS branch.

### Dates and time zones

The server likely runs in UTC; the user's browser does not. Formatting without an explicit time zone
produces different strings.

```ts
const fmt = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium', timeZone: 'America/Bogota',
})
const label = computed(() => fmt.format(new Date(event.value.startsAt)))
```

For "time ago" labels: render the absolute date on the server inside `<time datetime="...">`, then
swap to relative text in `onMounted`. Or render relative text client-only with a fixed-width fallback.

### User-specific content

If the server cannot see the session, it renders the logged-out view and the client renders the
logged-in view. Options:
- Session cookie readable on the server (`useCookie`, or Firebase session cookies verified in a Nitro
  middleware) so both sides agree.
- Route is `ssr: false` (dashboards).
- Small auth-dependent island (`<ClientOnly>`) with a skeleton of identical dimensions.

### Persisted UI state (theme, dismissed banners)

localStorage is invisible to the server. Use a cookie (`useCookie('theme')`) so SSR renders the
correct variant, or a module that injects a blocking inline script before hydration
(`@nuxtjs/color-mode`).

### Invalid HTML

The browser's parser silently fixes invalid nesting, so its DOM differs from Vue's virtual tree.
Common offenders: block elements inside `<p>`, interactive inside interactive (`<button>` in `<a>`),
`<tr>` directly inside `<table>` without `<tbody>` in some cases, `<li>` outside lists.
Run the HTML validator on rendered output when in doubt.

### Non-deterministic ordering

`Object.keys` on data assembled in different order, `Set` iteration of async-filled data, or
`sort()` with an unstable comparator. Sort deterministically on the server and transfer the result.

## Data fetching pitfalls that look like hydration bugs

- `useAsyncData` with `server: false` returns no data during hydration; the first client render must
  match the server's empty/pending state. Render a skeleton for `pending`.
- Key collision: two components using the same key for different data get each other's payload.
- Mutating the payload data object in place on the client before mount.

## Firestore data in the payload

`Timestamp`, `DocumentReference` and `GeoPoint` are not plain JSON. Convert in `transform`:

```ts
const { data } = await useAsyncData(`post:${slug}`, () => getPost(slug), {
  transform: (p) => p && ({ ...p, publishedAt: p.publishedAt.toMillis() }),
})
```

Or convert at the repository boundary so components never see SDK types.
