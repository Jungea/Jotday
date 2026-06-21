"use client";

import { create } from "zustand";

interface RecentEmojisStore {
  items: string[];
  setItems: (items: string[]) => void;
}

export const useRecentEmojisStore = create<RecentEmojisStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}));
