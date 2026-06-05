"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format, startOfWeek, startOfMonth, subDays, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

type Sort = "desc" | "asc";
type Preset = "all" | "week" | "thisWeek" | "month" | "thisMonth" | "custom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "week", label: "최근 1주일" },
  { key: "thisWeek", label: "이번 주" },
  { key: "month", label: "최근 1달" },
  { key: "thisMonth", label: "이번 달" },
  { key: "custom", label: "직접 설정" },
];

function getRange(preset: Preset, customFrom: string, customTo: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  switch (preset) {
    case "week":
      return { from: format(subDays(new Date(), 6), "yyyy-MM-dd"), to: today };
    case "thisWeek":
      return { from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"), to: today };
    case "month":
      return { from: format(subMonths(new Date(), 1), "yyyy-MM-dd"), to: today };
    case "thisMonth":
      return { from: format(startOfMonth(new Date()), "yyyy-MM-dd"), to: today };
    case "custom":
      return { from: customFrom, to: customTo };
    default:
      return { from: "", to: "" };
  }
}

export default function FeedPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const [sort, setSort] = useState<Sort>("desc");
  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const { from, to } = getRange(preset, customFrom, customTo);

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ feed: "true", sort, page: String(pageNum) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);

    const res = await fetch(`/api/cards?${params}`);
    if (res.ok) {
      const data: { cards: Card[]; hasMore: boolean } = await res.json();
      setCards((prev) => (reset ? data.cards : [...prev, ...data.cards]));
      setHasMore(data.hasMore);
    }

    setLoading(false);
    setInitialLoaded(true);
    fetchingRef.current = false;
  }, [sort, from, to]);

  // 필터 변경 시 초기화
  useEffect(() => {
    setCards([]);
    setPage(0);
    setHasMore(true);
    setInitialLoaded(false);
    fetchPage(0, true);
  }, [fetchPage]);

  // 무한 스크롤
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => {
            const next = p + 1;
            fetchPage(next);
            return next;
          });
        }
      },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, fetchPage]);

  const bg = isDark ? "bg-[#111]" : "bg-white";
  const border = isDark ? "border-gray-800" : "border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const sub = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* Header */}
      <header className={`flex items-center gap-3 px-5 py-4 shrink-0 ${bg} border-b ${border} shadow-sm`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"} ${sub}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`font-bold text-lg ${text}`}>전체 카드</h1>
      </header>

      {/* Filters */}
      <div className={`shrink-0 px-4 pt-3 pb-2 border-b ${border} ${bg} space-y-2`}>
        {/* Sort */}
        <div className="flex gap-2">
          {(["desc", "asc"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${sort === s
                  ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                  : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
            >
              {s === "desc" ? "최신순" : "과거순"}
            </button>
          ))}
        </div>

        {/* Period presets */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${preset === key
                  ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                  : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom range */}
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className={`flex-1 text-sm rounded-lg px-3 py-1.5 border ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            />
            <span className={`text-sm ${sub}`}>~</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className={`flex-1 text-sm rounded-lg px-3 py-1.5 border ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            />
          </div>
        )}
      </div>

      {/* Cards */}
      <main className="flex-1 overflow-y-auto">
        {!initialLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className={`text-sm ${sub}`}>해당 기간에 카드가 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 px-4">
            {cards.map((card) => (
              <div key={card.id} className="w-full max-w-sm">
                <div className={`text-xs mb-1 ${sub}`}>
                  {format(new Date(card.date), "yyyy년 M월 d일 (E)", { locale: ko })}
                </div>
                <CardItem card={card} isDark={isDark} />
              </div>
            ))}

            {/* Sentinel */}
            <div ref={sentinelRef} className="w-full h-4" />

            {loading && (
              <div className={`w-6 h-6 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
            )}

            {!hasMore && cards.length > 0 && (
              <p className={`text-xs ${sub} pb-4`}>모든 카드를 불러왔어요.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
