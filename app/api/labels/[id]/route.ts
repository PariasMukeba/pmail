/**
 * PATCH  /api/labels/[id] — update label name and/or color.
 * DELETE /api/labels/[id] — delete a user-defined label.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";

const patchLabelSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color")
    .optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * PATCH /api/labels/[id]
 * Updates the name and/or color of a label owned by the current user.
 * System labels cannot be modified.
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
  const parsed = patchLabelSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.label.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    const err = new NotFoundError("Label", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  if (existing.isSystem) {
    return NextResponse.json(
      { error: "System labels cannot be modified" },
      { status: 403 },
    );
  }

  const label = await prisma.label.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.color !== undefined && { color: parsed.data.color }),
    },
  });

  return NextResponse.json({ label });
}

/**
 * DELETE /api/labels/[id]
 * Permanently deletes a user-defined label.
 * System labels cannot be deleted.
 */
export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.label.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    const err = new NotFoundError("Label", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  if (existing.isSystem) {
    return NextResponse.json(
      { error: "System labels cannot be deleted" },
      { status: 403 },
    );
  }

  await prisma.label.delete({ where: { id: params.id } });

  return new NextResponse(null, { status: 204 });
}
