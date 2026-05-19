# Architecture: Data Model

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## Design principles

1. **Email content is always encrypted at rest.** `bodyEncrypted`, `subjectEncrypted`,
   `fromAddressEncrypted`, and `toAddressesEncrypted` are AES-256-GCM ciphertext.
   Decryption happens in `lib/crypto/` at the application layer — never in SQL.
2. **Metadata is stored in plaintext** to enable sorting, filtering, and counting
   without decrypting every row. Metadata: `receivedAt`, `isRead`, `hasAttachments`,
   `sizeEstimate`, `threadId`, `labelIds`.
3. **No body copies in AI tables.** `AIAnalysis` stores derived outputs (summaries,
   action items) but never a copy of the email body.
4. **Tokens are encrypted with an envelope pattern.** Each `Account` row stores
   `accessToken` and `refreshToken` encrypted with a per-account key, which is
   itself encrypted with the application master key (`ENCRYPTION_MASTER_KEY` env var).

---

## Full schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Identity ────────────────────────────────────────────────────────────────

model User {
  id        String    @id @default(cuid())
  email     String    @unique
  name      String?
  avatarUrl String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  accounts  Account[]
  contacts  Contact[]
  settings  UserSettings?

  @@index([email])
}

model UserSettings {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  aiSummariseEnabled  Boolean  @default(true)
  aiReplyEnabled      Boolean  @default(true)
  theme               String   @default("system") // "light" | "dark" | "system"
  notificationsEnabled Boolean @default(true)
  updatedAt           DateTime @updatedAt
}

// ─── Email accounts ───────────────────────────────────────────────────────────

model Account {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider            Provider
  providerAccountId   String    // Gmail: user's Google sub; Graph: AAD object ID
  emailAddress        String    // plaintext — used only for display
  displayName         String?

  // Envelope-encrypted OAuth tokens. Plaintext values never written to DB.
  accessTokenEncrypted  Bytes
  refreshTokenEncrypted Bytes
  encryptedKeyIv        Bytes   // IV for the per-account key ciphertext
  encryptedKey          Bytes   // per-account encryption key, wrapped with master key
  tokenExpiresAt        DateTime?
  scope                 String?

  mailboxes   Mailbox[]
  threads     Thread[]
  emails      Email[]
  labels      Label[]
  syncState   SyncState?
  pushSubscriptions PushSubscription[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([provider, providerAccountId])
  @@index([userId])
}

enum Provider {
  GMAIL
  MICROSOFT
  IMAP
}

// ─── Mailboxes / folders ──────────────────────────────────────────────────────

model Mailbox {
  id              String       @id @default(cuid())
  accountId       String
  account         Account      @relation(fields: [accountId], references: [id], onDelete: Cascade)
  name            String       // display name ("INBOX", "Sent", "Archive")
  type            MailboxType
  providerFolderId String?     // Gmail labelId, Graph folderId, or IMAP path
  unreadCount     Int          @default(0)
  totalCount      Int          @default(0)
  updatedAt       DateTime     @updatedAt

  @@unique([accountId, type])
  @@index([accountId])
}

enum MailboxType {
  INBOX
  SENT
  DRAFTS
  TRASH
  SPAM
  ARCHIVE
  CUSTOM
}

// ─── Labels ───────────────────────────────────────────────────────────────────

model Label {
  id               String   @id @default(cuid())
  accountId        String
  account          Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  name             String
  color            String   @default("#6B7280")
  providerLabelId  String?  // Gmail labelId
  isSystem         Boolean  @default(false) // true for provider-native labels

  threadLabels ThreadLabel[]

  @@unique([accountId, name])
  @@index([accountId])
}

model ThreadLabel {
  threadId String
  thread   Thread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  labelId  String
  label    Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@id([threadId, labelId])
}

// ─── Threads & emails ─────────────────────────────────────────────────────────

model Thread {
  id               String    @id @default(cuid())
  accountId        String
  account          Account   @relation(fields: [accountId], references: [id], onDelete: Cascade)
  providerThreadId String?   // Gmail threadId

  // Metadata (plaintext) — used for list view without decryption
  lastMessageAt    DateTime
  messageCount     Int       @default(1)
  unreadCount      Int       @default(0)
  hasAttachments   Boolean   @default(false)
  isStarred        Boolean   @default(false)
  isSnoozed        Boolean   @default(false)
  snoozedUntil     DateTime?

  // Encrypted preview fields — decrypted only for display in thread list
  subjectEncrypted      Bytes
  snippetEncrypted      Bytes  // first ~200 chars of latest message body
  fromAddressEncrypted  Bytes  // most recent sender

  emails       Email[]
  labels       ThreadLabel[]
  aiSummaries  ThreadAISummary[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([accountId, providerThreadId])
  @@index([accountId, lastMessageAt(sort: Desc)])
  @@index([accountId, unreadCount])
}

model Email {
  id              String   @id @default(cuid())
  threadId        String
  thread          Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  accountId       String
  account         Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  providerEmailId String?  // Gmail messageId

  // Metadata (plaintext)
  receivedAt      DateTime
  sentAt          DateTime?
  isRead          Boolean  @default(false)
  isDraft         Boolean  @default(false)
  isOutbound      Boolean  @default(false) // true for sent mail
  hasAttachments  Boolean  @default(false)
  sizeEstimate    Int?     // bytes

  // Encrypted content
  fromAddressEncrypted  Bytes
  toAddressesEncrypted  Bytes  // JSON array, encrypted
  ccAddressesEncrypted  Bytes?
  subjectEncrypted      Bytes
  bodyHtmlEncrypted     Bytes?
  bodyTextEncrypted     Bytes
  // Each field encrypted independently with the account key.
  // IV is prepended to the ciphertext (first 12 bytes).

  attachments   Attachment[]
  aiAnalyses    AIAnalysis[]

  createdAt     DateTime @default(now())

  @@unique([accountId, providerEmailId])
  @@index([threadId, receivedAt(sort: Desc)])
}

model Attachment {
  id          String   @id @default(cuid())
  emailId     String
  email       Email    @relation(fields: [emailId], references: [id], onDelete: Cascade)
  filename    String   // plaintext — filename is not sensitive
  mimeType    String
  sizeBytes   Int
  storageKey  String   // object storage path (content is stored encrypted separately)
  createdAt   DateTime @default(now())

  @@index([emailId])
}

// ─── AI outputs ───────────────────────────────────────────────────────────────

model AIAnalysis {
  id            String   @id @default(cuid())
  emailId       String
  email         Email    @relation(fields: [emailId], references: [id], onDelete: Cascade)

  // Derived outputs only — no body copy
  summary       String   // 1-3 sentences
  actionItems   String[] // extracted to-dos
  sentiment     Sentiment
  category      EmailCategory
  priority      Int      @default(0) // 0 (low) – 3 (urgent)

  // Provenance — critical for auditing prompt changes
  promptVersion String   // e.g. "summarise-v1.2"
  model         String   // e.g. "claude-sonnet-4-6"

  createdAt     DateTime @default(now())

  @@index([emailId])
}

model ThreadAISummary {
  id            String   @id @default(cuid())
  threadId      String
  thread        Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  summary       String
  promptVersion String
  model         String
  createdAt     DateTime @default(now())

  @@index([threadId])
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
  URGENT
}

enum EmailCategory {
  PERSONAL
  WORK
  NEWSLETTER
  NOTIFICATION
  RECEIPT
  SPAM
  OTHER
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

model Contact {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailAddress String   // plaintext — used for autocomplete
  name         String?
  avatarUrl    String?
  frequency    Int      @default(0) // higher = contacted more often; used for autocomplete ranking

  updatedAt    DateTime @updatedAt

  @@unique([userId, emailAddress])
  @@index([userId, frequency(sort: Desc)])
}

// ─── Sync state ───────────────────────────────────────────────────────────────

model SyncState {
  id            String     @id @default(cuid())
  accountId     String     @unique
  account       Account    @relation(fields: [accountId], references: [id], onDelete: Cascade)
  status        SyncStatus @default(IDLE)
  lastSyncAt    DateTime?
  // Provider-specific cursor for delta sync
  gmailHistoryId   String? // Gmail History API
  graphDeltaToken  String? // Microsoft Graph delta link
  imapUidValidity  Int?    // IMAP UIDVALIDITY
  imapUidNext      Int?    // IMAP UIDNEXT

  errorMessage  String?
  updatedAt     DateTime @updatedAt
}

enum SyncStatus {
  IDLE
  SYNCING
  ERROR
  RATE_LIMITED
}

// ─── Push notifications ───────────────────────────────────────────────────────

model PushSubscription {
  id          String   @id @default(cuid())
  accountId   String
  account     Account  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  endpoint    String   @unique
  p256dhKey   String
  authKey     String
  createdAt   DateTime @default(now())
}
```

---

## Encryption key hierarchy

```
ENCRYPTION_MASTER_KEY (env var, never in DB)
    │
    ▼ wraps
Account.encryptedKey  (per-account AES-256 key, stored encrypted in DB)
    │
    ▼ encrypts
Email.bodyTextEncrypted, Email.subjectEncrypted, ...
```

The master key rotates by re-encrypting all `Account.encryptedKey` values.
Email ciphertext does not need to be re-encrypted on master key rotation.

---

## Search strategy

Full-text search requires decryption. We decrypt on read in a tightly scoped
server function (`lib/search/searchEmails.ts`) and never cache plaintext. This
is an accepted trade-off — the alternative (deterministic encryption for
indexed fields) would weaken the security of those fields.

For subject and sender, we use deterministic encryption (AES-SIV) to allow
exact-match lookups without full decryption scans.

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial schema | Project setup |
