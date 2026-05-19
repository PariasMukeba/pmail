/**
 * POST /api/send — send an email via the provider adapter.
 *
 * Validates the request, calls the provider adapter's `sendEmail`, and
 * persists the sent message to `CachedEmail`.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
  // body field name conflicts with outer body; use a distinct name
  const emailBody = parsed.data.body;

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
  });

  if (!account) {
    const err = new NotFoundError("Account", accountId);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const adapter = await getProviderAdapter(account.provider);

  const attachmentBuffers = attachments?.map((a) => ({
    name: a.name,
    content: Buffer.from(a.content, "base64"),
    mimeType: a.mimeType,
  }));

  const sent = await adapter.sendEmail(account.id, {
    to,
    cc,
    bcc,
    subject,
    body: emailBody,
    attachments: attachmentBuffers,
    inReplyToId,
  });

  // Persist the sent email to the local cache
  await prisma.cachedEmail.create({
    data: {
      accountId: account.id,
      messageId: sent.messageId,
      threadId: sent.threadId,
      subject,
      fromName: account.displayName ?? account.email ?? "",
      fromAddress: account.email ?? "",
      toAddresses: JSON.stringify(to),
      ccAddresses: JSON.stringify(cc ?? []),
      preview: emailBody.slice(0, 200),
      bodyText: emailBody,
      date: new Date(),
      isRead: true,
      isStarred: false,
      isDraft: false,
      labels: JSON.stringify(["SENT"]),
      hasAttachments: (attachments?.length ?? 0) > 0,
      inReplyTo: inReplyToId,
    },
  });

  return NextResponse.json({ messageId: sent.messageId, threadId: sent.threadId });
}
