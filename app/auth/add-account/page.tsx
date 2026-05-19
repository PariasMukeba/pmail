"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";

// Re-use the same UI as signin but in authenticated context
// For simplicity, redirect to the connect flow
export default function AddAccountPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Add another account</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect Gmail, Microsoft, or IMAP</p>
        </div>
        {/* Rendered by the same form component as signin */}
        <AddAccountForm />
      </div>
    </div>
  );
}

function AddAccountForm() {
  // Same as signin form — in a real app this would share a component
  // For now, point users back to settings
  return (
    <div className="space-y-3">
      <a
        href="/api/auth/signin?callbackUrl=/settings/accounts"
        className="flex items-center justify-center gap-3 w-full h-11 border border-border rounded-md text-sm hover:bg-accent transition-colors"
      >
        Continue with Google
      </a>
      <a
        href="/api/auth/signin?callbackUrl=/settings/accounts"
        className="flex items-center justify-center gap-3 w-full h-11 border border-border rounded-md text-sm hover:bg-accent transition-colors"
      >
        Continue with Microsoft
      </a>
      <a href="/auth/signin" className="text-sm text-primary hover:underline block">
        Add IMAP account
      </a>
    </div>
  );
}
