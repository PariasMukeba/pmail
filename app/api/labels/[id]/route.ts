/**
 * PATCH  /api/labels/[id] — update label name and/or color.
 * DELETE /api/labels/[id] — delete a user-defined label.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
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

  const { data: existing } = await supabase
    .from("Label")
    .select("*")
    .eq("id", params.id)
    .eq("userId", session.user.id)
    .single();

  if (!existing) {
    const err = new NotFoundError("Label", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  if (row.isSystem) {
    return NextResponse.json(
      { error: "System labels cannot be modified" },
      { status: 403 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.color !== undefined) updateData.color = parsed.data.color;

  const { data: label } = await supabase
    .from("Label")
    .update(updateData)
    .eq("id", params.id)
    .select("*")
    .single();

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

  const { data: existing } = await supabase
    .from("Label")
    .select("id,isSystem")
    .eq("id", params.id)
    .eq("userId", session.user.id)
    .single();

  if (!existing) {
    const err = new NotFoundError("Label", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const row = existing as Record<string, unknown>;
  if (row.isSystem) {
    return NextResponse.json(
      { error: "System labels cannot be deleted" },
      { status: 403 },
    );
  }

  await supabase.from("Label").delete().eq("id", params.id);

  return new NextResponse(null, { status: 204 });
}
