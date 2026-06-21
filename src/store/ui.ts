import { create } from "zustand";

interface UIState {
  showNav: boolean;
  setShowNav: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showNav: true,
  setShowNav: (show) => set({ showNav: show }),
}));
