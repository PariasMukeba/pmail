import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserPreferences } from "@/lib/types";

/** Extends the standard DOM Event with PWA install-prompt capabilities. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface UIStore extends UserPreferences {
  isMobileNavOpen: boolean;
  activePaneOnMobile: "list" | "reading";
  isSearchOpen: boolean;
  isAITriageMode: boolean;
  /** Stashed beforeinstallprompt event so we can trigger it later. */
  installPromptEvent: BeforeInstallPromptEvent | null;

  /** Change the colour theme. */
  setTheme: (theme: UserPreferences["theme"]) => void;
  /** Change the email list density. */
  setDensity: (density: UserPreferences["density"]) => void;
  /** Set the reading-pane position. */
  setReadingPane: (pos: UserPreferences["readingPane"]) => void;
  /** Toggle the mobile navigation drawer. */
  toggleMobileNav: () => void;
  /** Set which pane is visible on mobile (list or reading). */
  setActivePaneOnMobile: (pane: "list" | "reading") => void;
  /** Show the command-palette / search overlay. */
  openSearch: () => void;
  /** Hide the search overlay. */
  closeSearch: () => void;
  /** Toggle AI triage view mode. */
  toggleAITriageMode: () => void;
  /** Store or clear the PWA install prompt event. */
  setInstallPromptEvent: (e: BeforeInstallPromptEvent | null) => void;
  /** Merge a partial preferences object into the store. */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // --- UserPreferences defaults ---
      theme: "dark",
      density: "comfortable",
      readingPane: "right",
      previewLines: 1,
      fontSize: "medium",
      conversationView: true,
      notifications: "priority",
      quietHoursStart: undefined,
      quietHoursEnd: undefined,

      // --- UI-only state ---
      isMobileNavOpen: false,
      activePaneOnMobile: "list",
      isSearchOpen: false,
      isAITriageMode: false,
      installPromptEvent: null,

      // --- actions ---
      setTheme: (theme) => set({ theme }),

      setDensity: (density) => set({ density }),

      setReadingPane: (pos) => set({ readingPane: pos }),

      toggleMobileNav: () =>
        set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),

      setActivePaneOnMobile: (pane) => set({ activePaneOnMobile: pane }),

      openSearch: () => set({ isSearchOpen: true }),

      closeSearch: () => set({ isSearchOpen: false }),

      toggleAITriageMode: () =>
        set((state) => ({ isAITriageMode: !state.isAITriageMode })),

      setInstallPromptEvent: (e) => set({ installPromptEvent: e }),

      updatePreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
    }),
    {
      name: "aire-ui-prefs",
      // Only persist user-controlled preferences, not transient UI state.
      partialize: (state) => ({
        theme: state.theme,
        density: state.density,
        readingPane: state.readingPane,
        previewLines: state.previewLines,
        fontSize: state.fontSize,
        conversationView: state.conversationView,
        notifications: state.notifications,
        quietHoursStart: state.quietHoursStart,
        quietHoursEnd: state.quietHoursEnd,
      }),
    }
  )
);
