# Aire — Architecture

**One-page overview for technical review**

---

## What it is

Aire is an AI-first universal email PWA. It connects Gmail, Outlook, and any
IMAP account into a single unified inbox. Claude runs inline — every email
gets a summary, priority score, reply draft, and action suggestions without
the user asking.

---

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 App Router | RSC + route handlers in one process; no separate API server |
| Language | TypeScript (strict) | `any` is banned; errors are typed, never `catch (e: unknown)` improvised |
| Styling | Tailwind CSS | Design tokens in CSS variables; dark-first theme |
| Auth | NextAuth v5 + PrismaAdapter | OAuth (Google, Microsoft) + IMAP credentials; JWT strategy |
| Database | Prisma / SQLite → PostgreSQL | Schema-as-code; same schema works in dev and prod |
| State (server) | SWR | Stale-while-revalidate, 30s polling, optimistic mutations |
| State (client) | Zustand | `useEmailStore`, `useComposeStore`, `useUIStore` |
| AI | Anthropic Claude API | All calls funnelled through `lib/ai/email-ai.ts` — never called directly |
| PWA | @ducanh2912/next-pwa | Workbox service worker, installable, offline shell |

---

## Directory map

```
app/
  (main)/           — authenticated shell (inbox, reading pane, compose)
  (marketing)/      — public landing page (8 sections, unauthenticated)
  api/
    accounts/       — GET connected accounts
    emails/         — GET list, GET :id, PATCH flags
    sync/           — POST all, POST :accountId
    send/           — POST outbound email
    ai/             — POST summarize, reply-draft, prioritize, suggest-actions
    auth/           — NextAuth handler
    webhooks/       — Gmail Pub/Sub, Microsoft Graph push
lib/
  ai/email-ai.ts    — ONLY file that imports Anthropic SDK
  sync/             — Provider adapters (gmail, microsoft, imap) + registry
  skills/           — Pure functions: AI prompts, crypto, email parsing, labels
  plugins/          — Extension interfaces: EmailProviderPlugin, AIFeaturePlugin
  stores/           — Zustand slices
  inbox.ts          — queryInbox() — single source of truth for email queries
  errors.ts         — Typed error classes (AuthError, SyncError, SendError…)
  constants.ts      — All magic numbers live here
components/
  layout/           — Sidebar, EmailListPane, ReadingPane, AccountSwitcher
  email/            — EmailRow, EmailBody (all actions wired), ThreadView
  compose/          — ComposeOverlay, ComposeWindow, RecipientInput
  ai/               — SummaryCard, ActionSuggestions, ReplyDraftButton
prisma/
  schema.prisma     — User, Account, CachedEmail, SyncState, Draft, Label
specs/              — Feature specs written before code; reviewed before implement
tests/              — Unit, integration, E2E, AI behaviour (38 files)
.agents/            — Claude Code agent definitions (spec, code, review, test, sync)
.github/workflows/  — CI, deploy, AI prompt regression
.husky/             — pre-commit (lint + typecheck + no-log guard), commit-msg, pre-push
```

---

## Auth split (required by NextAuth v5 Edge runtime)

```
middleware.ts  →  auth.config.ts   (Edge-compatible, no Node.js imports)
API routes     →  auth.ts          (Full Node.js, PrismaAdapter, all providers)
```

The middleware protects every route under `/(main)` and allows `/`, `/auth/*`,
and `/api/auth/*` through without a session.

---

## Sync engine

```
POST /api/sync/all
  ├─ Find active Account rows for session.user.id
  └─ For each (parallel):
       getProviderAdapter(account.provider)       ← registry maps "google"→gmailAdapter
         .fetchEmails(accountId, { maxResults: 100 })
           Gmail:     GET /messages (list) → 20-worker concurrent GETs
           Microsoft: Graph delta query
           IMAP:      SELECT INBOX, FETCH recent UIDs
       prisma.cachedEmail.upsert(×N)              ← idempotent by (accountId, messageId)
       prisma.syncState.upsert(cursor)
  └─ Returns { results: [{ accountId, synced, error? }] }
       — errors shown inline in email list, never swallowed
```

---

## AI integration

All Claude calls go through `lib/ai/email-ai.ts` which:
1. Builds prompts via pure functions in `lib/skills/ai/`
2. Calls the Anthropic SDK
3. Parses and validates the response
4. Returns a typed result

No component or route handler ever imports the Anthropic SDK directly.
This means prompts are testable in isolation (`tests/ai/`), swappable,
and the security boundary (email content never reaching the browser) is enforceable.

```
GET /api/ai/summarize  →  buildSummaryPrompt(email)  →  Claude  →  { summary }
GET /api/ai/prioritize →  buildPriorityPrompt(email) →  Claude  →  "high"|"normal"|"low"
GET /api/ai/reply-draft→  buildReplyPrompt(email, tone) → Claude → { draft }
```

---

## Plugin system

Two extension points, both server-side only:

- **`EmailProviderPlugin`** — add a new email provider (Fastmail, ProtonMail bridge, etc.)
  without touching core sync code
- **`AIFeaturePlugin`** — add a new AI feature (meeting extractor, tone analyser, etc.)
  with a `trigger` of `on-receive`, `on-open`, or `on-demand`

Plugins register via `lib/plugins/registry.ts` and are loaded once at startup.
The reading pane calls `renderResult()` to display plugin UI as a Client Component.

---

## Testing strategy

| Layer | Tool | Location |
|-------|------|----------|
| Unit — skills & utils | Vitest | `tests/unit/` |
| Integration — API routes | Vitest + MSW | `tests/integration/` |
| AI behaviour — prompts | Vitest | `tests/ai/` |
| E2E — happy paths | Playwright | `tests/e2e/` |

AI behaviour tests assert on prompt structure and response parsing — not on
Claude's output verbatim. This makes them deterministic and safe to run in CI.
Coverage threshold: **80%** enforced by the pre-push hook.

---

*Developer: Parias Mukeba — pariasmukeba@gmail.com — github.com/PariasMukeba*
