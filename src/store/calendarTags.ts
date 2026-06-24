import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CalendarTagsState {
  calendarTags: string[];
  selectedTag: string | null;
  setCalendarTags: (tags: string[]) => void;
  setSelectedTag: (tag: string | null) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
}

export const useCalendarTagsStore = create<CalendarTagsState>()(
  persist(
    (set) => ({
      calendarTags: [],
      selectedTag: null,
      setCalendarTags: (calendarTags) => set({ calendarTags }),
      setSelectedTag: (selectedTag) => set({ selectedTag }),
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
