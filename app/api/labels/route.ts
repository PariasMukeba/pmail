/**
 * GET  /api/labels — list all labels for the current user.
 * POST /api/labels — create a new label.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
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

  const { data: labels } = await supabase
    .from("Label")
    .select("*")
    .eq("userId", session.user.id)
    .order("isSystem", { ascending: false })
    .order("name", { ascending: true });

  return NextResponse.json({ labels: labels ?? [] });
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
    const { data: account } = await supabase
      .from("Account")
      .select("id")
      .eq("id", parsed.data.accountId)
      .eq("userId", session.user.id)
      .single();
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
  }

  const { data: label } = await supabase
    .from("Label")
    .insert({
      id: crypto.randomUUID(),
      userId: session.user.id,
      name: parsed.data.name,
      color: parsed.data.color,
      accountId: parsed.data.accountId ?? null,
      isSystem: false,
      createdAt: new Date().toISOString(),
    })
    .select("*")
    .single();

  return NextResponse.json({ label }, { status: 201 });
}
