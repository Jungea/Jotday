import { create } from "zustand";

interface GlobalLoadingStore {
  count: number;
  begin: () => void;
  end: () => void;
}

export const useGlobalLoadingStore = create<GlobalLoadingStore>((set) => ({
  count: 0,
  begin: () => set((s) => ({ count: s.count + 1 })),
  end: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
}));
