import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const SETTINGS_NAV = [
  { href: "/settings/accounts", label: "Accounts" },
  { href: "/settings/appearance", label: "Appearance" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/signatures", label: "Signatures" },
  { href: "/settings/labels", label: "Labels" },
  { href: "/settings/shortcuts", label: "Keyboard Shortcuts" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  return (
    <div className="flex h-screen bg-background">
      {/* Settings sidebar */}
      <div className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <Link href="/inbox" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to inbox
          </Link>
        </div>
        <nav className="p-2 space-y-0.5">
          {SETTINGS_NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
