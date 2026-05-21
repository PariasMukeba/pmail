# Pmail Agent OS

This directory contains instruction files for Pmail's specialised AI agents.
Each file is a system prompt — loaded by `scripts/agent.ts` and prepended with
`CLAUDE.md` so every agent always knows the project rules.

---

## What an agent is here

An agent is a single Claude API call with a purpose-built system prompt.
It reads specific inputs, does exactly one thing, produces a defined output,
and tells you what to run next. No agent does two jobs.

This is different from a general "do everything" prompt. A general prompt has
to balance competing concerns — write the code AND think about the tests AND
check the spec AND review for security — and it inevitably deprioritises the
things that feel secondary in the moment. A specialised agent has no competing
concerns. The spec-agent cannot write code even if it wants to. The code-agent
cannot mark a spec as APPROVED. Constraints are the feature, not a limitation.

---

## Workflow

```
Requirement (plain English)
        │
        ▼
  [spec-agent]  ──writes──▶  specs/features/[name].md
        │
        │  human reviews spec
        ▼
  [code-agent]  ──writes──▶  app/, lib/, prisma/ (no tests)
        │
        ▼
 [review-agent] ──produces─▶  review report (read-only)
        │
        │  human fixes BLOCKING items (if any)
        ▼
  [test-agent]  ──writes──▶  tests/ (no source edits)
        │
        ▼
     Ship it
```

---

## Agents

| Agent | File | One-liner |
|-------|------|-----------|
| spec-agent | `spec-agent.md` | Requirement → spec file |
| code-agent | `code-agent.md` | Spec → implementation (no tests) |
| review-agent | `review-agent.md` | Diff → review report (read-only) |
| test-agent | `test-agent.md` | Spec + impl → tests, run them |
| sync-agent | `sync-agent.md` | Orchestrates the four above |
| ai-prompt-agent | `ai-prompt-agent.md` | Iterates on Claude prompts |

---

## Invocation

### Individual agents

```bash
npm run spec        "Add ability to snooze emails for a chosen duration"
npm run implement   specs/features/snooze.md
npm run review      specs/features/snooze.md
npm run test-feature specs/features/snooze.md
```

### Full pipeline (pauses for human review at each gate)

```bash
npm run ship "Add ability to snooze emails for a chosen duration"
```

### Prompt improvement

```bash
npm run agent ai-prompt-agent summarizeEmail "Summary included the sender's greeting"
```

---

## How `scripts/agent.ts` works

1. Reads `.agents/<name>.md` as the system prompt.
2. Prepends `CLAUDE.md` so the agent knows every project rule.
3. If any CLI argument is a file path that exists, reads its contents and
   injects them into the user message automatically.
4. Streams the response to the terminal.
5. Detects `Run: claude --agent <name> <args>` in the output and prints the
   next suggested command.
6. The `sync-agent` (ship pipeline) runs the four agents in sequence with
   human-review pauses between each step.

---

## The one rule

> Each agent does ONE thing excellently.

If you find yourself writing an agent that "also checks X" or "additionally
handles Y" — split it. The cost of a fifth agent is zero. The cost of a
bloated agent is a session that half-does two jobs.

---

## This directory vs `.claude/agents/`

| Directory | Used by | Purpose |
|-----------|---------|---------|
| `.agents/` | `scripts/agent.ts` (Anthropic API calls) | Instruction markdown → system prompts for CLI runner |
| `.claude/agents/` | Claude Code's native agent system | Frontmatter-tagged definitions for in-editor invocation |

Both exist. They serve different invocation paths. Keep them in sync.
