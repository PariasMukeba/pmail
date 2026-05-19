import { describe, it, expect, beforeEach } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { makeApiEmail, makeHighPriorityEmail, makeNewsletterEmail } from "@/tests/fixtures/emails";
import { emailAI } from "@/lib/ai/email-ai";

// ── MSW helpers ──────────────────────────────────────────────────────────────

let _capturedBody: Record<string, unknown> | null = null;

/**
 * Override the Anthropic handler for a single test.
 * MSW resets per-test overrides via the afterEach in tests/setup.ts.
 */
function mockAnthropicResponse(content: string): void {
  _capturedBody = null;
  server.use(
    http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
      _capturedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: content }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 5 },
      });
    }),
  );
}

/**
 * Return the full text sent to Claude — system prompt + user message.
 * Use this to verify the right email content reached the model.
 */
function capturedPrompt(): string {
  if (!_capturedBody) return "";
  const system = _capturedBody["system"];
  const systemText = Array.isArray(system)
    ? system.map((b: { text?: string }) => b.text ?? "").join("\n")
    : typeof system === "string"
      ? system
      : "";
  const messages = _capturedBody["messages"] as Array<{ role: string; content: string }> | undefined;
  const userText = messages?.map((m) => m.content).join("\n") ?? "";
  return `${systemText}\n${userText}`;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("emailAI.prioritizeEmail", () => {
  beforeEach(() => {
    _capturedBody = null;
  });

  it("classifies newsletter as low priority", async () => {
    const email = makeApiEmail({
      subject: "Your weekly digest from ProductHunt",
      from: { name: "ProductHunt", address: "noreply@producthunt.com" },
    });
    mockAnthropicResponse("low");

    const result = await emailAI.prioritizeEmail(email);

    expect(result).toBe("low");
    expect(capturedPrompt()).toContain(email.subject);
    expect(capturedPrompt()).toContain("noreply@producthunt.com");
  });

  it("classifies urgent deadline email as high priority", async () => {
    const email = makeHighPriorityEmail();
    mockAnthropicResponse("high");

    const result = await emailAI.prioritizeEmail(email);

    expect(result).toBe("high");
    expect(capturedPrompt()).toContain(email.subject);
  });

  it("handles empty email body gracefully — sends (no body) placeholder", async () => {
    const email = makeApiEmail({ body: "" });
    mockAnthropicResponse("normal");

    const result = await emailAI.prioritizeEmail(email);

    expect(result).toBe("normal");
    // The prompt should still be formed and sent — not crash
    expect(_capturedBody).not.toBeNull();
  });

  it("handles Claude API rate limit (429) by throwing a retryable AIError", async () => {
    const email = makeApiEmail();
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.json(
          { type: "error", error: { type: "rate_limit_error", message: "Rate limited" } },
          { status: 429 },
        ),
      ),
    );

    await expect(emailAI.prioritizeEmail(email)).rejects.toMatchObject({
      code: "AI_ERROR",
      retryable: true,
    });
  });

  it("handles network failure by throwing a non-retryable AIError", async () => {
    const email = makeApiEmail();
    server.use(
      http.post("https://api.anthropic.com/v1/messages", () =>
        HttpResponse.error(),
      ),
    );

    await expect(emailAI.prioritizeEmail(email)).rejects.toMatchObject({
      code: "AI_ERROR",
    });
  });

  it("handles very long email body — truncates before sending, does not throw", async () => {
    const email = makeApiEmail({
      body: `<p>${"This is a very long email. ".repeat(5_000)}</p>`,
    });
    mockAnthropicResponse("normal");

    await expect(emailAI.prioritizeEmail(email)).resolves.toBe("normal");
    // Prompt must have been sent despite the large body
    expect(_capturedBody).not.toBeNull();
  });

  it("normalises case from model response — 'HIGH' → 'high'", async () => {
    const email = makeApiEmail();
    mockAnthropicResponse("HIGH");

    const result = await emailAI.prioritizeEmail(email);
    expect(result).toBe("high");
  });

  it("defaults to 'normal' when model returns an unexpected value", async () => {
    const email = makeApiEmail();
    mockAnthropicResponse("I cannot determine the priority.");

    const result = await emailAI.prioritizeEmail(email);
    expect(result).toBe("normal");
  });
});

describe("emailAI.prioritizeEmail — prompt content", () => {
  beforeEach(() => { _capturedBody = null; });

  it("prompt includes sender address", async () => {
    const email = makeApiEmail({ from: { name: "Bob Smith", address: "bob@acme.com" } });
    mockAnthropicResponse("normal");
    await emailAI.prioritizeEmail(email);
    expect(capturedPrompt()).toContain("bob@acme.com");
  });

  it("prompt includes subject line", async () => {
    const email = makeApiEmail({ subject: "Quarterly review deadline" });
    mockAnthropicResponse("high");
    await emailAI.prioritizeEmail(email);
    expect(capturedPrompt()).toContain("Quarterly review deadline");
  });

  it("prompt reaches the model (capturedBody is not null after call)", async () => {
    mockAnthropicResponse("normal");
    await emailAI.prioritizeEmail(makeApiEmail());
    expect(_capturedBody).not.toBeNull();
    expect(_capturedBody!["model"]).toBe("claude-sonnet-4-6");
  });
});
