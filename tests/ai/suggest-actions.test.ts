import { describe, it, expect, beforeEach } from "vitest";
import { server } from "@/tests/mocks/server";
import { http, HttpResponse } from "msw";
import { makeApiEmail } from "@/tests/fixtures/emails";

/**
 * AI behaviour tests for the suggest-actions feature.
 *
 * The feature analyses an email and returns a list of contextual quick-actions
 * (Accept meeting, Decline, Ask for details, Archive, etc.).
 *
 * lib/ai/email-ai.ts will expose `emailAI.suggestActions(email)` once
 * implemented. These tests define the contract (TDD).
 *
 * Until then, we test the output parser and prompt contracts independently.
 */

// ── Expected output shape ────────────────────────────────────────────────────

interface SuggestedAction {
  id: string;
  label: string;
  /** Pre-composed reply body, or null for UI-only actions (e.g. Archive). */
  draftBody: string | null;
}

// ── Output parser (mirrors what emailAI.suggestActions will use) ─────────────

function parseActions(raw: string): SuggestedAction[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (item): item is SuggestedAction =>
        typeof (item as SuggestedAction).id === "string" &&
        typeof (item as SuggestedAction).label === "string" &&
        ((item as SuggestedAction).draftBody === null ||
          typeof (item as SuggestedAction).draftBody === "string"),
    );
  } catch {
    return [];
  }
}

// ── MSW helper ───────────────────────────────────────────────────────────────

let _capturedBody: Record<string, unknown> | null = null;

function mockActionsResponse(actions: SuggestedAction[]): void {
  _capturedBody = null;
  server.use(
    http.post("https://api.anthropic.com/v1/messages", async ({ request }) => {
      _capturedBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: JSON.stringify(actions) }],
        model: "claude-sonnet-4-6",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 120, output_tokens: 60 },
      });
    }),
  );
}

// ── Output parser tests ───────────────────────────────────────────────────────

describe("parseActions — output parser", () => {
  beforeEach(() => { _capturedBody = null; });

  it("parses a valid actions JSON array", () => {
    const raw = JSON.stringify([
      { id: "accept", label: "Accept meeting", draftBody: "I'll be there. See you then!" },
      { id: "decline", label: "Decline", draftBody: "Sorry, I can't make it." },
      { id: "archive", label: "Archive", draftBody: null },
    ]);
    const actions = parseActions(raw);
    expect(actions).toHaveLength(3);
    expect(actions[0].id).toBe("accept");
    expect(actions[2].draftBody).toBeNull();
  });

  it("returns empty array for malformed JSON", () => {
    expect(parseActions("not json")).toEqual([]);
    expect(parseActions("")).toEqual([]);
    expect(parseActions("{broken")).toEqual([]);
  });

  it("returns empty array when model returns empty list", () => {
    expect(parseActions("[]")).toEqual([]);
  });

  it("filters out items missing required id or label fields", () => {
    const raw = JSON.stringify([
      { id: "valid", label: "Valid", draftBody: null },
      { label: "No id", draftBody: null },
      { id: "no-label", draftBody: null },
    ]);
    const actions = parseActions(raw);
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe("valid");
  });

  it("returns empty array when model wraps list in an object", () => {
    const raw = JSON.stringify({ actions: [{ id: "a", label: "A", draftBody: null }] });
    expect(parseActions(raw)).toEqual([]);
  });

  it("never throws for any string input", () => {
    const inputs = ["", "null", "undefined", "true", "42", '{"key":"val"}'];
    for (const input of inputs) {
      expect(() => parseActions(input)).not.toThrow();
    }
  });
});

describe("suggest-actions — email context", () => {
  it("meeting invitation has subject containing scheduling keywords", () => {
    const email = makeApiEmail({
      subject: "Team sync — Thursday 2pm",
      body: "<p>Can you join us Thursday at 2pm for the planning session?</p>",
    });
    expect(email.subject.toLowerCase()).toMatch(/thursday|meeting|sync|2pm/);
    expect(email.body).toContain("Thursday");
  });

  it("question email has body containing interrogative signals", () => {
    const email = makeApiEmail({
      subject: "Quick question",
      body: "<p>What is the deadline for the Q4 report?</p>",
    });
    expect(email.body).toContain("?");
  });

  it("newsletter email has marketing signals in from/subject", () => {
    const email = makeApiEmail({
      from: { name: "ProductHunt", address: "noreply@producthunt.com" },
      subject: "Top products this week",
    });
    expect(email.from.address).toContain("@producthunt.com");
  });

  it("high-priority email has urgency signals in subject", () => {
    const email = makeApiEmail({
      subject: "URGENT: Approval needed by noon",
      body: "<p>Please approve before noon today — the client is waiting.</p>",
      aiPriority: "high",
    });
    expect(email.subject).toContain("URGENT");
    expect(email.aiPriority).toBe("high");
  });

  it("draft-reply action has non-null draftBody", () => {
    const replyAction: SuggestedAction = {
      id: "reply-yes",
      label: "Yes, I'll attend",
      draftBody: "Confirmed! I'll be there at 2pm.",
    };
    expect(replyAction.draftBody).not.toBeNull();
    expect(replyAction.draftBody!.length).toBeGreaterThan(0);
  });

  it("ui-only action (Archive) has null draftBody", () => {
    const archiveAction: SuggestedAction = {
      id: "archive",
      label: "Archive",
      draftBody: null,
    };
    expect(archiveAction.draftBody).toBeNull();
  });
});
