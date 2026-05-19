# Feature: Compose & AI-Assisted Reply

## Status
[ ] Draft  [x] Reviewed  [ ] Implemented  [ ] Tested

## Problem
Replying to email is the most time-consuming action in any inbox. Users must
re-read context, choose a tone, and type a response — even for routine replies.
An AI-drafted reply that users can accept, edit, and send in one flow cuts this
from 5 minutes to under 30 seconds.

## Success criteria
- [ ] New compose, reply, reply-all, and forward work from any thread view
- [ ] AI draft streams into the editor within 5 s of clicking "Draft with AI"
- [ ] Draft auto-saves to the DB every 30 s and on blur; no work is ever lost
- [ ] Attachments up to 25 MB accepted via drag-drop or file picker
- [ ] Sent message appears in the thread immediately (optimistic); draft deleted on success

## User stories
- As a user reading a thread, I want to click "Draft Reply" and receive an AI
  draft I can tweak and send, so that routine replies take under a minute.
- As a user mid-compose, I want my draft saved automatically, so that closing
  the window by accident doesn't lose my work.

## Technical approach

### Data changes
No new models. Drafts are stored as `Email` rows with `isDraft = true`.
Attachments staged to object storage immediately on drop (not on send);
`storageKey` is a random CUID — never derived from filename.

### API changes
- `POST /api/drafts` — create draft (`accountId`, `threadId?`, `replyToEmailId?`, `to`, `subject`)
- `PUT /api/drafts/:id` — save content (`to`, `cc`, `subject`, `bodyHtml`, `bodyText`)
- `DELETE /api/drafts/:id` — discard
- `POST /api/messages/send` — send draft (`draftId`); calls provider adapter; deletes draft on success
- `POST /api/attachments` — upload file; returns `{ storageKey, filename, sizeBytes }`
- `DELETE /api/attachments/:id` — remove from draft
- `POST /api/ai/draft-reply` — body: `{ threadId, tone: "professional"|"friendly"|"brief" }`
  Returns SSE stream; final event: `{ draft: string }`

### UI changes
```
<ReplyBar onReply onReplyAll onForward onDraftWithAI />  [bottom of ThreadView]
<ComposePanel draftId>
  ├─ <AddressField label="To" />   [autocomplete from Contact table]
  ├─ <SubjectField />
  ├─ <ComposeToolbar onDraftWithAI onAttach onDiscard />
  ├─ <RichTextEditor />            [Tiptap — StarterKit + Link + Placeholder]
  ├─ <AttachmentList onRemove />
  └─ <ComposeFooter saveStatus sendButton />
```
Auto-save: single `useEffect` in `<ComposePanel>` manages a 30 s interval timer.
This is the only legitimate `useEffect` in this feature.

### AI changes
- Prompt: `lib/ai/prompts/draft-reply.ts`, version `draft-reply-v1.0`
- Model: `claude-sonnet-4-6`, max `REPLY_DRAFT_MAX_TOKENS` output tokens, streaming
- Context: last 5 thread emails (decrypted) + 3 Sent-folder sentences (style calibration)
- Input truncated to 6 000 tokens if needed (oldest messages dropped first)
- Tone parameter maps to a suffix appended to the system prompt
- Output: plain text only — no markdown, no greeting explanation, no preamble

### Side effects
- `POST /api/messages/send` calls `lib/sync/[provider].ts → sendMessage()`
- On success: draft `Email` row deleted, `Thread.messageCount` and `lastMessageAt` updated
- On failure: draft preserved; user shown "Send failed — try again"

## Edge cases
- **Attachment > 25 MB**: rejected client-side before upload with inline error.
- **AI failure during draft**: editor stays empty; toast "Couldn't generate draft — try again".
  Compose panel remains open; user can still write manually.
- **Send fails (provider 5xx)**: draft is NOT deleted; user retries from same panel.
- **Tab closed mid-compose**: 30 s auto-save means at most 30 s of work is lost.
- **Reply-all to a list with 200 recipients**: warn the user before sending.

## Out of scope
- Scheduled send (future — snooze-send spec)
- HTML signature management (future)
- Sending from an alias address

## Test plan

### Unit tests
- `buildDraftReplyPrompt`: thread truncation at 6 000 tokens; tone suffix injection;
  style exemplar extraction from sent emails
- Attachment size guard: rejects files > `MAX_ATTACHMENT_BYTES`
- Auto-save debounce: exactly one PUT fires per 30 s window under rapid keystrokes

### Integration tests
- `POST /api/drafts`: creates encrypted draft row; 400 on bad schema; 401 unauthenticated
- `PUT /api/drafts/:id`: updates encrypted fields; 403 wrong user
- `POST /api/messages/send`: mock provider adapter called; draft deleted on success;
  draft preserved and 500 returned if provider fails
- `POST /api/ai/draft-reply`: streams; error shape on AI failure; 403 wrong user

### E2E tests
- Open thread → Reply → type body → wait 30 s → verify "Saved" indicator →
  Send → verify thread shows sent message → verify compose panel closed.
- Click "Draft with AI" → verify streaming tokens appear → edit text → send.

### AI behaviour tests
- 5 golden examples (meeting confirm, bug report, friend plans, truncated thread, French email)
- Garbage output from mock Claude → fallback toast, no crash

## Open questions
- [ ] How many Sent-folder exemplars for style calibration? 3 feels arbitrary. (team, 2026-05-26)
- [ ] Reply-all to large lists: warn at what recipient count? (team, 2026-05-26)
