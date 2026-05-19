import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/tests/mocks/prisma";
import { mockPrisma } from "@/tests/mocks/prisma";
import { makeApiEmail, makeApiThread } from "@/tests/fixtures/emails";
import { makeAccount } from "@/tests/fixtures/accounts";

/**
 * Integration tests for the /api/emails route.
 *
 * Route handlers are TDD stubs — replace the imports below with the real
 * route handlers as each one is implemented:
 *
 *   import { GET, PATCH } from "@/app/api/emails/route";
 *   import { GET as GET_BY_ID } from "@/app/api/emails/[id]/route";
 *
 * The mock Prisma client intercepts all DB calls. Auth is stubbed via a
 * session token header checked in the placeholder handlers.
 *
 * Upgrade path: swap mockPrisma for an in-memory SQLite database (via
 * prisma-client-js + DATABASE_URL=file::memory:?cache=shared) once the
 * Prisma schema is established — the test structure stays identical.
 */

const BASE = "http://localhost:3000";

// ── TDD placeholder handlers ────────────────────────────────────────────────
// Each returns the shape the real route will return once implemented.

async function GET(req: Request): Promise<Response> {
  const session = req.headers.get("x-test-session");
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");
  const label = url.searchParams.get("label");
  const unread = url.searchParams.get("unread");
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = parseInt(url.searchParams.get("limit") ?? "20");

  const emails = await mockPrisma.email.findMany() as ReturnType<typeof makeApiEmail>[];

  let filtered = emails;
  if (accountId) filtered = filtered.filter((e) => e.accountId === accountId);
  if (label) filtered = filtered.filter((e) => e.labels?.includes(label));
  if (unread === "true") filtered = filtered.filter((e) => !e.isRead);

  const total = filtered.length;
  const paginated = filtered.slice((page - 1) * limit, page * limit);

  return Response.json({ emails: paginated, total, page, limit });
}

async function GET_BY_ID(req: Request, id: string): Promise<Response> {
  const session = req.headers.get("x-test-session");
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const email = await mockPrisma.email.findUnique() as ReturnType<typeof makeApiEmail> | null;
  if (!email) return Response.json({ error: "Not found" }, { status: 404 });

  // Attach thread siblings
  const thread = await mockPrisma.email.findMany() as ReturnType<typeof makeApiEmail>[];
  return Response.json({ email, thread });
}

async function PATCH(req: Request, id: string): Promise<Response> {
  const session = req.headers.get("x-test-session");
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  const body = await req.json() as Partial<ReturnType<typeof makeApiEmail>>;
  const updated = await mockPrisma.email.update() as ReturnType<typeof makeApiEmail>;
  return Response.json({ ...updated, ...body });
}

// ── Auth header helper ───────────────────────────────────────────────────────
function authed(init: RequestInit = {}): RequestInit {
  return { ...init, headers: { ...(init.headers ?? {}), "x-test-session": "test-token" } };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GET /api/emails — authentication", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await GET(new Request(`${BASE}/api/emails`));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 200 for an authenticated request", async () => {
    mockPrisma.email.findMany.mockResolvedValueOnce([]);
    const res = await GET(new Request(`${BASE}/api/emails`, authed()));
    expect(res.status).toBe(200);
  });
});

describe("GET /api/emails — filtering and pagination", () => {
  const account = makeAccount();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns paginated list of emails", async () => {
    const emails = makeApiThread(5, { accountId: account.id });
    mockPrisma.email.findMany.mockResolvedValueOnce(emails);

    const res = await GET(new Request(`${BASE}/api/emails?limit=3&page=1`, authed()));
    expect(res.status).toBe(200);
    const body = await res.json() as { emails: unknown[]; total: number; page: number };
    expect(body.emails).toHaveLength(3);
    expect(body.total).toBe(5);
    expect(body.page).toBe(1);
  });

  it("GET ?accountId=X filters to that account only", async () => {
    const myEmails = makeApiThread(2, { accountId: account.id });
    const otherEmails = makeApiThread(3, { accountId: "other-account" });
    mockPrisma.email.findMany.mockResolvedValueOnce([...myEmails, ...otherEmails]);

    const res = await GET(
      new Request(`${BASE}/api/emails?accountId=${account.id}`, authed()),
    );
    const body = await res.json() as { emails: Array<{ accountId: string }> };
    expect(body.emails.every((e) => e.accountId === account.id)).toBe(true);
  });

  it("GET ?label=starred returns only starred emails", async () => {
    const starred = [
      makeApiEmail({ isStarred: true, labels: ["inbox", "starred"] }),
      makeApiEmail({ isStarred: true, labels: ["starred"] }),
    ];
    const regular = [makeApiEmail({ labels: ["inbox"] })];
    mockPrisma.email.findMany.mockResolvedValueOnce([...starred, ...regular]);

    const res = await GET(new Request(`${BASE}/api/emails?label=starred`, authed()));
    const body = await res.json() as { emails: Array<{ labels: string[] }> };
    expect(body.emails).toHaveLength(2);
    expect(body.emails.every((e) => e.labels.includes("starred"))).toBe(true);
  });

  it("GET ?unread=true returns only unread emails", async () => {
    const unread = makeApiEmail({ isRead: false });
    const read = makeApiEmail({ isRead: true });
    mockPrisma.email.findMany.mockResolvedValueOnce([unread, read]);

    const res = await GET(new Request(`${BASE}/api/emails?unread=true`, authed()));
    const body = await res.json() as { emails: Array<{ isRead: boolean }> };
    expect(body.emails.every((e) => !e.isRead)).toBe(true);
  });
});

describe("GET /api/emails/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full email with thread for a valid id", async () => {
    const email = makeApiEmail();
    const thread = makeApiThread(3, { threadId: email.threadId });
    mockPrisma.email.findUnique.mockResolvedValueOnce(email);
    mockPrisma.email.findMany.mockResolvedValueOnce(thread);

    const res = await GET_BY_ID(
      new Request(`${BASE}/api/emails/${email.id}`, authed()),
      email.id,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { email: unknown; thread: unknown[] };
    expect(body.email).toBeDefined();
    expect(body.thread).toHaveLength(3);
  });

  it("returns 404 for a non-existent email id", async () => {
    mockPrisma.email.findUnique.mockResolvedValueOnce(null);
    const res = await GET_BY_ID(
      new Request(`${BASE}/api/emails/nonexistent`, authed()),
      "nonexistent",
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET_BY_ID(
      new Request(`${BASE}/api/emails/any-id`),
      "any-id",
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/emails/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCH {isRead: true} marks the email as read", async () => {
    const email = makeApiEmail({ isRead: false });
    mockPrisma.email.update.mockResolvedValueOnce({ ...email, isRead: true });

    const res = await PATCH(
      new Request(`${BASE}/api/emails/${email.id}`, {
        ...authed({ method: "PATCH" }),
        body: JSON.stringify({ isRead: true }),
      }),
      email.id,
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { isRead: boolean };
    expect(body.isRead).toBe(true);
  });

  it("PATCH {labels: [...]} updates the email labels", async () => {
    const email = makeApiEmail({ labels: ["inbox"] });
    const newLabels = ["inbox", "starred"];
    mockPrisma.email.update.mockResolvedValueOnce({ ...email, labels: newLabels });

    const res = await PATCH(
      new Request(`${BASE}/api/emails/${email.id}`, {
        ...authed({ method: "PATCH" }),
        body: JSON.stringify({ labels: newLabels }),
      }),
      email.id,
    );
    const body = await res.json() as { labels: string[] };
    expect(body.labels).toContain("starred");
  });

  it("returns 401 when not authenticated", async () => {
    const res = await PATCH(
      new Request(`${BASE}/api/emails/abc`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      }),
      "abc",
    );
    expect(res.status).toBe(401);
  });
});
