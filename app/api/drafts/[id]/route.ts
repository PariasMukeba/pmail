/**
 * PATCH  /api/drafts/[id] — update draft (auto-save).
 * DELETE /api/drafts/[id] — discard draft.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

const patchDraftSchema = z.object({
  to: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional(),
  cc: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional(),
  bcc: z
    .array(z.object({ name: z.string(), address: z.string().email() }))
    .optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/drafts/[id]
 * Partially updates a draft — used for debounced auto-save.
 */
export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = patchDraftSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.draft.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    const err = new NotFoundError("Draft", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const { to, cc, bcc, subject, body: draftBody } = parsed.data;

  const draft = await prisma.draft.update({
    where: { id: params.id },
    data: {
      ...(to !== undefined && { toAddresses: JSON.stringify(to) }),
      ...(cc !== undefined && { ccAddresses: JSON.stringify(cc) }),
      ...(bcc !== undefined && { bccAddresses: JSON.stringify(bcc) }),
      ...(subject !== undefined && { subject }),
      ...(draftBody !== undefined && { body: draftBody }),
    },
  });

  return NextResponse.json({ draft });
}

/**
 * DELETE /api/drafts/[id]
 * Permanently deletes a draft.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.draft.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    const err = new NotFoundError("Draft", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  await prisma.draft.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}
