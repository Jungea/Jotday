"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { CardItem } from "@/components/cards/CardItem";
import { CardForm } from "@/components/cards/CardForm";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

export default function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const router = useRouter();
  const [cards, setCards] = useState<Card[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number>(0);
  const theme = useThemeStore((s) => s.theme);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cards?date=${date}`);
    if (res.ok) {
      const data: Card[] = await res.json();
      setCards(data);
      setLoading(false);
      return data;
    }
    setLoading(false);
    return [];
  }, [date]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  async function handleDelete(id: string) {
    const res = await fetch(`/api/cards?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== id);
        setCurrentIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
        return next;
      });
    }
  }

  function handleEdit(card: Card) {
    setEditCard(card);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
    else if (diff < -50) setCurrentIndex((i) => Math.max(i - 1, 0));
  }

  const parsedDate = parseISO(date);
  const isCork = theme === "cork";
  const formattedDate = format(parsedDate, "yyyy년 M월 d일 (E)", { locale: ko });

  return (
    <div className={`min-h-screen ${isCork ? "theme-cork" : "theme-card"}`}>
      {/* Header */}
      <header className={`flex items-center gap-3 px-5 py-4 ${isCork ? "bg-amber-800/30" : "bg-white border-b border-gray-100 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/30 text-amber-100" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`font-bold text-lg ${isCork ? "text-amber-100" : "text-gray-900"}`}>
          {formattedDate}
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto bg-amber-500 hover:bg-amber-600 text-white rounded-full p-2 transition-colors shadow"
        >
          <Plus size={18} />
        </button>
      </header>

      {/* Cards */}
      <main className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className={`text-5xl ${isCork ? "opacity-70" : ""}`}>📝</div>
            <p className={`text-sm ${isCork ? "text-amber-200" : "text-gray-400"}`}>
              아직 기록이 없어요. + 버튼을 눌러 추가해보세요!
            </p>
          </div>
        ) : isCork ? (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {cards.map((card) => (
              <CardItem key={card.id} card={card} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Swiper */}
            <div
              className="w-full overflow-hidden"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {cards.map((card) => (
                  <div key={card.id} className="w-full flex-shrink-0 px-1">
                    <CardItem card={card} onDelete={handleDelete} onEdit={handleEdit} />
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            {cards.length > 1 && (
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                  disabled={currentIndex === 0}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-opacity"
                >
                  <ChevronLeft size={22} />
                </button>

                <div className="flex gap-2">
                  {cards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentIndex ? "bg-amber-500" : "bg-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setCurrentIndex((i) => Math.min(i + 1, cards.length - 1))}
                  disabled={currentIndex === cards.length - 1}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-opacity"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showForm && (
        <CardForm
          date={date}
          onSuccess={async () => {
            setShowForm(false);
            const next = await fetchCards();
            setCurrentIndex(Math.max(0, next.length - 1));
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editCard && (
        <CardForm
          date={date}
          editCard={editCard}
          onSuccess={() => {
            setEditCard(null);
            fetchCards();
          }}
          onCancel={() => setEditCard(null)}
        />
      )}
    </div>
  );
}
