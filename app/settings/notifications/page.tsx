"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { notifications, updatePreferences } = useUIStore();
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermissionState(result);
    if (result === "granted") {
      const sub = await registerPushSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
            },
          }),
        });
      }
    }
  };

  const levels: Array<{ value: typeof notifications; label: string; desc: string }> = [
    { value: "all", label: "All email", desc: "Notify me about every new email" },
    { value: "priority", label: "Priority only", desc: "Only high-priority emails" },
    { value: "none", label: "None", desc: "Don't send push notifications" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure when and how you get notified.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Push notifications</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {permissionState === "granted" ? "Enabled" : permissionState === "denied" ? "Blocked by browser" : "Not enabled"}
            </div>
          </div>
          {permissionState !== "granted" && permissionState !== "denied" && (
            <Button size="sm" onClick={requestPermission} className="gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Enable
            </Button>
          )}
          {permissionState === "denied" && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <BellOff className="w-3.5 h-3.5" />
              Blocked
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Notify me about</div>
          {levels.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => updatePreferences({ notifications: value })}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-md border text-left transition-colors",
                notifications === value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                notifications === value ? "border-primary" : "border-muted-foreground"
              )}>
                {notifications === value && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

async function registerPushSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
  } catch {
    return null;
  }
}
