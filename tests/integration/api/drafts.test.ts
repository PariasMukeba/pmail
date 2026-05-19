import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeAccount } from "@/tests/fixtures/accounts";
import { makeEmail } from "@/tests/fixtures/emails";

/**
 * Integration tests for the /api/drafts route (CRUD for draft emails).
 */

// TDD placeholders — replace with real route imports when implemented
const GET_DRAFTS = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");
  if (!accountId) return Response.json({ error: "accountId required" }, { status: 400 });
  const drafts = await mockPrisma.email.findMany();
  return Response.json({ drafts });
};

const POST_DRAFT = async (req: Request): Promise<Response> => {
  const body = await req.json() as { accountId?: string; subject?: string };
  if (!body.accountId) return Response.json({ error: "accountId required" }, { status: 422 });
  const draft = await mockPrisma.email.create();
  return Response.json(draft, { status: 201 });
};

const DELETE_DRAFT = async (req: Request, id: string): Promise<Response> => {
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await mockPrisma.email.delete();
  return new Response(null, { status: 204 });
};

const baseUrl = "http://localhost:3000";

describe("GET /api/drafts", () => {
  const account = makeAccount();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 without accountId", async () => {
    const res = await GET_DRAFTS(new Request(`${baseUrl}/api/drafts`));
    expect(res.status).toBe(400);
  });

  it("returns list of drafts for an account", async () => {
    const drafts = [
      makeEmail({ accountId: account.id, isDraft: true }),
      makeEmail({ accountId: account.id, isDraft: true }),
    ];
    mockPrisma.email.findMany.mockResolvedValueOnce(drafts);

    const res = await GET_DRAFTS(
      new Request(`${baseUrl}/api/drafts?accountId=${account.id}`),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { drafts: unknown[] };
    expect(body.drafts).toHaveLength(2);
  });
});

describe("POST /api/drafts", () => {
  const account = makeAccount();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.email.create.mockResolvedValue(
      makeEmail({ accountId: account.id, isDraft: true }),
    );
  });

  it("creates a draft and returns 201", async () => {
    const res = await POST_DRAFT(
      new Request(`${baseUrl}/api/drafts`, {
        method: "POST",
        body: JSON.stringify({ accountId: account.id, subject: "Draft" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(mockPrisma.email.create).toHaveBeenCalledTimes(1);
  });

  it("returns 422 without accountId", async () => {
    const res = await POST_DRAFT(
      new Request(`${baseUrl}/api/drafts`, {
        method: "POST",
        body: JSON.stringify({ subject: "Draft" }),
      }),
    );
    expect(res.status).toBe(422);
  });
});

describe("DELETE /api/drafts/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.email.delete.mockResolvedValue({});
  });

  it("deletes a draft and returns 204", async () => {
    const res = await DELETE_DRAFT(
      new Request(`${baseUrl}/api/drafts/draft-123`, { method: "DELETE" }),
      "draft-123",
    );
    expect(res.status).toBe(204);
    expect(mockPrisma.email.delete).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when id is empty", async () => {
    const res = await DELETE_DRAFT(
      new Request(`${baseUrl}/api/drafts/`, { method: "DELETE" }),
      "",
    );
    expect(res.status).toBe(400);
  });
});
