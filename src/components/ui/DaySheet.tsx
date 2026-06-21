"use client";

import { useState, useRef, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Link as LinkIcon, Plus, X } from "lucide-react";
import { CardItem } from "@/components/cards/CardItem";
import { cardBarGradient } from "@/lib/timeColor";
import { CardForm } from "@/components/cards/CardForm";
import { useShareSettingsStore } from "@/store/shareSettings";
import { useToastStore } from "@/store/toast";
import { useModalHistoryBack } from "@/hooks/useModalHistoryBack";
import type { Card } from "@/types";

interface DaySheetProps {
  date: string;
  isDark: boolean;
  onClose: () => void;
  onCardDeleted?: (id: string) => void;
  onDataChange?: () => void;
  scrollToId?: string;
  showAddButton?: boolean;
  showShareButton?: boolean;
  showBackdrop?: boolean;
  headerActions?: React.ReactNode;
  collapsedHeight?: string;
}

export function DaySheet({
  date,
  isDark,
  onClose,
  onCardDeleted,
  onDataChange,
  scrollToId,
  showAddButton = true,
  showShareButton = true,
  showBackdrop = true,
  headerActions,
  collapsedHeight = "75dvh",
}: DaySheetProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [showForm, setShowForm] = useState(false);
  const expiryDays = useShareSettingsStore((s) => s.expiryDays);
  const addToast = useToastStore((s) => s.addToast);
  useModalHistoryBack(onClose);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLoading(true);
    setCards([]);
    fetch(`/api/cards?date=${date}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Card[]) => { setCards(data); setLoading(false); });
  }, [date]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!scrollToId || cards.length === 0) return;
    const timer = setTimeout(() => {
      document.getElementById(`day-sheet-${scrollToId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToId, cards]);

  function onPointerDown(e: React.PointerEvent) {
    setIsDragging(true);
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging) return;
    const dy = e.clientY - startY.current;
    setDragY(expanded ? Math.max(0, dy) : Math.max(-100, dy));
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!isDragging) return;
    setIsDragging(false);
    const dy = e.clientY - startY.current;
    setDragY(0);
    if (expanded) {
      if (dy > 150) setExpanded(false);
    } else {
      if (dy < -80) setExpanded(true);
      else if (dy > 120) onClose();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/cards?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCards((prev) => prev.filter((c) => c.id !== id));
      onCardDeleted?.(id);
      onDataChange?.();
    }
  }

  function handleMove(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    onDataChange?.();
  }

  async function handleSetRepresentative(id: string) {
    const isCurrentlyRep = cards.find((c) => c.id === id)?.is_representative;
    const fd = new FormData();
    fd.append("id", id);
    fd.append(isCurrentlyRep ? "unset_representative" : "set_representative", "true");
    const res = await fetch("/api/cards", { method: "PATCH", body: fd });
    if (res.ok) {
      setCards((prev) => {
        if (isCurrentlyRep) return prev.map((c) => c.id === id ? { ...c, is_representative: false } : c);
        return prev.map((c) => ({ ...c, is_representative: c.id === id }));
      });
      onDataChange?.();
    }
  }

  async function handleShareDate() {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, expires_in_days: expiryDays }),
    });
    if (!res.ok) return;
    const { token } = await res.json();
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    addToast("링크가 복사됐어요");
  }

  function refresh() {
    fetch(`/api/cards?date=${date}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setCards);
  }

  const border = isDark ? "border-gray-800" : "border-gray-100";
  const sub = isDark ? "text-gray-400" : "text-gray-500";
  const iconBtn = `p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`;

  return (
    <>
      <div className={`fixed inset-0 z-sheet flex flex-col justify-end ${showBackdrop ? "" : "pointer-events-none"}`}>
        {showBackdrop && <div className="absolute inset-0 bg-black/50" onClick={onClose} />}
        <div
          className={`relative flex flex-col pointer-events-auto ${expanded ? "rounded-none" : "rounded-t-2xl"} ${isDark ? "bg-[#1a1a1a]" : "bg-white"}`}
          style={{
            height: expanded ? "100dvh" : collapsedHeight,
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? "none" : "transform 0.25s ease, height 0.25s ease, border-radius 0.25s ease",
          }}
        >
          <div
            className="flex justify-center py-3 shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <div className="w-10 h-1 rounded-full bg-gray-400/40" />
          </div>
          <div className={`flex items-center justify-between px-4 pb-3 shrink-0 border-b ${border}`}>
            <span className={`font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
              {format(parseISO(date), "yyyy년 M월 d일 (E)", { locale: ko })}
            </span>
            <div className="flex items-center gap-1">
              {headerActions}
              {showShareButton && (
                <button onClick={handleShareDate} className={iconBtn}>
                  <LinkIcon size={16} />
                </button>
              )}
              {showAddButton && (
                <button onClick={() => setShowForm(true)} className={iconBtn}>
                  <Plus size={16} />
                </button>
              )}
              <button onClick={onClose} className={iconBtn}>
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-4 py-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className={`w-7 h-7 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
              </div>
            ) : cards.length === 0 ? (
              <p className={`text-center text-sm py-12 ${sub}`}>카드가 없어요.</p>
            ) : (
              <div className="flex flex-col items-center gap-4 pb-6">
                {cards.map((card, i) => {
                  const toHour = (d: Date) => d.getHours() + d.getMinutes() / 60;
                  const from = toHour(new Date(card.created_at));
                  const next = cards[i + 1];
                  const to = next ? toHour(new Date(next.created_at)) : from + 1;
                  return (
                    <div key={card.id} id={`day-sheet-${card.id}`} className="w-full max-w-sm">
                      <CardItem
                        card={card}
                        isDark={isDark}
                        onDelete={handleDelete}
                        onEdit={setEditCard}
                        onMove={handleMove}
                        onSetRepresentative={handleSetRepresentative}
                        barGradient={cardBarGradient(from, to)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {showForm && (
        <CardForm
          date={date}
          onSuccess={() => { setShowForm(false); refresh(); onDataChange?.(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
      {editCard && (
        <CardForm
          date={editCard.date}
          editCard={editCard}
          onSuccess={() => { setEditCard(null); refresh(); onDataChange?.(); }}
          onCancel={() => setEditCard(null)}
        />
      )}
    </>
  );
}
