# AI Behaviour Spec: [Prompt / Feature Name]

**Status**: DRAFT | IN REVIEW | APPROVED | IN PROGRESS | SHIPPED
**Author**: [name]
**Created**: YYYY-MM-DD
**Last updated**: YYYY-MM-DD
**Parent feature spec**: `specs/features/[feature-name].md`

---

## 1. Purpose

*One paragraph. What decision or output does this prompt produce?
Why is AI the right tool here instead of deterministic logic?*

## 2. Model selection

| Property | Value |
|----------|-------|
| Model | `claude-sonnet-4-6` |
| Max tokens | [number] |
| Temperature | [0.0–1.0 — lower = more deterministic] |
| Streaming | yes / no |

**Justification for model choice**: *(explain if not the default `claude-sonnet-4-6`)*

## 3. Prompt design

### System prompt

```
[Paste the full system prompt here. Keep it in this spec so reviewers
can evaluate it without reading source code.]
```

### User message template

```
[Paste the user message template. Use {{variable}} placeholders.]
```

### Variables injected at runtime

| Variable | Type | Source | Notes |
|----------|------|--------|-------|
| `{{email_body}}` | string | DB — decrypted at call time | max 8 000 tokens |
| `{{user_prefs}}` | JSON | Zustand store | serialised before injection |

## 4. Expected output

### Format

*JSON schema, plain text, or other structured format.*

```json
{
  "summary": "string — max 280 chars",
  "action_items": ["string", "..."],
  "sentiment": "positive | neutral | negative | urgent"
}
```

### Validation

*How is the output validated before it reaches the UI?*

- Parsed with Zod schema `EmailAnalysisSchema` in `lib/ai/schemas.ts`
- If parse fails → fallback to `null`; UI shows "Analysis unavailable"

## 5. Failure handling

| Failure | Behaviour |
|---------|-----------|
| API timeout (> 30 s) | Return `null`; log error ID (no content) |
| Malformed JSON | Zod parse fails → fallback |
| Model refuses (safety) | Return `null`; surface generic message to user |
| Rate limit | Exponential backoff × 3, then surface error |

## 6. Privacy constraints

- [ ] No email content sent to telemetry or logged
- [ ] Prompt variables are assembled server-side only
- [ ] API key is read from `process.env.ANTHROPIC_API_KEY` — never from client

## 7. Evaluation / golden set

*Provide at least 5 example inputs and the expected output shape.
These become the test fixtures in `tests/ai/`.*

### Example 1 — Standard reply request

**Input**
```
[paste anonymised example input]
```

**Expected output**
```json
{
  "summary": "...",
  "action_items": [],
  "sentiment": "neutral"
}
```

### Example 2 — Urgent email

*(repeat structure)*

### Example 3 — Non-English email

*(repeat structure)*

### Example 4 — Empty / near-empty email

*(repeat structure)*

### Example 5 — Edge case (very long email)

*(repeat structure)*

## 8. Prompt versioning

*Bump the version string in `lib/ai/prompts/[name].ts` on every non-trivial change.
Record the change reason here.*

| Version | Date | Change summary |
|---------|------|----------------|
| v1.0 | YYYY-MM-DD | Initial |

## 9. Open questions

- [ ] Question — owner: [name], deadline: YYYY-MM-DD
