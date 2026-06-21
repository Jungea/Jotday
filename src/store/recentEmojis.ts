import { create } from "zustand";

const RECENT_KEY = "jotday_recent_emojis";
const MAX_RECENT = 32;

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}

interface RecentEmojisStore {
  items: string[];
  setItems: (items: string[]) => void;
  hydrate: () => void;
}

export const useRecentEmojisStore = create<RecentEmojisStore>((set) => ({
  items: [],
  setItems: (items) => {
    set({ items });
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  },
  hydrate: () => set({ items: load() }),
}));
