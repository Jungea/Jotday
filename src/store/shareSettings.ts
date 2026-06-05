import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShareSettingsState {
  expiryDays: number | null;
  setExpiryDays: (days: number | null) => void;
}

export const useShareSettingsStore = create<ShareSettingsState>()(
  persist(
    (set) => ({
      expiryDays: 7,
      setExpiryDays: (days) => set({ expiryDays: days }),
    }),
    { name: "share-settings" }
  )
);
