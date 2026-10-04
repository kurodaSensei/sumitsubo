---
name: firebase-firestore
description: Firebase for Nuxt/Vue apps - query-first Firestore data modeling (denormalization, aggregation docs, composite indexes, cursor pagination, batches/transactions), security rules as the real backend (deny by default, shape validation, emulator tests), Auth patterns, Cloud Functions v2 (idempotency, retries, secrets), cost/read amplification, Emulator Suite, and the modular SDK or nuxt-vuefire. Use when designing collections, writing queries, editing firestore.rules, storage.rules, firestore.indexes.json, firebase.json, functions/**, or any code importing firebase/* or firebase-admin.
---

# Firebase and Firestore

Firestore is not a relational database and not a free-form JSON bucket. It is a document store where
**you pay per document read**, **queries must be served by an index**, and **security rules are the
only backend** for anything the client SDK touches. Design for the queries the UI runs, then write
rules as if every client is hostile.

## Core principles

1. **Query-first modeling.** List every screen and the exact query it runs before creating a
   collection. The shape of documents follows the reads, not an ER diagram.
2. **Reads are the cost and latency unit.** One screen should cost a small, bounded number of reads,
   independent of total data size. Never count or aggregate by reading every document.
3. **Rules are the backend.** Deny by default. Validate auth, ownership, document shape, field
   types, allowed fields and immutable fields on every write. Test them in the emulator.
4. **Server for privilege, client for convenience.** Anything involving money, roles, cross-user
   writes or secrets goes through Cloud Functions or Nitro with firebase-admin.
5. **Modular SDK only, tree-shaken, initialized once.** No compat imports.

## Modeling rules

- Top-level collections for entities you query across owners (`projects`, `orders`). Subcollections
  for data always accessed through a parent (`projects/{id}/tasks`). Use collection-group queries
  when you must query subcollections across parents.
- **Denormalize what lists display.** A task list showing assignee name stores `assignee: { uid, name, photoURL }`
  in the task. Accept the write-time fan-out; update copies with a function when the source changes.
- **Aggregation documents** for counters and summaries (`projects/{id}/stats/summary` or fields on the
  parent), updated in a transaction or by a trigger. For high write rates, use sharded counters.
  For occasional counts, `getCountFromServer` / `getAggregateFromServer` (bills per batch of index
  entries, not per doc - verify current pricing).
- Keep documents well under the 1 MiB limit; never use an ever-growing array or map (comments, logs)
  inside a document. Unbounded lists are subcollections.
- Avoid sustained writes to a single document beyond roughly 1 per second, and avoid monotonically
  increasing document IDs or indexed timestamps on very high write volumes (hotspotting).
- Store timestamps as `serverTimestamp()` on write; store money as integer minor units.
- Version your schema: a `schemaVersion` field makes migrations tractable.

Worked modeling examples: `references/modeling.md`.

## Queries, indexes, pagination

```ts
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore'

const q = query(
  collection(db, 'projects'),
  where('ownerId', '==', uid),
  where('status', '==', 'active'),
  orderBy('updatedAt', 'desc'),
  limit(20),
  ...(cursor ? [startAfter(cursor)] : []),
)
```

- Every composite query needs a composite index; commit them in `firestore.indexes.json` (export
  with `firebase firestore:indexes`), never only through console links.
- Paginate with cursors (`startAfter(lastSnapshot)`) and `limit`. Never `offset`: skipped docs are
  still billed and slow.
- `in`/`array-contains-any`/`or()` have value limits (verify current max) - they are not a join.
- No client-side filtering of large result sets "because the query was hard". Change the model.
- Use `withConverter` (or a repository layer) to map documents to typed domain objects and convert
  `Timestamp` to plain values at the boundary.

## Writes: batches and transactions

- **Batch** independent writes that must all apply together (create project + owner membership).
- **Transaction** when a write depends on a read (decrement stock, increment counter with a cap).
  Transactions retry; keep them free of side effects (no emails, no external calls inside).
- Respect batch/transaction size and per-request limits (verify current limits).
- Prefer `updateDoc` with field paths and `increment()`/`arrayUnion()` over read-modify-write.

## Security rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(d) { return signedIn() && d.ownerId == request.auth.uid; }

    match /projects/{projectId} {
      allow read: if isOwner(resource.data);
      allow create: if isOwner(request.resource.data) && validProject(request.resource.data)
                    && request.resource.data.createdAt == request.time;
      allow update: if isOwner(resource.data) && validProject(request.resource.data)
                    && request.resource.data.diff(resource.data).affectedKeys()
                         .hasOnly(['name', 'status', 'updatedAt']);
      allow delete: if false; // soft delete via status, or server-only
    }
    function validProject(d) {
      return d.keys().hasOnly(['ownerId','name','status','createdAt','updatedAt'])
        && d.name is string && d.name.size() > 0 && d.name.size() <= 120
        && d.status in ['active', 'archived'];
    }
  }
}
```

- Nothing outside explicit `match` blocks is allowed; never ship `allow read, write: if true` or
  time-boxed test rules.
- Rules are not filters: a query must be constrained so every possible result passes the rule
  (e.g. include `where('ownerId', '==', uid)`).
- `get()`/`exists()` in rules cost reads and have per-request limits; prefer custom claims for roles.
- Roles live in custom claims (set by admin SDK) or a server-written doc; clients never write their own role.
- Test with `@firebase/rules-unit-testing` against the emulator: an allow and a deny test per rule.
  See `references/rules-testing.md`.
- Enable App Check for production web apps to reduce abuse of public config.

## Auth

- Client: `onAuthStateChanged` once (in a plugin/composable), exposed as reactive state. In
  nuxt-vuefire: `useCurrentUser()` and `await getCurrentUser()` in route middleware.
- SSR needs the user on the server: use session cookies or nuxt-vuefire's auth SSR support (verify
  setup for your version), and verify tokens with firebase-admin in `server/`. Otherwise make
  authenticated routes `ssr: false`.
- Never trust a uid sent in a request body; derive it from the verified token.

## Cloud Functions (v2)

```ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { setGlobalOptions } from 'firebase-functions/v2'
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

export const onOrderCreated = onDocumentCreated(
  { document: 'orders/{orderId}', retry: true },
  async (event) => {
    const processed = db.doc(`_processedEvents/${event.id}`)
    await db.runTransaction(async (tx) => {
      if ((await tx.get(processed)).exists) return   // idempotency guard
      tx.set(processed, { at: FieldValue.serverTimestamp() })
      tx.update(db.doc(`stats/global`), { orders: FieldValue.increment(1) })
    })
  },
)
```

- Triggers are at-least-once: make handlers idempotent (event id ledger, deterministic doc ids).
- Enable `retry` only for idempotent handlers; bound retries by checking event age.
- Secrets via `defineSecret` / Secret Manager, never in code or `runtimeConfig.public`.
- Long or heavy work goes to a task queue or scheduled function; the UI shows progress from a status doc.
- Set `maxInstances` to cap runaway cost. Watch for trigger loops (a function writing to the doc that triggers it).

## Client SDK and Nuxt integration

- Initialize once (plugin or nuxt-vuefire config). Import only what you use from `firebase/firestore`,
  `firebase/auth`; lazy-load heavy modules (Storage, Analytics) where they are needed.
- Prefer one-time reads (`getDocs`) for SSR pages; use realtime listeners (`onSnapshot`,
  `useCollection`) only where live updates matter, and unsubscribe on unmount (VueFire does this).
- Offline cache: `initializeFirestore(app, { localCache: persistentLocalCache(...) })` only for apps
  that benefit; it adds bundle size.
- Convert SDK types at the repository boundary before they reach the SSR payload (`nuxt-data-ssr`).

## Emulator Suite

`firebase emulators:start --import=./.emulator-data --export-on-exit` for local dev with seed data.
Connect the client conditionally in dev (`connectFirestoreEmulator`, `connectAuthEmulator`). CI runs
rules tests and function tests against emulators. Never develop against production data.

## Anti-patterns (AI slop tells)

- Normalized "SQL tables" with client-side joins (N+1 reads per list).
- Counting by `getDocs(...).size`, or loading a whole collection to filter/sort client-side.
- `offset` pagination; unbounded `onSnapshot` on large collections.
- Arrays of comments/messages inside one document.
- Test-mode rules in production, or rules that check auth but not shape/fields.
- Client writes `role: 'admin'` or `price` fields; uid taken from request body.
- Non-idempotent triggers; functions with no `maxInstances`; secrets in source.
- `firebase/compat/*` imports, or importing all of `firebase` in a client bundle.
- `any`-typed document data spread straight into components.

## Done checklist

- [ ] Each screen's queries listed; model serves them with bounded reads; indexes in `firestore.indexes.json`.
- [ ] Cursor pagination; no offset; no client-side filtering of large sets.
- [ ] Rules deny by default, validate shape/fields/immutables, and have allow + deny emulator tests.
- [ ] Privileged writes go through Functions/Nitro with verified tokens.
- [ ] Functions are idempotent, capped, use secrets properly, and avoid trigger loops.
- [ ] Modular SDK, single init, typed converters, SDK types converted before SSR payload.
- [ ] Cost estimate written for the hottest screen (reads per view x expected views).
