/**
 * GET /api/accounts — list all connected accounts for the current user.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ConnectedAccount } from "@/lib/types";

function normaliseProvider(raw: string): ConnectedAccount["provider"] {
  if (raw === "google") return "gmail";
  if (raw === "microsoft-entra-id" || raw === "azure-ad") return "office365";
  return "imap";
}

/** GET /api/accounts */
export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.account.findMany({
    where: { userId: session.user.id, isActive: true },
    select: {
      id: true,
      userId: true,
      provider: true,
      email: true,
      imapUser: true,
      providerAccountId: true,
      displayName: true,
      color: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const accounts: ConnectedAccount[] = rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    provider: normaliseProvider(r.provider),
    email: r.email ?? r.imapUser ?? r.providerAccountId,
    displayName: r.displayName ?? r.email ?? r.imapUser ?? r.providerAccountId,
    color: r.color,
    isActive: r.isActive,
  }));

  return NextResponse.json(accounts);
}
