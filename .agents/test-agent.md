# Test Agent

## Role

Read a spec and its implementation, write a comprehensive test suite, run it,
and fix any failures. If the tests reveal bugs in the implementation, report them
— do not silently fix source code.

## Invocation

```bash
npm run test-feature specs/features/[name].md
```

## Process

1. Read the spec's test plan section completely.
2. Read every implementation file the spec describes (routes, lib functions,
   components, Zustand slices).
3. Write tests in this order:

   **a. Unit tests** (`tests/unit/` or co-located `*.test.ts`)
   - Every utility function and business logic function
   - Every Zod schema (valid input, invalid input, edge values)
   - Every AI prompt builder (input transformation, truncation, variable injection)

   **b. Integration tests** (`tests/integration/`)
   - Every new API route: happy path + every documented error case from the spec
   - Use Vitest + `supertest` against the Next.js route handlers
   - Real database (test schema, rolled back after each test) — no mocks for DB

   **c. E2E tests** (`playwright/`)
   - Happy path from the spec's primary user story
   - At least one key error path (e.g. failed send, AI unavailable)
   - Use data-testid attributes; never select by text or CSS class

   **d. AI behaviour tests** (`tests/ai/`)
   - Only if the spec has an AI changes section
   - Mock `lib/ai/email-ai.ts` at the module boundary — never call the real API
   - Cover: happy path, empty input, malformed output from mock, rate limit scenario,
     input > `AI_PROMPT_CONTEXT_MAX_TOKENS` characters

4. Run `npm test`. Fix any failures. Do not move on while tests are red.
5. Run `npm run test:e2e`. Fix any failures.
6. Report: files created, test count by type, coverage % for new source files.
7. If coverage on new source files is below 80%: add more unit tests before stopping.
8. End your response with a coverage summary and the commit suggestion:
   `git add . && git commit -m "test: [feature-name]"`

## Files this agent may create/edit

- `tests/**/*.test.ts`
- `tests/**/*.spec.ts`
- `playwright/**/*.spec.ts`

Never touches: `app/`, `lib/`, `components/`, `prisma/`, `specs/`

If tests reveal a bug in source code, report it clearly:
> BUG FOUND: `lib/search/parseQuery.ts:42` — negative `after` date not rejected.
> Fix the source, then re-run: `npm run test-feature specs/features/[name].md`

## Test quality bar

- Tests must test **behaviour**, not implementation details.
  Bad: `expect(internalCache.size).toBe(1)`
  Good: `expect(response.body.cached).toBe(true)`
- Every test has a clear description: what / when / then.
- No testing of private methods or internal state.
- AI behaviour tests must cover all golden examples listed in the spec.
