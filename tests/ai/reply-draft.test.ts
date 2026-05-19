import { describe, it, expect, beforeEach } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { emailAI } from "@/lib/ai/email-ai";
import { buildReplyPrompt } from "@/lib/skills/ai/build-reply-prompt";

// ── MSW helpers ──────────────────────────────────────────────────────────────

let _capturedBody: Record<string, unknown> | null = null;

function mockReplyResponse(draftText: string): void {
  _capturedBody = null;
  server.use(
    http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
      _capturedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: draftText }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 150, output_tokens: 80 },
      });
    }),
  );
}

function thread(n: number) {
  const base = new Date("2024-06-15T09:00:00Z");
  return Array.from({ length: n }, (_, i) => ({
    from: i % 2 === 0 ? "alice@example.com" : "bob@example.com",
    textBody: `Message ${i + 1}: ${i % 2 === 0 ? "Are you free Thursday?" : "Thursday works for me."}`,
    receivedAt: new Date(base.getTime() + i * 3_600_000),
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("emailAI.draftReply", () => {
  beforeEach(() => { _capturedBody = null; });

  it("returns the draft text from the model response", async () => {
    mockReplyResponse("Thanks for reaching out! Thursday at 2pm works for me.");

    const result = await emailAI.draftReply({
      threadMessages: thread(2),
      styleExemplars: [],
      tone: "friendly",
    });

    expect(result).toBe("Thanks for reaching out! Thursday at 2pm works for me.");
  });

  it("sends the correct model to the API", async () => {
    mockReplyResponse("Draft reply.");
    await emailAI.draftReply({ threadMessages: thread(1), styleExemplars: [], tone: "professional" });
    expect(_capturedBody!["model"]).toBe("claude-sonnet-4-6");
  });

  it("applies professional tone — system prompt contains 'professional'", async () => {
    mockReplyResponse("I appreciate your message.");
    await emailAI.draftReply({ threadMessages: thread(1), styleExemplars: [], tone: "professional" });

    const system = (_capturedBody!["system"] as Array<{ text: string }>)
      .map((b) => b.text)
      .join(" ");
    expect(system.toLowerCase()).toContain("professional");
  });

  it("applies brief tone — system prompt mentions 2–3 sentences", async () => {
    mockReplyResponse("Got it. Will do.");
    await emailAI.draftReply({ threadMessages: thread(1), styleExemplars: [], tone: "brief" });

    const system = (_capturedBody!["system"] as Array<{ text: string }>)
      .map((b) => b.text)
      .join(" ");
    expect(system).toContain("2–3 sentences");
  });

  it("includes style exemplars in the system prompt when provided", async () => {
    mockReplyResponse("Thanks for the update.");
    await emailAI.draftReply({
      threadMessages: thread(1),
      styleExemplars: ["Sounds good, let me know!", "Thanks for looping me in."],
      tone: "friendly",
    });

    const system = (_capturedBody!["system"] as Array<{ text: string }>)
      .map((b) => b.text)
      .join(" ");
    expect(system).toContain("Sounds good, let me know!");
  });

  it("handles rate limit — throws a retryable AIError", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json(
          { type: "error", error: { type: "rate_limit_error", message: "Rate limited" } },
          { status: 429 },
        ),
      ),
    );

    await expect(
      emailAI.draftReply({ threadMessages: thread(1), styleExemplars: [], tone: "brief" }),
    ).rejects.toMatchObject({ code: "AI_ERROR", retryable: true });
  });

  it("returns empty string when model returns no content blocks", async () => {
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json({
          id: "msg_empty",
          type: "message",
          role: "assistant",
          content: [],
          model: "claude-sonnet-4-6",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 0 },
        }),
      ),
    );

    const result = await emailAI.draftReply({
      threadMessages: thread(1),
      styleExemplars: [],
      tone: "professional",
    });
    expect(result).toBe("");
  });
});

describe("buildReplyPrompt — prompt construction (unit level)", () => {
  it("thread context appears in user message oldest-first", () => {
    const messages = thread(3);
    const { user } = buildReplyPrompt({ threadMessages: messages, styleExemplars: [], tone: "professional" });
    expect(user.indexOf("Message 1")).toBeLessThan(user.indexOf("Message 2"));
    expect(user.indexOf("Message 2")).toBeLessThan(user.indexOf("Message 3"));
  });

  it("system prompt instructs no meta-commentary in the reply", () => {
    const { system } = buildReplyPrompt({ threadMessages: thread(1), styleExemplars: [], tone: "brief" });
    expect(system).toContain("No meta-commentary");
  });

  it("user message ends with a clear draft instruction", () => {
    const { user } = buildReplyPrompt({ threadMessages: thread(1), styleExemplars: [], tone: "professional" });
    expect(user).toContain("Draft a reply");
  });

  it("handles null from/body in thread messages without throwing", () => {
    expect(() =>
      buildReplyPrompt({
        threadMessages: [{ from: null, textBody: null, receivedAt: new Date() }],
        styleExemplars: [],
        tone: "brief",
      }),
    ).not.toThrow();
  });

  it("returns { system, user } — both are non-empty strings", () => {
    const { system, user } = buildReplyPrompt({
      threadMessages: thread(1),
      styleExemplars: [],
      tone: "professional",
    });
    expect(system.length).toBeGreaterThan(20);
    expect(user.length).toBeGreaterThan(10);
  });
});
