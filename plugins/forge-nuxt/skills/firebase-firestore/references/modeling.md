# Firestore modeling worked examples

## Method

1. Write the access patterns as a table: screen, query, sort, page size, frequency, freshness.
2. For each, design the cheapest document read that answers it.
3. Decide where duplicated data lives and who keeps it consistent (client batch, trigger, never).
4. Write rules alongside the model; a model you cannot secure with rules needs a server path.
5. Estimate reads/writes per day for the top three screens.

## Example: freelance client portal

Access patterns:

| Screen | Query | Notes |
| --- | --- | --- |
| My projects | projects where memberIds contains uid, order by updatedAt desc, 20/page | most frequent |
| Project detail | project doc + latest 30 activity items | |
| Project tasks board | tasks of project where status in [...], order by position | realtime |
| Admin dashboard | totals: active projects, open tasks, invoiced this month | must be O(1) reads |

Model:

```
projects/{projectId}
  name, status, clientName, ownerId, memberIds: string[], updatedAt, createdAt,
  counts: { openTasks: number, doneTasks: number }        // aggregation fields
projects/{projectId}/tasks/{taskId}
  title, status, position, assignee: { uid, name, photoURL } // denormalized
projects/{projectId}/activity/{activityId}
  type, actor: { uid, name }, at, summary                   // append-only, written by functions
stats/{yyyy-mm}
  activeProjects, openTasks, invoicedMinor                  // written only by functions
```

Indexes:
- `projects`: `memberIds` (array-contains) + `updatedAt desc`.
- `tasks`: `status` + `position asc` (collection scope).

Consistency:
- `counts.openTasks` updated in the same batch as the task status change (client) only if rules can
  validate the delta; otherwise by an `onDocumentWritten` trigger on tasks.
- When a user changes display name, a function fans out updates to `assignee.name` copies. Accept
  short staleness; document it.
- `memberIds` capped (e.g. 50) and validated in rules; larger teams need a `memberships` collection.

## Example: booking / availability

Avoid computing availability by reading every booking. Precompute:

```
resources/{resourceId}/days/{yyyy-mm-dd}
  slots: { "09:00": "free" | "held" | "booked", ... }   // bounded map, one doc per day
bookings/{bookingId}
  resourceId, day, slot, userId, status, createdAt
```

Booking is a transaction: read the day doc, verify slot free, set slot to `booked`, create booking.
A single day doc is a write hotspot only at extreme volume; shard by resource if needed.

## Example: chat / comments

```
threads/{threadId}                 lastMessage: { text, at, authorName }, participantIds, updatedAt
threads/{threadId}/messages/{id}   text, authorId, at
```

- Thread list reads only `threads` (with `lastMessage` denormalized), never messages.
- Messages paginate backward with `orderBy('at','desc').limit(30)` + `startAfter`.
- Unread counts per user: `threads/{id}/readState/{uid}` with `lastReadAt`, or a per-user
  `inbox/{uid}/threads/{threadId}` fan-out for large participant lists.

## Choosing duplication strategy

| Data changes... | Strategy |
| --- | --- |
| Never (author at time of post) | Copy at write time, never update |
| Rarely (display name, avatar) | Copy + trigger fan-out, tolerate brief staleness |
| Often and must be exact (price, stock) | Do not copy; read source, or reference by id + fetch |

## Cost sanity check

`reads_per_view x views_per_day x 30`. If the hottest screen costs more than a few reads per view,
look for: missing aggregation doc, list rendering requiring per-item reads, realtime listeners on
broad queries re-firing, or rules using `get()` per document.
