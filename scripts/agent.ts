#!/usr/bin/env tsx
/**
 * Aire Agent Runner
 *
 * Reads a .agents/<name>.md file as the system prompt, prepends CLAUDE.md,
 * and calls Claude with streaming output.
 *
 * Usage:
 *   tsx scripts/agent.ts <agent-name> [message or spec-path...]
 *   tsx scripts/agent.ts sync-agent "Add snooze feature"   ← full pipeline
 *
 * If any CLI argument is a file path that exists (.md, .ts, .tsx, .json),
 * its contents are injected into the user message automatically.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ── Config ─────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 8192;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Read a file relative to project root; returns "" if it does not exist. */
function read(rel: string): string {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf-8");
  } catch {
    return "";
  }
}

/**
 * Expand tokens that look like file paths into their contents.
 * Allows `npm run implement specs/features/snooze.md` to inject the spec text.
 */
function expandFileArgs(tokens: string[]): string {
  return tokens
    .map((token) => {
      const ext = path.extname(token);
      if ([".md", ".ts", ".tsx", ".json"].includes(ext)) {
        const abs = path.isAbsolute(token) ? token : path.join(ROOT, token);
        if (fs.existsSync(abs)) {
          return `\n--- ${token} ---\n${fs.readFileSync(abs, "utf-8")}\n---\n`;
        }
      }
      return token;
    })
    .join(" ")
    .trim();
}

/** Pause the pipeline and wait for the user to press Enter. */
async function waitForEnter(message: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) =>
    rl.question(`\n\x1b[33m${message}\x1b[0m\n> `, () => {
      rl.close();
      resolve();
    })
  );
}

// ── Core: run a single agent ──────────────────────────────────────────────────

/**
 * Call Claude with .agents/<agentName>.md as system prompt (prepended with CLAUDE.md).
 * Streams the response to stdout. Returns the full response text.
 */
async function runAgent(agentName: string, userMessage: string): Promise<string> {
  const agentInstructions = read(`.agents/${agentName}.md`);
  if (!agentInstructions) {
    console.error(`\x1b[31m[aire] Agent not found: .agents/${agentName}.md\x1b[0m`);
    process.exit(1);
  }

  const claudeMd = read("CLAUDE.md");

  // CLAUDE.md is prepended so agents always know the project rules.
  // Both blocks use cache_control so the static system prompt is cached
  // across repeated invocations of the same agent.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: `# Project rules — always apply these\n\n${claudeMd}`,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `# Agent role and process\n\n${agentInstructions}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const client = new Anthropic();

  console.log(`\n\x1b[36m[aire:${agentName}]\x1b[0m Running...\n`);
  console.log("─".repeat(72));

  let fullResponse = "";

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks as Anthropic.MessageParam["content"] extends never
      ? never
      : Anthropic.TextBlockParam[],
    messages: [{ role: "user", content: userMessage }],
  });

  stream.on("text", (text) => {
    process.stdout.write(text);
    fullResponse += text;
  });

  await stream.finalMessage();
  console.log("\n" + "─".repeat(72));

  return fullResponse;
}

// ── Pipeline helpers ──────────────────────────────────────────────────────────

/** Extract a spec path from agent output, e.g. specs/features/snooze.md */
function extractSpecPath(output: string): string | null {
  const match = output.match(/specs\/features\/[\w-]+\.md/);
  return match ? match[0] : null;
}

/** True if the review-agent output contains blocking issues. */
function hasBlockingIssues(output: string): boolean {
  // Matches "## BLOCKING" section with content (not just an empty section)
  return /##\s+BLOCKING\s*\n(?![\s]*\n|[\s]*$)([\s\S]+?)(?=##|$)/.test(output);
}

// ── Ship pipeline ─────────────────────────────────────────────────────────────

/**
 * Run the full Spec → Code → Review → Test pipeline for a new feature.
 * Pauses at human-review gates so nothing merges without sign-off.
 */
async function runShipPipeline(requirement: string): Promise<void> {
  if (!requirement.trim()) {
    console.error("\x1b[31m[aire:ship] Provide a requirement string.\x1b[0m");
    console.error("  npm run ship \"Add ability to snooze emails\"");
    process.exit(1);
  }

  console.log(`\n\x1b[35m[aire:ship]\x1b[0m Starting pipeline for:\n  ${requirement}\n`);

  // ── Step 1: Spec ────────────────────────────────────────────────────────────
  const specOutput = await runAgent("spec-agent", requirement);
  const specPath = extractSpecPath(specOutput);

  if (!specPath) {
    console.error(
      "\x1b[31m[aire:ship]\x1b[0m Could not detect spec path in spec-agent output.\n" +
        "Expected a path matching specs/features/*.md in the response.\n" +
        "Run spec-agent manually and pass the spec path to implement:\n" +
        "  npm run implement specs/features/[name].md"
    );
    process.exit(1);
  }

  await waitForEnter(
    `Spec written at ${specPath}.\nReview it, then press Enter to implement — or Ctrl+C to edit first.`
  );

  // ── Step 2: Implement ───────────────────────────────────────────────────────
  await runAgent("code-agent", specPath);

  // ── Step 3: Review ──────────────────────────────────────────────────────────
  console.log("\n\x1b[36m[aire:ship]\x1b[0m Running code review...");
  const reviewOutput = await runAgent(
    "review-agent",
    `${specPath}\n\nGit diff:\n${require("child_process")
      .execSync("git diff main 2>/dev/null || git diff HEAD~1 2>/dev/null || echo '(no diff available)'")
      .toString()}`
  );

  if (hasBlockingIssues(reviewOutput)) {
    await waitForEnter(
      "BLOCKING issues found above. Fix them, then press Enter to re-run the review."
    );
    await runAgent(
      "review-agent",
      `${specPath}\n\nGit diff:\n${require("child_process")
        .execSync("git diff main 2>/dev/null || git diff HEAD~1 2>/dev/null || echo '(no diff)'")
        .toString()}`
    );
  }

  await waitForEnter("Review passed. Press Enter to write and run tests.");

  // ── Step 4: Tests ───────────────────────────────────────────────────────────
  await runAgent("test-agent", specPath);

  // ── Done ────────────────────────────────────────────────────────────────────
  const featureName = path.basename(specPath, ".md");
  console.log(`\n\x1b[32m[aire:ship] Pipeline complete!\x1b[0m`);
  console.log(`\nReady to commit:`);
  console.log(`  git add . && git commit -m "feat: ${featureName}"\n`);
}

// ── Entry point ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const agentName = argv[0];

if (!agentName || agentName === "--help" || agentName === "-h") {
  console.log(`
Aire Agent Runner

Usage:
  tsx scripts/agent.ts <agent-name> [message or spec-path...]
  tsx scripts/agent.ts sync-agent "Add snooze feature"

Agents:
  spec-agent       "Add snooze feature"
  code-agent       specs/features/snooze.md
  review-agent     specs/features/snooze.md
  test-agent       specs/features/snooze.md
  ai-prompt-agent  summarizeEmail "Summary too long"
  sync-agent       "Add snooze feature"   ← full pipeline with pauses

npm shortcuts:
  npm run spec         "Add snooze feature"
  npm run implement    specs/features/snooze.md
  npm run review       specs/features/snooze.md
  npm run test-feature specs/features/snooze.md
  npm run ship         "Add snooze feature"
`);
  process.exit(0);
}

const messageTokens = argv.slice(1);
const userMessage =
  expandFileArgs(messageTokens) ||
  "(no additional input — follow your process instructions)";

if (agentName === "sync-agent") {
  runShipPipeline(messageTokens.join(" ")).catch((err: Error) => {
    console.error(`\n\x1b[31m[aire:ship] Error:\x1b[0m ${err.message}`);
    process.exit(1);
  });
} else {
  runAgent(agentName, userMessage)
    .then((output) => {
      // Detect handoff hint and print suggested next command
      const handoff = output.match(/Run:\s+claude\s+--agent\s+(\S+)\s+(.*)/);
      if (handoff) {
        console.log(
          `\n\x1b[33m[aire] Next step:\x1b[0m npm run agent ${handoff[1]} ${handoff[2].trim()}\n`
        );
      }
    })
    .catch((err: Error) => {
      console.error(`\n\x1b[31m[aire] Error:\x1b[0m ${err.message}`);
      process.exit(1);
    });
}
