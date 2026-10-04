# Effects: decision guide and refactors

Ask in order. Stop at the first yes.

1. Can it be computed from current props/state? -> compute during render.
2. Is it caused by a specific user interaction? -> event handler.
3. Should state reset when an identity changes? -> `key`.
4. Is it data for rendering? -> Server Component / `use()` / query library.
5. Is it subscribing to something outside React that changes over time? -> `useSyncExternalStore`.
6. Is it synchronizing with an external system for as long as the component is mounted? -> `useEffect` with cleanup.

## Refactor 1: derived filtering

```tsx
// Before
const [visible, setVisible] = useState<Todo[]>([]);
useEffect(() => { setVisible(todos.filter(t => t.status === filter)); }, [todos, filter]);

// After (compiler memoizes if needed)
const visible = todos.filter(t => t.status === filter);
```

## Refactor 2: logic triggered by an action

```tsx
// Before: effect watches state set by a click
useEffect(() => { if (submitted) { toast('Saved'); track('save'); } }, [submitted]);

// After
async function handleSave() {
  await save();
  toast('Saved');
  track('save');
}
```

## Refactor 3: reset on identity change

```tsx
// Before
useEffect(() => { setDraft(''); }, [threadId]);

// After: parent remounts the editor per thread
<CommentEditor key={threadId} threadId={threadId} />
```

## Refactor 4: adjusting state during render (rare)

When part of state must respond to a prop change and `key` is too coarse, store the previous prop and adjust during render. Prefer restructuring first.

```tsx
const [prevItems, setPrevItems] = useState(items);
const [selection, setSelection] = useState<string | null>(null);
if (items !== prevItems) {
  setPrevItems(items);
  setSelection(null);
}
```

## Refactor 5: external store

```tsx
function useOnlineStatus() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb);
      window.addEventListener('offline', cb);
      return () => {
        window.removeEventListener('online', cb);
        window.removeEventListener('offline', cb);
      };
    },
    () => navigator.onLine,
    () => true, // server snapshot
  );
}
```

## Refactor 6: latest value in an effect without re-subscribing (React 19.2)

```tsx
const onMessage = useEffectEvent((msg: Message) => {
  if (!muted) notify(msg);          // always reads current `muted`
});

useEffect(() => {
  const conn = connect(roomId);
  conn.on('message', (msg) => onMessage(msg));
  return () => conn.disconnect();
}, [roomId]);                        // muted not a dependency
```

Verify `useEffectEvent` is exported as stable in the installed React version; do not call it outside effects.

## Legitimate effects (keep, with cleanup)

- `IntersectionObserver`, `ResizeObserver`, `matchMedia` listeners (or `useSyncExternalStore`).
- Integrating non-React widgets (maps, charts, video players): create in effect, destroy in cleanup.
- Firestore `onSnapshot` subscriptions in client leaves: return the unsubscribe.
- Document-level keyboard shortcuts.
- Focus management after a state change that is not tied to a single handler (prefer handler or ref callback first).

## Strict Mode

Dev double-invokes effects (mount -> cleanup -> mount). If that breaks behavior, the cleanup is wrong; do not disable Strict Mode. For one-time app init, use a module-level guard, not an effect.
