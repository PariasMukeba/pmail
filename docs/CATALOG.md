# Aire — Agents, Skills, Hooks & Plugins Catalog

---

## Claude Code Agents (`.agents/`)

Each agent has a strictly scoped role. No agent may touch files outside its lane.
Invoked via `npm run <role> [input]` or `claude --agent <role> [input]`.

| Agent | File | Role | Input | Output | Off-limits |
|-------|------|------|-------|--------|------------|
| **spec-agent** | `spec-agent.md` | Turns a plain-English requirement into a complete spec. Asks clarifying questions before writing. Sets `Status: Draft` — never APPROVED. | Requirement string | `specs/features/[name].md` | `app/`, `lib/`, `prisma/`, `tests/` |
| **code-agent** | `code-agent.md` | Reads an APPROVED spec and implements it — schema, routes, lib, components. Runs typecheck before stopping. | Spec file path | Implementation files | `specs/`, `tests/` |
| **review-agent** | `review-agent.md` | Reads a git diff and checks it against the spec + CLAUDE.md non-negotiables. Returns a structured pass/fail report. | Diff or PR number | Review report | All source files (read-only) |
| **test-agent** | `test-agent.md` | Reads spec + implementation, writes unit, integration, E2E, and AI behaviour tests. | Spec + implementation paths | `tests/**/*.test.ts` | `app/`, `lib/`, `prisma/` |
| **ai-prompt-agent** | `ai-prompt-agent.md` | Iterates on prompts in `lib/skills/ai/`. Runs AI behaviour tests after each change. Never touches product code. | Prompt file path | Updated skill files | Anything outside `lib/skills/ai/` |
| **sync-agent** | `sync-agent.md` | Orchestrates the full feature pipeline: spec-agent → code-agent → review-agent → test-agent in sequence. Stops on any failure. | Requirement string | Fully implemented + tested feature | N/A (meta-agent) |

### Agent discipline rules
- Every agent reads `CLAUDE.md` before acting — non-negotiables apply to all
- Agents never write outside their lane (enforced by explicit file allow-lists)
- `review-agent` runs on every PR; it will fail the review if a non-negotiable is violated
- `sync-agent` never skips a step, even if the human asks

---

## Skills (`lib/skills/`)

Pure functions with no side effects. Importable anywhere on the server.
Tested in isolation in `tests/unit/skills/`.

### AI Skills (`lib/skills/ai/`)

| Skill | Function | Purpose |
|-------|----------|---------|
| `build-summary-prompt.ts` | `buildSummaryPrompt(email)` | Builds the Claude messages array for email summarisation. Returns structured `PromptMessages`. |
| `build-reply-prompt.ts` | `buildReplyPrompt(email, tone)` | Builds the reply-draft prompt. `tone` is `"professional" \| "friendly" \| "brief"`. |
| `build-priority-prompt.ts` | `buildPriorityPrompt(email)` | Builds the priority-scoring prompt. Instructs Claude to return exactly one of `high`, `normal`, `low`. |
| `parse-priority-response.ts` | `parsePriorityResponse(raw)` | Parses Claude's text output into a typed `Priority` value. Falls back to `"normal"` on malformed output. |

### Email Skills (`lib/skills/email/`)

| Skill | Function | Purpose |
|-------|----------|---------|
| `parse-mime.ts` | `parseMime(raw)` | Parses a raw RFC 2822 MIME string into `ParsedEmail` with extracted text, HTML, and attachment metadata. |
| `extract-thread.ts` | `extractThreads(emails)` | Groups a flat array of emails into conversation threads by `In-Reply-To` / `References` headers. |
| `detect-newsletter.ts` | `detectNewsletter(email)` | Heuristic detection of newsletters and bulk mail. Returns `{ isNewsletter, confidence, signals }`. |
| `sanitize-html.ts` | `sanitizeHtml(html)` | Strips dangerous tags/attributes from HTML email bodies before rendering in an iframe. |

### Sync Skills (`lib/skills/sync/`)

| Skill | Function | Purpose |
|-------|----------|---------|
| `map-gmail-labels.ts` | `mapGmailLabels(labelIds)` | Maps Gmail system label IDs (`INBOX`, `UNREAD`, etc.) to Aire's normalised label strings. |
| `refresh-gmail-token.ts` | `refreshGmailToken(accountId)` | Exchanges a refresh token for a new access token and updates the `Account` row. |

### Crypto Skills (`lib/skills/crypto/`)

| Skill | Function | Purpose |
|-------|----------|---------|
| `encrypt-imap-password.ts` | `encryptImapPassword(plaintext)` | AES-256-GCM encryption of IMAP passwords. Returns `{ encrypted, iv, tag }`. Key derived from `ENCRYPTION_SECRET`. |
| `decrypt-imap-password.ts` | `decryptImapPassword(encrypted)` | Inverse of the above. Called only server-side by the IMAP adapter. |

### Format Skills (`lib/skills/format/`)

| Skill | Function | Purpose |
|-------|----------|---------|
| `relative-date.ts` | `formatRelativeDate(date)` | Returns human-relative strings: "2 min ago", "Yesterday", "May 19" — localised, no external lib. |

---

## Git Hooks (`.husky/`)

Hooks run locally on every developer machine. They enforce the same standards
that CI enforces — meaning broken code never reaches a PR.

### `pre-commit`
Runs on every `git commit`. Blocks if any check fails.

1. **lint-staged** — ESLint + Prettier on staged `.ts`/`.tsx` files only (fast)
2. **typecheck** — `tsc --noEmit` strict mode across the whole project
3. **no-log guard** — scans staged files for `console.log` calls referencing
   `email`, `subject`, `body`, `sender`, or `recipient`. Blocks the commit if
   found — this is a CLAUDE.md non-negotiable enforced at the git layer.

### `commit-msg`
Validates the commit message format before the commit is recorded.

```
Allowed:  feat: add [thing]
          fix: [what] in [where]
          test: [what]
          refactor: [what]
          docs: [what]
          chore: [what]
```

Rejects free-form messages, JIRA-style prefixes, or missing type prefixes.

### `pre-push`
Runs on every `git push`. Blocks if tests fail.

1. **Full test suite** — `npm test` (Vitest unit + integration + AI behaviour)
2. **Coverage threshold** — `npm run test:coverage` — Vitest enforces ≥ 80%
   overall. Push is blocked if coverage drops below threshold.

---

## Plugins (`lib/plugins/`)

The plugin system provides two extension interfaces. Both run **server-side only**.
Plugin UI is rendered via a thin `renderResult()` Client Component boundary.

### `EmailProviderPlugin`

Adds support for a new email provider without touching core sync code.

| Method | Purpose |
|--------|---------|
| `connect(credentials)` | Authenticate and return a connection handle |
| `testConnection(conn)` | Health check — used by settings UI |
| `fetchEmails(conn, opts)` | Delta or full sync; returns `RawMessage[]` + cursor |
| `fetchThread(conn, threadId)` | Full thread with all messages |
| `sendEmail(conn, draft)` | Outbound send |
| `markRead / archive / trash` | Mutation operations |

**Built-in providers**: Gmail (`lib/sync/gmail.ts`), Microsoft (`lib/sync/microsoft.ts`), IMAP (`lib/sync/imap.ts`)

**Plugin providers (scaffold)**: Fastmail (`lib/plugins/providers/fastmail.ts`), ProtonMail bridge (`lib/plugins/providers/protonmail.ts`)

### `AIFeaturePlugin`

Adds an AI-powered feature to the reading or compose experience.

| Field/Method | Purpose |
|-------------|---------|
| `trigger` | `"on-receive"` \| `"on-open"` \| `"on-demand"` — when the plugin runs |
| `process(email, context)` | Server-side AI processing. Must call Claude via `lib/ai/email-ai.ts`. |
| `renderResult(result)` | Client Component renderer — presentational only |

**Built-in AI features (scaffold)**:
- `action-items.ts` — extracts to-do items from email body
- `meeting-extractor.ts` — detects meeting invites, proposed times, participants
- `tone-analyzer.ts` — scores sender tone (urgent / neutral / positive / negative)

### Plugin registry

```typescript
// lib/plugins/registry.ts
registerProvider(plugin: EmailProviderPlugin): void
registerAIFeature(plugin: AIFeaturePlugin): void
getProvider(id: string): EmailProviderPlugin | undefined
getAIFeature(id: string): AIFeaturePlugin | undefined
getAIFeaturesByTrigger(trigger): AIFeaturePlugin[]
```

Plugins register once at server startup via `lib/plugins/loader.ts`.
Duplicate IDs are silently skipped (safe for hot reloads in development).

---

## CI Workflows (`.github/workflows/`)

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `ci.yml` | Every push + PR | Lint, typecheck, unit tests, integration tests, coverage report |
| `deploy.yml` | Push to `main` | Build, migrate DB, deploy to production |
| `ai-prompt-regression.yml` | PR touching `lib/skills/ai/` | Runs AI behaviour tests only — fast gate specifically for prompt changes |

The AI prompt regression workflow is a deliberate design choice: prompt changes
get their own fast feedback loop without running the full suite.

---

*Developer: Parias Mukeba — pariasmukeba@gmail.com — github.com/PariasMukeba*
