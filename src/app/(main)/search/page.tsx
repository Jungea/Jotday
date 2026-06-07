"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Hash, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { DaySheet } from "@/components/ui/DaySheet";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const sub = isDark ? "text-gray-500" : "text-gray-400";

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [tagInput, setTagInput] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>(
    searchParams.get("tags") ? searchParams.get("tags")!.split(",").filter(Boolean) : []
  );
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false);

  // 모달
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalScrollToId, setModalScrollToId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const didInitialSearch = useRef(false);

  const fetchResults = useCallback(async (q: string, tags: string[], p: number, replace: boolean) => {
    if (!q && tags.length === 0) {
      setCards([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tags.length > 0) params.set("tags", tags.join(","));
    params.set("page", String(p));
    const res = await fetch(`/api/cards?${params}`);
    if (res.ok) {
      const { cards: data, hasMore: more } = await res.json();
      setCards((prev) => replace ? data : [...prev, ...data]);
      setHasMore(more);
    }
    setLoading(false);
    setSearched(true);
  }, []);

  // URL 파라미터로 직접 진입 시 초기 검색
  useEffect(() => {
    if (didInitialSearch.current) return;
    if (query || activeTags.length > 0) {
      didInitialSearch.current = true;
      fetchResults(query, activeTags, 0, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(overrideTags?: string[]) {
    const tags = overrideTags ?? activeTags;
    if (!query && tags.length === 0) return;
    setPage(0);
    fetchResults(query, tags, 0, true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tags.length > 0) params.set("tags", tags.join(","));
    router.replace(`/search${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        const next = page + 1;
        setPage(next);
        fetchResults(query, activeTags, next, false);
      }
    });
    observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loading, page, query, activeTags, fetchResults]);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, "");
    if (!tag || activeTags.includes(tag)) return;
    const newTags = [...activeTags, tag];
    setActiveTags(newTags);
    setTagInput("");
    handleSearch(newTags);
  }

  function openModal(date: string, scrollToId?: string) {
    setModalDate(date);
    setModalScrollToId(scrollToId ?? null);
  }

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* 검색 헤더 */}
      <div className={`shrink-0 px-4 pt-4 pb-3 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200"}`}>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 ${isDark ? "bg-[#1c1c1c]" : "bg-gray-100"}`}>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="내용 검색..."
            className={`flex-1 text-sm bg-transparent outline-none ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`}
          />
          {query && (
            <button onClick={() => setQuery("")} className={sub}><X size={15} /></button>
          )}
          <button onClick={() => handleSearch()} className={sub}>
            <Search size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center mt-2.5 min-h-[28px]">
          <Hash size={13} className={sub} />
          {activeTags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-gray-800 text-gray-300" : "bg-gray-200 text-gray-700"}`}>
              {tag}
              <button onClick={() => { const newTags = activeTags.filter((t) => t !== tag); setActiveTags(newTags); handleSearch(newTags); }} className="hover:opacity-70"><X size={10} /></button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); addTag(tagInput); }
              else if (e.key === "Backspace" && !tagInput && activeTags.length > 0)
                setActiveTags((prev) => prev.slice(0, -1));
            }}
            onBlur={() => { if (tagInput) addTag(tagInput); }}
            placeholder={activeTags.length === 0 ? "태그 입력 후 Enter" : ""}
            className={`flex-1 text-xs bg-transparent outline-none min-w-[80px] ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`}
          />
        </div>
      </div>

      {/* 결과 */}
      <main className="flex-1 overflow-y-auto">
        {!searched && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Search size={32} className={isDark ? "text-gray-700" : "text-gray-300"} />
            <p className={`text-sm ${sub}`}>내용이나 태그로 검색해보세요</p>
          </div>
        ) : loading && cards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-7 h-7 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${sub}`}>검색 결과가 없어요</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0 px-4 py-4">
            {cards.map((card, i) => {
              const showDate = i === 0 || cards[i - 1].date !== card.date;
              return (
                <div key={card.id} className={`w-full max-w-sm ${i > 0 ? "mt-3" : ""}`}>
                  {showDate && (
                    <p className={`text-xs mb-1 ${i > 0 ? "mt-2" : ""} ${sub}`}>
                      {format(parseISO(card.date), "yyyy년 M월 d일 (E)", { locale: ko })}
                    </p>
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
                    <CardItem card={card} isDark={isDark} shareView={true} disableLightbox={true} />
                  </div>
                </div>
              );
            })}
            <div ref={sentinelRef} className="w-full h-4" />
            {loading && (
              <div className={`w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mt-2 ${isDark ? "border-gray-600" : "border-gray-300"}`} />
            )}
          </div>
        )}
      </main>

      <BottomTabBar />

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
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
