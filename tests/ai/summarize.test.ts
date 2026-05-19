import { describe, it, expect, beforeEach } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { makeApiEmail } from "@/tests/fixtures/emails";
import { emailAI, type SummaryResult } from "@/lib/ai/email-ai";
import { buildSummaryPrompt } from "@/lib/skills/ai/build-summary-prompt";

// ── MSW helpers ──────────────────────────────────────────────────────────────

let _capturedBody: Record<string, unknown> | null = null;

function mockSummaryResponse(json: SummaryResult | object): void {
  _capturedBody = null;
  server.use(
    http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
      _capturedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: JSON.stringify(json) }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 200, output_tokens: 100 },
      });
    }),
  );
}

function mockRawResponse(raw: string): void {
  server.use(
    http.post("https://api.anthropic.com/v1/messages", () =>
      HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: raw }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 50, output_tokens: 10 },
      }),
    ),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("emailAI.summarizeEmail", () => {
  beforeEach(() => { _capturedBody = null; });

  it("returns parsed summary for a valid model response", async () => {
    const email = makeApiEmail({
      body: "<p>Please approve the Q3 budget by Friday. The board meets Monday.</p>",
    });
    const expected: SummaryResult = {
      summary: "Alice requests budget approval before the board meeting.",
      actionItems: ["Approve Q3 budget", "Reply by Friday"],
      sentiment: "NEUTRAL",
      category: "WORK",
    };
    mockSummaryResponse(expected);

    const result = await emailAI.summarizeEmail(email);

    expect(result).not.toBeNull();
    expect(result!.summary).toContain("budget");
    expect(result!.actionItems).toHaveLength(2);
    expect(result!.sentiment).toBe("NEUTRAL");
    expect(result!.category).toBe("WORK");
  });

  it("returns null for an email with empty body", async () => {
    const email = makeApiEmail({ body: "" });
    // Should short-circuit before calling the API — no mock needed
    const result = await emailAI.summarizeEmail(email);
    expect(result).toBeNull();
  });

  it("returns null when model returns malformed JSON", async () => {
    const email = makeApiEmail({ body: "<p>Some content.</p>" });
    mockRawResponse("Sorry, I can't summarise this email.");

    const result = await emailAI.summarizeEmail(email);
    expect(result).toBeNull();
  });

  it("classifies URGENT sentiment correctly", async () => {
    const email = makeApiEmail({
      subject: "URGENT: Server outage — immediate action required",
      body: "<p>Production is down. Rollback needed ASAP.</p>",
    });
    mockSummaryResponse({
      summary: "Production server is down and needs immediate rollback.",
      actionItems: ["Page on-call engineer", "Initiate rollback"],
      sentiment: "URGENT",
      category: "WORK",
    });

    const result = await emailAI.summarizeEmail(email);
    expect(result!.sentiment).toBe("URGENT");
    expect(result!.actionItems.length).toBeGreaterThan(0);
  });

  it("classifies newsletter as NEWSLETTER category", async () => {
    const email = makeApiEmail({
      subject: "Your weekly roundup",
      body: "<p>Top stories from this week...</p>",
    });
    mockSummaryResponse({
      summary: "Weekly newsletter with top stories.",
      actionItems: [],
      sentiment: "NEUTRAL",
      category: "NEWSLETTER",
    });

    const result = await emailAI.summarizeEmail(email);
    expect(result!.category).toBe("NEWSLETTER");
    expect(result!.actionItems).toHaveLength(0);
  });

  it("handles API error gracefully — returns null instead of throwing", async () => {
    const email = makeApiEmail({ body: "<p>Content.</p>" });
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({ error: "Internal server error" }, { status: 500 }),
      ),
    );

    const result = await emailAI.summarizeEmail(email);
    expect(result).toBeNull();
  });
});

describe("buildSummaryPrompt — prompt construction (unit level)", () => {
  it("system prompt is identical across calls (warm-cache contract)", () => {
    const { system: s1 } = buildSummaryPrompt({
      subject: "Email A",
      from: "a@example.com",
      textBody: "Body A",
      receivedAt: new Date(),
    });
    const { system: s2 } = buildSummaryPrompt({
      subject: "Email B",
      from: "b@example.com",
      textBody: "Body B",
      receivedAt: new Date(),
    });
    expect(s1).toBe(s2);
  });

  it("user message carries email-specific content", () => {
    const { user } = buildSummaryPrompt({
      subject: "Project Alpha launch",
      from: "cto@company.com",
      textBody: "We go live on Monday.",
      receivedAt: new Date("2024-06-15T09:00:00Z"),
    });
    expect(user).toContain("Project Alpha launch");
    expect(user).toContain("cto@company.com");
    expect(user).toContain("We go live on Monday.");
  });

  it("returns { system, user } pair — both non-empty strings", () => {
    const { system, user } = buildSummaryPrompt({
      subject: "Test",
      from: "x@y.com",
      textBody: "Body.",
      receivedAt: new Date(),
    });
    expect(system.length).toBeGreaterThan(50);
    expect(user.length).toBeGreaterThan(10);
  });
});
