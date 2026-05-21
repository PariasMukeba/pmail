/**
 * GET /api/accounts — list all connected accounts for the current user.
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
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

  const { data: rows } = await supabase
    .from("Account")
    .select(
      "id,userId,provider,email,imapUser,providerAccountId,displayName,color,isActive",
    )
    .eq("userId", session.user.id)
    .eq("isActive", true)
    .order("createdAt", { ascending: true });

  const accounts: ConnectedAccount[] = (rows ?? []).map(
    (r: Record<string, unknown>) => ({
      id: r.id as string,
      userId: r.userId as string,
      provider: normaliseProvider(r.provider as string),
      email: (r.email ?? r.imapUser ?? r.providerAccountId) as string,
      displayName: (r.displayName ??
        r.email ??
        r.imapUser ??
        r.providerAccountId) as string,
      color: r.color as string,
      isActive: r.isActive as boolean,
    }),
  );

  return NextResponse.json(accounts);
}
