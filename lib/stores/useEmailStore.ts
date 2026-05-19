import { create } from "zustand";
import type { Email, ConnectedAccount, EmailLabel } from "@/lib/types";

interface EmailStore {
  emails: Email[];
  selectedEmailId: string | null;
  selectedLabel: string;
  selectedAccountId: string | "unified";
  isLoading: boolean;
  isSyncing: boolean;
  accounts: ConnectedAccount[];
  labels: EmailLabel[];

  /** Replace the entire email list. */
  setEmails: (emails: Email[]) => void;
  /** Set the currently viewed email, or null to deselect. */
  selectEmail: (id: string | null) => void;
  /** Change the active mailbox label (e.g. "inbox", "sent"). */
  setSelectedLabel: (label: string) => void;
  /** Change the active account, or "unified" for all accounts. */
  setSelectedAccountId: (id: string | "unified") => void;
  /** Toggle the global loading state. */
  setLoading: (v: boolean) => void;
  /** Toggle the background sync indicator. */
  setSyncing: (v: boolean) => void;
  /** Replace the list of connected accounts. */
  setAccounts: (accounts: ConnectedAccount[]) => void;
  /** Replace the list of email labels. */
  setLabels: (labels: EmailLabel[]) => void;
  /** Mark a single email as read. */
  markRead: (id: string) => void;
  /** Set the starred state of a single email. */
  markStarred: (id: string, starred: boolean) => void;
  /** Remove an email from the local list (e.g. after archive/delete). */
  removeEmail: (id: string) => void;
}

export const useEmailStore = create<EmailStore>((set) => ({
  // --- initial state ---
  emails: [],
  selectedEmailId: null,
  selectedLabel: "inbox",
  selectedAccountId: "unified",
  isLoading: false,
  isSyncing: false,
  accounts: [],
  labels: [],

  // --- actions ---
  setEmails: (emails) => set({ emails }),

  selectEmail: (id) => set({ selectedEmailId: id }),

  setSelectedLabel: (label) => set({ selectedLabel: label }),

  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

  setLoading: (v) => set({ isLoading: v }),

  setSyncing: (v) => set({ isSyncing: v }),

  setAccounts: (accounts) => set({ accounts }),

  setLabels: (labels) => set({ labels }),

  markRead: (id) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === id ? { ...email, isRead: true } : email
      ),
    })),

  markStarred: (id, starred) =>
    set((state) => ({
      emails: state.emails.map((email) =>
        email.id === id ? { ...email, isStarred: starred } : email
      ),
    })),

  removeEmail: (id) =>
    set((state) => ({
      emails: state.emails.filter((email) => email.id !== id),
      selectedEmailId:
        state.selectedEmailId === id ? null : state.selectedEmailId,
    })),
}));
