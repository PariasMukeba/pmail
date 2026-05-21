/**
 * POST /api/send — send an email via the provider adapter.
 *
 * Validates the request, calls the provider adapter's `sendEmail`, and
 * persists the sent message to `CachedEmail`.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { getProviderAdapter } from "@/lib/sync";
import { NotFoundError, ValidationError } from "@/lib/errors";

const emailAddressSchema = z.object({
  name: z.string(),
  address: z.string().email(),
});

const sendSchema = z.object({
  accountId: z.string(),
  to: z.array(emailAddressSchema).min(1),
  cc: z.array(emailAddressSchema).optional(),
  bcc: z.array(emailAddressSchema).optional(),
  subject: z.string(),
  body: z.string(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        content: z.string(), // base64
        mimeType: z.string(),
      }),
    )
    .optional(),
  inReplyToId: z.string().optional(),
});

/**
 * POST /api/send
 * Sends an email via the provider adapter and saves it to the local cache.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json(
      { error: err.message, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { accountId, to, cc, bcc, subject, attachments, inReplyToId } =
    parsed.data;
  const emailBody = parsed.data.body;

  const { data: accountRow } = await supabase
    .from("Account")
    .select("*")
    .eq("id", accountId)
    .eq("userId", session.user.id)
    .single();

  if (!accountRow) {
    const err = new NotFoundError("Account", accountId);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const account = accountRow as Record<string, unknown>;
  const adapter = await getProviderAdapter(account.provider as string);

  const attachmentBuffers = attachments?.map((a) => ({
    name: a.name,
    content: Buffer.from(a.content, "base64"),
    mimeType: a.mimeType,
  }));

  const sent = await adapter.sendEmail(account.id as string, {
    to,
    cc,
    bcc,
    subject,
    body: emailBody,
    attachments: attachmentBuffers,
    inReplyToId,
  });

  await supabase.from("CachedEmail").insert({
    id: crypto.randomUUID(),
    accountId: account.id,
    messageId: sent.messageId,
    threadId: sent.threadId,
    subject,
    fromName: (account.displayName ?? account.email ?? "") as string,
    fromAddress: (account.email ?? "") as string,
    toAddresses: JSON.stringify(to),
    ccAddresses: JSON.stringify(cc ?? []),
    preview: emailBody.slice(0, 200),
    bodyText: emailBody,
    date: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    isRead: true,
    isStarred: false,
    isDraft: false,
    labels: JSON.stringify(["SENT"]),
    hasAttachments: (attachments?.length ?? 0) > 0,
    inReplyTo: inReplyToId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    messageId: sent.messageId,
    threadId: sent.threadId,
  });
}
