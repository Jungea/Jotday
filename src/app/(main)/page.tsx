"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { format, addMonths, subMonths, parse } from "date-fns";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CardForm } from "@/components/cards/CardForm";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useThemeStore } from "@/store/theme";
import type { DayMeta } from "@/types";

function HomeContent() {
  const searchParams = useSearchParams();
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [currentMonth, setCurrentMonth] = useState(
    searchParams.get("month") ?? format(new Date(), "yyyy-MM")
  );

  useEffect(() => {
    const month = searchParams.get("month");
    if (month) setCurrentMonth(month);
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
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
    setInitialLoaded(true);
  }, []);

  useEffect(() => {
    fetchMetas(currentMonth);
  }, [currentMonth, fetchMetas]);

  const isDark = theme === "dark";

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      {/* Calendar */}
      <main className="flex-1 overflow-y-auto px-4 py-6 relative" onScroll={(e) => onScroll(e.currentTarget.scrollTop)}>
        {!initialLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : (
          <>
            <CalendarGrid dayMetas={dayMetas} onMonthChange={setCurrentMonth} initialMonth={currentMonth} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
              </div>
            )}
          </>
        )}
      </main>

      <BottomTabBar />

      {/* 오늘 카드 FAB */}
      <button
        onClick={() => setShowForm(true)}
        className={`fixed bottom-20 right-5 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors
          ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
      >
        <Plus size={22} />
      </button>

      {showForm && (
        <CardForm
          date={today}
          onSuccess={() => {
            setShowForm(false);
            fetchMetas(currentMonth);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
