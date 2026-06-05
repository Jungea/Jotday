"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { Logo } from "@/components/Logo";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

type ShareData =
  | { type: "card"; card: Card; expires_at: string | null }
  | { type: "date"; date: string; cards: Card[]; expires_at: string | null };

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";
  const [data, setData] = useState<ShareData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share?token=${token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        setData(await res.json());
      })
      .finally(() => setLoading(false));
  }, [token]);

  const expiryLabel = data?.expires_at
    ? `이 링크는 ${format(parseISO(data.expires_at), "yyyy.MM.dd")}까지 유효합니다`
    : "만료 없음";

  const dateLabel = data?.type === "date"
    ? format(parseISO(data.date), "yyyy년 M월 d일 (E)", { locale: ko })
    : data?.type === "card"
      ? format(parseISO(data.card.date), "yyyy년 M월 d일 (E)", { locale: ko })
      : "";

  return (
    <div className={`min-h-dvh flex flex-col ${isDark ? "theme-dark bg-[#111] text-white" : "theme-light bg-gray-50 text-gray-900"}`}>
      <header className={`shrink-0 flex items-center justify-between px-4 py-3 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <Logo height={32} className={isDark ? "text-white" : "text-gray-900"} />
        {dateLabel && (
          <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{dateLabel}</span>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1 py-20">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : notFound ? (
          <div className="flex items-center justify-center flex-1 py-20">
            <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>링크가 만료되었거나 존재하지 않습니다</p>
          </div>
        ) : data?.type === "card" ? (
          <div className="flex flex-col items-center gap-4 py-4 px-4">
            <div className="w-full max-w-sm">
              <CardItem card={data.card} isDark={isDark} shareView={true} />
            </div>
          </div>
        ) : data?.type === "date" ? (
          <div className="flex flex-col items-center gap-4 py-4 px-4">
            {data.cards.map((card) => (
              <div key={card.id} className="w-full max-w-sm">
                <CardItem card={card} isDark={isDark} shareView={true} />
              </div>
            ))}
          </div>
        ) : null}
      </main>

      {!loading && !notFound && data && (
        <footer className={`shrink-0 text-center py-4 text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          {expiryLabel}
        </footer>
      )}
    </div>
  );
}
