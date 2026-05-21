import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { supabase } from "@/lib/supabase";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { EmailBody } from "@/components/email/EmailBody";

interface Props {
  params: { id: string };
}

export default async function EmailDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  // Verify ownership: get user's account IDs
  const { data: userAccounts } = await supabase
    .from("Account")
    .select("id")
    .eq("userId", session.user.id);
  const accountIds = (userAccounts ?? []).map(
    (a: Record<string, unknown>) => a.id as string,
  );

  const { data: emailRow } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("id", params.id)
    .in("accountId", accountIds)
    .single();

  if (!emailRow) notFound();

  const row = emailRow as Record<string, unknown>;
  const email = dbEmailToApiEmail(row);

  const { data: threadRows } = await supabase
    .from("CachedEmail")
    .select("*")
    .eq("threadId", row.threadId as string)
    .eq("accountId", row.accountId as string)
    .order("date", { ascending: true });

  const thread = (threadRows ?? []).map((r) =>
    dbEmailToApiEmail(r as Record<string, unknown>),
  );

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <EmailBody email={email} thread={thread} />
    </div>
  );
}
