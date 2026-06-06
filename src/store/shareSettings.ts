import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShareSettingsState {
  expiryDays: number | null;
  daySort: "asc" | "desc";
  setExpiryDays: (days: number | null) => void;
  setDaySort: (sort: "asc" | "desc") => void;
}

export const useShareSettingsStore = create<ShareSettingsState>()(
  persist(
    (set) => ({
      expiryDays: 7,
      daySort: "asc",
      setExpiryDays: (days) => set({ expiryDays: days }),
      setDaySort: (sort) => set({ daySort: sort }),
    }),
    { name: "share-settings" }
  )
);
