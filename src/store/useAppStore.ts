import { create } from "zustand";

interface AppState {
  // Layout related states
  activePane: "structure" | "editor" | "chat";
  displayMode: "summary" | "intent";

  // User related states
  user: {
    name: string;
    isLoggedIn: boolean;
  };

  // Actions
  setActivePane: (pane: "structure" | "editor" | "chat") => void;
  setDisplayMode: (mode: "summary" | "intent") => void;
  setUser: (name: string) => void;
  login: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial states
  activePane: "structure",
  displayMode: "summary",
  user: {
    name: "",
    isLoggedIn: false,
  },

  // Actions
  setActivePane: (pane) => set({ activePane: pane }),
  setDisplayMode: (mode) => set({ displayMode: mode }),
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
}));
