import { Mail } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated logo */}
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-1.5 rounded-[18px] border-2 border-transparent border-t-primary/60 animate-spin" />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">Signing you in…</p>
          <p className="text-xs text-muted-foreground">Connecting to your account</p>
        </div>

        {/* Dot progress */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
