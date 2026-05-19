const SHORTCUTS = [
  { key: "J / K", description: "Navigate between emails (next / previous)" },
  { key: "E", description: "Archive selected email" },
  { key: "#", description: "Delete selected email" },
  { key: "R", description: "Reply to email" },
  { key: "F", description: "Forward email" },
  { key: "U", description: "Mark as unread" },
  { key: "S", description: "Star / unstar email" },
  { key: "⌘K", description: "Open search" },
  { key: "⌘/", description: "Compose new email" },
  { key: "?", description: "Show keyboard shortcuts" },
  { key: "Escape", description: "Close compose / search / dialog" },
  { key: "⌘Enter", description: "Send email (in compose)" },
];

export default function ShortcutsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Keyboard Shortcuts</h1>
        <p className="text-sm text-muted-foreground mt-1">Speed up your workflow with these shortcuts.</p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {SHORTCUTS.map(({ key, description }, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0"
          >
            <span className="text-sm text-muted-foreground">{description}</span>
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded-md">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
