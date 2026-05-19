import { describe, it, expect } from "vitest";
import { buildSummaryPrompt } from "@/lib/skills/ai/build-summary-prompt";
import { AI_PROMPT_CONTEXT_MAX_TOKENS } from "@/lib/constants";

const BASE_EMAIL = {
  subject: "Q4 Budget Review",
  from: "Alice Johnson <alice@company.com>",
  textBody: "Hi team, please review the attached budget spreadsheet and reply by Friday.",
  receivedAt: new Date("2024-06-15T10:00:00Z"),
};

describe("buildSummaryPrompt — system prompt", () => {
  it("system prompt contains instruction to be concise or brief", () => {
    const { system } = buildSummaryPrompt(BASE_EMAIL);
    expect(system.toLowerCase()).toMatch(/concise|brief/);
  });

  it("system prompt specifies the exact JSON output schema", () => {
    const { system } = buildSummaryPrompt(BASE_EMAIL);
    expect(system).toContain('"summary"');
    expect(system).toContain('"actionItems"');
    expect(system).toContain('"sentiment"');
    expect(system).toContain('"category"');
  });

  it("system prompt enumerates all valid sentiment values", () => {
    const { system } = buildSummaryPrompt(BASE_EMAIL);
    expect(system).toContain("POSITIVE");
    expect(system).toContain("NEUTRAL");
    expect(system).toContain("NEGATIVE");
    expect(system).toContain("URGENT");
  });

  it("system prompt is static — identical for different emails (makes it cacheable)", () => {
    const { system: s1 } = buildSummaryPrompt(BASE_EMAIL);
    const { system: s2 } = buildSummaryPrompt({
      subject: "Totally different subject",
      from: "other@example.com",
      textBody: "Completely different body.",
      receivedAt: new Date(),
    });
    expect(s1).toBe(s2);
  });

  it("no PII from the email appears in the system prompt", () => {
    const { system } = buildSummaryPrompt(BASE_EMAIL);
    // System prompt must not contain email-specific data — only the user message should
    expect(system).not.toContain(BASE_EMAIL.subject);
    expect(system).not.toContain("alice@company.com");
    expect(system).not.toContain("budget spreadsheet");
  });
});

describe("buildSummaryPrompt — user prompt", () => {
  it("user prompt contains the email subject", () => {
    const { user } = buildSummaryPrompt(BASE_EMAIL);
    expect(user).toContain("Q4 Budget Review");
  });

  it("user prompt contains the sender name / address", () => {
    const { user } = buildSummaryPrompt(BASE_EMAIL);
    expect(user).toContain("alice@company.com");
  });

  it("user prompt contains the email body", () => {
    const { user } = buildSummaryPrompt(BASE_EMAIL);
    expect(user).toContain("review the attached budget spreadsheet");
  });

  it("user prompt includes Received timestamp", () => {
    const { user } = buildSummaryPrompt(BASE_EMAIL);
    expect(user).toContain("Received:");
    expect(user).toContain("2024");
  });

  it("long emails (body exceeds token budget) are truncated and a marker is appended", () => {
    // AI_PROMPT_CONTEXT_MAX_TOKENS chars/4; double the limit to force truncation
    const longBody = "word ".repeat(AI_PROMPT_CONTEXT_MAX_TOKENS * 2);
    const { user } = buildSummaryPrompt({ ...BASE_EMAIL, textBody: longBody });
    expect(user).toContain("[truncated]");
  });

  it("short emails within the token budget are NOT truncated", () => {
    const shortBody = "This is a short reply. Thanks!";
    const { user } = buildSummaryPrompt({ ...BASE_EMAIL, textBody: shortBody });
    expect(user).not.toContain("[truncated]");
    expect(user).toContain("short reply");
  });

  it("handles null subject — uses (no subject) fallback", () => {
    const { user } = buildSummaryPrompt({ ...BASE_EMAIL, subject: null });
    expect(user).toContain("(no subject)");
  });

  it("handles null from — uses 'unknown' fallback", () => {
    const { user } = buildSummaryPrompt({ ...BASE_EMAIL, from: null });
    expect(user).toContain("unknown");
  });

  it("handles null textBody — uses (no body) fallback", () => {
    const { user } = buildSummaryPrompt({ ...BASE_EMAIL, textBody: null });
    expect(user).toContain("(no body)");
  });

  it("HTML entities in subject appear in user prompt (plain-text prompt context)", () => {
    // Subjects like "<Project>" or "Q&A" arrive as literal strings from mailparser.
    // They should appear verbatim in the plain-text prompt (no entity encoding needed
    // for a text prompt — models don't interpret HTML in message content).
    const { user } = buildSummaryPrompt({
      ...BASE_EMAIL,
      subject: "Q&A Session: What's new in <v2.0>?",
    });
    expect(user).toContain("Q&A Session");
    expect(user).toContain("<v2.0>");
  });
});
