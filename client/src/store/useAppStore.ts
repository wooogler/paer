import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AppState {
  // Layout related states
  activePane: "structure" | "editor" | "chat";
  displayMode: "sentence" | "hierarchy";
  showHierarchy: boolean;

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
  setUser: (name: string) => void;
  setUserName: (name: string) => void;
  setUserId: (id: string) => void;
  login: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      // Initial states
      activePane: "structure",
      displayMode: "sentence",
      showHierarchy: false,
      user: {
        name: "testuser",
        isLoggedIn: true,
      },
      userName: "", // 초기값을 빈 문자열로 변경
      userId: "",

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
    { name: "app-store" }
  )
);
