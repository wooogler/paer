import { create } from 'zustand';

interface Section {
  title: string;
  content: string;
}

interface Paper {
  title: string;
  content: string;
  sections: Section[];
}

interface PaperStore {
  currentPaper: Paper | null;
  setPaper: (paper: Paper) => void;
  clearPaper: () => void;
}

export const usePaperStore = create<PaperStore>((set) => ({
  currentPaper: null,
  setPaper: (paper) => set({ currentPaper: paper }),
  clearPaper: () => set({ currentPaper: null }),
})); 