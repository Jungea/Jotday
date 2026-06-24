import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CalendarTagsState {
  calendarTags: string[];
  setCalendarTags: (tags: string[]) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

export const useCalendarTagsStore = create<CalendarTagsState>()(
  persist(
    (set) => ({
      calendarTags: [],
      setCalendarTags: (calendarTags) => set({ calendarTags }),
      addTag: (tag) =>
        set((s) => ({
          calendarTags: s.calendarTags.includes(tag) ? s.calendarTags : [...s.calendarTags, tag],
        })),
      removeTag: (tag) =>
        set((s) => ({ calendarTags: s.calendarTags.filter((t) => t !== tag) })),
    }),
    { name: "calendar-tags" }
  )
);
