"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { DaySheet } from "@/components/ui/DaySheet";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";


interface PhotoItem {
  url: string;
  cardId: string;
  date: string;
}

function toThumbnail(url: string): string {
  return url.replace("/upload/", "/upload/w_100,q_auto,f_auto/");
}

function extractPhotos(cards: Card[]): PhotoItem[] {
  return cards.flatMap((card) => {
    const imgs =
      card.images?.length > 0
        ? card.images
        : card.image_url
        ? [{ url: card.image_url }]
        : [];
    return imgs.map((img) => ({ url: img.url, cardId: card.id, date: card.date }));
  });
}

function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => undefined);
}

export default function PhotosPage() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { showHeader, onScroll: onScrollHeader } = useScrollHeader();

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalScrollToId, setModalScrollToId] = useState<string | null>(null);

  const pageRef = useRef(0);
  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNext = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    const res = await fetch(`/api/cards?photos=true&page=${pageRef.current}`);
    if (res.ok) {
      const data: { cards: Card[]; hasMore: boolean } = await res.json();
      const newPhotos = extractPhotos(data.cards);
      await preloadImages(newPhotos.map((p) => toThumbnail(p.url)));
      setPhotos((prev) => [...prev, ...newPhotos]);
      setHasMore(data.hasMore);
      pageRef.current += 1;
    }

    setLoading(false);
    setInitialLoaded(true);
    fetchingRef.current = false;
  }, []);

  useEffect(() => {
    fetchNext();
  }, [fetchNext]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => onScrollHeader(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScrollHeader]);

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) fetchNext(); },
      { threshold: 0.1 }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, fetchNext, initialLoaded]);

  const bg = isDark ? "bg-[#111]" : "bg-white";
  const sub = isDark ? "text-gray-400" : "text-gray-500";

  // 날짜별 그룹
  const groups: { date: string; photos: PhotoItem[] }[] = [];
  for (const photo of photos) {
    const last = groups[groups.length - 1];
    if (last && last.date === photo.date) last.photos.push(photo);
    else groups.push({ date: photo.date, photos: [photo] });
  }

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      <main ref={scrollRef} className={`flex-1 overflow-y-auto pb-16 ${bg}`}>
        {!initialLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className={`text-sm ${sub}`}>아직 사진이 없어요.</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.date}>
                <div className={`px-4 py-2 text-xs font-medium ${sub} ${isDark ? "bg-[#111]" : "bg-gray-50"}`}>
                  {format(new Date(`${group.date}T00:00:00`), "yyyy년 M월 d일 (E)", { locale: ko })}
                </div>
                <div className="grid grid-cols-6 gap-px">
                  {group.photos.map((photo, i) => (
                    <button
                      key={`${photo.cardId}-${i}`}
                      className="w-full overflow-hidden"
                      onClick={() => {
                        setModalDate(photo.date);
                        setModalScrollToId(photo.cardId);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={toThumbnail(photo.url)}
                        alt=""
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div ref={sentinelRef} className="w-full h-4" />

            {loading ? (
              <div className="flex justify-center py-4">
                <div className={`w-6 h-6 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
              </div>
            ) : !hasMore && (
              <p className={`text-center text-xs py-6 ${sub}`}>모든 사진을 불러왔어요.</p>
            )}
          </>
        )}
      </main>

      {modalDate && (
        <DaySheet
          date={modalDate}
          isDark={isDark}
          onClose={() => { setModalDate(null); setModalScrollToId(null); }}
          onCardDeleted={(id) => setPhotos((prev) => prev.filter((p) => p.cardId !== id))}
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
