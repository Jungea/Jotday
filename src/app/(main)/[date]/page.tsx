"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
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
    if (res.ok) setCards((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSetRepresentative(id: string) {
    const formData = new FormData();
    formData.append("id", id);
    formData.append("set_representative", "true");
    const res = await fetch("/api/cards", { method: "PATCH", body: formData });
    if (res.ok) {
      setCards((prev) => prev.map((c) => ({ ...c, is_representative: c.id === id })));
    }
  }

  function handleEdit(card: Card) {
    setEditCard(card);
  }

  const parsedDate = parseISO(date);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!isValid(parsedDate)) router.replace("/");
  }, [parsedDate, router]);

  if (!isValid(parsedDate)) return null;

  const dayLabel  = format(parsedDate, "(E)", { locale: ko });
  const dateLabel = format(parsedDate, "M월 d일", { locale: ko });

  return (
    <div className={`h-dvh flex flex-col overflow-hidden ${isDark ? "theme-dark" : "theme-light"}`}>
      {/* Header */}
      <header className={`shrink-0 flex items-center gap-3 px-4 py-3 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>

        <span className={`text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          {dateLabel}
          <span className={`ml-1.5 text-sm font-normal ${isDark ? "text-gray-500" : "text-gray-400"}`}>{dayLabel}</span>
          {!loading && cards.length > 0 && (
            <span className={`ml-2 inline-flex items-center justify-center text-[11px] font-medium px-1.5 py-0.5 rounded-full
              ${isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
              {cards.length}
            </span>
          )}
        </span>
      </header>

      {/* Cards */}
      <main className="flex-1 overflow-y-auto pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className={`text-sm ${isDark ? "text-gray-600" : "text-gray-400"}`}>아직 기록이 없어요</p>
            <p className={`text-xs ${isDark ? "text-gray-700" : "text-gray-300"}`}>아래 + 버튼을 눌러 추가해보세요</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4 px-4">
            {cards.map((card) => (
              <div key={card.id} className="w-full max-w-sm">
                <CardItem card={card} isDark={isDark} onDelete={handleDelete} onEdit={handleEdit} onSetRepresentative={handleSetRepresentative} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className={`fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors
          ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
      >
        <Plus size={22} />
      </button>

      {showForm && (
        <CardForm
          date={date}
          onSuccess={async () => {
            setShowForm(false);
            await fetchCards();
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
