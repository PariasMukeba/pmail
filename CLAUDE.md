# CLAUDE.md — Aire Email Client

## Project identity

Aire is an AI-first universal email PWA. Stack: Next.js 14 App Router, TypeScript,
Tailwind, Prisma/PostgreSQL, NextAuth v5, Anthropic Claude API, Zustand, SWR.

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

## How to start a new feature

1. Write a spec first: `specs/features/[feature-name].md` (use the spec template)
2. Get spec reviewed (run: `claude review-spec specs/features/[feature-name].md`)
3. Only then generate code (run: `claude implement-spec specs/features/[feature-name].md`)
4. Run tests: `npm test`
5. Run type-check: `npm run typecheck`
6. Commit: `git add . && git commit -m "feat: [feature-name]"`

## File naming conventions

- Components: PascalCase.tsx (`EmailRow.tsx`)
- Hooks: camelCase starting with `use` (`useEmailSync.ts`)
- Utilities: camelCase.ts (`formatDate.ts`)
- API routes: `route.ts` inside descriptive folders
- Specs: kebab-case.md (`reply-draft-ai.md`)
- Tests: `[filename].test.ts` or `[filename].spec.ts` co-located with source

## Code style rules

- Prefer named exports over default exports (except `page.tsx` files)
- Prefer composition over inheritance
- Prefer small, focused functions (< 40 lines each)
- No magic numbers — use named constants in `lib/constants.ts`
- Error handling: always use typed errors from `lib/errors.ts`
- Async: always use async/await, never raw Promises
- Never use `useEffect` to sync state — use Zustand actions or SWR

## Agent roles (see `.agents/`)

When running in multi-agent mode, agents have strict lanes:

- **spec-agent**: reads requirements, writes specs
- **code-agent**: reads specs, writes implementation
- **review-agent**: reads diffs, checks against spec + conventions
- **test-agent**: reads specs + code, writes/runs tests
- **sync-agent**: orchestrates the others in sequence

No agent should operate outside its lane.

## Test requirements

Every feature must have:

- Unit tests for all utility functions and AI prompt logic
- Integration tests for all API routes
- At minimum one E2E test for the happy path
- AI behaviour tests for any Claude prompt (see `tests/ai/`)

## Commit message format

```
feat: add [thing]       — new feature
fix: [what] in [where]  — bug fix
test: [what]            — adding tests only
refactor: [what]        — no behaviour change
docs: [what]            — spec or README only
chore: [what]           — config, deps, tooling
```
