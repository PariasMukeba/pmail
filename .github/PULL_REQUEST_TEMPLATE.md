# What does this PR do?

<!-- One paragraph. What problem does it solve, and how? -->

## Which spec does it implement?

Spec: <!-- Link: specs/features/[name].md -->

## Test plan

- [ ] Unit tests written and passing (`npm test`)
- [ ] Integration tests written and passing
- [ ] E2E tests written and passing (`npm run test:e2e`)
- [ ] AI behaviour tests written and passing (`npm run test:ai`) — if applicable
- [ ] Coverage ≥ 80% (`npm run test:coverage`)

## CLAUDE.md compliance

- [ ] TypeScript strict — no `any`, no `@ts-ignore`
- [ ] JSDoc on every new public function
- [ ] Zod schema on every new API route request body
- [ ] No email content (subjects, bodies, sender addresses) in console logs or error messages
- [ ] OAuth tokens not exposed in client-side code or localStorage
- [ ] All AI calls go through `lib/ai/email-ai.ts` (not called directly)
- [ ] All provider calls go through `lib/sync/` adapters (not called directly)
- [ ] Follows file naming conventions (PascalCase components, camelCase hooks/utils)

## How to test locally

```bash
# 1. Install dependencies
npm ci

# 2. Set environment variables
cp .env.example .env.local
# Fill in ENCRYPTION_SECRET, NEXTAUTH_SECRET, DATABASE_URL

# 3. Run unit + integration tests
npm test

# 4. Run the dev server
npm run dev

# 5. Specific manual test steps:
#    [describe what the reviewer should click/do to verify the feature]
```

## Screenshots / recordings

<!-- If this touches UI, include before/after screenshots or a screen recording. -->
