"use client";

import { format } from "date-fns";
import { cloudinaryResized } from "@/hooks/useImageSlots";
import type { Card } from "@/types";

const HOUR_HEIGHT = 64; // px per hour

function toDecimalHour(dateStr: string) {
  const d = new Date(dateStr);
  return d.getHours() + d.getMinutes() / 60;
}

interface DayTimelineProps {
  cards: Card[];
  isDark: boolean;
  onEdit?: (card: Card) => void;
}

export function DayTimeline({ cards, isDark, onEdit }: DayTimelineProps) {
  if (cards.length === 0) return null;

  const startHours = cards.map((c) => toDecimalHour(c.created_at));
  const endHours = cards.filter((c) => c.end_at).map((c) => toDecimalHour(c.end_at!));

  const minHour = Math.max(0, Math.floor(Math.min(...startHours)) - 1);
  const maxHour = Math.min(24, Math.ceil(Math.max(...startHours, ...endHours, minHour + 1)) + 1);
  const visibleHours = maxHour - minHour;
  const containerHeight = visibleHours * HOUR_HEIGHT;

  return (
    <div className="relative mx-4 mt-4 mb-24" style={{ height: containerHeight }}>
      {/* 시간 라인 */}
      {Array.from({ length: visibleHours + 1 }).map((_, i) => {
        const h = minHour + i;
        return (
          <div
            key={h}
            className="absolute left-0 right-0 flex items-center gap-2 pointer-events-none"
            style={{ top: i * HOUR_HEIGHT }}
          >
            <span className={`text-xs w-12 text-right shrink-0 tabular-nums ${isDark ? "text-gray-700" : "text-gray-300"}`}>
              {String(h).padStart(2, "0")}:00
            </span>
            <div className={`flex-1 border-t ${isDark ? "border-gray-800" : "border-gray-100"}`} />
          </div>
        );
      })}

      {/* 카드 */}
      {cards.map((card) => {
        const top = (toDecimalHour(card.created_at) - minHour) * HOUR_HEIGHT;
        const startTime = format(new Date(card.created_at), "HH:mm");
        const endTime = card.end_at ? format(new Date(card.end_at), "HH:mm") : null;
        const images =
          card.images?.length > 0
            ? card.images
            : card.image_url
            ? [{ url: card.image_url, public_id: card.image_public_id ?? "" }]
            : [];

        return (
          <div
            key={card.id}
            className="absolute"
            style={{ top: top + 4, left: 60, right: 0 }}
          >
            <button
              onClick={() => onEdit?.(card)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                isDark ? "hover:bg-gray-800/60" : "hover:bg-gray-50"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${isDark ? "bg-gray-500" : "bg-gray-400"}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs tabular-nums ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {startTime}{endTime ? ` ~ ${endTime}` : ""}
                </div>
                {card.emojis?.[0] && images.length === 0 && (
                  <span className="text-base leading-tight">{card.emojis[0]}</span>
                )}
                {card.content && (
                  <p className={`text-sm truncate leading-snug ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    {card.content}
                  </p>
                )}
              </div>
              {images[0] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={cloudinaryResized(images[0].url, 200)}
                  alt=""
                  className="w-9 h-12 object-cover rounded-lg shrink-0"
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
