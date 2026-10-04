---
name: js-ts
description: JavaScript and TypeScript standards for browser and Node code — strict TypeScript, modules, async and fetch patterns with cancellation and errors, DOM and events, Web Components for framework-less sites, security (XSS, secrets), runtime validation and linting. Use when writing or reviewing *.js, *.ts, *.mjs, scripts inside templates, Web Components, or tooling config (tsconfig, eslint.config.*).
---

# JavaScript & TypeScript

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` where the project allows. No `any`; use `unknown` and narrow.
- Model the domain: discriminated unions for states (`{ status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: T }`), branded types for IDs when mixing is dangerous, `as const` + `satisfies` for config objects.
- Types flow from the source of truth: infer from schemas (zod/valibot) or generated API types; don't hand-duplicate.
- Validate at boundaries (forms, network responses, localStorage, URL params, webhooks). Inside, trust the types.
- Prefer `type` aliases for unions and shapes, `interface` when extension/merging is intended. Export types alongside the code that owns them.

## Language

- ES modules only; named exports (default exports only where a framework requires them).
- `const` by default; no `var`. Immutable updates (`structuredClone`, spread, `toSorted`, `toSpliced`, `with`).
- Modern APIs over libraries: `Intl` (dates, numbers, plurals, relative time), `URL`/`URLSearchParams`, `AbortController`, `structuredClone`, `Array.prototype.at`, `Object.groupBy`, optional chaining and `??` where values can truly be absent.
- No clever one-liners that need a comment to decode.

## Async and network

```ts
async function getProducts(signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch('/api/products', { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new HttpError(res.status, await res.text());
  return ProductList.parse(await res.json()); // runtime validation at the boundary
}
```

- Always check `res.ok`; `fetch` doesn't reject on HTTP errors.
- Cancel stale requests (search-as-you-type, route changes) with `AbortController`; debounce user-driven requests.
- Run independent work in parallel (`Promise.all` / `allSettled`), never sequential awaits in a loop by accident.
- Timeouts with `AbortSignal.timeout(ms)`. Retries only for idempotent requests, with backoff.
- Surface errors to the user in plain language; log technical details once.

## DOM and events (framework-less code)

- Event delegation on a stable container for lists; `{ passive: true }` on scroll/touch listeners.
- Clean up listeners, observers and timers (AbortController `signal` on `addEventListener` makes this one line).
- Batch DOM reads before writes; avoid layout thrashing in loops. Use `IntersectionObserver` / `ResizeObserver` instead of scroll/resize polling.
- Keep long tasks under 50 ms: yield with `scheduler.yield()` (fallback `setTimeout`) during heavy work to protect INP.
- Progressive enhancement: the page works (or degrades meaningfully) before JS loads.

## Web Components (Shopify, WordPress, static sites)

- Custom element per interactive component (`<cart-drawer>`), light DOM by default so theme CSS applies; shadow DOM only for truly encapsulated widgets.
- Set up in `connectedCallback`, tear down in `disconnectedCallback`; read config from attributes/data attributes; communicate via `CustomEvent`s with `bubbles: true`.
- Guard re-definition: `if (!customElements.get('cart-drawer')) customElements.define(...)`.

## Security

- Never inject untrusted strings with `innerHTML`; use `textContent`, DOM APIs or a sanitizer (DOMPurify) for unavoidable HTML.
- No secrets in client bundles. Public keys only, and only those designed to be public.
- Validate and encode URL params before use; avoid `eval`, `new Function`, string `setTimeout`.
- Set `rel="noopener noreferrer"` on `target="_blank"` links created by script.

## Tooling

- ESLint flat config (`eslint.config.js`) with TypeScript rules; Prettier for formatting; no style debates in review.
- Lint and typecheck in CI and pre-commit. Zero warnings policy for new code.

## Slop tells

- `any`, `// @ts-ignore`, `as` casts to make errors disappear.
- `useEffect`/watchers for derived values (framework-specific skills cover this).
- `.then()` chains mixed with `async/await`; unhandled promise rejections; `await` in loops for independent requests.
- jQuery or lodash for things the platform does.
- Global mutable state and listeners never removed.

## Done checklist

- [ ] `tsc --noEmit` and lint pass with zero new warnings.
- [ ] Every network call: ok-check, typed/validated response, cancellation where relevant, user-facing error state.
- [ ] No listeners/observers leak; no long tasks in interaction handlers.
- [ ] No untrusted HTML injection, no secrets in client code.
