# lib/plugins/

The plugin system lets you add email providers and AI features without modifying
core application code. Plugins self-register; the core never names them.

---

## What a plugin is

A plugin is a TypeScript module that implements one of two interfaces:

| Interface | File | Adds |
|-----------|------|------|
| `EmailProviderPlugin` | `providers/[name].ts` | A new email provider (IMAP server, JMAP service, bridge) |
| `AIFeaturePlugin` | `ai-features/[name].ts` | A new AI-powered feature in the reading pane or compose window |

Both types must export a single default object that implements the interface.

---

## What a plugin is NOT

- Not a place for shared utilities (those go in `lib/skills/`)
- Not a place for core sync logic (that lives in `lib/sync/`)
- Not a client-side module — plugins run **server-side only**
  (the only exception: `renderResult` runs in a Client Component, but it must
  be a thin presentational layer with no API calls or secrets)

---

## The Registry Pattern

The registry (`registry.ts`) is a pair of `Map<id, plugin>` objects.
Plugins write to it once at startup via `register*()`.
Application code reads from it via `getProvider(id)` or `getAllAIFeatures()`.

This means:
- Adding a provider requires zero changes to sync job code
- Adding an AI feature requires zero changes to the reading pane layout
- The set of plugins is determined at runtime, not hardcoded in `if/else` chains

### Why this beats `if/else` chains

```typescript
// Without plugins: fragile, violates open/closed principle
if (provider === "gmail") { ... }
else if (provider === "outlook") { ... }
else if (provider === "fastmail") { ... }  // must edit this file every time
```

```typescript
// With plugins: the core never changes
const plugin = getProvider(account.provider);
if (!plugin) throw new NotFoundError("provider", account.provider);
await plugin.fetchEmails(connection, options); // works for any provider
```

The open/closed principle: code is **open for extension** (add a new plugin)
but **closed for modification** (the sync engine never changes to add a provider).

---

## How to create a new email provider plugin

1. Create `lib/plugins/providers/[name].ts`
2. Implement the `EmailProviderPlugin` interface (import from `../types`)
3. Export the plugin as `export default`
4. Add an entry to `PROVIDER_IMPORTS` in `lib/plugins/loader.ts`
5. Write a spec at `specs/features/[name]-provider.md` before implementing
6. Write tests at `tests/plugins/providers/[name].test.ts`

Checklist:
- [ ] `id` is kebab-case and unique; never changes after release
- [ ] `connect()` validates and rejects bad credentials before storing anything
- [ ] `fetchEmails()` handles pagination via the cursor returned in `SyncResult`
- [ ] All methods throw `AuthError` (retryable: false) on auth failure and
  `SyncError` on transient provider errors — never raw `Error`
- [ ] No credentials logged — not even IDs or usernames

---

## How to create a new AI feature plugin

1. Create `lib/plugins/ai-features/[name].ts`
2. Implement the `AIFeaturePlugin` interface
3. Export the plugin as `export default`
4. Add an entry to `AI_FEATURE_IMPORTS` in `lib/plugins/loader.ts`
5. Write a spec (including AI behaviour section) at `specs/features/[name]-plugin.md`

Checklist:
- [ ] `process()` calls AI **only** through `lib/ai/email-ai.ts`
- [ ] `process()` handles AI failure gracefully — returns an empty/default result,
  never throws to the caller
- [ ] `renderResult()` is a thin presentational layer only — no API calls, no secrets
- [ ] Prompt and version string live in `lib/ai/prompts/[name].ts`
- [ ] Golden examples in the spec become fixtures in `tests/ai/[name].test.ts`

---

## Security model

- Plugins run **server-side only** in Next.js Route Handlers or RSCs.
- `renderResult()` is the only method that may run on the client, and it must
  receive only the serialised `AIPluginResult` — never raw email content.
- Plugins must not import `@anthropic-ai/sdk` directly; they must go through
  `lib/ai/email-ai.ts`.
- Plugins must not import the Prisma client directly unless they have a declared
  `@sideEffects database` JSDoc tag and a spec justifying it.

---

## Plugin loading

Plugins load at app startup via `loadPlugins()` in `lib/plugins/loader.ts`.
Call it once from `app/layout.tsx`:

```typescript
// app/layout.tsx
import { loadPlugins } from "@/lib/plugins/loader";
await loadPlugins();
```

A plugin that fails to load is logged and skipped — it never crashes the app.
