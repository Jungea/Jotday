"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "@/types";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const VALID_THEMES: Theme[] = ["light", "dark"];

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "jotday-theme",
      onRehydrateStorage: () => (state) => {
        if (state && !VALID_THEMES.includes(state.theme)) {
          state.theme = "dark";
        }
      },
    }
  )
);
