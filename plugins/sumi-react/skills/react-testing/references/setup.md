# Testing setup reference

Versions move fast; check installed versions and current docs for config keys.

## Vitest

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    restoreMocks: true,
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
```

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); cleanup(); });
afterAll(() => server.close());
```

Modules that import `server-only` throw in jsdom: alias it in tests (`resolve.alias: { 'server-only': new URL('./tests/empty.ts', import.meta.url).pathname }`) or mock it with `vi.mock('server-only', () => ({}))`.

Mock Next.js navigation in client component tests:

```ts
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/projects',
  useSearchParams: () => new URLSearchParams(),
}));
```

## MSW 2

```ts
// tests/msw/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://api.example.com/projects', () =>
    HttpResponse.json([{ id: 'p1', name: 'Alpha' }]),
  ),
];

// tests/msw/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

Per-test override:

```ts
server.use(http.get('https://api.example.com/projects', () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
```

## Render helper

```tsx
// tests/render.tsx
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

export function setup(ui: ReactElement, options?: RenderOptions) {
  return { user: userEvent.setup(), ...render(ui, { wrapper: TestProviders, ...options }) };
}
```

`TestProviders` wraps only what components truly need (theme, i18n, query client with `retry: false`).

## Playwright

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'], storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'], storageState: 'tests/e2e/.auth/user.json' }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Axe fixture:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('projects page has no WCAG 2.2 AA violations', async ({ page }) => {
  await page.goto('/projects');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Keyboard path example:

```ts
test('contact form is completable by keyboard', async ({ page }) => {
  await page.goto('/contact');
  await page.keyboard.press('Tab');                 // skip link
  await page.getByLabel('Email').focus();
  await page.keyboard.type('a@b.co');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Hello there');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText(/sent/i);
});
```

## Firebase

- Run tests against the Emulator Suite (`firebase emulators:exec "pnpm test"`).
- Test Security Rules with `@firebase/rules-unit-testing`: one allowed and one denied case per rule path.
- Never point tests at a real project.

## CI order

1. Typecheck + lint
2. Vitest (unit + integration)
3. Build
4. Playwright (chromium + mobile), upload traces on failure
