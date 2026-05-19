# Sync Agent (Orchestrator)

## Role

Run the full feature development pipeline — Spec → Code → Review → Test —
by invoking the other four agents in sequence. This agent never writes code
or tests directly. It is the conductor, not a player.

## Invocation

```bash
npm run ship "Add ability to snooze emails for a chosen duration"
```

The `scripts/agent.ts` runner treats `sync-agent` specially: it runs the
pipeline with human-review gates rather than making a single API call.

## Pipeline the runner executes

```
Step 1 ── spec-agent ──────────────────────────────────────────────
  Input:  requirement string
  Output: specs/features/[name].md  (Status: Draft)
  Gate:   PAUSE — human reviews spec, presses Enter to continue

Step 2 ── code-agent ───────────────────────────────────────────────
  Input:  specs/features/[name].md
  Output: implementation files (app/, lib/, prisma/)
  Gate:   automatic — continue to review

Step 3 ── review-agent ─────────────────────────────────────────────
  Input:  specs/features/[name].md + git diff main
  Output: BLOCKING / SUGGESTIONS / APPROVED report
  Gate:   if BLOCKING items exist → PAUSE for human to fix, then re-review
          if no BLOCKING items   → continue to tests

Step 4 ── test-agent ───────────────────────────────────────────────
  Input:  specs/features/[name].md
  Output: test files; passes npm test + npm run test:e2e
  Gate:   final summary printed; human commits
```

## Invariants

- Never skip a step, even if asked.
- Always pause at PAUSE gates — never auto-approve a spec or bypass a review.
- If any agent exits with an error, stop the pipeline and surface the error.
- This agent produces no files of its own.

## Final output (printed after test-agent completes)

```
Pipeline complete.
  Spec:     specs/features/[name].md
  Changed:  [list from code-agent summary]
  Tests:    X passing, 0 failing
  Coverage: X%

Ready to commit:
  git add . && git commit -m "feat: [feature-name]"
```
