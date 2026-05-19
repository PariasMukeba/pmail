# lib/skills/

Reusable, well-tested functions that any agent or application code can call.
Think of this as Aire's standard library — small, focused, independently testable.

---

## What a skill is

- Does **exactly one thing**
- Is **pure where possible** — same input always produces the same output
- Has **declared side effects** when impure (see `@sideEffects` JSDoc tag)
- Has a **co-located unit test** (`*.test.ts` next to the source file)
- Has a **JSDoc comment** on every exported function

---

## What a skill is NOT

- Not a component (those live in `components/`)
- Not an API route (those live in `app/api/`)
- Not an agent (those live in `.agents/`)
- Not a service class or singleton

---

## Directory layout

```
lib/skills/
  email/    — parse-mime, extract-thread, detect-newsletter, sanitize-html
  ai/       — prompt builders, response parsers
  sync/     — OAuth token refresh, provider label mapping
  crypto/   — encrypt/decrypt helpers for IMAP credentials
  format/   — relative dates, display formatting
  index.ts  — re-exports everything; import skills from here
```

---

## How to add a new skill

1. Create `lib/skills/<category>/<skill-name>.ts`
2. Export one (or a small group of closely related) named functions
3. Add a JSDoc comment with at minimum: what it does, `@sideEffects` if impure
4. Create `lib/skills/<category>/<skill-name>.test.ts`
   — cover: happy path, empty/null inputs, edge cases from the spec
5. Export from `lib/skills/index.ts`
6. Run `npm test lib/skills/<category>/<skill-name>.test.ts` — must pass

---

## The `@sideEffects` convention

Pure functions: no tag needed.

Impure functions must declare what they touch:

```typescript
/**
 * @sideEffects network — one HTTP POST to Google's token endpoint
 */
export async function refreshGmailToken(...) { ... }

/**
 * @sideEffects database — upserts one row in the SyncState table
 */
export async function updateSyncCursor(...) { ... }
```

Allowed side-effect categories: `network`, `database`, `filesystem`, `env`.

---

## Security rules for skills

- Never log email body, subject, sender, or recipient in any skill.
- If a skill processes email content, it must accept pre-decrypted text —
  decryption happens in the caller, not inside skills.
- Crypto skills must throw immediately if `ENCRYPTION_SECRET` is not set.

---

## Checklist before merging a new skill

- [ ] Single exported function (or a tightly related family)
- [ ] JSDoc on every export with `@sideEffects` where applicable
- [ ] Co-located test with ≥ 80% coverage for the skill file
- [ ] No `any` type
- [ ] No `console.log` calls
- [ ] Exported from `lib/skills/index.ts`
