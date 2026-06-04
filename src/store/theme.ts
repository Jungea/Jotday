"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "@/types";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "card",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "lumia-theme" }
  )
);
