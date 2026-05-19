"use client";

import { useRef, useState, useEffect } from "react";
import useSWR from "swr";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEmailStore } from "@/lib/stores/useEmailStore";
import { EmailRow } from "@/components/email/EmailRow";
import { Skeleton } from "@/components/ui/skeleton";
import type { Email, PaginatedResult } from "@/lib/types";
import { RefreshCw } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function EmailListPane() {
  const { selectedLabel, selectedAccountId, selectedEmailId, selectEmail, setEmails } =
    useEmailStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (selectedAccountId !== "unified") params.set("accountId", selectedAccountId);
  // Map sidebar label IDs to the correct API query params
  switch (selectedLabel) {
    case "unified":
      break; // no filter — show all
    case "starred":
      params.set("starred", "true");
      break;
    case "attachments":
      params.set("hasAttachments", "true");
      break;
    case "priority":
      params.set("priority", "high");
      break;
    case "drafts":
      params.set("drafts", "true");
      break;
    default:
      if (selectedLabel) params.set("label", selectedLabel);
  }

  const { data, isLoading, mutate } = useSWR<PaginatedResult<Email>>(
    `/api/emails?${params}`,
    fetcher,
    { onSuccess: (d) => setEmails(d.items), refreshInterval: 30_000 },
  );

  const emails = data?.items ?? [];

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      const json = await res.json() as { results?: Array<{ error?: string; synced: number }> };
      const firstError = json.results?.find((r) => r.error)?.error;
      if (firstError) setSyncError(firstError);
      await mutate();
    } catch (err) {
      setSyncError(String(err));
    } finally {
      setSyncing(false);
    }
  };

  // Auto-trigger sync once when inbox loads empty for the first time
  useEffect(() => {
    if (!isLoading && emails.length === 0 && !syncAttempted) {
      setSyncAttempted(true);
      void runSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const rowVirtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  return (
    <div className="flex flex-col w-full md:w-[380px] shrink-0 border-r border-border h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm capitalize">
          {selectedLabel === "unified" ? "Unified Inbox" : (selectedLabel || "Inbox")}
        </h2>
        <button
          onClick={() => void runSync()}
          disabled={syncing}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Sync now"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading || syncing ? (
          <div className="p-3 space-y-2">
            {syncing && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-2 flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing your inbox…
              </p>
            )}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 gap-3 px-4">
            {syncError ? (
              <p className="text-xs text-destructive text-center break-all">{syncError}</p>
            ) : (
              <p className="text-sm">No emails found</p>
            )}
            <button
              onClick={() => void runSync()}
              className="text-xs text-primary hover:underline"
            >
              Sync now
            </button>
          </div>
        ) : (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const email = emails[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <EmailRow
                    email={email}
                    isSelected={email.id === selectedEmailId}
                    onClick={() => selectEmail(email.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
