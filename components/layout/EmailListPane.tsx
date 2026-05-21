"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEmailStore } from "@/lib/stores/useEmailStore";
import { EmailRow } from "@/components/email/EmailRow";
import { Skeleton } from "@/components/ui/skeleton";
import type { Email, PaginatedResult } from "@/lib/types";
import { RefreshCw } from "lucide-react";
import { INBOX_INITIAL_LIMIT, INBOX_LOAD_MORE_SIZE } from "@/lib/constants";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<PaginatedResult<Email>>);

export function EmailListPane() {
  const {
    selectedLabel,
    selectedAccountId,
    selectedEmailId,
    selectEmail,
    setEmails,
  } = useEmailStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncAttempted, setSyncAttempted] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Accumulated email list across all loaded pages
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const params = new URLSearchParams();
  params.set("limit", String(INBOX_INITIAL_LIMIT));
  if (selectedAccountId !== "unified")
    params.set("accountId", selectedAccountId);
  switch (selectedLabel) {
    case "unified":
      break;
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

  const swrKey = `/api/emails?${params.toString()}`;

  const {
    data: firstPage,
    isLoading,
    mutate,
  } = useSWR<PaginatedResult<Email>>(swrKey, fetcher, {
    onSuccess: (d) => {
      // Reset to first page whenever SWR refetches (sync, label change, etc.)
      setAllEmails(d.items);
      setNextCursor(d.nextCursor);
      setHasMore(!!d.nextCursor);
    },
  });

  // Keep email store in sync with the full accumulated list
  useEffect(() => {
    setEmails(allEmails);
  }, [allEmails, setEmails]);

  // Reset accumulated state when the view changes (different label or account)
  useEffect(() => {
    setAllEmails([]);
    setNextCursor(undefined);
    setHasMore(false);
    // swrKey captures label+account — reset whenever it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swrKey]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    setIsLoadingMore(true);
    try {
      const moreParams = new URLSearchParams(params);
      moreParams.set("limit", String(INBOX_LOAD_MORE_SIZE));
      moreParams.set("cursor", nextCursor);
      const res = await fetcher(`/api/emails?${moreParams.toString()}`);
      setAllEmails((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
    // params is rebuilt each render; intentionally omitted — cursor/hasMore cover the dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isLoadingMore, nextCursor]);

  // Trigger loadMore when the user scrolls within 200 px of the bottom
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
        void loadMore();
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMore]);

  const runSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncError(null);

    try {
      const res = await fetch("/api/sync/all", { method: "POST" });
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let emailsSinceLastRefresh = 0;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          let event: {
            type: string;
            count?: number;
            error?: string;
            synced?: number;
            errors?: string[];
          };
          try {
            event = JSON.parse(dataLine.slice(6)) as typeof event;
          } catch {
            continue;
          }

          if (event.type === "email") {
            emailsSinceLastRefresh++;
            if (
              emailsSinceLastRefresh === 1 ||
              emailsSinceLastRefresh % 5 === 0
            ) {
              void mutate();
            }
          } else if (event.type === "done") {
            if (event.errors && event.errors.length > 0)
              setSyncError(event.errors[0]);
            break outer;
          } else if (event.type === "error") {
            setSyncError(event.error ?? "Sync error");
          }
        }
      }
    } catch (err) {
      setSyncError(String(err));
    } finally {
      await mutate();
      setSyncing(false);
    }
  };

  // Auto-trigger sync once when inbox first loads empty
  useEffect(() => {
    if (
      !isLoading &&
      allEmails.length === 0 &&
      !syncAttempted &&
      firstPage !== undefined
    ) {
      setSyncAttempted(true);
      void runSync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, firstPage]);

  const rowVirtualizer = useVirtualizer({
    count: allEmails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  return (
    <div className="flex flex-col w-full md:w-[380px] shrink-0 border-r border-border h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-sm capitalize">
          {selectedLabel === "unified"
            ? "Unified Inbox"
            : selectedLabel || "Inbox"}
        </h2>
        <button
          onClick={() => void runSync()}
          disabled={syncing}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          title="Sync now"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {isLoading || (syncing && allEmails.length === 0) ? (
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
        ) : allEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 gap-3 px-4">
            {syncError ? (
              <p className="text-xs text-destructive text-center break-all">
                {syncError}
              </p>
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
          <>
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const email = allEmails[virtualItem.index];
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

            {/* Load-more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center py-3">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && allEmails.length > INBOX_INITIAL_LIMIT && (
              <p className="text-center text-xs text-muted-foreground py-3">
                All caught up
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
