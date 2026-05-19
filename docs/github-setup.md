# GitHub Repository Setup

This document covers everything you need to configure after creating the GitHub repository: branch protection rules, required status checks, merge strategy, and the reasoning behind each decision.

Do this setup once before the first developer pushes code. Skipping it means the first person to push a broken commit can merge directly to main without review.

---

## Branch protection rules

Navigate to: **GitHub repo → Settings → Branches → Add branch protection rule**

Set the branch name pattern to `main`. Then enable the following settings in order.

---

### 1. Require a pull request before merging

**Setting:** `Require a pull request before merging` ✓

This is the gate everything else depends on. Without it, every other protection is bypassable with a direct `git push origin main`. With it, code cannot reach `main` except through a PR — which means it must pass CI, be reviewed, and have all conversations resolved.

**Sub-settings to enable:**

`Require approvals` → set to **1**

One human being has to have read the diff before it merges. This catches things automated tools can't: logic errors, missing edge cases, naming that doesn't match the rest of the codebase, a secret accidentally hardcoded, a TODO that should have been a ticket.

`Dismiss stale pull request approvals when new commits are pushed` ✓

Without this, Alice approves a PR, Bob pushes five more commits to fix review feedback, and the approval still counts — even though Alice hasn't seen those five commits. Enabling this invalidates the approval the moment new commits arrive, requiring a fresh review of the final state. It takes an extra few minutes per PR. It prevents the scenario where a "small follow-up fix" contains the actual bug.

`Require review from Code Owners` ✓

Uses the `.github/CODEOWNERS` file to auto-assign the right reviewers based on which files changed. A PR that touches `lib/ai/email-ai.ts` automatically requires `@aire/ai-team` review. A PR that touches `lib/skills/crypto/` requires `@aire/security-team`. Without this, it's easy to merge an AI change without anyone who understands the billing or quality implications ever seeing it.

---

### 2. Require status checks to pass before merging

**Setting:** `Require status checks to pass before merging` ✓

`Require branches to be up to date before merging` ✓

This second sub-option is important and easy to miss. Without it, the following sequence is possible: Alice's PR passes CI on commit A of main. Bob merges a breaking change (commit B). Alice's PR still shows green CI — but it was tested against commit A, not B. Enabling "up to date" forces Alice to pull in Bob's change and re-run CI before merging. It costs a rebase. It prevents broken-main surprises.

**Add these status checks** (use the search box, which shows checks that have run at least once):

| Check name | Job in `ci.yml` | Required? |
|---|---|---|
| `CI / Type Check + Lint` | `quality` | Yes |
| `CI / Unit + Integration Tests` | `unit-tests` | Yes |
| `CI / AI Behaviour Tests` | `ai-tests` | Yes |
| `CI / E2E Tests (Playwright)` | `e2e` | Yes |
| `CI / Security Scan` | `security-scan` | Recommended |

The `security-scan` job is listed as "Recommended" rather than required because `npm audit` occasionally flags vulnerabilities in packages you can't upgrade (a subdependency of Next.js, for example). Making it required would block all merges until npm releases a patch you have no control over. A middle path: require it for normal PRs, document a bypass procedure for the dependency-upgrade case.

> **How to find the check names:** the names shown in this search box come from the `name:` field in the workflow YAML and the `jobs.<id>.name` field. For `ci.yml`, the job name is `"Type Check + Lint"` and the workflow is `"CI"`, so the check shows as `CI / Type Check + Lint`.
>
> These names don't appear until the workflow has run at least once. Create a draft PR, push a commit to trigger CI, then come back to this settings page to add the checks.

---

### 3. Require linear history

**Setting:** `Require linear history` ✓

This enforces that every merge to `main` must be a squash merge or a rebase — no merge commits (`Merge branch 'feature/x' into main`). GitHub exposes this as a repository-level option under **Settings → General → Pull Requests**: enable "Allow squash merging", disable "Allow merge commits" and "Allow rebase merging".

**Why squash merges, not rebase merges?**

A squash merge takes all commits on a feature branch — including the "wip: fix typo", "actually fix it", "ok NOW it works" commits — and collapses them into one commit on `main`. The commit message becomes the PR title and description. The result: `main`'s history reads like a changelog of features and fixes, not a developer's working notes.

A rebase merge preserves each individual commit, which sounds better but produces a messier history in practice — unless every developer writes perfect atomic commits, which they don't.

With linear history enforced, `git log --oneline` on `main` looks like this:

```
a3f8c21 feat: add email priority classification
d2e1b90 feat: add thread grouping via Union-Find
8f4a77d fix: sanitize HTML external image blocking
1c9b88a chore: add GitHub Actions CI pipeline
```

Without it, `git log` looks like this:

```
f9d3e12 Merge branch 'feature/html-sanitizer' into main
a3f8c21 wip: trying a different regex
7b2c88d actually fix the regex
4d1a99f ok this compiles at least
d2e1b90 Merge branch 'feature/threading' into main
...
```

The linear history is searchable, bisectable (`git bisect` works correctly), and understandable at a glance. It's the repository's permanent record.

---

### 4. Require conversation resolution before merging

**Setting:** `Require conversation resolution before merging` ✓

Every comment thread opened during code review must be resolved (marked "Resolved" by the reviewer who opened it) before the merge button is enabled. This prevents the pattern where a reviewer leaves five concerns, the author pushes "addressed" commits, and merges before the reviewer has checked that the concerns were actually addressed correctly.

The discipline this creates: reviewers don't leave drive-by comments they don't plan to follow up on. Authors don't merge before their reviewer has signed off on each specific point.

---

### 5. Do not bypass rules for administrators

**Setting:** `Do not allow bypassing the above settings` ✓

If administrators can bypass rules, the rules are optional. The first time a deadline creates pressure, the bypass gets used. Then it gets used again. Then it's not a rule, it's a suggestion. Apply the rules to everyone, including yourself.

The only legitimate bypass scenario is a production incident requiring a hotfix faster than CI can run. For that, GitHub allows you to disable branch protection temporarily and re-enable it after the fix. That process is deliberate enough to be auditable; it requires two actions in the settings UI, not a git flag.

---

### Complete settings reference

```
Branch name pattern: main

☑ Require a pull request before merging
  Required approvals: 1
  ☑ Dismiss stale pull request approvals when new commits are pushed
  ☑ Require review from Code Owners

☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  Status checks:
    CI / Type Check + Lint
    CI / Unit + Integration Tests
    CI / AI Behaviour Tests
    CI / E2E Tests (Playwright)
    CI / Security Scan

☑ Require linear history
☑ Require conversation resolution before merging
☑ Do not allow bypassing the above settings
```

---

## Merge strategy configuration

Under **Settings → General → Pull Requests**, set:

```
☑ Allow squash merging       ← default merge method
  Default message: Pull request title and description

☐ Allow merge commits        ← disabled (enforces linear history)
☐ Allow rebase merging       ← disabled (squash gives cleaner history)

☑ Automatically delete head branches
```

`Automatically delete head branches` removes the feature branch after merge. Stale branches accumulate fast on an active team. Deleted branches can always be restored from the PR page if needed.

---

## Required GitHub secrets

Before CI can run successfully, add these secrets under **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Used by | Where to get it |
|---|---|---|
| `CODECOV_TOKEN` | `ci.yml` → upload coverage | codecov.io → repository settings |
| `VERCEL_TOKEN` | `deploy.yml` | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `deploy.yml` | Vercel dashboard → `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `deploy.yml` | Same as above |
| `ANTHROPIC_API_KEY` | `ai-prompt-regression.yml` | console.anthropic.com → API keys |
| `SLACK_WEBHOOK_URL` | `ai-prompt-regression.yml` | Slack → App settings → Incoming Webhooks |

`CODECOV_TOKEN` and `SLACK_WEBHOOK_URL` are optional — the CI steps that use them have `fail_ci_if_error: false` or `if: failure()` guards. The pipeline works without them; you just don't get coverage comments or Slack alerts.

---

## Why AI prompt regression tests run weekly

The CI pipeline runs AI behaviour tests on every push, but those tests use MSW to intercept the Anthropic API — the model never runs. MSW returns whatever the test tells it to return. Those tests verify that *our code* handles the model's response correctly. They say nothing about whether the model still *produces* the response we expect.

Model behaviour can drift for three reasons:

**1. Model version updates.** Anthropic periodically updates Claude behind the same API endpoint. The `claude-sonnet-4-6` alias you call today may point to a different model checkpoint next month. The new checkpoint might be better overall but handle edge cases differently — returning `"normal"` formatted as `"Normal."` (with a capital and a period) instead of `"normal"` (lowercase, no punctuation). Our `parsePriorityResponse` trims and lowercases, so this particular drift would be caught. But drift in JSON structure (a new field, a renamed field, a changed sentinel value) would not be caught until the feature started silently returning wrong results in production.

**2. System prompt sensitivity.** A prompt that works today might degrade after a model update even if the prompt text is unchanged. Models have different "default instincts" between versions. A prompt that reliably produced `{"sentiment":"NEUTRAL"}` might start occasionally producing `{"sentiment": "neutral"}` (lowercase) — valid JSON but failing our enum validation.

**3. Gradual quality erosion.** Without a baseline to compare against, quality degradation is invisible. The weekly run creates a repeatable benchmark: same prompts, same test assertions, real model responses. If the test that checks `result.actionItems.length > 0` for an email containing "Please review by Friday" starts failing, that's a concrete signal to investigate and update the prompt before users notice.

Weekly (not daily, not per-commit) because:
- Each real-API run costs money (~$0.10–$0.50 depending on test count and body length).
- Model updates happen on the order of weeks to months, not hours.
- Daily runs would produce 365 runs per year for a signal that changes at most a handful of times.
- Monday 9am gives the team a chance to respond to a failure before the work week is in full swing.

The `workflow_dispatch` trigger lets you run it manually before shipping any prompt change, verifying the new prompt still passes all assertions against the live model before merging.

---

## Why we separate mocked tests from real-API tests

Every Anthropic API call in CI has three failure modes that are unrelated to code quality:

1. **Network latency** — the Anthropic API occasionally has elevated response times. A test that normally takes 200ms might timeout at 5s, failing CI for infrastructure reasons.
2. **Rate limits** — `claude-sonnet-4-6` has per-minute and per-day token limits. A large CI queue (ten developers pushing simultaneously) can exhaust the limit and fail everyone's build.
3. **Cost** — the AI tests run on every push to every branch. If each run costs $0.20 and you have 5 developers pushing 10 times a day, that's $10/day, $3,650/year for CI alone.

MSW-mocked tests eliminate all three problems. The mock intercepts the HTTP request at the fetch layer, returns a controlled response in microseconds, and costs nothing. The test still exercises the full code path: the prompt builder, the Anthropic SDK request formatting, the response parser, the error handling. It just doesn't exercise the model itself.

The separation is enforced by a single environment variable:

```typescript
// tests/setup.ts
if (process.env.USE_REAL_API !== 'true') {
  server.use(...anthropicHandlers);  // install the mock
}
// When USE_REAL_API=true, the mock is not installed.
// Real HTTP reaches the real API. All other mocks stay active.
```

The CI job sets `ANTHROPIC_API_KEY: ci-placeholder-not-used-msw-intercepts`. The SDK validates that the key is set (it would throw otherwise) but never reaches the network. The regression job sets the real key and `USE_REAL_API: true`. Same test files, same assertions, different execution path.

This pattern — same test code, different infrastructure — means you're not maintaining two separate test suites. You're running the same suite twice: once fast and cheap (CI), once slow and real (weekly regression). Any fix to a failing regression test also fixes the mocked version, and vice versa.

---

## The shift-left principle

"Shift left" means moving quality checks earlier in the development timeline — closer to the moment the code was written. The further right a bug travels (past commit, past review, past CI, past staging, into production), the more expensive it is to fix.

```
COST TO FIX A BUG:
                                                           ┌──────────┐
                                                           │Production│
                                                    ┌──────┤  ~$10k   │
                                                    │      └──────────┘
                                             ┌──────┤
                                             │Staging│
                                      ┌──────┤ ~$1k  │
                                      │      └───────┘
                               ┌──────┤
                               │  CI  │
                        ┌──────┤ ~$10 │
                        │      └──────┘
                 ┌──────┤
                 │Review│
          ┌──────┤  ~$5 │
          │      └──────┘
   ┌──────┤
   │ Your  │
   │editor │
   │  ~$0  │
   └───────┘
←─── shift left ───────────────────────────────────────────────────────►
```

The Aire pipeline is deliberately designed around this principle. Each layer catches a different class of problem as early as possible:

**Your editor** (`tsc`, ESLint, Prettier): catches syntax errors, obvious type mistakes, and formatting. Zero CI minutes spent. This is why TypeScript strict mode is non-negotiable and why the husky pre-commit hook runs lint-staged — if the error is catchable before the commit, it should be caught before the commit.

**Pre-push hook** (`.husky/pre-push`): runs `npm test` before the push reaches GitHub. Catches test failures before a CI runner is even allocated. Costs a few seconds; saves a round-trip to GitHub and the mental context-switch of coming back to a failed build.

**`quality` job (typecheck + lint)**: the first job in CI, blocking everything else. Catches type errors that only appear when the whole project compiles together (not just the file you edited), and lint violations that the pre-commit hook might have missed (if someone ran `git commit --no-verify`).

**`unit-tests` with coverage**: catches logic errors in the functions that do the actual work. Also enforces the coverage threshold — which is itself a shift-left mechanism, because uncovered code is code where bugs hide undetected until production.

**`ai-tests`**: specifically catches regressions in the AI pipeline — prompt format errors, output parser failures, handling of API error responses. Runs in parallel with unit tests so it doesn't add to the critical path.

**`e2e`**: runs last because it's expensive (real browser, real server). It catches integration failures that unit tests miss: Next.js routing misconfigurations, incorrect response shapes, auth middleware behaving differently in a real HTTP context.

**Weekly regression**: catches model-side drift that can't be detected locally or in CI. The furthest-right automated check before the user.

Every rule in CLAUDE.md — "never use `any`", "every route needs a Zod schema", "no email content in logs" — is a shift-left rule. It's cheaper to enforce it in code review (or better, in the editor via TypeScript) than to discover the security implication in a production incident.

The git hooks (`.husky/pre-commit` scanning staged files for `console.log.*email`) are the most extreme shift-left possible: catching a potential data exposure before the code is even committed to the developer's local branch.
