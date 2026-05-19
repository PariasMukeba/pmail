import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  gmail: "#EA4335",
  office365: "#0078D4",
  imap: "#6366F1",
};

export default async function AccountsSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your connected email accounts.</p>
        </div>
        <Link
          href="/auth/add-account"
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add account
        </Link>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
              style={{ backgroundColor: account.color || PROVIDER_COLORS[account.provider] || "#6366F1" }}
            >
              {(account.email ?? account.providerAccountId).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{account.displayName || account.email}</div>
              <div className="text-xs text-muted-foreground">
                {account.email} · <span className="capitalize">{account.provider}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${account.isActive ? "bg-green-500/10 text-green-400" : "bg-muted text-muted-foreground"}`}>
                {account.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No accounts connected yet.</p>
            <Link href="/auth/add-account" className="text-primary text-sm hover:underline mt-2 block">
              Add your first account →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
