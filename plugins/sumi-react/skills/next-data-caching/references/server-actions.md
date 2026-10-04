# Server Action reference pattern

End-to-end example: schema shared between client and server, action with auth/validation/authorization/invalidation, and an accessible form consuming it.

## 1. Schema (shared)

```ts
// features/projects/schema.ts
import { z } from 'zod';

export const RenameProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, 'Use at least 2 characters').max(80),
});

export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message: string }
  | { status: 'error'; message?: string; fieldErrors?: Record<string, string[] | undefined> };

export const initialActionState: ActionState = { status: 'idle' };
```

zod 4 API (`z.flattenError`, `z.treeifyError`) differs from zod 3 (`error.flatten()`); match the installed version.

## 2. Data access layer

```ts
// features/projects/queries.ts
import 'server-only';
import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';

export const getOwnedProject = cache(async (id: string, userId: string) => {
  return db.project.findFirst({
    where: { id, ownerId: userId },
    select: { id: true, name: true, updatedAt: true },
  });
});

export async function listProjects(userId: string) {
  'use cache';
  cacheLife('minutes');
  cacheTag('projects', `projects:user:${userId}`);
  return db.project.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
}
```

## 3. Action

```ts
// features/projects/actions.ts
'use server';

import { updateTag } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { getOwnedProject } from './queries';
import { RenameProjectSchema, type ActionState } from './schema';

export async function renameProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();                       // 1. authenticate (throws/redirects)

  const parsed = RenameProjectSchema.safeParse({          // 2. validate
    id: formData.get('id'),
    name: formData.get('name'),
  });
  if (!parsed.success) {
    return { status: 'error', fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const project = await getOwnedProject(parsed.data.id, user.id); // 3. authorize
  if (!project) return { status: 'error', message: 'Project not found.' };

  try {
    await db.project.update({                            // 4. mutate
      where: { id: project.id },
      data: { name: parsed.data.name },
    });
  } catch (err) {
    console.error('renameProject failed', { projectId: project.id, err });
    return { status: 'error', message: 'Could not save. Try again.' };
  }

  updateTag(`project:${project.id}`);                      // 5. invalidate (read-your-writes)
  updateTag(`projects:user:${user.id}`);
  return { status: 'success', message: 'Project renamed.' }; // 6. typed result
}
```

If the action ends with navigation, call `redirect()` after the try/catch, never inside it.

## 4. Form (client leaf)

```tsx
'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import { renameProject } from '@/features/projects/actions';
import { initialActionState } from '@/features/projects/schema';

export function RenameProjectForm({ id, name }: { id: string; name: string }) {
  const [state, formAction] = useActionState(renameProject, initialActionState);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const nameError = state.status === 'error' ? state.fieldErrors?.name?.[0] : undefined;

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="id" value={id} />
      <label htmlFor={inputId}>Project name</label>
      <input
        id={inputId}
        name="name"
        defaultValue={name}
        required
        aria-invalid={nameError ? true : undefined}
        aria-describedby={nameError ? errorId : undefined}
      />
      {nameError && <p id={errorId}>{nameError}</p>}
      <SubmitButton />
      <p role="status" aria-live="polite">
        {state.status === 'success' ? state.message : state.status === 'error' ? state.message : ''}
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

Notes:
- Uncontrolled inputs with `defaultValue` + `FormData` are the default; the form works before hydration.
- React 19 resets uncontrolled forms after a successful action. If you need to keep values on error, return submitted values in state or use `key` deliberately.
- Run the same zod schema client-side only if you want instant inline validation; the server check is the one that counts.

## Firebase variant

- Verify the session cookie with `firebase-admin` (`verifySessionCookie(cookie, true)`) inside `requireUser()`.
- Writes via admin SDK bypass Security Rules - your action IS the rules. Authorize explicitly.
- After writes, invalidate tags the same way; Firestore realtime listeners on the client will update independently.
