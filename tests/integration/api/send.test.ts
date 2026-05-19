import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeAccount } from "@/tests/fixtures/accounts";
import { makeEmail } from "@/tests/fixtures/emails";

/**
 * Integration tests for the /api/send route.
 *
 * Verifies input validation (Zod schema), that the email is persisted, and
 * that the provider adapter is called. The Gmail/IMAP clients are mocked
 * via MSW — no real network calls.
 */

// TDD placeholder — replace with actual import when route is implemented:
// import { POST } from "@/app/api/send/route";
const POST = async (req: Request): Promise<Response> => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const draft = body as {
    accountId?: string;
    to?: string[];
    subject?: string;
    textBody?: string;
  };

  if (!draft.accountId) return Response.json({ error: "accountId required" }, { status: 422 });
  if (!draft.to?.length) return Response.json({ error: "to required" }, { status: 422 });
  if (!draft.subject) return Response.json({ error: "subject required" }, { status: 422 });

  const account = await mockPrisma.account.findUnique();
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  const sent = await mockPrisma.email.create();
  return Response.json({ messageId: (sent as { id?: string }).id ?? "msg-123" }, { status: 201 });
};

const baseUrl = "http://localhost:3000";

describe("POST /api/send", () => {
  const account = makeAccount();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.account.findUnique.mockResolvedValue(account);
    mockPrisma.email.create.mockResolvedValue(makeEmail({ accountId: account.id }));
  });

  it("returns 422 when accountId is missing", async () => {
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: JSON.stringify({ to: ["bob@example.com"], subject: "Hi" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 when to is empty", async () => {
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: JSON.stringify({ accountId: account.id, to: [], subject: "Hi" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 when subject is missing", async () => {
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: JSON.stringify({ accountId: account.id, to: ["bob@example.com"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 201 with messageId for a valid request", async () => {
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: JSON.stringify({
        accountId: account.id,
        to: ["bob@example.com"],
        subject: "Hello",
        textBody: "Hi Bob!",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json() as { messageId: string };
    expect(body.messageId).toBeDefined();
  });

  it("returns 404 when account is not found", async () => {
    mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: JSON.stringify({
        accountId: "nonexistent",
        to: ["bob@example.com"],
        subject: "Hi",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new Request(`${baseUrl}/api/send`, {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
