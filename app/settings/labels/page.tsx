"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#0EA5E9", "#64748B",
];

interface Label {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LabelsPage() {
  const { data, mutate } = useSWR<{ labels: Label[] }>("/api/labels", fetcher);
  const labels = data?.labels ?? [];
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const createLabel = async () => {
    if (!newName.trim()) return;
    await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, color: newColor }),
    });
    setNewName("");
    setCreating(false);
    await mutate();
  };

  const deleteLabel = async (id: string) => {
    await fetch(`/api/labels/${id}`, { method: "DELETE" });
    await mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Labels</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize your emails with labels.</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          New label
        </Button>
      </div>

      {creating && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <Input
            placeholder="Label name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createLabel()}
            autoFocus
          />
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition-all ${newColor === c ? "ring-2 ring-offset-2 ring-ring" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={createLabel} disabled={!newName.trim()}>Create</Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {labels.map((label) => (
          <div key={label.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
            <span className="flex-1 text-sm">{label.name}</span>
            {label.isSystem && <span className="text-xs text-muted-foreground">System</span>}
            {!label.isSystem && (
              <button onClick={() => deleteLabel(label.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {labels.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No labels yet. Create one above.</div>
        )}
      </div>
    </div>
  );
}
