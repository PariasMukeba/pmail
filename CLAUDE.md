# CLAUDE.md — Pmail Email Client

## Project identity

Pmail is an AI-first universal email PWA. Stack: Next.js 14 App Router, TypeScript,
Tailwind, Prisma/SQLite (dev) / PostgreSQL (prod), NextAuth v5, Anthropic Claude API,
Zustand, SWR.

GitHub: https://github.com/PariasMukeba/pmail

---

## Non-negotiables (never violate these)

- Never store email body content unencrypted at rest
- Never log email content, subjects, or sender addresses to console or telemetry
- Never expose OAuth tokens in client-side code or browser storage
- All AI calls must go through `lib/ai/email-ai.ts` — never call Anthropic SDK directly
  from components or API routes
- All external email provider calls must go through `lib/sync/` adapters —
  never call Gmail/Graph/IMAP directly from API routes
- TypeScript strict mode is on — never use `any`, never use `@ts-ignore`
- Every new public function needs a JSDoc comment
- Every new API route needs a Zod schema for its request body

---

## Environment setup

Copy `.env.example` to `.env.local` and fill in every value before running.

```
NEXTAUTH_URL=http://localhost:3001        # Must match the port your dev server runs on
AUTH_SECRET=<openssl rand -base64 32>     # NextAuth v5 reads AUTH_SECRET (not NEXTAUTH_SECRET)
NEXTAUTH_SECRET=<same value>             # Keep both — auth.ts falls back to NEXTAUTH_SECRET

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...

ANTHROPIC_API_KEY=...

DATABASE_URL=file:./dev.db               # Prisma CLI reads .env, not .env.local
                                          # Keep DATABASE_URL in both files

ENCRYPTION_SECRET=<openssl rand -base64 32>  # Required for IMAP password encryption

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@yourdomain.com
```

**Critical**: `NEXTAUTH_URL` must match your actual dev server port. If you run on
`:3001` and `NEXTAUTH_URL` points to `:3000`, OAuth callbacks land on the wrong port
and Gmail/Microsoft APIs return 403.

Also register `http://localhost:3001/api/auth/callback/google` as an authorised
redirect URI in Google Cloud Console, and enable the **Gmail API** in your project.

---

## Auth architecture

NextAuth v5 uses a **split config** required by the Edge runtime:

| File | Used by | Can import Node.js modules? |
|------|---------|----------------------------|
| `auth.config.ts` | `middleware.ts` only | No — Edge-compatible only |
| `auth.ts` | API routes, Server Components | Yes — full Node.js |

**PrismaAdapter requirements** — the `Account` model must have these exact
snake_case fields or sign-in crashes with "Unknown argument" errors:

```
type, access_token, refresh_token, expires_at, token_type,
scope, id_token, session_state
```

**Provider name mapping** — NextAuth stores `provider: "google"` in the DB, but
our sync code uses `"gmail"`. Both are aliased in `lib/sync/index.ts`.

**Secret** — `auth.ts` passes `secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`
so either variable works. NextAuth v5 looks for `AUTH_SECRET` by default.

---

## Database

SQLite in development (`prisma/dev.db`), PostgreSQL in production.

```bash
# First-time setup
npx prisma migrate dev

# After schema changes
npx prisma migrate dev --name <description>

# Open GUI
npx prisma studio
```

Prisma CLI reads `.env` (not `.env.local`). Keep `DATABASE_URL` in `.env`.

---

## Sync engine

Email sync runs in-request via `POST /api/sync/all`. No background queue.

- **Gmail**: lists messages with `GET /users/me/messages`, then fetches each
  individually with a 20-worker concurrency pool. `batchGet` does not exist in
  the Gmail REST API.
- **Microsoft**: uses Graph delta queries via `lib/sync/microsoft.ts`.
- **IMAP**: uses the `imap` npm package via `lib/sync/imap.ts`.

`serverExternalPackages: ["imap", "mailparser", "nodemailer"]` in `next.config.mjs`
prevents webpack from bundling these Node-only modules.

Initial sync cap: `MAX_EMAILS_PER_SYNC = 100` (in `lib/constants.ts`).

---

## Sidebar label → API param mapping

Sidebar folder IDs map to specific API query params in `EmailListPane`:

| Sidebar ID | API param | DB filter |
|------------|-----------|-----------|
| `unified` | (none) | all emails |
| `starred` | `starred=true` | `isStarred = true` |
| `attachments` | `hasAttachments=true` | `hasAttachments = true` |
| `priority` | `priority=high` | `aiPriority = "high"` |
| `drafts` | `drafts=true` | `isDraft = true` |
| `trash` | `label=trash` | labels JSON contains "trash" |
| anything else | `label=<value>` | labels JSON contains value |

---

## Key API routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/emails` | Paginated email list with filters |
| GET | `/api/emails/:id` | Single email + thread |
| PATCH | `/api/emails/:id` | Update flags (isRead, isStarred, archived, trashed) |
| GET | `/api/accounts` | List connected accounts for the current user |
| POST | `/api/sync/all` | Sync all accounts, returns per-account results with errors |
| POST | `/api/sync/:accountId` | Sync one account |
| POST | `/api/send` | Send email via provider adapter |
| POST | `/api/ai/summarize` | Generate AI summary for an email |
| POST | `/api/ai/reply-draft` | Generate AI reply draft |
| POST | `/api/ai/prioritize` | Score email priority (high/normal/low) |
| POST | `/api/ai/suggest-actions` | Suggest action labels for an email |

---

## How to start a new feature

1. Write a spec first: `specs/features/[feature-name].md` (use the spec template)
2. Get spec reviewed (run: `claude review-spec specs/features/[feature-name].md`)
3. Only then generate code (run: `claude implement-spec specs/features/[feature-name].md`)
4. Run tests: `npm test`
5. Run type-check: `npm run typecheck`
6. Commit: `git add . && git commit -m "feat: [feature-name]"`

---

## File naming conventions

- Components: PascalCase.tsx (`EmailRow.tsx`)
- Hooks: camelCase starting with `use` (`useEmailSync.ts`)
- Utilities: camelCase.ts (`formatDate.ts`)
- API routes: `route.ts` inside descriptive folders
- Specs: kebab-case.md (`reply-draft-ai.md`)
- Tests: `[filename].test.ts` or `[filename].spec.ts` co-located with source

---

## Code style rules

- Prefer named exports over default exports (except `page.tsx` files)
- Prefer composition over inheritance
- Prefer small, focused functions (< 40 lines each)
- No magic numbers — use named constants in `lib/constants.ts`
- Error handling: always use typed errors from `lib/errors.ts`
- Async: always use async/await, never raw Promises
- Never use `useEffect` to sync state — use Zustand actions or SWR
- Next.js 14: route `params` are plain objects, not Promises — do not use `use(params)`

---

## Agent roles (see `.agents/`)

When running in multi-agent mode, agents have strict lanes:

- **spec-agent**: reads requirements, writes specs
- **code-agent**: reads specs, writes implementation
- **review-agent**: reads diffs, checks against spec + conventions
- **test-agent**: reads specs + code, writes/runs tests
- **sync-agent**: orchestrates the others in sequence

No agent should operate outside its lane.

---

## Test requirements

Every feature must have:

- Unit tests for all utility functions and AI prompt logic
- Integration tests for all API routes
- At minimum one E2E test for the happy path
- AI behaviour tests for any Claude prompt (see `tests/ai/`)

---

## Commit message format

```
feat: add [thing]       — new feature
fix: [what] in [where]  — bug fix
test: [what]            — adding tests only
refactor: [what]        — no behaviour change
docs: [what]            — spec or README only
chore: [what]           — config, deps, tooling
```
