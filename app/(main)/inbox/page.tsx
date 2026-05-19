"use client";

import { useEffect } from "react";
import { EmailListPane } from "@/components/layout/EmailListPane";
import { ReadingPane } from "@/components/layout/ReadingPane";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useEmailStore } from "@/lib/stores/useEmailStore";
import { cn } from "@/lib/utils";

export default function InboxPage() {
  const { readingPane, activePaneOnMobile } = useUIStore();
  const { selectedEmailId } = useEmailStore();

  // Auto-switch to reading pane on mobile when email is selected
  const { setActivePaneOnMobile } = useUIStore();
  useEffect(() => {
    if (selectedEmailId) {
      setActivePaneOnMobile("reading");
    }
  }, [selectedEmailId, setActivePaneOnMobile]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Email list — hidden on mobile when reading */}
      <div className={cn(
        "flex md:flex",
        activePaneOnMobile === "reading" ? "hidden" : "flex",
        "flex-col w-full md:w-auto"
      )}>
        <EmailListPane />
      </div>

      {/* Reading pane */}
      {readingPane !== "off" && (
        <div className={cn(
          "flex-1 overflow-hidden",
          activePaneOnMobile === "list" ? "hidden md:flex" : "flex",
          "flex-col"
        )}>
          <ReadingPane />
        </div>
      )}
    </div>
  );
}
