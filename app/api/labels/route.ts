/**
 * GET  /api/labels — list all labels for the current user.
 * POST /api/labels — create a new label.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

const createLabelSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accountId: z.string().optional(),
});

/**
 * GET /api/labels
 * Returns all labels owned by the authenticated user.
 */
export async function GET(_request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const labels = await prisma.label.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ labels });
}

/**
 * POST /api/labels
 * Creates a new user-defined label.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = createLabelSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // If accountId is provided, verify it belongs to the user
  if (parsed.data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, userId: session.user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  const label = await prisma.label.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      color: parsed.data.color,
      accountId: parsed.data.accountId ?? null,
      isSystem: false,
    },
  });

  return NextResponse.json({ label }, { status: 201 });
}
