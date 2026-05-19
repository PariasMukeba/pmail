# specs/

Every feature and architectural decision in Aire is written down before code is
written. This directory is the single source of truth for what we are building,
why we built it that way, and what "done" looks like.

---

## Directory layout

```
specs/
├── README.md              ← you are here
├── template.md            ← copy this for every new feature spec
├── architecture/          ← standing decisions; change by adding, not deleting
│   ├── system-overview.md
│   ├── data-model.md
│   ├── ai-strategy.md
│   └── sync-engine.md
└── features/              ← one file per feature, kebab-case, never deleted
    ├── unified-inbox.md
    ├── ai-summarize.md
    ├── compose-reply.md
    └── search.md
```

---

## Lifecycle of a feature spec

```
DRAFT → IN REVIEW → APPROVED → IN PROGRESS → SHIPPED
```

| Status | Who sets it | What it means |
|--------|-------------|---------------|
| DRAFT | spec-agent or author | Still being written; not ready for implementation |
| IN REVIEW | spec-agent | Complete; waiting for human or review-agent sign-off |
| APPROVED | reviewer or human | Safe to implement; spec is now immutable |
| IN PROGRESS | code-agent | Implementation has started |
| SHIPPED | sync-agent | Merged, live, and verified |

**Once APPROVED, a spec is immutable.** Open `[name]-v2.md` for any revisions.

---

## How to write a new feature spec

1. Copy `template.md` → `features/[kebab-case-name].md`
2. Fill in every section — no placeholders left behind
3. Set `Status: DRAFT`
4. Run `claude review-spec specs/features/[name].md` when ready for review
5. Do not touch `src/`, `lib/`, or `app/` until status reaches APPROVED

---

## Architecture docs

Files in `architecture/` are living documents — update them in place when a
decision changes, but always add an entry to the change log at the bottom of
each file explaining what changed and why.

---

## Rules

- No code without an APPROVED spec.
- AI behaviour changes (prompt edits, model version bumps) always require a new
  or updated spec section — they are not "just a config change".
- Specs are never deleted. Superseded specs keep their file; add a note at the top
  pointing to the replacement.
