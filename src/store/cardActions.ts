import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ActionId = "edit" | "delete" | "download" | "link" | "star";

export const DEFAULT_ORDER: ActionId[] = ["edit", "delete", "download", "link", "star"];

export const ACTION_LABELS: Record<ActionId, string> = {
  edit:     "수정",
  delete:   "삭제",
  download: "다운로드",
  link:     "링크 공유",
  star:     "대표 설정",
};

interface CardActionsState {
  order: ActionId[];
  pinned: ActionId[];
  toggle: (id: ActionId) => void;
  reorder: (from: number, to: number) => void;
}

export const useCardActionsStore = create<CardActionsState>()(
  persist(
    (set) => ({
      order: [...DEFAULT_ORDER],
      pinned: ["edit", "delete"],
      toggle: (id) =>
        set((s) => ({
          pinned: s.pinned.includes(id)
            ? s.pinned.filter((a) => a !== id)
            : [...s.pinned, id],
        })),
      reorder: (from, to) =>
        set((s) => {
          const next = [...s.order];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return { order: next };
        }),
    }),
    { name: "card-actions" }
  )
);
