---
name: code-quality
description: Engineering quality bar for every code change — the rules that separate senior work from AI slop. Covers simplicity and scope, naming, function and file size, error handling, comments, dependencies, types, tests, dead code and verification. Use on every implementation, refactor or code review, in any language or stack, and whenever code "works" but feels generated.
---

# Code Quality — No Slop

Write the code a senior engineer would be happy to maintain in two years. Correct, small, obvious, verified.

## Principles

1. **Solve the stated problem.** Not the general version of it. No config options, abstraction layers, plugin systems or "future-proofing" nobody asked for. Three similar lines beat a premature abstraction; extract on the third real repetition.
2. **Read before you write.** Match the project's existing patterns, naming and structure. Search for an existing utility before writing a new one. A new pattern needs a reason.
3. **Never invent APIs.** If you are not certain a function, option, filter or hook exists in the installed version, check `node_modules`, the lockfile version, or official docs. Guessing is the number one source of slop.
4. **Make illegal states unrepresentable.** Precise types, discriminated unions, enums over magic strings, validation at boundaries (user input, network, storage), trust inside.
5. **Fail loudly at the right level.** Handle errors where you can do something meaningful (retry, fallback, user message). Otherwise let them propagate. Never swallow (`catch {}`), never log-and-continue silently.
6. **Delete freely.** Remove dead code, unused imports, stale flags and commented-out blocks. Git remembers.

## Size and shape

- Functions do one thing; if you need "and" to describe it, split it. Aim < 40 lines.
- Files have one reason to change. Components > ~200 lines or modules > ~300 lines need a look (stack packs may set tighter limits; the tighter one wins).
- Max nesting depth 3. Use early returns and guard clauses.
- Parameters: ≤ 3 positional; beyond that, an options object with named fields.
- Pure logic separate from I/O and framework glue, so it can be tested without mocks.

## Naming

- Names say what, not how: `unpaidInvoices`, not `filteredList2`. Booleans read as questions: `isOpen`, `hasStock`, `canEdit`.
- Functions are verbs (`calculateShipping`), event handlers describe the event (`handleSubmit`, `onCartUpdated`).
- No abbreviations except universal ones (`id`, `url`, `i` in short loops). No `data`, `info`, `item`, `temp`, `helper`, `utils2`, `manager` without a domain noun.
- Units in names when ambiguous: `timeoutMs`, `priceCents`.

## Comments

Comment **why**, never what. Document non-obvious constraints, workarounds (with a link to the issue), business rules and invariants. No narrating comments (`// loop over items`), no banner art, no AI-style section headers in code (`// ===== HELPER FUNCTIONS =====`).

## Dependencies

Before adding a package: can the platform do it (native `<dialog>`, `Intl`, `fetch`, CSS)? Is it maintained, typed, tree-shakeable, and is its size justified? Prefer one well-chosen dependency over three overlapping ones. Never add a dependency to save five lines.

## Tests

- Test behavior through public interfaces, not implementation details.
- New logic with branches → tests. Bug fix → a test that fails before the fix.
- Tests are code: same naming and clarity rules. One reason to fail per test.
- Use the project's test runner and conventions; don't introduce a second one.

## AI slop tells — never ship these

- `any`, `as unknown as`, non-null `!` sprinkled to silence the compiler.
- Defensive checks for impossible states; optional chaining on values that are always defined.
- try/catch around code that cannot throw, or catch blocks that only `console.log`.
- Wrapper functions that just call another function with the same arguments.
- Over-commented trivial code; JSDoc that restates the signature.
- Placeholder logic left behind: `// TODO: implement`, mock data in production paths, `console.log` debugging.
- Inconsistent style within the same file (mixing async/await and `.then`, two naming conventions).
- "Enterprise" structure for a small feature: interfaces with one implementation, factories, service-repository-controller layers for a single CRUD call.
- Rewriting working code that wasn't part of the task.

## Done checklist

- [ ] The change does what was asked, nothing more; scope creep noted as follow-ups.
- [ ] Types pass, linter passes with zero new warnings, formatter applied.
- [ ] Tests added/updated and passing; you ran them and saw the output.
- [ ] No dead code, debug logs, TODO stubs or commented-out code.
- [ ] Errors handled at the right level with useful messages.
- [ ] Every API used exists in the installed version.
- [ ] Diff reads cleanly top to bottom; a reviewer would not ask "why is this here?".
