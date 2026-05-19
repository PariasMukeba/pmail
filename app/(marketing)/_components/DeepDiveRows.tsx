import type { ReactNode } from "react";

interface DeepDiveRow {
  headline: string;
  benefits: string[];
  visual: ReactNode;
  imageRight: boolean;
  accentColor: string;
}

function InboxVisual() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[hsl(240_10%_6%)] p-4 space-y-2.5 shadow-xl shadow-black/40">
      {[
        { label: "Urgent", color: "bg-red-400", width: "w-10" },
        { label: "Action needed", color: "bg-yellow-400", width: "w-24" },
        { label: "FYI", color: "bg-blue-400", width: "w-8" },
        { label: "Newsletter", color: "bg-muted", width: "w-20" },
        { label: "Newsletter", color: "bg-muted", width: "w-20" },
      ].map((row, i) => (
        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${i < 2 ? "bg-white/[0.04]" : ""}`}>
          <div className={`w-2 h-2 rounded-full ${row.color} shrink-0`} />
          <div className="flex-1 space-y-1">
            <div className="h-2 rounded bg-white/30" style={{ width: `${60 + i * 10}%` }} />
            <div className="h-1.5 rounded bg-white/15" style={{ width: `${40 + i * 8}%` }} />
          </div>
          <div className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
            i === 0 ? "bg-red-400/10 border-red-400/20 text-red-300" :
            i === 1 ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-300" :
            "bg-white/5 border-white/10 text-muted-foreground/60"
          }`}>
            {row.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReplyVisual() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[hsl(240_10%_6%)] p-4 space-y-3 shadow-xl shadow-black/40">
      <div className="rounded-lg border border-primary/20 bg-primary/8 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-primary/70" />
          <div className="w-24 h-1.5 rounded bg-primary/50" />
        </div>
        {[1, 0.9, 0.85, 0.7].map((w, i) => (
          <div key={i} className="h-1.5 rounded bg-white/20" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
      <div className="flex gap-2">
        {["Professional", "Casual", "Concise"].map((tone, i) => (
          <button key={tone} className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
            i === 0
              ? "bg-primary/20 border-primary/30 text-primary"
              : "bg-white/[0.04] border-white/10 text-muted-foreground"
          }`}>
            {tone}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-2 flex items-center gap-2">
        <div className="flex-1 h-2 rounded bg-white/15" />
        <div className="w-14 h-6 rounded-md bg-primary/80 shrink-0" />
      </div>
    </div>
  );
}

function SearchVisual() {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[hsl(240_10%_6%)] p-4 space-y-3 shadow-xl shadow-black/40">
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
        <div className="w-4 h-4 rounded bg-white/20 shrink-0" />
        <div className="flex-1 h-2 rounded bg-white/25" />
        <div className="w-8 h-5 rounded bg-primary/30 text-primary text-[9px] flex items-center justify-center shrink-0">⌘K</div>
      </div>
      <div className="space-y-1.5">
        {[
          { width: "70%", highlight: true },
          { width: "85%", highlight: false },
          { width: "55%", highlight: false },
          { width: "75%", highlight: false },
        ].map((r, i) => (
          <div key={i} className={`flex items-center gap-2.5 p-2 rounded-lg ${r.highlight ? "bg-primary/10 border border-primary/20" : "bg-white/[0.02]"}`}>
            <div className="w-6 h-6 rounded-full bg-white/20 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded bg-white/30" style={{ width: r.width }} />
              <div className="h-1.5 rounded bg-white/15" style={{ width: "50%" }} />
            </div>
            {r.highlight && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-center text-muted-foreground/50">Results in &lt;200ms</p>
    </div>
  );
}

const ROWS: DeepDiveRow[] = [
  {
    headline: "Your inbox, prioritised by AI",
    benefits: [
      "Urgent threads float to the top automatically",
      "Zero-attention newsletters filtered out of your way",
      "Action items extracted and surfaced before you open a thread",
    ],
    visual: <InboxVisual />,
    imageRight: true,
    accentColor: "text-red-400",
  },
  {
    headline: "Reply drafts that sound like you",
    benefits: [
      "Context-aware suggestions based on the full thread",
      "Tone control — Professional, Casual, or Concise",
      "One-click send or full manual edit — your call",
    ],
    visual: <ReplyVisual />,
    imageRight: false,
    accentColor: "text-indigo-400",
  },
  {
    headline: "Search that actually works",
    benefits: [
      "Searches all connected accounts simultaneously",
      "Natural language queries — type what you remember",
      "Results appear in under 200 ms, always",
    ],
    visual: <SearchVisual />,
    imageRight: true,
    accentColor: "text-purple-400",
  },
];

export function DeepDiveRows() {
  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-28">
        {ROWS.map((row) => (
          <div
            key={row.headline}
            className={`flex flex-col ${row.imageRight ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-12 md:gap-16`}
          >
            {/* Text */}
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                {row.headline}
              </h2>
              <ul className="space-y-3">
                {row.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <div className={`mt-1 w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-muted-foreground leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual */}
            <div className="flex-1 w-full">
              {row.visual}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
