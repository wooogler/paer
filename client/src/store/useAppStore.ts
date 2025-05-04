import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AppState {
  // Layout related states
  activePane: "structure" | "editor" | "chat";
  displayMode: "sentence" | "hierarchy";
  showHierarchy: boolean;
  isStructureVisible: boolean;
  isChatVisible: boolean;

  // User related states
  user: {
    name: string;
    isLoggedIn: boolean;
  };
  userName: string;
  userId: string;

  // Actions
  setActivePane: (pane: "structure" | "editor" | "chat") => void;
  setDisplayMode: (mode: "sentence" | "hierarchy") => void;
  setShowHierarchy: (show: boolean) => void;
  toggleStructureVisibility: () => void;
  toggleChatVisibility: () => void;
  setUser: (name: string) => void;
  setUserName: (name: string) => void;
  setUserId: (id: string) => void;
  login: () => void;
  logout: () => void;
}

// // Calculate initial widths based on typical screen width (1920px) and original ratios
// const INITIAL_SCREEN_WIDTH = 1920;
// const INITIAL_STRUCTURE_WIDTH = Math.round(INITIAL_SCREEN_WIDTH * 0.2); // 20%
// const INITIAL_CHAT_WIDTH = Math.round(INITIAL_SCREEN_WIDTH * 0.25); // 25%

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial states
        activePane: "structure",
        displayMode: "sentence",
        showHierarchy: false,
        isStructureVisible: true,
        isChatVisible: true,
        user: {
          name: "",
          isLoggedIn: false,
        },
        userName: "",
        userId: "",

        // Actions
        setActivePane: (pane) => set({ activePane: pane }),
        setDisplayMode: (mode) => set({ displayMode: mode }),
        setShowHierarchy: (show) => set({ showHierarchy: show }),
        toggleStructureVisibility: () => set((state) => ({ isStructureVisible: !state.isStructureVisible })),
        toggleChatVisibility: () => set((state) => ({ isChatVisible: !state.isChatVisible })),
        setUser: (name: string) =>
          set((state) => ({
            user: {
              ...state.user,
              name,
            },
          })),
        setUserName: (name: string) => set({ userName: name }),
        setUserId: (id: string) => set({ userId: id }),
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
            userName: "",
            userId: "",
          })),
      }),
      {
        name: "app-storage",
        partialize: (state) => ({
          user: state.user,
          userName: state.userName,
          userId: state.userId,
        }),
      }
    ),
    { name: "app-store" }
  )
);
