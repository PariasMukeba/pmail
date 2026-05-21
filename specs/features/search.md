# Feature: Search

## Status
[ ] Draft  [x] Reviewed  [ ] Implemented  [ ] Tested

## Problem
Users accumulate thousands of emails across multiple accounts and can't find
specific messages without remembering which folder or account they're in. Pmail
needs fast, cross-account search that works on real content, not just metadata.

## Success criteria
- [ ] Keyword results appear within 300 ms of typing stopping (debounced)
- [ ] Body-keyword search returns a first page within 2 s for up to 100 000 emails
- [ ] Filter operators work: `from:`, `to:`, `after:`, `before:`, `has:attachment`, `in:`
- [ ] Results are cross-account by default; scoped with `in:` operator
- [ ] No search history is persisted anywhere

## User stories
- As a user, I want to type "invoice March 2025" and see results across all
  accounts so I can find any email without knowing which folder it's in.
- As a user, I want `from:alice@example.com has:attachment` to work so I can
  find the specific file Alice sent me without scrolling through everything.

## Technical approach

### Data changes
No new models. Search uses the existing `Email` table.
Body search requires server-side decryption — we do not store a plaintext search
index because doing so would violate the "never store email body content
unencrypted at rest" non-negotiable. Re-evaluate a self-hosted vector index at
> 500 000 emails per user. Subject/from use AES-SIV deterministic encryption
to allow exact-match pre-filtering before full decryption.

### API changes
- `GET /api/search?q=…&limit=20&cursor=…`
  Three-phase pipeline:
  1. Parse `q` into `{ keywords, from, to, after, before, hasAttachment, inMailbox }`.
  2. SQL pre-filter on plaintext metadata (`receivedAt`, `hasAttachments`, accountId guard).
     Reduces candidates from ~100 000 to typically < 5 000.
  3. Decrypt subject + from + body snippet server-side; application-layer keyword match.
  4. Score: `relevanceScore × recencyWeight` (weight halves every 90 days).
  Returns: `{ results: [{ id, threadId, subject, from, snippet, receivedAt, hasAttachments, account }], nextCursor, totalEstimate }`

### UI changes
```
<SearchBar />   [in global header; Cmd+K / Ctrl+K opens]
<SearchPanel>
  ├─ <SearchInput value onChange />
  ├─ <OperatorHints />        [shown when query is empty]
  └─ <SearchResults isLoading isEmpty>
       └─ <SearchResultRow>
            ├─ <AccountDot />
            ├─ <ResultMeta from subject date />
            └─ <ResultSnippet snippet query />   [keywords wrapped in <mark>]
```
`<ResultSnippet>` escapes the snippet string first, then wraps keyword matches
in `<mark>` — never `dangerouslySetInnerHTML` on raw input.
SWR key: `["/api/search", debouncedQuery]` — falsy when query is empty.
`keepPreviousData: true` prevents flash-to-empty between keystrokes.

### AI changes
None in v1. Planned v2: `claude-haiku-4-5-20251001` expands shorthand queries
("invoice march" → `after:2025-03-01 before:2025-03-31 invoice`) but that is
explicitly out of scope here.

### Side effects
None. Search is purely read-only and stateless.

## Edge cases
- **Special regex characters in query** (`.*+?`): escape before using in the
  application-layer keyword match — no crash, treated as literals.
- **Empty query**: SWR key is falsy; no request fired; show `<OperatorHints />`.
- **All emails from one account deleted**: results correctly return 0 for that account.
- **`after:` date after `before:` date**: query parser swaps them silently and adds a
  warning badge in the search bar.
- **100 000-email corpus**: SQL pre-filter on indexed `receivedAt` keeps decryption
  work bounded. Document p95 latency in the open questions.

## Out of scope
- Attachment content search (PDF OCR, spreadsheet content)
- Saved searches / smart folders
- Semantic / vector search (requires self-hosted embedding model — future)
- Search history

## Test plan

### Unit tests
- `parseQuery`: all 6 operators; mixed operators + keywords; empty string;
  malformed date; unknown operators ignored; swapped after/before dates
- `scoreResult`: recency decay; keyword relevance multiplier; sort stability
- `buildSnippet`: keyword highlighting; XSS escape before `<mark>` injection; 200-char truncation
- SQL pre-filter builder: correct `WHERE` clause per operator combination;
  always includes `accountId IN (…)` ownership guard

### Integration tests
- `GET /api/search`: keyword match; `from:` operator; `has:attachment`; date range;
  empty result; pagination; 401; query returning another user's email → 0 results
- Special characters in `q` → 200 OK, no crash, no injection

### E2E tests
- Type "invoice" → verify results appear → click result → thread opens →
  Esc → panel closes → verify 0 rows written to any search-history table.

## Open questions
- [ ] P95 latency benchmark: needs load test with 100 000 synthetic emails before ship.
  (team, 2026-06-02)
- [ ] Should `in:` accept account email address (e.g. `in:alice@gmail.com`) or only
  mailbox type keywords (`in:inbox`, `in:sent`)? (team, 2026-05-26)
