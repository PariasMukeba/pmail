/**
 * GET  /api/drafts — list all drafts for the current user.
 * POST /api/drafts — create a new draft.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

const createDraftSchema = z.object({
  accountId: z.string(),
  to: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional()
    .default([]),
  cc: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional()
    .default([]),
  bcc: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional()
    .default([]),
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
  inReplyToId: z.string().optional(),
});

/**
 * GET /api/drafts
 * Returns all drafts for the authenticated user across all accounts.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drafts = await prisma.draft.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ drafts });
}

/**
 * POST /api/drafts
 * Creates a new draft and returns it with its generated id.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createDraftSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Verify the account belongs to the user
  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const draft = await prisma.draft.create({
    data: {
      accountId: parsed.data.accountId,
      userId: session.user.id,
      toAddresses: JSON.stringify(parsed.data.to),
      ccAddresses: JSON.stringify(parsed.data.cc),
      bccAddresses: JSON.stringify(parsed.data.bcc),
      subject: parsed.data.subject,
      body: parsed.data.body,
      inReplyToId: parsed.data.inReplyToId,
    },
  });

  return NextResponse.json({ draft }, { status: 201 });
}
