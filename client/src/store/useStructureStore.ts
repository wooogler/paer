import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface StructureStore {
  // Structure visibility state
  isStructureVisible: boolean;
  toggleStructureVisibility: () => void;
}

export const useStructureStore = create<StructureStore>()(
  devtools(
    (set) => ({
      // Initial states
      isStructureVisible: true,

      // Actions
      toggleStructureVisibility: () => {
        set((state) => ({ isStructureVisible: !state.isStructureVisible }));
      },
    }),
    { name: "Structure Store" }
  )
); 