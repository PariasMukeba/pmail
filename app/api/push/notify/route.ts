/**
 * POST /api/push/notify — internal endpoint to send a push notification.
 *
 * Body: `{ userId: string, title: string, body: string, url?: string }`
 *
 * This route is intended for server-to-server calls (e.g. from background
 * workers or webhook handlers) and is NOT user-facing.  It sends a Web Push
 * message to every subscription registered for the given userId.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const notifySchema = z.object({
  userId: z.string(),
  title: z.string().min(1),
  body: z.string().min(1),
  url: z.string().url().optional(),
});

/**
 * POST /api/push/notify
 * Delivers a Web Push notification to all subscriptions for a user.
 * Stale subscriptions (410 Gone) are automatically removed.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  const internalSecret = request.headers.get("x-internal-secret");
  const isInternal =
    internalSecret && internalSecret === process.env.INTERNAL_API_SECRET;

  if (!session?.user?.id && !isInternal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: subRows } = await supabase
    .from("PushSubscription")
    .select("*")
    .eq("userId", parsed.data.userId);

  const subscriptions = (subRows ?? []) as Record<string, unknown>[];

  const payload = JSON.stringify({
    title: parsed.data.title,
    body: parsed.data.body,
    url: parsed.data.url,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
        },
        payload,
      );
    }),
  );

  // Remove subscriptions that returned 410 Gone (browser unsubscribed)
  const staleIds = subscriptions
    .filter((_, i) => {
      const result = results[i];
      return (
        result?.status === "rejected" &&
        result.reason instanceof Error &&
        "statusCode" in result.reason &&
        (result.reason as { statusCode: number }).statusCode === 410
      );
    })
    .map((s) => s.id as string);

  if (staleIds.length > 0) {
    await supabase.from("PushSubscription").delete().in("id", staleIds);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ sent });
}
