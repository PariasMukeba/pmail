import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { dbEmailToApiEmail } from "@/lib/inbox";
import { EmailBody } from "@/components/email/EmailBody";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmailDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const row = await prisma.cachedEmail.findFirst({
    where: { id, account: { userId: session.user.id } },
  });
  if (!row) notFound();

  const email = dbEmailToApiEmail(row);

  // Fetch thread
  const threadRows = await prisma.cachedEmail.findMany({
    where: { threadId: row.threadId, accountId: row.accountId },
    orderBy: { date: "asc" },
  });
  const thread = threadRows.map(dbEmailToApiEmail);

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <EmailBody email={email} thread={thread} />
    </div>
  );
}
