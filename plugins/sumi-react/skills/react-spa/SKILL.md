---
name: react-spa
description: Client-rendered React apps built with Vite (no Next.js) - React Router v7 in data mode, route-level code splitting, auth-guarded routes, Zustand for shared client state with granular selectors, TanStack Query for server state, Firebase on the client, VITE_ env vars, SPA hosting rewrites, PWA (vite-plugin-pwa) and desktop/mobile shells (Tauri, Capacitor). Use when the project has vite.config.* with React and no next.config.*, when editing src/main.tsx, src/router.tsx, routes/**, stores/**, or when choosing between an SPA and Next.js for an app behind a login.
---

# React SPA (Vite)

When the app lives behind a login, is installed as a PWA or wrapped in a desktop/mobile shell, there is no SEO to win and no server to keep: a Vite SPA is the smaller, simpler answer. Public, content-led pages still go to Next.js (`next-app-router`) or a static site. Component rules are in `react-components`; tests in `react-testing`.

## Structure

```
src/
  main.tsx            createRoot + providers (QueryClient, auth) + RouterProvider
  router.tsx          the route tree, nothing else
  routes/             one module per route: component + loader/action, lazy-loaded
  features/<domain>/  components, hooks, api.ts, store.ts for one domain
  lib/                firebase.ts, query-client.ts, cn.ts
  stores/             only cross-domain client state
```

## Routing: React Router v7, data mode

```tsx
// router.tsx
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  { path: '/login', lazy: () => import('./routes/login') },
  {
    path: '/',
    lazy: () => import('./routes/app-shell'),   // loader redirects to /login when signed out
    children: [
      { index: true, lazy: () => import('./routes/dashboard') },
      { path: 'expenses/:id', lazy: () => import('./routes/expense') },
    ],
    errorElement: <RouteError />,
  },
]);
```

- Import from `react-router` (v7 merged `react-router-dom` into it).
- **Every route is `lazy`**: each module exports `Component`, and `loader`/`action` when it needs them. The first load ships the shell, not the whole app.
- Guard once, in the parent route's `loader` (`redirect('/login')`), not with `if (!user)` inside every page.
- Shareable UI state (filters, tabs, page) lives in the URL (`useSearchParams`), not in a store.
- `errorElement` on the root and on any route whose loader can fail; a blank screen is not an error state.

## State: what goes where

| State | Home |
|---|---|
| Server data (lists, records, anything fetched) | TanStack Query (or Firestore listeners), never copied into a store |
| One component or one route | `useState` / `useReducer` |
| Shareable view state | URL |
| Cross-route client state (session UI, wizard, preferences) | Zustand store per domain |

```ts
// features/budget/store.ts
import { create } from 'zustand';

interface BudgetUi {
  period: 'q1' | 'q2';
  setPeriod: (p: BudgetUi['period']) => void;
}

export const useBudgetUi = create<BudgetUi>()((set) => ({
  period: 'q1',
  setPeriod: (period) => set({ period }),
}));

// In components: one selector per value
const period = useBudgetUi((s) => s.period);
```

- **Granular selectors.** `useStore()` with no selector re-renders on every change; select fields, or several with `useShallow`.
- Actions live in the store, not in components.
- `persist` only for preferences. Never persist server data or tokens.

## Server state: TanStack Query

```ts
export function useExpense(id: string) {
  return useQuery({ queryKey: ['expense', id], queryFn: () => getExpense(id), staleTime: 30_000 });
}
```

- Query keys are arrays that start with the domain; invalidate by prefix after a mutation.
- Optimistic updates through `onMutate` + rollback in `onError`, not by writing to a store.
- With Firestore realtime, use `onSnapshot` in one hook per query and unsubscribe on unmount (`sumi-nuxt:firebase-firestore` for modeling and rules; they apply unchanged).

## Environment and Firebase

- Anything under `import.meta.env.VITE_*` ships to the browser: public config only. Secrets belong in a backend or a function, never in a `VITE_` variable.
- Initialize Firebase once in `lib/firebase.ts`; expose auth state through one provider fed by `onAuthStateChanged`, and read it in loaders.
- Type `import.meta.env` in `src/vite-env.d.ts`.

## Hosting and shells

- SPA hosting needs a rewrite of every path to `/index.html` (Vercel `rewrites`, Firebase Hosting `rewrites`), or deep links 404.
- PWA: `vite-plugin-pwa` with an explicit update strategy (prompt the user), a real offline state, and a manifest with maskable icons. On iOS, storage can be purged: the source of truth stays in the cloud.
- Tauri (desktop) or Capacitor (mobile) wrap the same build. Keep platform calls behind one module (`lib/platform.ts`) so the web build still runs in a browser.

## Performance

- Route-level `lazy` is the main lever; check the build output (`vite build` reports chunk sizes) against `sumi:performance` budgets.
- Prefetch the next likely route's module on hover/focus of its link, not on load.
- Heavy client libraries (charts, editors, maps) are imported inside the route that uses them.

## Slop tells

- `react-router-dom` imports and `<Switch>` in a new v7 project; routes defined inside components.
- Fetched data copied into Zustand or `useState` "to have it handy".
- `useStore()` without a selector; one global store for everything.
- Auth checks repeated in every page; secrets in `VITE_` variables.
- A single 1 MB `index.js` because nothing is lazy.

## Done checklist

- [ ] Every route lazy; auth guarded in one parent loader; `errorElement` in place.
- [ ] Server state in TanStack Query (or listeners with cleanup); stores hold client state only, read with selectors.
- [ ] No secrets in `VITE_*`; hosting rewrites configured.
- [ ] Initial JS within the `sumi:performance` budget; PWA/shell behavior tested if used.
