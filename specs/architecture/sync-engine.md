# Architecture: Sync Engine

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## Overview

The sync engine is responsible for pulling email from providers, encrypting it,
and writing it to the Aire database. It runs as a set of BullMQ jobs. The UI
never calls providers directly — it reads from the database, which the sync
engine keeps current.

---

## Provider adapters

All provider-specific code lives in `lib/sync/`. Each adapter implements the
same interface:

```typescript
// lib/sync/types.ts
interface EmailAdapter {
  /** Fetch all new messages since the last sync cursor. Returns a cursor for the next call. */
  fetchDelta(accountId: string, cursor: SyncCursor | null): Promise<DeltaResult>;

  /** Fetch a single message by provider ID (used for webhook-triggered fetches). */
  fetchMessage(accountId: string, providerMessageId: string): Promise<RawMessage>;

  /** Send a composed message. */
  sendMessage(accountId: string, draft: OutboundDraft): Promise<SentReceipt>;

  /** Register a push channel so the provider notifies us of new mail. */
  registerWatch(accountId: string): Promise<WatchHandle>;
}
```

Adapters: `lib/sync/gmail.ts`, `lib/sync/microsoft.ts`, `lib/sync/imap.ts`.
Route handlers import only from `lib/sync/index.ts` (re-exports typed functions).

---

## Sync strategies by provider

### Gmail

**Primary**: Gmail History API (delta sync)
- On first sync: full message list for INBOX, last 90 days.
- Subsequent syncs: `GET /gmail/v1/users/me/history?startHistoryId={cursor}`.
- Cursor stored as `SyncState.gmailHistoryId`.
- Captures: `messagesAdded`, `messagesDeleted`, `labelsAdded`, `labelsRemoved`.

**Push**: Gmail Pub/Sub watch
- On account connect: `POST /gmail/v1/users/me/watch { topicName }`.
- Google pushes a notification to `POST /api/webhooks/gmail` within seconds of
  new mail arriving.
- The webhook handler enqueues a `gmail-delta` job; it does NOT process inline
  (webhook must respond < 10 s).
- Watch tokens expire every 7 days — a daily cron job renews them.

**Fallback**: If History API returns `404` (history expired), fall back to
full re-sync for the last 30 days.

### Microsoft Graph

**Primary**: Graph delta queries
- `GET /me/mailFolders/inbox/messages/delta?$deltaToken={cursor}`.
- Cursor stored as `SyncState.graphDeltaToken`.

**Push**: Graph change notifications
- `POST /subscriptions { resource: "me/messages", notificationUrl }`.
- Subscription expires every 3 days — renewed by cron.
- Webhook at `POST /api/webhooks/microsoft`.

### IMAP

**Primary**: IMAP IDLE command (RFC 2177)
- Opens a persistent IMAP connection per account.
- Server sends `EXISTS` or `RECENT` unsolicited responses on new mail.
- On notification, fetch new UIDs via `UID SEARCH UNSEEN`.
- Cursor stored as `SyncState.imapUidNext`.

**Fallback**: Polling every 5 minutes if IDLE is not supported (`CAPABILITY` check).

**Note**: IMAP connections are long-lived — they run in the worker process, not
in Next.js route handlers.

---

## Job queue structure

```
Queue: "email-sync"
  ├─ Job: "initial-sync"     priority 10  (first-time account setup)
  ├─ Job: "delta-sync"       priority 5   (triggered by webhook or cron)
  ├─ Job: "full-resync"      priority 1   (recovery after history expiry)
  └─ Job: "send-message"     priority 10  (user action — highest priority)

Queue: "ai-analysis"
  └─ Job: "analyse-email"    priority 1   (background; runs after delta-sync)

Queue: "maintenance"
  ├─ Job: "renew-watches"    cron: "0 2 * * *"  (daily at 02:00 UTC)
  └─ Job: "prune-old-jobs"   cron: "0 3 * * 0"  (weekly)
```

BullMQ configuration:
- `removeOnComplete: 100` (keep last 100 completed jobs per queue for debugging)
- `removeOnFail: 500`
- `attempts: 3`, `backoff: { type: "exponential", delay: 2000 }`

---

## Write path (sync → database)

```
1. Adapter.fetchDelta() returns RawMessage[]

2. For each RawMessage:
   a. Derive or fetch per-account encryption key from Account.encryptedKey
      (decrypt with master key, cache in-process for the duration of the job)
   b. Encrypt: bodyText, bodyHtml, subject, fromAddress, toAddresses
      using AES-256-GCM. IV prepended to ciphertext.
   c. Upsert Thread (update lastMessageAt, unreadCount, snippetEncrypted)
   d. Upsert Email (all encrypted fields)
   e. Upsert Attachments metadata (content stored separately via storageKey)
   f. Update SyncState.gmailHistoryId (or equivalent)

3. Enqueue "analyse-email" jobs for new emails > AI_MIN_BODY_WORDS words
   (word count estimated from sizeEstimate without decrypting)
```

All steps within a single sync cycle run in a Prisma transaction. If the
transaction fails, the job retries with the same cursor — idempotent by design
because of `upsert`.

---

## Conflict resolution

Provider data wins. If the Aire DB has `isRead = false` but Gmail reports the
message as read, the sync engine writes `isRead = true`. Local optimistic
updates are overwritten on the next delta.

Exception: drafts. Drafts modified locally but not yet sent are NOT overwritten
by sync. The `isDraft = true` flag locks the email from sync writes until sent
or discarded.

---

## Rate limiting

Gmail: 250 quota units/user/second. The adapter sleeps 200 ms between batch
requests. If a 429 is returned, the job is re-queued with a 60 s delay and
`SyncState.status` is set to `RATE_LIMITED`.

Microsoft Graph: 10 000 requests/10 minutes. Similar backoff pattern.

IMAP: No formal rate limit, but we limit to 1 concurrent connection per account.

---

## Error states

| Error | SyncState.status | Recovery |
|-------|-----------------|---------|
| Token expired | ERROR | NextAuth refreshes token on next route handler call; sync retries |
| History expired (Gmail) | ERROR | Auto-triggers full-resync job |
| Account disconnected | ERROR | User prompted to reconnect in UI |
| Persistent 5xx from provider | ERROR | Exponential backoff × 3, then ERROR; user notified |

---

## Security notes

- The per-account encryption key is held in worker process memory only for the
  duration of a sync job. It is never written to logs or passed between processes.
- Webhook endpoints (`/api/webhooks/gmail`, `/api/webhooks/microsoft`) verify
  request signatures before enqueuing any job.
  - Gmail: validates `X-Goog-Resource-State` and checks Pub/Sub push token.
  - Microsoft: validates `validationToken` handshake and HMAC signature.

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial document | Project setup |
