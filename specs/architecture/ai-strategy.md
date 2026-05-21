# Architecture: AI Strategy

**Last updated**: 2026-05-19
**Status**: CURRENT

---

## Guiding principle

AI in Pmail is a layer on top of email, not the foundation of it. Every AI feature
must degrade gracefully — the inbox must be fully usable with AI calls turned off
or failing. AI results are always advisory; users take the final action.

---

## The one rule

**All Anthropic SDK calls go through `lib/ai/email-ai.ts`.**

Nothing else in the codebase imports `@anthropic-ai/sdk`. This centralises:
- API key management
- Prompt caching headers
- Error handling and retry logic
- Cost tracking hooks
- Prompt versioning

---

## When we call Claude

| Trigger | Timing | User-visible? | Cached? |
|---------|--------|---------------|---------|
| User clicks "Summarise" | On demand | Yes — streaming | Yes — in `AIAnalysis` |
| User clicks "Draft Reply" | On demand | Yes — streaming | No — always fresh |
| Email arrives (background) | Post-sync, async | No — silent | Yes — in `AIAnalysis` |
| User runs Search | On demand | Yes — instant | No — ephemeral |
| Category/priority scoring | Post-sync, async | No — updates badge | Yes — in `AIAnalysis` |

**Background analysis** runs as a BullMQ job after each sync cycle. It only
processes emails that have no existing `AIAnalysis` row and are longer than
`AI_MIN_BODY_WORDS` (default: 100). Short emails (receipts, notifications) are
skipped to control cost.

---

## Model selection

| Use case | Model | Reason |
|----------|-------|--------|
| Summarise, categorise, prioritise | `claude-sonnet-4-6` | Fast, cheap, accurate for structured extraction |
| Draft reply | `claude-sonnet-4-6` | Good at tone-matching; fast enough for interactive use |
| Thread-level summary (long threads) | `claude-sonnet-4-6` with extended context | Long context window handles full thread history |
| Search query understanding | `claude-haiku-4-5-20251001` | Latency-sensitive; only needs simple intent extraction |

Default to `claude-sonnet-4-6`. Only use a different model with a spec change
documenting the rationale.

---

## Prompt caching

System prompts are static and long — ideal candidates for Anthropic's prompt
caching feature. All system prompts in `lib/ai/prompts/` are structured so the
cacheable portion comes first with a `cache_control: { type: "ephemeral" }` block.

```typescript
// lib/ai/email-ai.ts — example cache_control usage
const messages = [
  {
    role: "user",
    content: [
      {
        type: "text",
        text: systemPromptText,
        cache_control: { type: "ephemeral" }, // cached for 5 minutes
      },
      {
        type: "text",
        text: `Email to summarise:\n\n${decryptedBody}`,
        // not cached — varies per call
      },
    ],
  },
];
```

Cache hit rate target: **> 80%** for summarisation (same system prompt, different
user content). Monitor via Anthropic API usage logs.

---

## Prompt versioning

Every prompt file exports a `PROMPT_VERSION` constant:

```typescript
// lib/ai/prompts/summarise.ts
export const PROMPT_VERSION = "summarise-v1.2";
```

This version is written to `AIAnalysis.promptVersion` on every insert. When a
prompt changes:
1. Bump the version string.
2. Existing `AIAnalysis` rows are NOT retroactively re-analysed (cost control).
3. New emails get the new prompt version.
4. If re-analysis is needed, run the `scripts/reanalyse.ts` migration script
   with an explicit `--prompt-version` flag.

---

## Rate limiting and cost control

```
Per-user limits (enforced in lib/ai/email-ai.ts):
  - Summarise: 100 calls / user / day
  - Draft reply: 50 calls / user / day
  - Background analysis: 500 emails / account / sync cycle

Global circuit breaker:
  - If Anthropic API returns 529 (overloaded) 3× in 60 s → pause all AI calls
    for 5 minutes, surface a banner to affected users.

Budget guard:
  - If estimated daily spend > $ANTHROPIC_DAILY_BUDGET_USD → disable background
    analysis, keep on-demand calls alive.
```

Cost estimates are logged (without content) to a `ai_cost_log` table:
`{ timestamp, model, inputTokens, outputTokens, cachedTokens, promptVersion }`.

---

## Privacy constraints on AI calls

- Email body is decrypted **in the same server process** as the API call.
  The decrypted string never touches disk or a log.
- No email content is sent to telemetry or error tracking (Sentry, Datadog, etc.).
  Configure those tools to scrub any field named `body`, `subject`, or `content`.
- Prompt inputs are assembled in `lib/ai/email-ai.ts` — components and API routes
  pass an `emailId`, not a body string.
- We do NOT opt out of Anthropic model training via the API flag because we have a
  BAA-equivalent data processing agreement. Re-evaluate if this changes.

---

## Failure handling contract

Every exported function in `lib/ai/email-ai.ts` must return `T | null` — never
throw to the caller. Errors are caught internally, logged without content, and
`null` is returned. Callers check for `null` and show a graceful fallback UI.

```typescript
// Bad — throws to caller
export async function summariseEmail(emailId: string): Promise<Summary> { ... }

// Good — returns null on failure
export async function summariseEmail(emailId: string): Promise<Summary | null> { ... }
```

---

## AI feature flags

Controlled via `UserSettings`:
- `aiSummariseEnabled` — default true
- `aiReplyEnabled` — default true

Background analysis respects both flags. If a user disables both, no AI calls
are made for their account. We never disable AI globally via a code deploy —
always via the settings table.

---

## Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-05-19 | Initial document | Project setup |
