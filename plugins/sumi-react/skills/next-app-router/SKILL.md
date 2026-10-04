---
name: next-app-router
description: Next.js App Router architecture - server components by default, client boundaries at the leaves, route groups and nested layouts, loading/error/not-found files, Metadata API, route handlers, proxy (ex-middleware), env/config and folder conventions. Use when creating or restructuring routes, layouts or pages; when touching app/**, src/app/**, page.tsx, layout.tsx, route.ts, loading.tsx, error.tsx, not-found.tsx, proxy.ts or middleware.ts, next.config.*, .env*; when deciding where a 'use client' directive goes; or when reviewing a Next.js project structure.
---

# Next.js App Router

Target: Next.js 16 + React 19.2, TypeScript strict. Defaults below assume App Router only (no `pages/`). For data and caching see `next-data-caching`; for component internals see `react-components`.

## Principles

1. **Server by default.** Every file in `app/` is a Server Component until proven otherwise. Server code is free for the bundle; client code is paid for by every visitor.
2. **Client boundaries are leaves.** `'use client'` marks an entry point into the client graph, not "this file uses React". Push it down to the smallest interactive island.
3. **The file system is the router, not the architecture.** `app/` holds routing files and thin composition. Domain logic lives in `src/features/*` or `src/lib/*`.
4. **Every segment owns its states.** Loading, error and not-found are designed per segment, not bolted on globally.
5. **Fail closed at the server.** Auth, validation and secrets are enforced in server code (layouts are not a security boundary - see below).

## Folder conventions

```
src/
  app/
    (marketing)/            # route group: own layout, no URL segment
      layout.tsx
      page.tsx
    (app)/
      layout.tsx            # authed shell
      dashboard/
        page.tsx
        loading.tsx
        error.tsx
        _components/        # private folder: colocated, never routable
    api/webhooks/stripe/route.ts
    layout.tsx              # root: <html>, <body>, fonts, providers
    not-found.tsx
    global-error.tsx
  features/<domain>/        # queries.ts, actions.ts, schema.ts, components/
  lib/                      # db, auth, env, utils (server-only where relevant)
  components/ui/            # design-system primitives (tokens from DESIGN.md)
proxy.ts                    # only if truly needed
```

- Colocate route-only components in `_components/`; promote to `features/` when a second route needs them.
- Mark server-only modules with `import 'server-only'` (db clients, firebase-admin, secrets). Mark browser-only modules with `import 'client-only'`.
- Full tree with rationale: `references/structure.md`.

## Server vs client boundary

DO - keep the page on the server, pass serializable data into a small client leaf:

```tsx
// app/(app)/products/[id]/page.tsx  (Server Component)
export default async function Page({ params }: PageProps<'/products/[id]'>) {
  const { id } = await params;                 // params is async (Next 15+)
  const product = await getProduct(id);
  if (!product) notFound();
  return (
    <article>
      <h1>{product.name}</h1>
      <ProductGallery images={product.images} />  {/* server */}
      <AddToCartButton productId={product.id} />  {/* 'use client' leaf */}
    </article>
  );
}
```

DON'T - `'use client'` on the page "because one button needs onClick". That ships the whole tree, its dependencies and its markup logic to the browser.

- Pass Server Components *into* client components via `children` or slot props; the client component never imports them.
- Props crossing the boundary must be serializable: no functions (except Server Actions), class instances, or `Date` you expect to stay a `Date` without care.
- Context providers are client components: wrap them in one `app/providers.tsx` and render it as deep as possible (not around `<html>` if only `(app)` needs it).
- `PageProps` / `LayoutProps` global helpers come from typed routes; verify availability and flag (`typedRoutes`) against current docs, else type `params: Promise<{ id: string }>`.

## Layouts, groups, templates

- Layouts persist across navigation and do not re-render; put shell UI and providers there, never per-request data the child must trust.
- **Layouts are not auth gates.** A layout check does not re-run on client navigation between siblings, and pages/actions/route handlers can be reached directly. Check auth in the data access layer and in every Server Action.
- Use route groups `(name)` for separate shells (marketing vs app) and for multiple root layouts.
- Use `template.tsx` only when you need remount on navigation (enter animations, per-page state reset).
- Parallel routes (`@slot`) need an explicit `default.tsx` in Next 16. Use them for modals with intercepting routes `(.)photo/[id]`, not for ordinary composition.

## Loading, error, not-found

- `loading.tsx` = automatic Suspense boundary for the segment. Make it a layout-faithful skeleton (same dimensions) to avoid CLS. Prefer granular `<Suspense>` inside the page for slow parts.
- `error.tsx` must be `'use client'`; receives `error` and `reset`. Show a human message, log `error.digest`, never render `error.message` from the server to users.
- `global-error.tsx` replaces the root layout - include `<html>` and `<body>`.
- Call `notFound()` from `next/navigation` when a resource is missing; style `not-found.tsx` per segment where context matters.
- `redirect()` throws: do not wrap it in `try/catch` that swallows it.

## Metadata

```tsx
export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const post = await getPost((await params).slug); // dedupe with React cache()
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { images: [post.ogImage] },
  };
}
```

- Set `metadataBase` and a `title.template` in the root layout.
- Use file conventions: `opengraph-image.tsx`, `icon.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`.
- `viewport` / `themeColor` go in `export const viewport`, not `metadata`.
- Set `<html lang>` in the root layout (`sumi:a11y`).

## Route handlers

- Use `route.ts` for webhooks, public APIs, OAuth callbacks, file/stream responses. **Do not** build an internal REST layer for your own pages: Server Components read data directly, mutations go through Server Actions.
- `GET` handlers are dynamic by default (since 15). Validate input with zod, return typed `Response.json()`, set explicit status codes.
- Verify webhook signatures before parsing the body as trusted.

## Proxy (formerly middleware)

- Next 16 renames `middleware.ts` to `proxy.ts` (verify the runtime and matcher options against current docs). Keep it for: redirects/rewrites, i18n locale negotiation, cheap cookie presence checks, headers.
- DON'T do data fetching, heavy auth verification, or DB calls there. It runs on every matched request. Always set a tight `matcher` excluding `_next/static`, images and assets.
- Optimistic redirect in proxy is fine; the real authorization still happens server-side next to the data.

## Env and config

- One `src/lib/env.ts` validates `process.env` with zod at boot; import from it, never read `process.env` ad hoc.
- `NEXT_PUBLIC_*` is inlined into client bundles at build time: never put secrets there; treat its value as public.
- Keep `next.config.ts` typed (`NextConfig`), minimal, and commented when a flag is non-obvious (`cacheComponents`, `reactCompiler`, `images.remotePatterns`).
- Turbopack is the default bundler in 16; avoid webpack-only config unless required.
- Firebase: client SDK in client components only; `firebase-admin` behind `server-only`. Session verification happens server-side.

## Navigation

- `<Link>` for internal navigation (prefetch is automatic in production). `useRouter` only for imperative cases after an event.
- `useSearchParams` forces client rendering up to the nearest Suspense - wrap the consumer in `<Suspense>`. On the server, read `searchParams` from page props.
- Use `next/form` for search/filter forms that update the URL.

## AI slop tells

- `'use client'` at the top of every file, including pages and layouts.
- `useEffect(() => fetch('/api/...'))` in a client component to load data the server could have rendered.
- An `app/api/*` route for every query, called from your own Server Components.
- Auth checked only in a layout or only in proxy.
- Reading `params` synchronously, or `any` for page props.
- A single giant `layout.tsx` with every provider wrapping `<html>`.
- `loading.tsx` with a centered spinner that shifts the whole layout.
- `process.env.X!` sprinkled across components.

## Done checklist

- [ ] No `'use client'` on pages/layouts unless justified in a comment; client islands are leaves.
- [ ] Server-only modules import `server-only`; no secrets in `NEXT_PUBLIC_*`.
- [ ] Each new segment has a deliberate loading state, error boundary and not-found path.
- [ ] Metadata (title, description, canonical, OG) set; `lang` on `<html>`.
- [ ] Auth/authorization enforced in data access and actions, not just layout/proxy.
- [ ] `params`/`searchParams` awaited and typed; no `any`.
- [ ] Proxy (if any) has a narrow matcher and no data fetching.
- [ ] Cross-checked with `sumi:a11y`, `sumi:performance`, `sumi:js-ts`.
