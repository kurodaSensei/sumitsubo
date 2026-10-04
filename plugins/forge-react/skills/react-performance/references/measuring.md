# Measuring React/Next.js performance

## 1. Field data (source of truth)

- CrUX (PageSpeed Insights, CrUX dashboard / BigQuery) for public sites with traffic.
- RUM for everything else: report Web Vitals from the app.

```tsx
// app/_components/web-vitals.tsx
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric: { name: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB', value, rating, id, navigationType }
    const body = JSON.stringify({ ...metric, path: location.pathname });
    navigator.sendBeacon?.('/api/vitals', body) || fetch('/api/vitals', { body, method: 'POST', keepalive: true });
  });
  return null;
}
```

Render `<WebVitals />` once in the root layout. For attribution (which element is LCP, which interaction is slow), use the `web-vitals` package `attribution` build directly and send `attribution.interactionTarget`, `attribution.lcpEntry` selectors.

Vercel Speed Insights or any RUM vendor is fine; the point is p75 field numbers per route.

## 2. Lab: Lighthouse / Chrome DevTools

- Always on a production build: `next build && next start`.
- Mobile emulation with CPU 4x throttling for representative INP/TBT.
- Performance panel: record an interaction, look for long tasks, "Recalculate style"/"Layout" chains, and which React work (Components track in React DevTools-enabled builds) dominates.
- Performance panel "Live metrics" shows LCP/INP/CLS as you interact - fast feedback loop.

## 3. React Profiler

- React DevTools Profiler: record, inspect commits, "Why did this render?" (enable in settings).
- Profile in a profiling build when measuring precise timings; dev builds are slower and double-render in Strict Mode.
- Programmatic: `<Profiler id="ProjectTable" onRender={(id, phase, actualDuration) => ...}>` around a suspect subtree; log only `actualDuration` > 16ms.
- React 19.2 adds React Performance Tracks in the Chrome Performance panel (Scheduler and Components tracks) - verify availability in your DevTools version.

## 4. Bundles

- Next 16 Turbopack bundle analyzer (experimental at time of writing - verify command) or `@next/bundle-analyzer` with webpack.
- Look for: duplicated libraries, whole-library imports, server-only libs leaking into client chunks (add `server-only` to catch them at build), large JSON imported into client code.
- Record First Load JS per route from `next build` output; fail CI on regressions beyond an agreed budget.

## 5. Interpreting

| Symptom | Likely cause | First lever |
|---|---|---|
| High LCP, low TTFB | LCP image not prioritized, client-rendered hero, font blocking | `priority`/preload, render hero on server, `next/font` |
| High LCP, high TTFB | Dynamic route blocking on slow data | Cache shell, stream slow parts with Suspense |
| High INP | Long tasks in handlers, large re-renders, third-party scripts | Transitions, yield, split state, defer scripts |
| High CLS | Unsized media, late banners, font swap, skeleton mismatch | Dimensions, overlays, size-adjusted fonts, faithful skeletons |
| Large First Load JS | Client boundary too high, heavy deps | Push `'use client'` down, dynamic import, replace deps |

## 6. Report format

When reporting a perf change, include: route, device profile, metric before -> after, method (field/lab), and the change that caused it. No unmeasured claims.
