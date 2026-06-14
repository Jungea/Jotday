"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, CalendarDays } from "lucide-react";
import { format, subDays, subMonths, subYears } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { cardBarGradient } from "@/lib/timeColor";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { DaySheet } from "@/components/ui/DaySheet";
import { useScrollHeader } from "@/hooks/useScrollHeader";
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
  const [selectedId, setSelectedId] = useState<SelectedId>(visiblePresets[0]?.id ?? "week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [imagesOnly, setImagesOnly] = useState(false);

  const [cards, setCards] = useState<Card[]>([]);
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { showHeader, onScroll: onScrollHeader } = useScrollHeader();
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalScrollToId, setModalScrollToId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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
    if (imagesOnly) params.set("imagesOnly", "true");

    const res = await fetch(`/api/cards?${params}`);
    if (res.ok) {
      const data: { cards: Card[]; hasMore: boolean } = await res.json();
      setCards((prev) => (reset ? data.cards : [...prev, ...data.cards]));
      setHasMore(data.hasMore);
    }

    setLoading(false);
    setInitialLoaded(true);
    fetchingRef.current = false;
  }, [sort, from, to, imagesOnly, setCards]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCards([]);
    pageRef.current = 0;
    setHasMore(true);
    setInitialLoaded(false);
    fetchPage(0, true);
  }, [fetchPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          pageRef.current += 1;
          fetchPage(pageRef.current);
        }
      },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, fetchPage]);

  function openModal(date: string, scrollToId?: string) {
    setModalDate(date);
    setModalScrollToId(scrollToId ?? null);
  }

  // 스크롤 위치 감지 → 위로가기 버튼 표시
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cur = el.scrollTop;
      setShowScrollTop(cur > 300);
      onScrollHeader(cur);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollHeader]);

  const bg = isDark ? "bg-[#111]" : "bg-white";
  const border = isDark ? "border-gray-800" : "border-gray-200";
  const sub = isDark ? "text-gray-400" : "text-gray-500";
  const chipActive = isDark ? "bg-white text-black" : "bg-gray-900 text-white";
  const chipInactive = isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600";

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      {/* Filters */}
      <div className={`shrink-0 px-4 pt-3 pb-2 border-b ${border} ${bg} space-y-2`}>
        {/* Sort */}
        <div className="flex items-center gap-2">
          {(["desc", "asc"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${sort === s ? chipActive : chipInactive}`}
            >
              {s === "desc" ? "최신순" : "과거순"}
            </button>
          ))}
          <button
            onClick={() => setImagesOnly((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${imagesOnly ? chipActive : chipInactive}`}
          >
            사진만
          </button>
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
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
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
            {cards.map((card, i) => {
              const showDate = i === 0 || cards[i - 1].date !== card.date;
              return (
                <div key={card.id} className="w-full max-w-sm">
                  {showDate && (
                    <div className={`text-xs mb-1 ${i > 0 ? "mt-2" : ""} ${sub}`}>
                      {format(new Date(card.date), "yyyy년 M월 d일 (E)", { locale: ko })}
                    </div>
                  )}
                  <div
                    className="cursor-pointer"
                    onPointerDown={(e) => { (e.currentTarget as HTMLElement).dataset.startX = String(e.clientX); }}
                    onClick={(e) => {
                      const startX = Number((e.currentTarget as HTMLElement).dataset.startX ?? e.clientX);
                      if (Math.abs(e.clientX - startX) > 8) return;
                      if ((e.target as HTMLElement).closest("button")) return;
                      openModal(card.date, card.id);
                    }}
                  >
                    <CardItem card={card} isDark={isDark} shareView={true} disableLightbox={true} barGradient={cardBarGradient(new Date(card.created_at).getHours() + new Date(card.created_at).getMinutes() / 60, new Date(card.created_at).getHours() + new Date(card.created_at).getMinutes() / 60 + 1)} />
                  </div>
                </div>
              );
            })}

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

      {/* 날짜 카드 모달 */}
      {modalDate && (
        <DaySheet
          date={modalDate}
          isDark={isDark}
          onClose={() => setModalDate(null)}
          onCardDeleted={(id) => setCards((prev) => prev.filter((c) => c.id !== id))}
          scrollToId={modalScrollToId ?? undefined}
          headerActions={
            <button
              onClick={() => router.push(`/?month=${modalDate.slice(0, 7)}`)}
              className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
            >
              <CalendarDays size={16} />
            </button>
          }
        />
      )}

      <BottomTabBar />

      {/* 맨 위로 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
          className={`fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors
            ${isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-900 hover:bg-gray-700 text-white"}`}
        >
          <ArrowUp size={18} />
        </button>
      )}
    </div>
  );
}
