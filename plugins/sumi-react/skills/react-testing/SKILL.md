---
name: react-testing
description: Testing React/Next.js apps - Vitest + React Testing Library for components and hooks, MSW for network mocking, Playwright for E2E and async Server Components, axe for automated accessibility checks, testing Server Actions and zod schemas as plain functions. Test behavior, not implementation. Use when writing or reviewing *.test.ts(x), *.spec.ts, tests/**, e2e/**, vitest.config.*, playwright.config.*, MSW handlers, or when adding a feature/bugfix that needs coverage or deciding what to test.
---

# React / Next.js testing

Stack: Vitest (jsdom or happy-dom), React Testing Library + `@testing-library/user-event`, MSW 2, Playwright, `@axe-core/playwright` / `vitest-axe`. Config and helpers: `references/setup.md`.

## Principles

1. **Test what users and callers observe.** Rendered output, accessible roles, URL, network effects, returned values. Not state, not hook internals, not class names.
2. **Confidence per minute.** Few E2E for critical journeys, many fast integration tests for components with real children, unit tests for pure logic.
3. **Mock at the boundary.** Mock the network (MSW) or the data-access module, never the component under test or React itself.
4. **Every bug fix ships with a failing-first test.**
5. **Tests are code.** Typed, readable, no `any`, no sleep-based waits.

## What to test where

| Subject | Tool | Notes |
|---|---|---|
| zod schemas, formatters, reducers, utils | Vitest | Pure, fast, table-driven (`it.each`). |
| Server Actions | Vitest | Call as functions with `FormData`; mock `requireUser`, db, `next/cache`. Assert auth, validation, authorization, invalidation. |
| Data access (`queries.ts`) | Vitest + test DB/emulator | Firebase: Emulator Suite; SQL: ephemeral DB (Testcontainers / docker). Test security rules too. |
| Client components | Vitest + RTL + user-event | Render with real children; MSW for fetches. |
| Async Server Components, routing, caching, streaming | Playwright | RTL support for async RSC is limited - verify current status; E2E is the reliable path. |
| Critical journeys (signup, checkout, contact form) | Playwright | Against a production build. |
| Accessibility | axe in RTL + Playwright, plus manual keyboard pass | Automated checks find ~30-40% of issues (`sumi:a11y`). |

## Queries: accessible first

Priority: `getByRole` (with `name`) > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId` (last resort, for non-semantic hooks into canvas/charts).

DO:
```tsx
const user = userEvent.setup();
render(<RenameProjectForm id="p1" name="Old" />);
await user.clear(screen.getByRole('textbox', { name: /project name/i }));
await user.type(screen.getByRole('textbox', { name: /project name/i }), 'A');
await user.click(screen.getByRole('button', { name: /save/i }));
expect(await screen.findByText(/at least 2 characters/i)).toBeVisible();
```

DON'T:
```tsx
const { container } = render(<Form />);
fireEvent.change(container.querySelector('.input-name')!, { target: { value: 'A' } });
expect(wrapper.state('error')).toBe(true);
```

If you cannot find an element by role and name, that is often an accessibility bug - fix the component.

## Async

- `findBy*` and `waitFor` for async UI. Never `setTimeout` sleeps.
- `waitFor` holds one assertion, no side effects inside.
- Fake timers (`vi.useFakeTimers({ shouldAdvanceTime: true })`) for debounce; pair with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

## Server Actions

```ts
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ updateTag: vi.fn(), revalidateTag: vi.fn() }));

it('rejects renaming a project the user does not own', async () => {
  vi.mocked(requireUser).mockResolvedValue({ id: 'u1' } as User);
  vi.mocked(getOwnedProject).mockResolvedValue(null);
  const fd = new FormData(); fd.set('id', 'p9'); fd.set('name', 'New name');
  const result = await renameProject({ status: 'idle' }, fd);
  expect(result).toEqual({ status: 'error', message: expect.any(String) });
  expect(updateTag).not.toHaveBeenCalled();
});
```

Cover per action: unauthenticated, invalid input, unauthorized resource, success + invalidation.

## Network: MSW

- One `handlers.ts` per feature with happy-path defaults; override per test with `server.use(...)` for errors/edge cases.
- `onUnhandledRequest: 'error'` so unmocked calls fail loudly.
- Reuse the same handlers in Storybook/dev if useful.

## Playwright

- Run against `next build && next start` (`webServer` in config). Use `baseURL`.
- Locators by role/label (`page.getByRole('button', { name: 'Save' })`); web-first assertions (`await expect(locator).toBeVisible()`), no manual waits.
- Seed data via API/emulator in fixtures; isolate state per test; reuse auth via `storageState`.
- Include a mobile project and at least one keyboard-only path for critical flows.
- Run axe on key pages: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()`; fail on violations.
- Visual regression (`toHaveScreenshot`) only for stable design-system surfaces, with masked dynamic regions.

## Hygiene

- Test names describe behavior: `it('shows an error when the name is too short')`.
- Arrange-Act-Assert, one behavior per test; table-drive variations.
- Reset mocks between tests (`restoreMocks: true` in config).
- No snapshot tests of whole component trees; they assert implementation and get rubber-stamped.
- Coverage is a signal, not a goal. Watch branches in actions/schemas, not percentages on JSX.

## AI slop tells

- `getByTestId` everywhere, `container.querySelector`, asserting CSS classes.
- Mocking the component's own hooks or child components to make a test pass.
- Huge `toMatchSnapshot()` of rendered markup.
- `await new Promise(r => setTimeout(r, 1000))`.
- `fireEvent` where `user-event` models real interaction.
- Tests that only assert "renders without crashing".
- Server Action tests that never cover the unauthenticated/unauthorized path.
- `as any` to silence test typing.

## Done checklist

- [ ] New behavior has tests at the cheapest level that gives confidence; bug fixes have a regression test.
- [ ] Queries are role/label based; no implementation details asserted.
- [ ] Server Actions cover unauth, invalid, unauthorized, success + invalidation.
- [ ] Network mocked with MSW; unhandled requests fail.
- [ ] Critical journeys covered in Playwright against a production build, including a keyboard path and axe scan.
- [ ] No sleeps, no `any`, mocks reset between tests; suite runs green in CI.
