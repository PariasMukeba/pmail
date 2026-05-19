export function BrowserMockup() {
  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Glow behind mockup */}
      <div className="absolute -inset-4 bg-primary/10 rounded-2xl blur-3xl" />

      {/* Browser shell */}
      <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/60 bg-[hsl(240_10%_6%)]">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 px-4 h-10 bg-[hsl(240_10%_5%)] border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 mx-4 h-5 rounded-md bg-white/[0.06] flex items-center px-3 gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/50" />
            <div className="w-24 h-2 rounded bg-white/20" />
          </div>
        </div>

        {/* App layout */}
        <div className="flex h-[340px] sm:h-[400px]">
          {/* Sidebar */}
          <div className="hidden sm:flex flex-col w-48 border-r border-white/[0.06] bg-[hsl(240_10%_5%)] p-3 gap-1 shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
              <div className="w-5 h-5 rounded bg-primary/30" />
              <div className="w-16 h-2.5 rounded bg-white/30" />
            </div>
            {["Inbox", "Starred", "Sent", "Drafts", "Archive"].map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${i === 0 ? "bg-primary/20" : "hover:bg-white/5"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-sm ${i === 0 ? "bg-primary/70" : "bg-white/20"}`} />
                <div className={`h-2 rounded ${i === 0 ? "w-10 bg-white/70" : "w-8 bg-white/25"}`} />
                {i === 0 && <div className="ml-auto w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[8px] text-white font-bold">3</div>}
              </div>
            ))}
          </div>

          {/* Email list */}
          <div className="w-full sm:w-64 border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
              <div className="w-12 h-2.5 rounded bg-white/40" />
              <div className="w-16 h-5 rounded-md bg-white/[0.06] border border-white/10" />
            </div>
            {[
              { unread: true, color: "bg-blue-400" },
              { unread: true, color: "bg-emerald-400" },
              { unread: false, color: "bg-orange-400" },
              { unread: false, color: "bg-purple-400" },
              { unread: false, color: "bg-pink-400" },
            ].map((row, i) => (
              <div
                key={i}
                className={`flex gap-2.5 px-3 py-2.5 border-b border-white/[0.04] ${i === 0 ? "bg-primary/10" : ""}`}
              >
                <div className={`w-7 h-7 rounded-full ${row.color} opacity-80 shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex justify-between">
                    <div className={`h-2 rounded ${row.unread ? "w-20 bg-white/70" : "w-16 bg-white/30"}`} />
                    <div className="w-8 h-1.5 rounded bg-white/20" />
                  </div>
                  <div className={`h-1.5 rounded ${row.unread ? "w-full bg-white/40" : "w-3/4 bg-white/20"}`} />
                  <div className="h-1.5 rounded w-2/3 bg-white/15" />
                </div>
                {row.unread && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>

          {/* Reading pane */}
          <div className="flex-1 flex flex-col hidden sm:flex overflow-hidden p-4 gap-3">
            {/* Email header */}
            <div className="space-y-2">
              <div className="w-3/4 h-3.5 rounded bg-white/50" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-400/80" />
                <div className="space-y-1">
                  <div className="w-20 h-2 rounded bg-white/40" />
                  <div className="w-32 h-1.5 rounded bg-white/20" />
                </div>
              </div>
            </div>

            {/* AI Summary card */}
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm bg-primary/70" />
                <div className="w-20 h-2 rounded bg-primary/60" />
                <div className="ml-auto px-1.5 py-0.5 rounded-sm bg-primary/20 text-[8px] text-primary/80 font-medium border border-primary/20">AI</div>
              </div>
              <div className="space-y-1.5">
                <div className="h-1.5 rounded w-full bg-white/25" />
                <div className="h-1.5 rounded w-5/6 bg-white/20" />
                <div className="h-1.5 rounded w-4/5 bg-white/15" />
              </div>
            </div>

            {/* Body text bars */}
            <div className="space-y-2 flex-1">
              {[1, 0.9, 0.8, 1, 0.7, 0.85, 0.6].map((w, i) => (
                <div key={i} className="h-1.5 rounded bg-white/15" style={{ width: `${w * 100}%` }} />
              ))}
            </div>

            {/* Reply bar */}
            <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 flex items-center gap-2">
              <div className="flex-1 h-2 rounded bg-white/15" />
              <div className="w-14 h-5 rounded-md bg-primary/80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
