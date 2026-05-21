/**
 * POST /api/push/subscribe — register a Web Push subscription.
 *
 * Body: `{ endpoint: string, keys: { p256dh: string, auth: string } }`
 * Saves the subscription to `PushSubscription` in the DB.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/**
 * POST /api/push/subscribe
 * Upserts a Web Push subscription for the authenticated user.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await supabase.from("PushSubscription").upsert(
    {
      userId: session.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      createdAt: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}
