"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { useUIStore } from "@/lib/stores/useUIStore";

export function InstallPrompt() {
  const { installPromptEvent, setInstallPromptEvent } = useUIStore();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const d = localStorage.getItem("aire-install-dismissed");
    if (d) return;

    // Track visit count
    const visits = parseInt(localStorage.getItem("aire-visit-count") || "0", 10) + 1;
    localStorage.setItem("aire-visit-count", String(visits));

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);

    // Show banner after 3 visits
    if (visits >= 3) {
      setShowBanner(true);
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
      if (visits >= 3) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [setInstallPromptEvent]);

  const install = async () => {
    if (installPromptEvent) {
      await installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      if (outcome === "accepted") {
        setInstallPromptEvent(null);
        setShowBanner(false);
      }
    }
  };

  const dismiss = () => {
    localStorage.setItem("aire-install-dismissed", "1");
    setShowBanner(false);
    setDismissed(true);
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-0 mx-auto max-w-sm z-50 px-4">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border shadow-lg">
        <Download className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Install Pmail for faster access</p>
          {isIOS && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Tap <span className="font-mono">⎙</span> then &ldquo;Add to Home Screen&rdquo;
            </p>
          )}
        </div>
        {!isIOS && installPromptEvent && (
          <button
            onClick={install}
            className="text-sm text-primary font-medium hover:text-primary/80 transition-colors shrink-0"
          >
            Install
          </button>
        )}
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
