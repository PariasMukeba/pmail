# Aire — Claude Code Development Workflow

---

## Philosophy

Aire is built with Claude Code as a first-class development tool — not as a code
autocomplete, but as a disciplined engineering collaborator with explicit roles,
enforced standards, and verifiable outputs.

The core principle: **Claude writes code inside constraints, not around them.**
The constraints (CLAUDE.md non-negotiables, agent lanes, hook gates) exist
precisely because AI-assisted development can produce plausible-but-wrong code
at high speed. Every guard is there to catch a specific class of mistake.

---

## The feature pipeline

Every feature — large or small — follows the same sequence:

```
1. SPEC        claude --agent spec-agent "requirement"
                  └─ Writes specs/features/[name].md
                  └─ Must fill every section; no placeholder text
                  └─ Status: Draft — requires human sign-off to proceed

2. REVIEW      Human reads spec, approves or sends back
                  └─ Approval = Status: Approved in the spec file

3. IMPLEMENT   claude --agent code-agent specs/features/[name].md
                  └─ Reads CLAUDE.md before the first line of code
                  └─ Implements: types → schema → lib → API → components
                  └─ Runs npm run typecheck before stopping

4. REVIEW DIFF claude --agent review-agent <diff>
                  └─ Checks against spec + CLAUDE.md non-negotiables
                  └─ Returns structured pass/fail with line-level citations

5. TEST        claude --agent test-agent specs/features/[name].md
                  └─ Writes unit, integration, E2E, and AI behaviour tests
                  └─ Does NOT touch implementation files

6. COMMIT      git commit
                  └─ pre-commit: lint + typecheck + no-log guard
                  └─ commit-msg: format enforced
                  └─ pre-push: full test suite + coverage ≥ 80%
```

The `sync-agent` orchestrates steps 1→5 automatically. A human approves step 2.

---

## CLAUDE.md as the contract

`CLAUDE.md` is the single document that Claude Code agents, CI, and git hooks
all reference. It defines:

- **Non-negotiables** — rules that are never bent, and that hooks/CI enforce
- **Architecture constraints** — which modules are allowed to call what
- **Code style** — consistent choices that keep AI-generated code reviewable
- **Agent lanes** — what each agent may and may not touch

When a non-negotiable is violated:
- The `pre-commit` hook blocks the commit (log guard)
- The `review-agent` fails the review (any violation = fail)
- CI fails the PR

This means Claude Code cannot accidentally ship a security regression even when
operating autonomously — the checks run regardless of who (human or agent) wrote
the code.

---

## AI-first design decisions

These decisions are about using Claude intelligently, not just using it more:

**Prompts are pure functions.**
`lib/skills/ai/build-summary-prompt.ts` is a pure function that takes an email
and returns a `PromptMessages` array. It has no side effects and can be unit
tested without calling Claude. The AI behaviour tests assert on prompt structure,
not on Claude's output — making them deterministic and safe for CI.

**One call site for all AI.**
`lib/ai/email-ai.ts` is the only file that imports the Anthropic SDK. This
is enforced by the review-agent and documented in CLAUDE.md. It means:
- Email content never leaks to the browser (the call happens server-side)
- Prompt versioning and model switching happen in one place
- Mock in tests replaces one import, not a scattered set

**AI features fire on-open by default.**
SummaryCard and ActionSuggestions mount when the user opens an email.
They use SWR with `revalidateOnFocus: false` so the AI call fires once
per email view, not on every tab switch. This keeps costs predictable.

**Sync errors surface, never swallow.**
`POST /api/sync/all` returns `{ results: [{ accountId, synced, error? }] }`.
The `EmailListPane` reads this response and displays per-account errors inline.
Before this, errors were caught and silently returned as empty lists — making
debugging impossible without server logs.

**Plugin triggers.**
`AIFeaturePlugin.trigger` is `on-receive | on-open | on-demand`.
Plugins that run `on-receive` (e.g. newsletter detection) are cheap to run
at sync time on every message. Plugins that run `on-open` (e.g. summarisation)
run when the user actually looks at the email. `on-demand` plugins (e.g. reply
draft) only run on explicit user action. This is intentional cost architecture.

---

## Spec discipline

Specs live in `specs/features/`. They are written before code, not after.
A spec is not done unless it answers:

1. What does "done" look like? *(success criteria — measurable)*
2. What can go wrong? *(at least 3 edge cases)*
3. How do we prove it works? *(test plan: unit, integration, E2E, AI behaviour)*
4. What data changes? What API routes? What components?

The `spec-agent` is instructed to ask clarifying questions before writing,
to refuse to proceed on ambiguous requirements, and to never set `Status: Approved`
— that sign-off requires a human. This is a deliberate check on autonomous operation.

---

## Testing discipline

```
tests/
  unit/           — Skills (pure functions), utilities, error classes
  integration/    — API route handlers (with Prisma mocked or real SQLite)
  ai/             — AI prompt structure + response parsing (deterministic)
  e2e/            — Happy paths with Playwright (auth, compose, inbox, search, PWA)
  fixtures/       — Shared test data (emails, threads, accounts)
  mocks/          — Provider API mocks (Gmail, Microsoft, IMAP, Anthropic)
```

38 test files written spec-first. The `test-agent` writes tests from the spec,
before implementation — so tests document intent, not implementation details.

AI behaviour tests are isolated from the Anthropic API. They test that:
- The prompt builder produces the right message structure
- The response parser handles edge cases correctly (malformed JSON, missing fields)
- Priority/sentiment values are within expected ranges

This makes the test suite safe to run in CI without API credits.

---

## What Claude Code discipline looks like in practice

| Without discipline | With Aire's approach |
|-------------------|---------------------|
| "Add a summary feature" → code written immediately | Spec written first, edge cases identified, test plan agreed |
| Anthropic SDK imported wherever it's convenient | Single import in `lib/ai/email-ai.ts`; hook fails commit otherwise |
| Sync errors silently swallowed | Every error returned and surfaced in UI |
| 500 concurrent API requests crashing the provider | Concurrency pool of 20; rate limit awareness by design |
| `params` used as a Promise in Next.js 14 | CLAUDE.md documents the Next.js 14 constraint; code-agent reads it first |
| Free-form commit messages | commit-msg hook enforces `type: description` format |
| Coverage drops when a feature ships | pre-push hook blocks push if coverage < 80% |

The discipline is not about slowing down — it is about Claude Code producing
outputs that can be shipped confidently, not outputs that need to be audited line
by line before touching production.

---

*Developer: Parias Mukeba — pariasmukeba@gmail.com — github.com/PariasMukeba*
