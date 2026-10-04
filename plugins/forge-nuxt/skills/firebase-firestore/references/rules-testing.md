# Testing security rules with the emulator

## Setup

```bash
npm i -D @firebase/rules-unit-testing vitest
firebase emulators:exec --only firestore "vitest run tests/rules"
```

```ts
// tests/rules/projects.test.ts
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-forge',            // demo-* ids never touch real projects
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

async function seedProject(id: string, ownerId: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `projects/${id}`), {
      ownerId, name: 'Site', status: 'active', createdAt: new Date(), updatedAt: new Date(),
    })
  })
}

describe('projects', () => {
  it('owner can read own project', async () => {
    await seedProject('p1', 'alice')
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(db, 'projects/p1')))
  })

  it('other user cannot read', async () => {
    await seedProject('p1', 'alice')
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(db, 'projects/p1')))
  })

  it('owner cannot change ownerId', async () => {
    await seedProject('p1', 'alice')
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(db, 'projects/p1'), { ownerId: 'bob' }))
  })

  it('rejects unknown fields on create', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'projects/p2'), {
      ownerId: 'alice', name: 'X', status: 'active',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isPaid: true,
    }))
  })

  it('unauthenticated cannot list', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'projects/p1')))
  })
})
```

## What to cover per collection

- Read: owner allowed, non-owner denied, unauthenticated denied.
- List queries: constrained query allowed, unconstrained query denied.
- Create: valid allowed; missing field, extra field, wrong type, spoofed owner each denied.
- Update: allowed fields only; immutable fields (`ownerId`, `createdAt`) denied; role escalation denied.
- Delete: matches intended policy.
- Custom claims: `authenticatedContext('admin', { role: 'admin' })` for role-gated paths.

## Rule-writing helpers

```
function unchanged(field) {
  return request.resource.data[field] == resource.data[field];
}
function onlyChanges(fields) {
  return request.resource.data.diff(resource.data).affectedKeys().hasOnly(fields);
}
function hasRole(role) {
  return request.auth != null && request.auth.token.role == role;
}
```

## CI

Run rules tests on every change to `firestore.rules`, `storage.rules` or the data model. Deploy rules
from the repository (`firebase deploy --only firestore:rules,firestore:indexes`), never by editing in
the console.
