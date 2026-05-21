/**
 * GET  /api/webhooks/microsoft — Microsoft Graph subscription validation.
 * POST /api/webhooks/microsoft — Microsoft Graph change notification handler.
 *
 * Microsoft sends a GET request with `?validationToken=...` to validate the
 * webhook URL.  Subsequent change notifications arrive as POST requests.
 *
 * Always returns 200 quickly for POST — the actual sync is fire-and-forget.
 */

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/** Shape of a Microsoft Graph change notification. */
interface GraphNotification {
  value?: Array<{
    subscriptionId?: string;
    clientState?: string;
    resource?: string;
    resourceData?: { id?: string };
  }>;
}

/**
 * GET /api/webhooks/microsoft
 * Echoes the `validationToken` query parameter back as plain text to confirm
 * ownership of the endpoint with Microsoft Graph.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get("validationToken");

  if (validationToken) {
    return new Response(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("Not found", { status: 404 });
}

/**
 * POST /api/webhooks/microsoft
 * Processes Microsoft Graph change notifications and triggers an incremental
 * sync for the affected account.  Always responds 202 immediately.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: GraphNotification;

  try {
    payload = (await request.json()) as GraphNotification;
  } catch {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const notifications = payload?.value ?? [];

  void (async () => {
    for (const notification of notifications) {
      try {
        if (!notification.subscriptionId) continue;

        const { data: accountRows } = await supabase
          .from("Account")
          .select("id,email,providerAccountId")
          .eq("provider", "microsoft-entra-id");

        const resource = notification.resource ?? "";
        const account = (accountRows ?? []).find(
          (a: Record<string, unknown>) =>
            (a.email && resource.includes(a.email as string)) ||
            resource.includes(a.providerAccountId as string),
        ) as Record<string, unknown> | undefined;

        if (!account) continue;

        await fetch(`${process.env.NEXTAUTH_URL}/api/sync/${account.id}`, {
          method: "POST",
          headers: {
            "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
          },
        });
      } catch {
        // Swallow — must not throw
      }
    }
  })();

  return NextResponse.json({ ok: true }, { status: 202 });
}
