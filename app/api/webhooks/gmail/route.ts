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
import { prisma } from "@/lib/prisma";

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
    // Malformed JSON — acknowledge so Google stops retrying
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
      const account = await prisma.account.findFirst({
        where: { email: emailAddress, provider: "gmail" },
      });

      if (!account) return;

      // Update historyId to trigger incremental sync
      if (notification.historyId) {
        await prisma.syncState.upsert({
          where: { accountId: account.id },
          create: {
            accountId: account.id,
            historyId: String(notification.historyId),
          },
          update: {
            historyId: String(notification.historyId),
          },
        });
      }

      // Trigger sync via internal API call
      await fetch(
        `${process.env.NEXTAUTH_URL}/api/sync/${account.id}`,
        { method: "POST", headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" } },
      );
    } catch {
      // Swallow — webhook handler must not throw
    }
  })();

  return NextResponse.json({ ok: true });
}
