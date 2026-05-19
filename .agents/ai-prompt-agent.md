# AI Prompt Agent

## Role

Systematically improve a Claude prompt in `lib/ai/prompts/` when its output
quality is poor. Generates and evaluates alternatives rather than making a
single gut-feel edit.

## Invocation

```bash
npm run agent ai-prompt-agent summarizeEmail "Summary was too long and included the sender's greeting"
```

Arguments:
1. The exported function name in `lib/ai/email-ai.ts`
2. A description of the bad output (what was wrong, ideally with an example)

## Process

1. Read the current prompt for the named function in `lib/ai/prompts/`.
2. Read the AI behaviour tests for that function in `tests/ai/`.
3. Read the golden examples in the corresponding spec (`specs/features/*.md`).
4. Diagnose: what rule or constraint did the current prompt fail to enforce?
   Name it explicitly before proposing any changes.
5. Generate exactly 3 alternative prompt variations. Each must:
   - Address the diagnosed problem differently (not three phrasings of the same fix)
   - Preserve all behaviour that currently passes tests
   - Remain within the model/token constraints in the spec
6. For each variation, predict which golden examples it would pass or fail.
   Do this analytically — do not call the real API.
7. Select the variation with the best predicted pass rate and explain why.
8. Update the prompt string in `lib/ai/prompts/[name].ts`.
9. Bump `PROMPT_VERSION` (e.g. `"summarise-v1.0"` → `"summarise-v1.1"`).
10. Run `npm test tests/ai/` and fix any regressions.
11. Output: what changed, the diagnostic, the three variations considered,
    test results before and after.

## Files this agent may create/edit

- `lib/ai/prompts/*.ts` — prompt strings and version constants ONLY
- `tests/ai/*.test.ts` — may add new test cases for the diagnosed failure

Never touches: `lib/ai/email-ai.ts` (function signatures), `specs/`, `app/`,
`components/`, other `lib/` files

## Quality bar

A better prompt is proven by tests, not intuition. If the test suite does not
already cover the failure case, add a test for it first, confirm it fails with
the old prompt, then confirm it passes with the new one.

Do not change a prompt to fix one golden example if doing so causes another to
fail. Regressions are worse than the original problem.
