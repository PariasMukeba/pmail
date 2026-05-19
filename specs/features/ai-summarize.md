# Feature: AI Email Summarisation

## Status
[ ] Draft  [x] Reviewed  [ ] Implemented  [ ] Tested

## Problem
Long threads — support tickets, legal back-and-forths, mailing-list threads —
take minutes to read before a user can decide if action is required. A one-click
summary with extracted action items turns 5 minutes of reading into 10 seconds.

## Success criteria
- [ ] Summary streams back within 3 s of clicking "Summarise"
- [ ] Action items (may be empty), sentiment chip, and category label are shown alongside summary
- [ ] Cached result loads instantly on re-open (no second API call)
- [ ] Background analysis populates summary before the user opens most threads
- [ ] AI failure shows graceful fallback — inbox remains fully usable

## User stories
- As a user opening a long thread, I want a 3-sentence summary so I can decide
  whether it needs my attention without reading everything.
- As a user returning to a thread I have already summarised, I want the cached
  result to appear instantly so the feature feels free.

## Technical approach

### Data changes
None. Uses existing `AIAnalysis` model (email-level) and `ThreadAISummary` (thread-level).
Cache is stale when `createdAt < NOW() - 7 days` OR `promptVersion` differs from current.

### API changes
- `POST /api/ai/summarise` — body: `{ targetId, targetType: "email"|"thread", force?: boolean }`
  Returns `text/event-stream`; final event delivers:
  `{ summary, actionItems, sentiment, category, cached, promptVersion }`
  If cached, returns full object in a single event (no token streaming needed).

### UI changes
```
<ThreadView>
  └─ <AISummaryPanel>
       ├─ <SummaryText isStreaming />
       ├─ <ActionItemList />
       ├─ <SentimentChip />          [POSITIVE | NEUTRAL | NEGATIVE | URGENT]
       └─ <SummaryControls onRegenerate isCached />
```
Hook: `useAISummary(targetId, targetType)` — triggers `POST` on mount if no
cached value in SWR; streams tokens into local state via `ReadableStream`.

### AI changes
- Prompt: `lib/ai/prompts/summarise.ts`, version `summarise-v1.0`
- Model: `claude-sonnet-4-6`, max 512 output tokens, streaming on-demand
- System prompt cached with `cache_control: { type: "ephemeral" }`
- Input capped at 8 000 tokens (estimated as `bodyText.length / 4`); truncated with `[truncated]`
- Output validated with `AIAnalysisOutputSchema` (Zod); parse failure → `null` → fallback UI
- Background job: enqueued after every delta-sync; skips emails < `AI_MIN_BODY_WORDS` words

### Side effects
- `AIAnalysis` row upserted on completion (on-demand and background paths)
- `AIAnalysis.promptVersion` written on every insert for auditability

## Edge cases
- **Very short email ("Thanks!")**: model returns empty `actionItems`; sentiment POSITIVE.
  Summary should not be forced — skip background analysis if < `AI_MIN_BODY_WORDS`.
- **Non-English email**: model replies in the same language. No special handling required.
- **Anthropic API timeout (> 30 s)**: return `null`; log error ID only (no content).
- **Rate limited**: `AIError(operation: "summarise", retryable: true)`; UI shows "Try again".
- **Output is not valid JSON**: Zod parse fails; `AIError(retryable: false)`; show fallback.

## Out of scope
- Summarising attachment content (PDFs, images)
- Automatic translation of summaries
- Comparing two email threads

## Test plan

### Unit tests
- `buildSummarisePrompt`: correct truncation at 8 000 tokens; JSON structure
- `AIAnalysisOutputSchema`: valid input; missing fields; wrong enum; extra fields stripped
- `isSummaryStale(createdAt, promptVersion)`: expired TTL; mismatched version; fresh entry

### Integration tests
- `POST /api/ai/summarise`: cache hit returns immediately; cache miss calls `email-ai`
  (mocked); `force: true` bypasses cache; 401; 403 wrong user; 404 email not found

### E2E tests
- Open thread; click Summarise; verify tokens stream in; close; re-open;
  verify summary shown with no loading state.

### AI behaviour tests
- 5 golden examples (single action item; newsletter; angry complaint; one-liner; truncated long email)
- Simulated garbage JSON response → fallback UI shown, no crash

## Open questions
- [ ] Show per-email summary or thread-level summary in the panel by default?
  (design, 2026-05-26)
