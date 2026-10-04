# Project structure reference

Opinionated layout for a freelance-scale Next.js app (marketing site + authenticated app), Firebase or SQL backend.

```
.
├── next.config.ts
├── proxy.ts                         # optional; redirects/i18n only
├── src/
│   ├── app/
│   │   ├── layout.tsx               # <html lang>, <body>, next/font, metadataBase
│   │   ├── not-found.tsx
│   │   ├── global-error.tsx         # 'use client', includes <html>/<body>
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── (marketing)/
│   │   │   ├── layout.tsx           # header/footer, no auth providers
│   │   │   ├── page.tsx
│   │   │   └── blog/[slug]/
│   │   │       ├── page.tsx
│   │   │       └── opengraph-image.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx           # app shell + providers.tsx
│   │   │   ├── providers.tsx        # 'use client': theme, toasts, query client if any
│   │   │   └── projects/
│   │   │       ├── page.tsx
│   │   │       ├── loading.tsx
│   │   │       ├── error.tsx
│   │   │       ├── [id]/page.tsx
│   │   │       └── _components/
│   │   │           ├── project-table.tsx
│   │   │           └── project-filters.tsx   # 'use client'
│   │   └── api/
│   │       └── webhooks/stripe/route.ts
│   ├── features/
│   │   └── projects/
│   │       ├── schema.ts            # zod schemas + inferred types (shared)
│   │       ├── queries.ts           # 'server-only'; reads, auth-scoped, cached
│   │       ├── actions.ts           # 'use server'; mutations
│   │       └── components/          # domain components reused across routes
│   ├── components/
│   │   └── ui/                      # primitives (Button, Dialog...) built on Radix/React Aria + DESIGN.md tokens
│   ├── lib/
│   │   ├── env.ts                   # zod-validated env
│   │   ├── auth.ts                  # 'server-only'; getSession(), requireUser()
│   │   ├── db.ts | firebase-admin.ts# 'server-only'
│   │   ├── firebase-client.ts       # 'client-only'
│   │   └── utils.ts                 # cn(), formatters
│   └── styles/globals.css           # tokens + Tailwind layers (forge-core:css-architecture)
└── tests/
    └── e2e/                         # Playwright
```

## Rules behind the layout

- `app/` files stay thin: fetch via `features/*/queries.ts`, render domain components, done. A page over ~80 lines is a smell.
- `features/<domain>` is the unit of ownership. Cross-feature imports go through the feature's public files (`queries.ts`, `actions.ts`, `components/index.ts`), not deep paths.
- `queries.ts` is the Data Access Layer: every function resolves the current user and authorizes before returning data. Return DTOs (only the fields the UI needs), never raw DB documents with internal fields.
- `components/ui` knows nothing about domains. Domain components know nothing about routing.
- Tests live next to code (`*.test.ts(x)`) except E2E.
- Path alias: `@/*` -> `src/*`. No `../../../`.

## Naming

- Files: kebab-case (`project-table.tsx`). Components: PascalCase exports. One exported component per file; small private helpers allowed.
- Actions: verb-first (`createProject`, `archiveProject`). Queries: `getX`, `listX`.
- Route groups name the shell, not the feature: `(marketing)`, `(app)`, `(auth)`.

## env.ts sketch

```ts
import 'server-only';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
});

export const env = schema.parse(process.env);
```

Client-visible values need a separate module that reads each `NEXT_PUBLIC_*` explicitly (static access is required for inlining).
