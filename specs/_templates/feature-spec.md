# Spec: [Feature Name]

**Status**: DRAFT | IN REVIEW | APPROVED | IN PROGRESS | SHIPPED
**Author**: [name]
**Created**: YYYY-MM-DD
**Last updated**: YYYY-MM-DD
**Ticket**: [link or ID]

---

## 1. Problem statement

*One paragraph. What user pain does this solve? What breaks or is missing today?
Write from the user's perspective, not the engineer's.*

## 2. Goals

- [ ] Goal 1 — measurable outcome
- [ ] Goal 2
- [ ] Goal 3

## 3. Non-goals (explicitly out of scope)

- Thing we are NOT doing and why

## 4. User stories

```
As a [persona],
I want to [action],
so that [outcome].
```

Acceptance criteria (Given / When / Then):

```
Given [precondition]
When  [action]
Then  [observable result]
```

## 5. Technical design

### Data model changes

*Describe any new Prisma models or schema changes. Include field names and types.*

```prisma
// example
model EmailLabel {
  id        String   @id @default(cuid())
  name      String
  color     String
  accountId String
  account   Account  @relation(fields: [accountId], references: [id])
  createdAt DateTime @default(now())
}
```

### API surface

*List every new or modified API route.*

| Method | Path | Auth required | Description |
|--------|------|---------------|-------------|
| POST   | /api/labels | yes | Create a label |

### Component tree

*Rough sketch — don't over-specify implementation details.*

```
<LabelsPage>
  └─ <LabelList>
       └─ <LabelRow> (repeated)
  └─ <CreateLabelForm>
```

### State management

*Which Zustand store slice owns this feature's state? What actions are added?*

### External dependencies

*New npm packages, API keys, or third-party services needed.*

## 6. AI behaviour (if applicable)

*Fill in only if this feature involves a Claude prompt. Otherwise delete this section.*

See `_templates/ai-behaviour-spec.md` for detailed guidance.

- **Prompt location**: `lib/ai/prompts/[name].ts`
- **Model**: claude-sonnet-4-6 (default) or justify a different choice
- **Expected input**: ...
- **Expected output format**: ...
- **Failure mode**: what happens if the AI returns something unexpected?

## 7. Security & privacy checklist

- [ ] No email body content logged or stored unencrypted
- [ ] No OAuth tokens exposed client-side
- [ ] New API route has Zod schema for request body
- [ ] New API route validates session before processing
- [ ] No PII in error messages returned to client

## 8. Test plan

| Test type | What to cover |
|-----------|--------------|
| Unit | utility functions, prompt logic |
| Integration | each API route (happy path + error cases) |
| E2E | primary happy path only |
| AI behaviour | prompt output shape, failure handling |

## 9. Open questions

- [ ] Question 1 — owner: [name], deadline: YYYY-MM-DD
- [ ] Question 2

## 10. References

- [Link to design mockup]
- [Link to related ADR]
- [Link to relevant external docs]
