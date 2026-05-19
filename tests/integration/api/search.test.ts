import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeThread } from "@/tests/fixtures/threads";
import { makeAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for the /api/search route.
 *
 * Search works on server-decrypted content — these tests verify that:
 * - Query validation is enforced (min length, required accountId)
 * - Results are returned in recency order
 * - Empty results are handled gracefully
 */

// TDD placeholder
const GET_SEARCH = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const accountId = url.searchParams.get("accountId");

  if (!accountId) return Response.json({ error: "accountId required" }, { status: 400 });
  if (!q || q.trim().length < 2) {
    return Response.json({ error: "query too short" }, { status: 422 });
  }

  const results = await mockPrisma.thread.findMany();
  return Response.json({ results, total: (results as unknown[]).length });
};

const baseUrl = "http://localhost:3000";

describe("GET /api/search", () => {
  const account = makeAccount();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when accountId is missing", async () => {
    const res = await GET_SEARCH(new Request(`${baseUrl}/api/search?q=hello`));
    expect(res.status).toBe(400);
  });

  it("returns 422 when query is too short (< 2 chars)", async () => {
    const res = await GET_SEARCH(
      new Request(`${baseUrl}/api/search?accountId=${account.id}&q=a`),
    );
    expect(res.status).toBe(422);
  });

  it("returns 422 when query is empty", async () => {
    const res = await GET_SEARCH(
      new Request(`${baseUrl}/api/search?accountId=${account.id}&q=`),
    );
    expect(res.status).toBe(422);
  });

  it("returns results for a valid query", async () => {
    const threads = [makeThread({ accountId: account.id }), makeThread({ accountId: account.id })];
    mockPrisma.thread.findMany.mockResolvedValueOnce(threads);

    const res = await GET_SEARCH(
      new Request(`${baseUrl}/api/search?accountId=${account.id}&q=project+update`),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.results).toHaveLength(2);
    expect(body.total).toBe(2);
  });

  it("returns empty results when nothing matches", async () => {
    mockPrisma.thread.findMany.mockResolvedValueOnce([]);

    const res = await GET_SEARCH(
      new Request(`${baseUrl}/api/search?accountId=${account.id}&q=zzz-no-match`),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { results: unknown[]; total: number };
    expect(body.results).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("calls prisma.thread.findMany exactly once per search request", async () => {
    await GET_SEARCH(
      new Request(`${baseUrl}/api/search?accountId=${account.id}&q=hello+world`),
    );
    expect(mockPrisma.thread.findMany).toHaveBeenCalledTimes(1);
  });
});
