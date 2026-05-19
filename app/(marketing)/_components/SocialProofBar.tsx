const PROVIDERS = [
  {
    name: "Gmail",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z" fill="#4285F4" opacity=".2"/>
        <path d="M22 6l-10 7L2 6" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    name: "Outlook",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <rect x="2" y="4" width="10" height="16" rx="1" fill="#0078D4" opacity=".8"/>
        <path d="M12 8h8a2 2 0 012 2v8a2 2 0 01-2 2h-8V8z" fill="#0078D4"/>
        <path d="M12 8l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".6"/>
      </svg>
    ),
  },
  {
    name: "iCloud",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M17.5 9.5A5 5 0 0013 6a5 5 0 00-4.9 4H7a4 4 0 000 8h10.5a3.5 3.5 0 000-7 3.5 3.5 0 00-.5.5H17.5z" fill="#3b82f6" opacity=".7"/>
      </svg>
    ),
  },
  {
    name: "Yahoo",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4">
        <path d="M3 5l5 8-5 6h3l3.5-4.5L13 19h3l-5-6 5-8h-3l-3 4.5L7 5H3z" fill="#6001D2" opacity=".8"/>
      </svg>
    ),
  },
  {
    name: "Any IMAP",
    icon: (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" opacity=".5"/>
        <path d="M2 9h20M7 4v5M12 4v5M17 4v5" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" opacity=".5"/>
      </svg>
    ),
  },
];

export function SocialProofBar() {
  return (
    <section className="py-10 border-y border-border/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground/60 mb-6 font-medium">
          Works with every email provider
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="flex items-center gap-2 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
              {p.icon}
              <span className="text-sm font-medium">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
