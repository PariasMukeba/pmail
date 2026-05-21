/**
 * POST /api/webhooks/gmail — Gmail Pub/Sub push notification handler.
 *
 * Google delivers a base64-encoded JSON message to this endpoint.
 * The handler decodes it, identifies the affected account, and triggers
 * an incremental sync in the background.
 *
 * Always returns HTTP 200 quickly — the actual sync is fire-and-forget.
 * Google will retry failed deliveries (non-2xx responses) automatically.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** Shape of the Pub/Sub message wrapper from Google. */
interface PubSubMessage {
  message?: {
    data?: string;
    messageId?: string;
  };
  subscription?: string;
}

/** Decoded Gmail notification data. */
interface GmailNotification {
  emailAddress?: string;
  historyId?: string | number;
}

/**
 * POST /api/webhooks/gmail
 * Decodes the Pub/Sub payload, finds the matching account, and enqueues a
 * background sync.  Always responds 200 to acknowledge receipt.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let pubSubMessage: PubSubMessage;

  try {
    pubSubMessage = (await request.json()) as PubSubMessage;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const encodedData = pubSubMessage?.message?.data;
  if (!encodedData) {
    return NextResponse.json({ ok: true });
  }

  let notification: GmailNotification;
  try {
    const decoded = Buffer.from(encodedData, "base64").toString("utf-8");
    notification = JSON.parse(decoded) as GmailNotification;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const emailAddress = notification.emailAddress;
  if (!emailAddress) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget background sync — do not await
  void (async () => {
    try {
      const { data: account } = await supabase
        .from("Account")
        .select("id")
        .eq("email", emailAddress)
        .eq("provider", "google")
        .single();

      if (!account) return;

      const acct = account as Record<string, unknown>;

      if (notification.historyId) {
        await supabase.from("SyncState").upsert(
          {
            accountId: acct.id,
            historyId: String(notification.historyId),
            updatedAt: new Date().toISOString(),
          },
          { onConflict: "accountId" },
        );
      }

      await fetch(`${process.env.NEXTAUTH_URL}/api/sync/${acct.id}`, {
        method: "POST",
        headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      });
    } catch {
      // Swallow — webhook handler must not throw
    }
  })();

  return NextResponse.json({ ok: true });
}
