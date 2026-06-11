import { create } from "zustand";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastStore {
  toasts: ToastItem[];
  nextId: number;
  addToast: (message: string) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  nextId: 0,
  addToast: (message) =>
    set((s) => ({
      toasts: [...s.toasts, { id: s.nextId, message }],
      nextId: s.nextId + 1,
    })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
