import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AppState {
  // Layout related states
  activePane: "structure" | "editor" | "chat";
  displayMode: "summary" | "intent";
  showHierarchy: boolean;

  // User related states
  user: {
    name: string;
    isLoggedIn: boolean;
  };

  // Actions
  setActivePane: (pane: "structure" | "editor" | "chat") => void;
  setDisplayMode: (mode: "summary" | "intent") => void;
  setShowHierarchy: (show: boolean) => void;
  setUser: (name: string) => void;
  login: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial states
      activePane: "structure",
      displayMode: "summary",
      showHierarchy: false,
      user: {
        name: "",
        isLoggedIn: false,
      },

      // Actions
      setActivePane: (pane) => set({ activePane: pane }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setShowHierarchy: (show) => set({ showHierarchy: show }),
      setUser: (name: string) =>
        set((state) => ({
          user: {
            ...state.user,
            name,
          },
        })),
      login: () =>
        set((state) => ({
          user: {
            ...state.user,
            isLoggedIn: true,
          },
        })),
      logout: () =>
        set((state) => ({
          user: {
            ...state.user,
            isLoggedIn: false,
          },
        })),
    }),
    { name: "App Store" }
  )
);
