import { Mail } from "lucide-react";

export default function SignInLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding skeleton */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center animate-pulse">
              <Mail className="w-6 h-6 text-primary/60" />
            </div>
          </div>
          <div className="h-8 w-24 rounded-lg bg-muted animate-pulse mx-auto" />
          <div className="h-4 w-48 rounded bg-muted/60 animate-pulse mx-auto" />
        </div>

        {/* Button skeletons */}
        <div className="space-y-3">
          <div className="h-11 w-full rounded-md bg-muted/40 animate-pulse" />
          <div className="h-11 w-full rounded-md bg-muted/40 animate-pulse" />
          <div className="h-11 w-full rounded-md bg-muted/40 animate-pulse" />
        </div>

        <div className="h-4 w-56 rounded bg-muted/30 animate-pulse mx-auto" />
      </div>
    </div>
  );
}
