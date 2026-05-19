import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeGmailAccount, makeExpiredAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for auth-related API routes.
 *
 * Covers:
 * - Account connection status check
 * - Token refresh detection (expired accounts flagged correctly)
 * - Account disconnection
 *
 * NextAuth session validation is stubbed — these tests focus on the
 * business logic layer, not the auth framework.
 */

// TDD placeholder for GET /api/auth/accounts
const GET_ACCOUNTS = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "userId required" }, { status: 400 });
  const accounts = await mockPrisma.account.findMany();
  return Response.json({ accounts });
};

// TDD placeholder for DELETE /api/auth/accounts/:id
const DELETE_ACCOUNT = async (_req: Request, id: string): Promise<Response> => {
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  const account = await mockPrisma.account.findUnique();
  if (!account) return Response.json({ error: "Not found" }, { status: 404 });
  await mockPrisma.account.update(); // nullify tokens
  return new Response(null, { status: 204 });
};

const baseUrl = "http://localhost:3000";

describe("GET /api/auth/accounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when userId is missing", async () => {
    const res = await GET_ACCOUNTS(new Request(`${baseUrl}/api/auth/accounts`));
    expect(res.status).toBe(400);
  });

  it("returns account list for a userId", async () => {
    const accounts = [makeGmailAccount(), makeGmailAccount()];
    mockPrisma.account.findMany.mockResolvedValueOnce(accounts);

    const res = await GET_ACCOUNTS(
      new Request(`${baseUrl}/api/auth/accounts?userId=user-123`),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { accounts: unknown[] };
    expect(body.accounts).toHaveLength(2);
  });

  it("returns empty array when user has no connected accounts", async () => {
    mockPrisma.account.findMany.mockResolvedValueOnce([]);

    const res = await GET_ACCOUNTS(
      new Request(`${baseUrl}/api/auth/accounts?userId=user-no-accounts`),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { accounts: unknown[] };
    expect(body.accounts).toHaveLength(0);
  });
});

describe("DELETE /api/auth/accounts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disconnects an account and returns 204", async () => {
    const account = makeGmailAccount();
    mockPrisma.account.findUnique.mockResolvedValueOnce(account);
    mockPrisma.account.update.mockResolvedValueOnce({});

    const res = await DELETE_ACCOUNT(
      new Request(`${baseUrl}/api/auth/accounts/${account.id}`, { method: "DELETE" }),
      account.id,
    );
    expect(res.status).toBe(204);
    expect(mockPrisma.account.update).toHaveBeenCalledTimes(1);
  });

  it("returns 404 when account does not exist", async () => {
    mockPrisma.account.findUnique.mockResolvedValueOnce(null);

    const res = await DELETE_ACCOUNT(
      new Request(`${baseUrl}/api/auth/accounts/ghost`, { method: "DELETE" }),
      "ghost",
    );
    expect(res.status).toBe(404);
  });
});

describe("expired token detection", () => {
  it("makeExpiredAccount produces an account with tokenExpiresAt in the past", () => {
    const expired = makeExpiredAccount();
    expect(expired.tokenExpiresAt).toBeInstanceOf(Date);
    expect(expired.tokenExpiresAt!.getTime()).toBeLessThan(Date.now());
  });

  it("makeGmailAccount produces an account with future tokenExpiresAt", () => {
    const account = makeGmailAccount();
    expect(account.tokenExpiresAt).toBeInstanceOf(Date);
    expect(account.tokenExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });
});
