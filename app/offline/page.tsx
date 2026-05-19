"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83m4.098-4.098A7.5 7.5 0 006.49 6.49m-.93 4.51a7.5 7.5 0 0010 10" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-foreground">You&apos;re offline</h1>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
