/**
 * GET  /api/emails/[id] — single email + thread messages
 * PATCH /api/emails/[id] — update email (isRead, isStarred, labels, archived, trashed)
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { getProviderAdapter } from "@/lib/sync";
import { ValidationError, NotFoundError } from "@/lib/errors";

const patchSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  labels: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
  trashed: z.boolean().optional(),
});

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/emails/[id]
 * Returns the email and all messages in the same thread.
 */
export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = await prisma.cachedEmail.findFirst({
    where: {
      id: params.id,
      account: { userId: session.user.id },
    },
  });

  if (!email) {
    const err = new NotFoundError("Email", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const threadMessages = await prisma.cachedEmail.findMany({
    where: {
      threadId: email.threadId,
      accountId: email.accountId,
      account: { userId: session.user.id },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    email: dbEmailToApiEmail(email),
    thread: threadMessages.map(dbEmailToApiEmail),
  });
}

/**
 * PATCH /api/emails/[id]
 * Updates email flags/labels, mirroring changes to the provider and DB.
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const err = new ValidationError("Invalid request body", {
      issues: parsed.error.flatten(),
    });
    return NextResponse.json({ error: err.message, details: parsed.error.flatten() }, { status: 400 });
  }

  const email = await prisma.cachedEmail.findFirst({
    where: {
      id: params.id,
      account: { userId: session.user.id },
    },
    include: { account: true },
  });

  if (!email) {
    const err = new NotFoundError("Email", params.id);
    return NextResponse.json({ error: err.message }, { status: 404 });
  }

  const { isRead, isStarred, labels, archived, trashed } = parsed.data;

  // Mirror changes to provider adapter
  try {
    const adapter = await getProviderAdapter(email.account.provider);

    if (isRead === true) {
      await adapter.markRead(email.accountId, [email.messageId]);
    }
    if (archived === true) {
      await adapter.archive(email.accountId, [email.messageId]);
    }
    if (trashed === true) {
      await adapter.trash(email.accountId, [email.messageId]);
    }
    if (labels && labels.length > 0) {
      await adapter.applyLabel(email.accountId, [email.messageId], labels[0]);
    }
  } catch {
    // Provider errors are non-fatal — we still update the local DB cache
  }

  const updated = await prisma.cachedEmail.update({
    where: { id: params.id },
    data: {
      ...(isRead !== undefined && { isRead }),
      ...(isStarred !== undefined && { isStarred }),
      ...(labels !== undefined && { labels: JSON.stringify(labels) }),
    },
  });

  return NextResponse.json({ email: dbEmailToApiEmail(updated) });
}
