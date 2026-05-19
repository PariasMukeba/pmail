# Architecture: System Overview

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## What Aire is

Aire is a server-side-rendered, AI-first email PWA. It connects to any number of
email accounts (Gmail, Outlook, IMAP), presents a unified inbox, and uses Claude
to summarise, categorise, draft, and prioritise email — all without storing
unencrypted content at rest.

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
    ├──── Prisma ORM ──────► PostgreSQL                      │
    │      (encrypted fields)                                │
    │                                                        │
    ├──── lib/ai/email-ai.ts ──► Anthropic Claude API        │
    │                                                        │
    ├──── lib/sync/ ──────────► Gmail API                    │
    │                      └──► Microsoft Graph API          │
    │                      └──► IMAP (nodemailer)            │
    │                                                        │
    └──── NextAuth v5 ────────► Google OAuth                 │
                           └──► Microsoft OAuth              │
                                                             │
BullMQ workers (same Next.js process in dev;                 │
 separate worker.ts process in prod) ────────────────────────┘
```

---

## Layer responsibilities

### `app/` — Presentation layer

- **React Server Components** fetch data directly via Prisma (no API round-trip).
- **Client Components** are islands: interactive widgets that receive data as props.
- `app/api/` route handlers handle mutations and webhook ingress only.
- No Prisma calls in Client Components — data always enters via RSC or SWR.

### `lib/` — Domain layer

| Path | Responsibility |
|------|---------------|
| `lib/ai/email-ai.ts` | **Only** place Anthropic SDK is called. Exposes typed functions; never leaks raw API responses to callers. |
| `lib/sync/` | Provider-specific adapters. Each exports `fetchMessages`, `sendMessage`, `watchChanges`. Route handlers never import Gmail or Graph SDKs directly. |
| `lib/crypto/` | AES-256-GCM encrypt/decrypt. Used by sync adapters before any DB write. |
| `lib/errors.ts` | Typed error classes. All throw sites use these. |
| `lib/constants.ts` | Named constants — no magic numbers anywhere else. |
| `lib/validators/` | Zod schemas shared between route handlers and tests. |

### `prisma/` — Data layer

Prisma ORM with PostgreSQL. Schema is the single source of truth for the data
model. Migrations are generated with `prisma migrate dev` and committed to git.

### BullMQ workers — Async layer

Long-running work (sync cycles, AI batch analysis) runs in BullMQ queues backed
by Redis. In development, workers run in the same process via `--experimental-worker`.
In production, a separate `worker.ts` entrypoint is deployed as a long-running
process alongside the Next.js server.

---

## Auth flow

```
User → /auth/signin
  → NextAuth v5 → Google OAuth / Microsoft OAuth
  → Callback stores { accessToken, refreshToken } encrypted in Account table
  → Session contains only { userId, email, name } — no tokens
  → All provider API calls use tokens fetched from DB server-side
```

Tokens never reach the browser. `NEXTAUTH_SECRET` rotates quarterly.

---

## Data flow for reading email

```
1. RSC: app/(inbox)/page.tsx
   └─ queries Thread table via Prisma (no decryption — list view uses metadata only)

2. RSC: app/(inbox)/[threadId]/page.tsx
   └─ queries Email table, calls lib/crypto/decrypt(email.bodyEncrypted)
   └─ passes decrypted body to Client Component as prop (server boundary)

3. Client Component renders body — body never round-trips through an API route
```

---

## Data flow for AI analysis

```
1. User clicks "Summarise" in browser
2. POST /api/ai/summarise { emailId }
3. Route handler:
   a. Validates session
   b. Fetches email from DB, decrypts body server-side
   c. Calls lib/ai/email-ai.ts → summariseEmail(decryptedBody)
   d. Anthropic SDK call — body never leaves the server
   e. Stores result in AIAnalysis table (summary, actionItems — no body copy)
   f. Returns { summary, actionItems, sentiment }
4. Client updates UI via SWR mutate
```

---

## PWA configuration

- `next-pwa` with Workbox for service worker generation.
- Offline shell: inbox list served from cache; email bodies are network-only.
- Manifest: `public/manifest.json` — installable on iOS and Android.
- Push notifications: Web Push API via `web-push` library, subscriptions stored in DB.

---

## Key technology choices and why

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 14 App Router | RSC lets us fetch data without client round-trips; built-in route handlers replace a separate API server |
| ORM | Prisma | Type-safe queries, migration tooling, schema-as-code |
| Auth | NextAuth v5 | First-class Next.js integration; handles OAuth token refresh automatically |
| State (client) | Zustand | Minimal boilerplate; avoids the over-fetching trap of Redux |
| State (server) | SWR | Stale-while-revalidate caching + optimistic updates out of the box |
| AI | Anthropic Claude API | Best-in-class instruction following for email tasks; prompt caching reduces cost |
| Queue | BullMQ + Redis | Reliable job processing with retries, delayed jobs, and rate limiting |
| Encryption | AES-256-GCM | Authenticated encryption; envelope pattern with per-account keys |

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial document | Project setup |
