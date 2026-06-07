"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LayoutGrid, CalendarDays, CalendarRange } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { useThemeStore } from "@/store/theme";

interface Stats {
  totalCards: number;
  thisWeekCount: number;
  weekDayCounts: { day: number; date: string; count: number }[];
  thisMonthCount: number;
  monthly: Record<string, number>;
  topTags: { tag: string; count: number }[];
  recentTopTags: { tag: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
  dowCount: number[];
  thisMonthRecorded: number;
  thisMonthPassed: number;
  daysInMonth: number;
}

export default function StatsPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tagMode, setTagMode] = useState<"all" | "recent">("recent");

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  const monthlyEntries = stats
    ? Object.entries(stats.monthly).map(([month, count]) => ({ month, count }))
    : [];
  const maxCount = Math.max(...monthlyEntries.map((e) => e.count), 1);

  const today = new Date();
  const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      <header className={`shrink-0 flex items-center gap-3 px-4 py-3 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <span className={`flex-1 text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>통계</span>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : stats ? (
          <div className="flex flex-col gap-5 max-w-sm mx-auto">

            {/* 요약 카드 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                icon={<LayoutGrid size={18} className="text-blue-400" />}
                label="전체 카드"
                value={stats.totalCards.toLocaleString()}
                isDark={isDark}
              />
              <StatCard
                icon={<CalendarRange size={18} className="text-purple-400" />}
                label="이번 주"
                value={`${stats.thisWeekCount}개`}
                isDark={isDark}
              />
              <StatCard
                icon={<CalendarDays size={18} className="text-green-400" />}
                label="이번 달"
                value={`${stats.thisMonthCount}개`}
                isDark={isDark}
              />
            </div>

            {/* 이번 주 요일별 */}
            {(() => {
              const maxW = Math.max(...stats.weekDayCounts.map((d) => d.count), 1);
              const todayDow = today.getDay();
              return (
                <div className={`rounded-2xl p-4 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
                  <p className={`text-sm font-semibold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>이번 주</p>
                  <div className="flex items-end justify-between gap-1.5">
                    {stats.weekDayCounts.map(({ day, count }) => {
                      const isToday = day === todayDow;
                      const isFuture = day > todayDow;
                      const isSun = day === 0;
                      const isSat = day === 6;
                      const heightPct = count === 0 ? 4 : Math.round((count / maxW) * 100);
                      return (
                        <div key={day} className="flex flex-col items-center gap-1 flex-1">
                          <span className={`text-[10px] font-medium ${count > 0 ? isDark ? "text-gray-400" : "text-gray-500" : "invisible"}`}>
                            {count}
                          </span>
                          <div className="w-full flex items-end" style={{ height: "64px" }}>
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                isFuture
                                  ? isDark ? "bg-gray-800" : "bg-gray-100"
                                  : isToday
                                  ? isDark ? "bg-white" : "bg-gray-900"
                                  : isSun ? "bg-red-400" : isSat ? "bg-blue-400"
                                  : isDark ? "bg-gray-500" : "bg-gray-400"
                              }`}
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-medium ${
                            isToday
                              ? isDark ? "text-white" : "text-gray-900"
                              : isSun ? "text-red-400" : isSat ? "text-blue-400"
                              : isDark ? "text-gray-500" : "text-gray-400"
                          }`}>
                            {DOW_LABELS[day]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 최근 30일 일별 */}
            {(() => {
              const maxDay = Math.max(...stats.dailyCounts.map((d) => d.count), 1);
              return (
                <div className={`rounded-2xl p-4 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
                  <p className={`text-sm font-semibold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>{format(today, "M월", { locale: ko })}</p>
                  <div className="overflow-x-auto scrollbar-none">
                    <div className="flex items-end gap-[3px]" style={{ minWidth: `${stats.dailyCounts.length * 17}px` }}>
                      {stats.dailyCounts.map(({ date, count }, i) => {
                        const isToday = i === today.getDate() - 1;
                        const dayNum = parseInt(date.slice(8), 10);
                        const showLabel = i === 0 || isToday || (dayNum % 5 === 0);
                        const heightPct = count === 0 ? 3 : Math.round((count / maxDay) * 100);
                        return (
                          <div key={date} className="flex flex-col items-center gap-0.5" style={{ width: "14px" }}>
                            <span className={`text-[8px] leading-none ${count > 0 ? isDark ? "text-gray-400" : "text-gray-500" : "invisible"}`}>
                              {count}
                            </span>
                            <div className="w-full flex items-end" style={{ height: "60px" }}>
                              <div
                                className={`w-full rounded-t-sm ${
                                  isToday
                                    ? isDark ? "bg-white" : "bg-gray-900"
                                    : count === 0
                                    ? isDark ? "bg-gray-800" : "bg-gray-200"
                                    : isDark ? "bg-gray-500" : "bg-gray-400"
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                            <span className={`text-[8px] leading-none ${showLabel ? "" : "invisible"} ${
                              isToday
                                ? isDark ? "text-white font-bold" : "text-gray-900 font-bold"
                                : isDark ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {dayNum}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 월별 바 차트 */}
            <div className={`rounded-2xl p-4 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
              <p className={`text-sm font-semibold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>최근 6개월</p>
              <div className="flex items-end justify-between gap-1.5 h-28">
                {monthlyEntries.map(({ month, count }) => {
                  const isThisMonth = month === format(today, "yyyy-MM");
                  const heightPct = count === 0 ? 4 : Math.round((count / maxCount) * 100);
                  const label = format(subMonths(today, monthlyEntries.findIndex((e) => e.month === month) === -1 ? 0 : 5 - monthlyEntries.findIndex((e) => e.month === month)), "M월", { locale: ko });
                  return (
                    <div key={month} className="flex flex-col items-center gap-1 flex-1">
                      {count > 0 && (
                        <span className={`text-[10px] font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}>{count}</span>
                      )}
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${
                            isThisMonth
                              ? isDark ? "bg-white" : "bg-gray-900"
                              : isDark ? "bg-gray-600" : "bg-gray-300"
                          }`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 자주 쓴 태그 */}
            {(stats.topTags.length > 0 || stats.recentTopTags.length > 0) && (
              <div className={`rounded-2xl p-4 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>자주 쓴 태그</p>
                  <div className={`flex rounded-lg overflow-hidden text-xs font-medium ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
                    <button
                      onClick={() => setTagMode("all")}
                      className={`px-3 py-1 transition-colors ${tagMode === "all" ? isDark ? "bg-white text-black" : "bg-gray-900 text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      전체
                    </button>
                    <button
                      onClick={() => setTagMode("recent")}
                      className={`px-3 py-1 transition-colors ${tagMode === "recent" ? isDark ? "bg-white text-black" : "bg-gray-900 text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      최근 30일
                    </button>
                  </div>
                </div>
                {(() => {
                  const tags = tagMode === "all" ? stats.topTags : stats.recentTopTags;
                  if (tags.length === 0) {
                    return (
                      <p className={`text-xs text-center py-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}>태그 기록이 없습니다</p>
                    );
                  }
                  return (
                    <div className="flex flex-col gap-2">
                      {tags.map(({ tag, count }, i) => {
                        const widthPct = Math.round((count / tags[0].count) * 100);
                        return (
                          <div key={tag} className="flex items-center gap-2">
                            <span className={`text-xs w-4 text-right shrink-0 ${isDark ? "text-gray-600" : "text-gray-400"}`}>{i + 1}</span>
                            <div className="flex-1 relative h-6 flex items-center">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-md ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                                style={{ width: `${widthPct}%` }}
                              />
                              <span className={`relative z-10 text-xs font-medium px-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                                #{tag}
                              </span>
                            </div>
                            <span className={`text-xs shrink-0 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${isDark ? "text-gray-600" : "text-gray-400"}`}>데이터를 불러올 수 없습니다</p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, isDark }: { icon: React.ReactNode; label: string; value: string; isDark: boolean }) {
  return (
    <div className={`rounded-2xl p-3 flex flex-col gap-1.5 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
      {icon}
      <span className={`text-[11px] ${isDark ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
      <span className={`text-lg font-bold leading-none ${isDark ? "text-white" : "text-gray-900"}`}>{value}</span>
    </div>
  );
}
