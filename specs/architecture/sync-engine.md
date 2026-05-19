# Architecture: Sync Engine

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## Overview

The sync engine pulls email from providers and writes it to the `CachedEmail`
table. It runs **in-request** — triggered by API route handlers, not a
background queue. The UI reads from the database; the sync keeps it current.

---

## Provider adapters

All provider-specific code lives in `lib/sync/`. Each adapter implements
`EmailProvider` from `lib/sync/types.ts`:

```typescript
interface EmailProvider {
  fetchEmails(accountId: string, options: FetchOptions): Promise<SyncResult>;
  fetchThread(accountId: string, threadId: string): Promise<EmailData[]>;
  fetchAttachment(accountId: string, messageId: string, attachmentId: string): Promise<Buffer>;
  markRead(accountId: string, messageIds: string[]): Promise<void>;
  archive(accountId: string, messageIds: string[]): Promise<void>;
  trash(accountId: string, messageIds: string[]): Promise<void>;
  applyLabel(accountId: string, messageIds: string[], labelId: string): Promise<void>;
  sendEmail(accountId: string, draft: DraftData): Promise<SentResult>;
}
```

The registry in `lib/sync/index.ts` maps provider strings to adapters:

```
"google" | "gmail"                    → gmailAdapter
"microsoft-entra-id" | "office365"   → microsoftAdapter
"credentials" | "imap"               → imapAdapter
```

NextAuth stores `provider: "google"` in the DB; the registry aliases both forms.

---

## Sync trigger

```
POST /api/sync/all
  ├─ Finds all Account rows for session.user.id where isActive=true
  ├─ For each account (in parallel):
  │    ├─ Calls adapter.fetchEmails(account.id, { incremental, maxResults })
  │    ├─ Upserts each EmailData into CachedEmail
  │    └─ Upserts SyncState (cursor for next incremental sync)
  └─ Returns { results: [{ accountId, synced, error? }] }
```

Errors per-account are non-fatal — other accounts continue syncing.
The full error message is returned in `results[].error` and shown in the UI.

Sync is also triggered by:
- `EmailListPane` auto-sync on first empty load
- Manual refresh button (RefreshCw icon in list header)
- SWR 30-second polling interval (re-fetches email list, not full sync)

---

## Gmail adapter (`lib/sync/gmail.ts`)

### Authentication

OAuth tokens stored in `Account.access_token` / `Account.refresh_token`.
The adapter refreshes proactively if `expires_at - now < 60s`.
Token refresh uses `POST https://oauth2.googleapis.com/token` with
`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

### Message fetching

```
1. GET /gmail/v1/users/me/messages?maxResults=N&labelIds=INBOX
   → Returns list of { id, threadId } refs (no content)

2. For each ref — individual GET /gmail/v1/users/me/messages/{id}?format=FULL
   → 20-worker concurrency pool (not sequential, not unlimited parallel)
   → Avoids Gmail rate limits while keeping throughput high
```

**Important**: The Gmail REST API has no `batchGet` endpoint for messages
(only `batchDelete` and `batchModify`). Individual fetches are the correct approach.

### Label normalisation

Gmail label IDs are mapped to lowercase strings:
`INBOX→inbox`, `UNREAD→unread`, `STARRED→starred`, `DRAFT→draft`, etc.

### Incremental sync

`SyncState.historyId` stores the Gmail History ID from the most recent message.
Future syncs can use `GET /users/me/history?startHistoryId={id}` to fetch only
changes since the last sync. Currently the first sync does a full page fetch;
incremental is wired but not yet active.

---

## Microsoft adapter (`lib/sync/microsoft.ts`)

Uses Microsoft Graph API delta queries:
- Full sync: `GET /me/mailFolders/inbox/messages`
- Incremental: `GET /me/mailFolders/inbox/messages/delta?$deltaToken={cursor}`
- Cursor stored as `SyncState.deltaLink`

Token refresh uses `https://login.microsoftonline.com/common/oauth2/v2.0/token`.

---

## IMAP adapter (`lib/sync/imap.ts`)

Uses the `imap` npm package (Node.js only — excluded from webpack bundle via
`serverExternalPackages`).

```
1. Connect with stored credentials (decrypt imapPasswordEncrypted)
2. SELECT INBOX
3. FETCH UIDs for recent messages
4. Parse with mailparser → EmailData[]
```

IMAP passwords are encrypted with AES-256-GCM using `ENCRYPTION_SECRET`.
Decryption happens in `lib/skills/crypto/decrypt-imap-password.ts`.

---

## Write path

```
adapter.fetchEmails() → EmailData[]

For each EmailData:
  prisma.cachedEmail.upsert({
    where: { accountId_messageId: { accountId, messageId } },
    create: { all fields },
    update: { isRead, isStarred, labels }   // only mutable state updated
  })

prisma.syncState.upsert({
  where: { accountId },
  update: { lastSyncedAt, historyId?, deltaLink?, nextPageToken? }
})
```

Upsert on `(accountId, messageId)` makes sync idempotent — re-running never
creates duplicates.

---

## Sending email

```
POST /api/send { accountId, to, cc, bcc, subject, body, inReplyToId? }
  → adapter.sendEmail(accountId, draft)
  → Gmail: builds RFC 2822 message, base64url-encodes, POST /users/me/messages/send
  → Microsoft: POST /me/sendMail
  → IMAP: nodemailer SMTP transport
```

---

## Error handling

| Error | Behaviour |
|-------|-----------|
| 401 from Gmail | Auto-refresh token, retry once |
| 403 from Gmail | Thrown as SyncError — usually means Gmail API not enabled in GCP or missing OAuth scopes |
| Token refresh fails | AuthError thrown → returned in sync results as error string |
| IMAP connection fails | `verifyImapConnection()` returns false → CredentialsSignin error at sign-in |
| Any other error | Caught in `/api/sync/all`, returned as `{ error: string }` per account, shown in UI |

---

## Rate limiting

`MAX_EMAILS_PER_SYNC = 100` caps the initial fetch. Increase in `lib/constants.ts`
for production. The 20-worker concurrency pool for Gmail respects per-user rate
limits without explicit backoff logic (individual 429s will surface as SyncErrors).

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial document | Project setup |
| 2026-05-19 | Rewrote to match actual implementation | Original doc described BullMQ/Redis/IMAP-IDLE architecture; actual implementation uses in-request sync with concurrency pool |
