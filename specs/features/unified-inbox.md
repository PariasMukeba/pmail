# Feature: Unified Inbox

## Status
[ ] Draft  [x] Reviewed  [ ] Implemented  [ ] Tested

## Problem
Users with multiple email accounts miss messages because they must check each
account separately. Pmail must present all accounts as a single, fast,
reverse-chronological thread list so nothing slips through.

## Success criteria
- [ ] Threads from all connected accounts appear interleaved, sorted by `lastMessageAt DESC`
- [ ] A list of 1 000 threads renders at 60 fps (virtualised rows, fixed height 72 px)
- [ ] Archive, snooze, and read/unread toggled from the list in one click (optimistic update)
- [ ] New mail appears within 10 s of arrival without a full page reload
- [ ] Each thread row shows an account colour-dot so accounts are distinguishable at a glance

## User stories
- As a user with Gmail + Outlook, I want to see all email in one list so I stop
  missing messages in the account I checked last.
- As a mobile user, I want swipe-to-archive so I can triage fast without opening threads.

## Technical approach

### Data changes
None. Reads from the existing `Thread` table (metadata only — no decryption).

### API changes
- `GET /api/threads?filter=all|unread|starred|attachments&limit=50&cursor=…`
  Returns paginated thread metadata. Subject/snippet/from decrypted server-side
  in the RSC layer; arrives at the client as plaintext strings (never re-stored).
- `PATCH /api/threads/:id` — toggle `isRead`, `isStarred`, `isSnoozed`
- `POST /api/threads/:id/archive` — move to ARCHIVE mailbox

### UI changes
```
<InboxPage>  [RSC — fetches first page]
  └─ <InboxClient>  [Client — owns SWR + virtual list]
       ├─ <FilterBar />
       └─ <VirtualList>
            └─ <ThreadRow account subject snippet time unreadCount aiPriority />
                 └─ <QuickActions />  [hover-reveal: archive, snooze, read]
```
SWR polling: 10 s while tab is visible; paused when hidden.
Zustand: `optimisticArchived: Set<string>` hides rows pending API confirmation;
reverts on failure with an error toast.

### AI changes
None in the critical path. `aiPriority` badge reads from the existing
`AIAnalysis.priority` column populated by background analysis jobs.

### Side effects
None beyond the existing sync jobs that keep `Thread` rows current.

## Edge cases
- **No accounts connected**: show onboarding prompt, not an empty list.
- **Sync is rate-limited**: stale badge shows on the account dot; list still renders.
- **Thread deleted on provider between page loads**: 404 from archive route → show
  toast "Email no longer exists", remove row optimistically.
- **Subject > 200 chars**: truncate with ellipsis in the row; full subject in thread view.

## Out of scope
- Bulk selection / bulk actions (separate spec)
- Drag-and-drop reordering between accounts
- Custom sort orders beyond reverse-chronological

## Test plan

### Unit tests
- `buildThreadListQuery`: filter → Prisma `where` clause
- `encodeCursor` / `decodeCursor`: round-trip for pagination cursor
- `deriveAccountColor`: same account ID always returns the same colour

### Integration tests
- `GET /api/threads`: all filter values; cursor pagination; 401 when unauthenticated;
  403 when `thread.accountId` does not belong to session user
- `PATCH /api/threads/:id`: ownership guard; invalid `isRead` type rejected by Zod
- `POST /api/threads/:id/archive`: happy path; ownership guard

### E2E tests
- Load inbox with two mock accounts; scroll to trigger load-more; archive a thread;
  verify it disappears; switch to "Unread" filter; mark a thread read; verify it disappears.

## Open questions
- [ ] Account colour derivation: hash of `account.id` into a fixed palette vs user-configurable?
  (design team, 2026-05-26)
