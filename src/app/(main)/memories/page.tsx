"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { format, subWeeks, subMonths, subYears } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { CardItem } from "@/components/cards/CardItem";
import { cardBarGradient } from "@/lib/timeColor";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { DaySheet } from "@/components/ui/DaySheet";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

const PERIODS = [
  { label: "1주 전 오늘",  fn: (d: Date) => subWeeks(d, 1) },
  { label: "2주 전 오늘",  fn: (d: Date) => subWeeks(d, 2) },
  { label: "1달 전 오늘",  fn: (d: Date) => subMonths(d, 1) },
  { label: "3달 전 오늘",  fn: (d: Date) => subMonths(d, 3) },
  { label: "6달 전 오늘",  fn: (d: Date) => subMonths(d, 6) },
  { label: "1년 전 오늘",  fn: (d: Date) => subYears(d, 1) },
  { label: "2년 전 오늘",  fn: (d: Date) => subYears(d, 2) },
  { label: "3년 전 오늘",  fn: (d: Date) => subYears(d, 3) },
  { label: "5년 전 오늘",  fn: (d: Date) => subYears(d, 5) },
];

function HorizontalScroll({ children, className, isDark }: { children: React.ReactNode; className?: string; isDark: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 24);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 24);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener("scroll", updateButtons, { passive: true });
    return () => el.removeEventListener("scroll", updateButtons);
  }, [updateButtons]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  const btnBase = `absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-opacity duration-150`;
  const btnStyle = isDark
    ? "bg-gray-700 text-white hover:bg-gray-600"
    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200";

  return (
    <div className="relative">
      {canLeft && (
        <button onClick={() => scroll("left")} className={`${btnBase} left-1 ${btnStyle}`}>
          <ChevronLeft size={16} />
        </button>
      )}
      <div ref={scrollRef} className={className}>
        <div className="shrink-0 w-5" />
        {children}
        <div className="shrink-0 w-5" />
      </div>
      {canRight && (
        <button onClick={() => scroll("right")} className={`${btnBase} right-1 ${btnStyle}`}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

interface Section {
  label: string;
  dateStr: string;
  cards: Card[];
}

export default function MemoriesPage() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { showHeader, onScroll: onScrollHeader } = useScrollHeader();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalScrollToId, setModalScrollToId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const today = new Date();
      const periods = PERIODS.map((p) => ({
        label: p.label,
        dateStr: format(p.fn(today), "yyyy-MM-dd"),
      }));
      const dates = periods.map((p) => p.dateStr).join(",");

      const res = await fetch(`/api/cards?memories=true&dates=${dates}`);
      if (!res.ok) { setLoading(false); return; }

      const data: Record<string, Card[]> = await res.json();

      const result: Section[] = periods
        .map((p) => ({ label: p.label, dateStr: p.dateStr, cards: data[p.dateStr] ?? [] }))
        .filter((s) => s.cards.length > 0);

      setSections(result);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => onScrollHeader(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollHeader]);

  const bg = isDark ? "bg-[#111]" : "bg-gray-50";
  const sub = isDark ? "text-gray-400" : "text-gray-500";
  const divider = isDark ? "divide-gray-800" : "divide-gray-200";

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      <main ref={scrollRef} className={`flex-1 overflow-y-auto pb-16 ${bg}`}>
        {/* 페이지 타이틀 */}
        <div className={`px-5 pt-5 pb-4 ${isDark ? "bg-[#111]" : "bg-white"} border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
          <h1 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>오늘의 추억</h1>
          <p className={`text-xs mt-0.5 ${sub}`}>
            {format(new Date(), "yyyy년 M월 d일 (E)", { locale: ko })} 기준
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className={`text-sm ${sub}`}>아직 추억이 없어요.</p>
            <p className={`text-xs ${sub}`}>기록이 쌓이면 이곳에서 만날 수 있어요.</p>
          </div>
        ) : (
          <div className={`flex flex-col divide-y ${divider}`}>
            {sections.map((section) => (
              <div key={section.dateStr} className={`py-4 ${isDark ? "bg-[#111]" : "bg-white"} mb-2 last:mb-0`}>
                {/* 섹션 헤더 */}
                <div className="px-5 mb-3 flex items-baseline justify-between">
                  <span className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    {section.label}
                  </span>
                  <span className={`text-xs ${sub}`}>
                    {format(new Date(section.dateStr), "yyyy년 M월 d일 (E)", { locale: ko })}
                  </span>
                </div>

                {/* 가로 스크롤 캐러셀 */}
                <HorizontalScroll isDark={isDark} className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory scroll-pl-5">
                  {section.cards.map((card) => {
                    const h = new Date(card.created_at).getHours() + new Date(card.created_at).getMinutes() / 60;
                    return (
                      <div
                        key={card.id}
                        className="w-72 shrink-0 snap-start cursor-pointer"
                        onPointerDown={(e) => { (e.currentTarget as HTMLElement).dataset.startX = String(e.clientX); }}
                        onClick={(e) => {
                          const startX = Number((e.currentTarget as HTMLElement).dataset.startX ?? e.clientX);
                          if (Math.abs(e.clientX - startX) > 8) return;
                          if ((e.target as HTMLElement).closest("button")) return;
                          setModalDate(section.dateStr);
                          setModalScrollToId(card.id);
                        }}
                      >
                        <CardItem
                          card={card}
                          isDark={isDark}
                          shareView={true}
                          disableLightbox={true}
                          barGradient={cardBarGradient(h, h + 1)}
                        />
                      </div>
                    );
                  })}
                </HorizontalScroll>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalDate && (
        <DaySheet
          date={modalDate}
          isDark={isDark}
          onClose={() => { setModalDate(null); setModalScrollToId(null); }}
          onCardDeleted={(id) => {
            setSections((prev) => prev
              .map((s) => ({ ...s, cards: s.cards.filter((c) => c.id !== id) }))
              .filter((s) => s.cards.length > 0)
            );
          }}
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
    </div>
  );
}
