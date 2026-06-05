"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addMonths, subMonths, parse } from "date-fns";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useThemeStore } from "@/store/theme";
import type { DayMeta } from "@/types";

export default function HomePage() {
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(true);
  const { showHeader, onScroll } = useScrollHeader();
  const theme = useThemeStore((s) => s.theme);

  const fetchMetas = useCallback(async (month: string) => {
    setLoading(true);
    const base = parse(month, "yyyy-MM", new Date());
    const months = [
      format(subMonths(base, 1), "yyyy-MM"),
      month,
      format(addMonths(base, 1), "yyyy-MM"),
    ];
    const results = await Promise.all(months.map((m) => fetch(`/api/cards?month=${m}`).then((r) => r.ok ? r.json() : [])));
    setDayMetas(results.flat());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetas(currentMonth);
  }, [currentMonth, fetchMetas]);

  const isDark = theme === "dark";

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      {/* Calendar */}
      <main className="flex-1 overflow-y-auto px-4 py-6" onScroll={(e) => onScroll(e.currentTarget.scrollTop)}>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : (
          <CalendarGrid
            dayMetas={dayMetas}
            onMonthChange={setCurrentMonth}
          />
        )}
      </main>

      <BottomTabBar />
    </div>
  );
}
