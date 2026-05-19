# Architecture: Data Model

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## Design principles

1. **Email metadata in plaintext** — `subject`, `fromAddress`, `preview`, `isRead`,
   `isStarred`, `labels`, etc. are stored unencrypted to enable sorting and filtering
   without per-row decryption.
2. **IMAP passwords encrypted at rest** — `Account.imapPasswordEncrypted` stores
   AES-256-GCM ciphertext. All other credentials (OAuth tokens) are stored as-is
   in the NextAuth PrismaAdapter fields.
3. **Flat email cache** — emails are stored as `CachedEmail` rows (not a
   Thread+Email hierarchy). `threadId` groups messages for reply chains.
4. **No body copies in AI result columns** — `aiSummary` stores the derived output
   only; the original `bodyText`/`bodyHtml` is never duplicated.

---

## Actual Prisma schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"   // Change to "postgresql" for production
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?           // Required by PrismaAdapter
  image         String?             // Required by PrismaAdapter
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts          Account[]
  labels            Label[]
  pushSubscriptions PushSubscription[]
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String   @default("oauth")  // Required by PrismaAdapter

  // NextAuth provider fields
  provider          String
  providerAccountId String

  // OAuth token fields — snake_case required by PrismaAdapter
  access_token      String?
  refresh_token     String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  // Custom Aire fields
  imapHost              String?
  imapPort              Int?
  smtpHost              String?
  smtpPort              Int?
  imapUser              String?
  imapPasswordEncrypted String?   // AES-256-GCM ciphertext (JSON: {encrypted, iv, tag})
  email                 String?   // Display email address (patched after OAuth sign-in)
  displayName           String?
  color                 String   @default("#6366F1")
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  syncState SyncState?
  emails    CachedEmail[]
  labels    Label[]

  @@unique([provider, providerAccountId])
}

model SyncState {
  id            String    @id @default(cuid())
  accountId     String    @unique
  lastSyncedAt  DateTime?
  nextPageToken String?   // Gmail pagination token
  historyId     String?   // Gmail History API cursor for incremental sync
  deltaLink     String?   // Microsoft Graph delta link
  updatedAt     DateTime  @updatedAt

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
}

model CachedEmail {
  id               String   @id @default(cuid())
  accountId        String
  threadId         String   // Groups messages in the same conversation
  messageId        String   // Provider message ID (Gmail messageId, IMAP UID)
  subject          String   @default("")
  fromName         String   @default("")
  fromAddress      String   @default("")
  toAddresses      String   @default("[]")   // JSON: [{name, address}]
  ccAddresses      String   @default("[]")   // JSON: [{name, address}]
  preview          String   @default("")     // Snippet / first ~200 chars
  bodyText         String?                  // Plain-text body
  bodyHtml         String?                  // HTML body
  rawMime          String?
  date             DateTime
  receivedAt       DateTime @default(now())
  isRead           Boolean  @default(false)
  isStarred        Boolean  @default(false)
  isDraft          Boolean  @default(false)
  labels           String   @default("[]")  // JSON: ["inbox", "unread", ...]
  hasAttachments   Boolean  @default(false)
  aiPriority       String   @default("normal")  // "high" | "normal" | "low"
  aiSummary        String?
  aiActionItems    String?  // JSON array of action item strings
  inReplyTo        String?
  references       String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([accountId, messageId])
  @@index([accountId, date])
  @@index([accountId, threadId])
  @@index([accountId, isRead])
}

model Label {
  id        String   @id @default(cuid())
  userId    String
  accountId String?
  name      String
  color     String   @default("#6366F1")
  syncedId  String?
  isSystem  Boolean  @default(false)
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  account Account? @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@unique([userId, accountId, name])
}

model Draft {
  id              String   @id @default(cuid())
  accountId       String
  userId          String
  toAddresses     String   @default("[]")
  ccAddresses     String   @default("[]")
  bccAddresses    String   @default("[]")
  subject         String   @default("")
  body            String   @default("")
  attachments     String   @default("[]")
  providerDraftId String?
  inReplyToId     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## PrismaAdapter requirements

NextAuth v5's PrismaAdapter expects **exact field names** on the `Account` model.
Missing or renamed fields cause a `Unknown argument` error on sign-in:

| Field | Type | Required by |
|-------|------|-------------|
| `type` | `String` | PrismaAdapter |
| `access_token` | `String?` | PrismaAdapter (OAuth token) |
| `refresh_token` | `String?` | PrismaAdapter (OAuth token) |
| `expires_at` | `Int?` | PrismaAdapter (epoch seconds) |
| `token_type` | `String?` | PrismaAdapter |
| `scope` | `String?` | PrismaAdapter |
| `id_token` | `String?` | PrismaAdapter |
| `session_state` | `String?` | PrismaAdapter |
| `emailVerified` | `DateTime?` on User | PrismaAdapter |
| `image` | `String?` on User | PrismaAdapter |

The `email` field on `Account` is not set by PrismaAdapter — it is patched
in the `signIn` callback in `auth.ts` after OAuth completes.

---

## IMAP password encryption

```
ENCRYPTION_SECRET (env var)
    │  SHA-256 → 32-byte AES key
    ▼
lib/skills/crypto/encrypt-imap-password.ts
    └─ AES-256-GCM(plaintext, randomIV)
    └─ stores { encrypted (hex), iv (hex), tag (hex) }
    └─ JSON-stringified into Account.imapPasswordEncrypted
```

OAuth tokens (`access_token`, `refresh_token`) are stored as-is — they are
server-side-only values never returned to the browser.

---

## Label storage

Labels are stored as a JSON array string in `CachedEmail.labels`:

```json
["inbox", "unread", "important"]
```

Gmail label IDs are normalised in `lib/sync/gmail.ts`:

| Gmail label ID | Stored as |
|----------------|-----------|
| `INBOX` | `"inbox"` |
| `UNREAD` | `"unread"` |
| `STARRED` | `"starred"` |
| `DRAFT` | `"draft"` |
| `TRASH` | `"trash"` |
| `SENT` | `"sent"` |
| `IMPORTANT` | `"important"` |

SQLite string-contains is used for label filtering:
`WHERE labels LIKE '%"inbox"%'`

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial schema | Project setup |
| 2026-05-19 | Rewrote to match actual Prisma schema | Original doc described planned encrypted schema; actual implementation uses flat CachedEmail with plaintext fields |
