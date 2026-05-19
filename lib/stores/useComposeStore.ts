import { create } from "zustand";
import type { EmailAddress } from "@/lib/types";

export interface ComposeWindow {
  id: string;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  subject: string;
  body: string;
  fromAccountId: string;
  attachments: Array<{ id: string; name: string; size: number; file?: File }>;
  isDraft: boolean;
  draftId?: string;
  isMinimized: boolean;
  inReplyToId?: string;
  isReply?: boolean;
  isForward?: boolean;
}

interface ComposeStore {
  windows: ComposeWindow[];
  /** Open a new compose window, optionally pre-populated with initial values. */
  openCompose: (initial?: Partial<ComposeWindow>) => void;
  /** Close and remove a compose window by ID. */
  closeCompose: (id: string) => void;
  /** Minimise a compose window to the taskbar. */
  minimizeCompose: (id: string) => void;
  /** Restore a minimised compose window to full size. */
  maximizeCompose: (id: string) => void;
  /** Apply partial updates to a compose window. */
  updateWindow: (id: string, updates: Partial<ComposeWindow>) => void;
}

/** Generates a simple unique ID for compose windows. */
function generateComposeId(): string {
  return `compose_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Default state for a new compose window. */
function defaultWindow(overrides: Partial<ComposeWindow> = {}): ComposeWindow {
  return {
    id: generateComposeId(),
    to: [],
    cc: [],
    bcc: [],
    subject: "",
    body: "",
    fromAccountId: "",
    attachments: [],
    isDraft: false,
    isMinimized: false,
    ...overrides,
  };
}

export const useComposeStore = create<ComposeStore>((set) => ({
  windows: [],

  openCompose: (initial) =>
    set((state) => ({
      windows: [...state.windows, defaultWindow(initial)],
    })),

  closeCompose: (id) =>
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    })),

  minimizeCompose: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w
      ),
    })),

  maximizeCompose: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false } : w
      ),
    })),

  updateWindow: (id, updates) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    })),
}));
