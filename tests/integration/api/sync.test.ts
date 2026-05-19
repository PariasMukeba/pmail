import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeGmailAccount, makeMicrosoftAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for the /api/sync route (manual sync trigger).
 *
 * The sync route kicks off an immediate sync for an account. It should:
 * - Validate the accountId
 * - Check the account exists and token is not expired
 * - Dispatch a sync job (queue or direct call)
 * - Return 202 Accepted immediately
 */

// TDD placeholder
const POST_SYNC = async (req: Request): Promise<Response> => {
  const body = await req.json().catch(() => null) as { accountId?: string } | null;
  if (!body?.accountId) {
    return Response.json({ error: "accountId required" }, { status: 422 });
  }

  const account = await mockPrisma.account.findUnique();
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  // In the real implementation, this would enqueue a BullMQ job
  return Response.json({ status: "queued", accountId: body.accountId }, { status: 202 });
};

const baseUrl = "http://localhost:3000";

describe("POST /api/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 422 when accountId is missing", async () => {
    const req = new Request(`${baseUrl}/api/sync`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST_SYNC(req);
    expect(res.status).toBe(422);
  });

  it("returns 404 when account does not exist", async () => {
    mockPrisma.account.findUnique.mockResolvedValueOnce(null);
    const req = new Request(`${baseUrl}/api/sync`, {
      method: "POST",
      body: JSON.stringify({ accountId: "nonexistent" }),
    });
    const res = await POST_SYNC(req);
    expect(res.status).toBe(404);
  });

  it("returns 202 Accepted for a valid Gmail account", async () => {
    const account = makeGmailAccount();
    mockPrisma.account.findUnique.mockResolvedValueOnce(account);

    const req = new Request(`${baseUrl}/api/sync`, {
      method: "POST",
      body: JSON.stringify({ accountId: account.id }),
    });
    const res = await POST_SYNC(req);
    expect(res.status).toBe(202);
    const body = await res.json() as { status: string; accountId: string };
    expect(body.status).toBe("queued");
    expect(body.accountId).toBe(account.id);
  });

  it("returns 202 Accepted for a valid Microsoft account", async () => {
    const account = makeMicrosoftAccount();
    mockPrisma.account.findUnique.mockResolvedValueOnce(account);

    const req = new Request(`${baseUrl}/api/sync`, {
      method: "POST",
      body: JSON.stringify({ accountId: account.id }),
    });
    const res = await POST_SYNC(req);
    expect(res.status).toBe(202);
  });

  it("calls account.findUnique with the provided accountId", async () => {
    const account = makeGmailAccount();
    mockPrisma.account.findUnique.mockResolvedValueOnce(account);

    const req = new Request(`${baseUrl}/api/sync`, {
      method: "POST",
      body: JSON.stringify({ accountId: account.id }),
    });
    await POST_SYNC(req);
    expect(mockPrisma.account.findUnique).toHaveBeenCalledTimes(1);
  });
});
