"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, X, Hash, CalendarDays } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { cardBarGradient } from "@/lib/timeColor";
import { DaySheet } from "@/components/ui/DaySheet";
import { useScrollHeader } from "@/hooks/useScrollHeader";
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

  // 태그 자동완성
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);

  // 모달
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalScrollToId, setModalScrollToId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tagAreaRef = useRef<HTMLDivElement>(null);
  const didInitialSearch = useRef(false);
  const { showHeader, onScroll: onScrollHeader } = useScrollHeader();

  useEffect(() => {
    fetch("/api/cards?alltags=true")
      .then((r) => r.json())
      .then((tags) => setAllTags(tags))
      .catch(() => {});
  }, []);

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
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (didInitialSearch.current) return;
    if (query || activeTags.length > 0) {
      didInitialSearch.current = true;
      fetchResults(query, activeTags, 0, true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight;
      onScrollHeader(scrollable > 120 ? el.scrollTop : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollHeader]);

  function handleTagInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTagInput(val);
    const q = val.trim().toLowerCase().replace(/^#/, "");
    if (q) {
      const filtered = allTags
        .filter((t) => t.includes(q) && !activeTags.includes(t))
        .sort((a, b) => {
          if (a === q) return -1;
          if (b === q) return 1;
          const aStarts = a.startsWith(q);
          const bStarts = b.startsWith(q);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          return 0;
        })
        .slice(0, 6);
      setTagSuggestions(filtered);
      setActiveSuggestion(0);
    } else {
      setTagSuggestions([]);
    }
  }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/^#/, "");
    setTagSuggestions([]);
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

  const bg = isDark ? "bg-[#111]" : "bg-white";
  const border = isDark ? "border-gray-800" : "border-gray-200";
  const chipTag = isDark ? "bg-gray-800 text-gray-200" : "bg-gray-900 text-white";

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* 검색 헤더 */}
      <div className={`shrink-0 overflow-hidden transition-[max-height] duration-300 ${showHeader ? "max-h-[200px]" : "max-h-0"}`}>
      <div className={`px-4 pt-3 pb-2.5 border-b ${border} ${bg}`}>
        {/* 통합 검색 컨테이너 */}
        <div className={`rounded-xl border ${isDark ? "bg-[#1c1c1c] border-gray-800" : "bg-gray-50 border-gray-200"}`}>
          {/* 텍스트 검색 */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Search size={14} className={sub} />
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
              <button onClick={() => setQuery("")} className={`${sub} transition-opacity hover:opacity-60`}><X size={14} /></button>
            )}
          </div>

          {/* 구분선 */}
          <div className={`h-px mx-3 ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />

          {/* 태그 검색 */}
          <div ref={tagAreaRef} className="relative">
            <div className="flex flex-wrap gap-1.5 items-center px-3 py-2 min-h-[36px]">
              <Hash size={13} className={sub} />
              {activeTags.map((tag) => (
                <span key={tag} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${chipTag}`}>
                  {tag}
                  <button
                    onClick={() => { const newTags = activeTags.filter((t) => t !== tag); setActiveTags(newTags); handleSearch(newTags); }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={(e) => {
                  if (tagSuggestions.length > 0) {
                    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((i) => Math.min(i + 1, tagSuggestions.length - 1)); return; }
                    if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((i) => Math.max(i - 1, 0)); return; }
                    if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); addTag(tagSuggestions[activeSuggestion]); return; }
                    if (e.key === "Escape") { setTagSuggestions([]); return; }
                  }
                  if (e.key === "Enter" || e.key === "," || e.key === " ") { e.preventDefault(); addTag(tagInput); }
                  else if (e.key === "Backspace" && !tagInput && activeTags.length > 0) {
                    const newTags = activeTags.slice(0, -1);
                    setActiveTags(newTags);
                    handleSearch(newTags);
                  }
                }}
                onBlur={() => { setTimeout(() => { setTagSuggestions([]); if (tagInput) addTag(tagInput); }, 150); }}
                placeholder={activeTags.length === 0 ? "태그 입력..." : ""}
                className={`flex-1 text-sm bg-transparent outline-none min-w-[80px] ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`}
              />
            </div>
            {tagSuggestions.length > 0 && (() => {
              const rect = tagAreaRef.current?.getBoundingClientRect();
              return (
              <ul
                style={{ top: rect ? rect.bottom + 4 : 0, left: rect?.left ?? 0, right: rect ? window.innerWidth - rect.right : 0 }}
                className={`fixed z-50 rounded-xl overflow-hidden shadow-xl border ${isDark ? "bg-[#222] border-gray-700" : "bg-white border-gray-200"}`}
              >
                {tagSuggestions.map((tag, i) => (
                  <li key={tag}>
                    <button
                      onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                      onMouseEnter={() => setActiveSuggestion(i)}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors ${
                        i === activeSuggestion
                          ? isDark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                          : isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <Hash size={12} className={sub} />
                      {tag}
                    </button>
                  </li>
                ))}
              </ul>
              );
            })()}
          </div>

        </div>

      </div>
      </div>

      {/* 결과 */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto pb-16">
        {!searched && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Search size={28} className={isDark ? "text-gray-700" : "text-gray-300"} />
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
          <div className="flex flex-col items-center px-4 py-4">
            {/* 결과 수 */}
            <p className={`self-start text-xs mb-3 ${sub}`}>카드 {cards.length}개{hasMore ? " 이상" : ""}</p>

            {cards.map((card, i) => {
              const showDate = i === 0 || cards[i - 1].date !== card.date;
              return (
                <div key={card.id} className={`w-full max-w-sm ${i > 0 ? "mt-3" : ""}`}>
                  {showDate && (
                    <p className={`text-xs font-medium mb-1.5 ${i > 0 ? "mt-3" : ""} ${sub}`}>
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
                    <CardItem card={card} isDark={isDark} shareView={true} disableLightbox={true} barGradient={cardBarGradient(new Date(card.created_at).getHours() + new Date(card.created_at).getMinutes() / 60, new Date(card.created_at).getHours() + new Date(card.created_at).getMinutes() / 60 + 1)} />
                  </div>
                </div>
              );
            })}
            <div ref={sentinelRef} className="w-full h-4" />
            {loading && (
              <div className={`w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mt-2 ${isDark ? "border-gray-600" : "border-gray-300"}`} />
            )}
            {!hasMore && cards.length > 0 && (
              <p className={`text-xs mt-2 ${sub}`}>모든 카드를 불러왔어요</p>
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
