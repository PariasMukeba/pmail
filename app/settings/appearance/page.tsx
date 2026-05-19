"use client";

import { useUIStore } from "@/lib/stores/useUIStore";
import { cn } from "@/lib/utils";

type OptionProps<T> = {
  label: string;
  value: T;
  current: T;
  onSelect: (v: T) => void;
};

function OptionButton<T extends string | number>({ label, value, current, onSelect }: OptionProps<T>) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "px-3 py-2 rounded-md text-sm border transition-colors",
        current === value
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}

function Setting({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="flex gap-1.5 shrink-0">{children}</div>
    </div>
  );
}

export default function AppearancePage() {
  const { theme, density, readingPane, previewLines, fontSize, setTheme, setDensity, setReadingPane, updatePreferences } = useUIStore();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Appearance</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize how Pmail looks and feels.</p>
      </div>

      <div className="rounded-lg border border-border bg-card divide-y divide-border">
        <div className="p-4 space-y-3">
          <Setting label="Theme" description="Choose your preferred color theme">
            {(["dark", "light", "system"] as const).map((t) => (
              <OptionButton key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} value={t} current={theme} onSelect={setTheme} />
            ))}
          </Setting>

          <Setting label="Email density" description="How compact should email rows be?">
            {(["comfortable", "compact", "ultra"] as const).map((d) => (
              <OptionButton
                key={d}
                label={d === "ultra" ? "Ultra" : d.charAt(0).toUpperCase() + d.slice(1)}
                value={d}
                current={density}
                onSelect={setDensity}
              />
            ))}
          </Setting>

          <Setting label="Reading pane" description="Position of the email reading pane">
            {(["right", "bottom", "off"] as const).map((r) => (
              <OptionButton
                key={r}
                label={r.charAt(0).toUpperCase() + r.slice(1)}
                value={r}
                current={readingPane}
                onSelect={setReadingPane}
              />
            ))}
          </Setting>

          <Setting label="Preview lines" description="Lines of preview text shown in email list">
            {([0, 1, 2] as const).map((n) => (
              <OptionButton
                key={n}
                label={n === 0 ? "None" : `${n} line${n > 1 ? "s" : ""}`}
                value={n}
                current={previewLines}
                onSelect={(v) => updatePreferences({ previewLines: v as 0 | 1 | 2 })}
              />
            ))}
          </Setting>

          <Setting label="Font size" description="Size of text in the reading pane">
            {(["small", "medium", "large"] as const).map((s) => (
              <OptionButton
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                value={s}
                current={fontSize}
                onSelect={(v) => updatePreferences({ fontSize: v })}
              />
            ))}
          </Setting>
        </div>
      </div>
    </div>
  );
}
