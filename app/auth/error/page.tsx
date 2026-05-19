"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, AlertTriangle, ArrowLeft } from "lucide-react";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  Configuration: {
    title: "Server configuration error",
    body: "The authentication provider is not configured correctly. Please contact support.",
  },
  AccessDenied: {
    title: "Access denied",
    body: "You do not have permission to sign in. Your account may have been restricted.",
  },
  Verification: {
    title: "Link expired",
    body: "The sign-in link has expired or has already been used. Please request a new one.",
  },
  OAuthSignin: {
    title: "OAuth sign-in failed",
    body: "Could not start the sign-in flow. Check that pop-ups are not blocked and try again.",
  },
  OAuthCallback: {
    title: "OAuth callback error",
    body: "Something went wrong during sign-in with your provider. Please try again.",
  },
  OAuthCreateAccount: {
    title: "Account creation failed",
    body: "Your account could not be created. The email may already be linked to another provider.",
  },
  CredentialsSignin: {
    title: "Invalid credentials",
    body: "Could not connect with the provided IMAP details. Check your email, password, and server settings, then try again.",
  },
  Default: {
    title: "Authentication error",
    body: "An unexpected error occurred during sign-in. Please try again.",
  },
};

function ErrorContent() {
  const params = useSearchParams();
  const code = params.get("error") ?? "Default";
  const { title, body } = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-foreground text-xl tracking-tight">Pmail</span>
        </div>

        {/* Error card */}
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
          {code !== "Default" && (
            <p className="text-xs text-muted-foreground/50 font-mono">Error code: {code}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20"
          >
            Try signing in again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
