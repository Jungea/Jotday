import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BuiltinKey = "week" | "month" | "month3" | "month6" | "year";

export type PresetItem = {
  id: BuiltinKey;
  label: string;
  hidden?: boolean;
};

const DEFAULT_PRESETS: PresetItem[] = [
  { id: "week",   label: "1주" },
  { id: "month",  label: "1개월" },
  { id: "month3", label: "3개월" },
  { id: "month6", label: "6개월" },
  { id: "year",   label: "1년" },
];

interface FeedPresetsStore {
  presets: PresetItem[];
  reorder: (oldIndex: number, newIndex: number) => void;
  toggleHidden: (id: string) => void;
}

export const useFeedPresetsStore = create<FeedPresetsStore>()(
  persist(
    (set) => ({
      presets: DEFAULT_PRESETS,
      reorder: (oldIndex, newIndex) =>
        set((s) => {
          const next = [...s.presets];
          const [moved] = next.splice(oldIndex, 1);
          next.splice(newIndex, 0, moved);
          return { presets: next };
        }),
      toggleHidden: (id) =>
        set((s) => ({
          presets: s.presets.map((p) =>
            p.id === id ? { ...p, hidden: !p.hidden } : p
          ),
        })),
    }),
    { name: "feed-presets" }
  )
);
