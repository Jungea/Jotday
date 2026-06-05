"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { useThemeStore } from "@/store/theme";
import { useFeedPresetsStore } from "@/store/feedPresets";
import type { Card } from "@/types";
import type { BuiltinKey } from "@/store/feedPresets";

type Sort = "desc" | "asc";
type SelectedId = BuiltinKey | "custom";

function getBuiltinRange(id: BuiltinKey): { from: string; to: string } {
  const today = format(new Date(), "yyyy-MM-dd");
  switch (id) {
    case "week":   return { from: format(subDays(new Date(), 6), "yyyy-MM-dd"), to: today };
    case "month":  return { from: format(subMonths(new Date(), 1), "yyyy-MM-dd"), to: today };
    case "month3": return { from: format(subMonths(new Date(), 3), "yyyy-MM-dd"), to: today };
    case "month6": return { from: format(subMonths(new Date(), 6), "yyyy-MM-dd"), to: today };
    case "year":   return { from: format(subYears(new Date(), 1), "yyyy-MM-dd"), to: today };
    default:       return { from: "", to: "" };
  }
}

export default function FeedPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const allPresets = useFeedPresetsStore((s) => s.presets);
  const visiblePresets = allPresets.filter((p) => !p.hidden);

  const [sort, setSort] = useState<Sort>("desc");
  const [selectedId, setSelectedId] = useState<SelectedId>(() => visiblePresets[0]?.id ?? "week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const { from, to } = selectedId === "custom"
    ? { from: appliedFrom, to: appliedTo }
    : getBuiltinRange(selectedId as BuiltinKey);

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

  async function handleSetRepresentative(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("set_representative", "true");
    const res = await fetch("/api/cards", { method: "PATCH", body: formData });
    if (res.ok) {
      const updated: Card = await res.json();
      setCards((prev) =>
        prev.map((c) =>
          c.date === updated.date
            ? { ...c, is_representative: c.id === id }
            : c
        )
      );
    }
  }

  useEffect(() => {
    setCards([]);
    setPage(0);
    setHasMore(true);
    setInitialLoaded(false);
    fetchPage(0, true);
  }, [fetchPage]);

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
  const sub = isDark ? "text-gray-400" : "text-gray-500";
  const chipActive = isDark ? "bg-white text-black" : "bg-gray-900 text-white";
  const chipInactive = isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600";

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* Filters */}
      <div className={`shrink-0 px-4 pt-3 pb-2 border-b ${border} ${bg} space-y-2`}>
        {/* 뒤로가기 + Sort */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"} ${sub}`}
          >
            <ArrowLeft size={18} />
          </button>
          {(["desc", "asc"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${sort === s ? chipActive : chipInactive}`}
            >
              {s === "desc" ? "최신순" : "과거순"}
            </button>
          ))}
        </div>

        {/* Period presets + 직접 설정 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {visiblePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setSelectedId(preset.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedId === preset.id ? chipActive : chipInactive}`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={() => setSelectedId("custom")}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedId === "custom" ? chipActive : chipInactive}`}
          >
            직접 설정
          </button>
        </div>

        {/* 직접 설정 날짜 입력 */}
        {selectedId === "custom" && (
          <DateRangePicker
            from={customFrom}
            to={customTo}
            onChange={(f, t) => {
              setCustomFrom(f);
              setCustomTo(t);
              if (f && t) { setAppliedFrom(f); setAppliedTo(t); }
            }}
            isDark={isDark}
          />
        )}
      </div>

      {/* Cards */}
      <main className="flex-1 overflow-y-auto">
        {!initialLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${sub}`}>해당 기간에 카드가 없어요.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 px-4">
            {cards.map((card) => (
              <div key={card.id} className="w-full max-w-sm">
                <div className={`text-xs mb-1 ${sub}`}>
                  {format(new Date(card.date), "yyyy년 M월 d일 (E)", { locale: ko })}
                </div>
                <CardItem card={card} isDark={isDark} onSetRepresentative={handleSetRepresentative} />
              </div>
            ))}

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
