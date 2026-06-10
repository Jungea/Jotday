import { create } from "zustand";

interface ToastItem {
  id: number;
  message: string;
}

let _id = 0;

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message) => set((s) => ({ toasts: [...s.toasts, { id: ++_id, message }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
