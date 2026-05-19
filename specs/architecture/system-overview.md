# Architecture: System Overview

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## What Aire is

Aire is a server-side-rendered, AI-first email PWA. It connects to any number of
email accounts (Gmail, Outlook, IMAP), presents a unified inbox, and uses Claude
to summarise, categorise, draft, and prioritise email.

---

## High-level diagram

```
Browser (PWA)
    │  HTTPS
    ▼
Next.js 14 App Router  ─────────────────────────────────────┐
  app/                  (React Server Components + Client)   │
  app/api/              (Route Handlers — all auth-gated)    │
    │                                                        │
    ├──── Prisma ORM ──────► SQLite (dev) / PostgreSQL (prod)│
    │                                                        │
    ├──── lib/ai/email-ai.ts ──► Anthropic Claude API        │
    │                                                        │
    ├──── lib/sync/ ──────────► Gmail REST API               │
    │                      └──► Microsoft Graph API          │
    │                      └──► IMAP (imap npm package)      │
    │                                                        │
    └──── NextAuth v5 ────────► Google OAuth                 │
                           └──► Microsoft OAuth              │
                           └──► IMAP Credentials             │
```

---

## Layer responsibilities

### `app/` — Presentation layer

- **React Server Components** protect routes via session check in layout.
- **Client Components** fetch data via SWR from API routes.
- `app/api/` route handlers handle all data mutations and reads.
- No direct Prisma calls in Client Components.

### `lib/` — Domain layer

| Path | Responsibility |
|------|----------------|
| `lib/ai/email-ai.ts` | Only place Anthropic SDK is called. Exposes typed functions. |
| `lib/sync/` | Provider adapters: `gmail.ts`, `microsoft.ts`, `imap.ts`. Each implements `EmailProvider`. Route handlers never import Gmail/Graph/IMAP directly. |
| `lib/sync/index.ts` | Registry — maps provider strings (`"google"`, `"gmail"`, `"microsoft-entra-id"`, etc.) to the correct adapter. |
| `lib/inbox.ts` | `queryInbox()` — single source of truth for email list queries with all filter logic. |
| `lib/skills/crypto/` | AES-256-GCM encrypt/decrypt for IMAP passwords only. |
| `lib/errors.ts` | Typed error classes used at all throw sites. |
| `lib/constants.ts` | Named constants — no magic numbers elsewhere. |
| `lib/stores/` | Zustand stores: `useEmailStore`, `useComposeStore`, `useUIStore`. |

### `prisma/` — Data layer

Prisma ORM with SQLite in development, PostgreSQL in production. Schema is the
single source of truth. Migrations committed to git.

---

## Auth architecture

NextAuth v5 uses a **split config** required by the Edge middleware runtime:

| File | Used by | Constraint |
|------|---------|-----------|
| `auth.config.ts` | `middleware.ts` | Edge-compatible only — no Node.js imports |
| `auth.ts` | API routes, Server Components | Full Node.js — imports PrismaAdapter |

Session strategy: **JWT**. The PrismaAdapter creates `User` and `Account` rows on
sign-in but session data travels as a signed JWT cookie, not a database session.

**Token storage**: OAuth `access_token` and `refresh_token` are stored in the
`Account` table (snake_case fields required by PrismaAdapter). The Gmail and
Microsoft adapters refresh tokens automatically on 401 responses.

**Provider name mapping**: NextAuth stores `provider: "google"` but the sync
registry key is `"gmail"`. Both are aliased in `lib/sync/index.ts`.

```
User signs in with Google
  → PrismaAdapter creates/updates User + Account rows
  → JWT callback: token.userId = user.id
  → Session: session.user.id = token.userId
  → All API routes read session.user.id to scope DB queries
```

---

## Data flow for reading email

```
1. User lands on /inbox (requires session — MainLayout redirects if not authed)

2. EmailListPane mounts → SWR fetches GET /api/emails
   └─ On empty result: auto-triggers POST /api/sync/all

3. POST /api/sync/all
   └─ Finds all Account rows for session.user.id where isActive=true
   └─ For each account: calls adapter.fetchEmails()
      └─ Gmail: GET /users/me/messages (list) → 20 concurrent GETs for full messages
      └─ IMAP: connects, fetches headers + body
   └─ Upserts results into CachedEmail table
   └─ Upserts SyncState (historyId / deltaLink for incremental future syncs)

4. SWR mutate() re-fetches GET /api/emails → list renders
```

---

## Data flow for AI analysis

```
1. User views email → SummaryCard mounts → POST /api/ai/summarize { emailId }
2. Route handler:
   a. Validates session, fetches email from CachedEmail
   b. Calls lib/ai/email-ai.ts → summarizeEmail(email)
   c. Anthropic SDK called server-side — body never leaves the server
   d. Returns { summary }
3. SWR caches result; card renders summary
```

---

## Sync engine

Sync runs in-request (no background queue). `POST /api/sync/all` is called:
- Automatically on first page load when inbox is empty
- Manually via the refresh button
- Via SWR's 30-second polling interval

**Gmail**: No `batchGet` endpoint exists in the Gmail REST API. Messages are
fetched individually using a 20-worker concurrency pool to balance throughput
against rate limits.

**IMAP/nodemailer/mailparser** are excluded from the browser/Edge bundle via
`serverExternalPackages` in `next.config.mjs`.

---

## PWA configuration

- `@ducanh2912/next-pwa` with Workbox for service worker generation.
- Offline shell: `app/offline/page.tsx`.
- Manifest: `public/manifest.json` — installable on iOS and Android.
- Push notifications: Web Push API via `web-push`, subscriptions in DB.

---

## Key technology choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 App Router | RSC + built-in route handlers |
| ORM | Prisma | Type-safe queries, migration tooling |
| Auth | NextAuth v5 | First-class Next.js integration, OAuth token refresh |
| State (client) | Zustand | Minimal boilerplate |
| State (server) | SWR | Stale-while-revalidate + optimistic updates |
| AI | Anthropic Claude API | Best instruction following for email tasks |
| DB (dev) | SQLite | Zero-config local development |
| DB (prod) | PostgreSQL | Production-grade, same Prisma schema |

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial document | Project setup |
| 2026-05-19 | Updated to match actual implementation | Removed BullMQ/Redis/encryption references that were planned but not built |
