"use client";

import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
}

export function CardItem({ card, onDelete, onEdit }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isCork = theme === "cork";
  const timeLabel = format(new Date(card.created_at), "HH:mm");

  if (isCork) {
    return (
      <div
        className="relative bg-[#fdf6e3] rounded-sm shadow-[2px_4px_8px_rgba(0,0,0,0.25)] p-4 group"
        style={{
          transform: `rotate(${Math.random() > 0.5 ? 1 : -1}deg)`,
        }}
      >
        {/* Pin */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow" />

        {card.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.image_url}
            alt={card.title ?? ""}
            className="w-full h-40 object-cover rounded-sm mb-3"
          />
        )}
        {card.title && (
          <h3 className="text-sm font-bold text-amber-900 mb-1">{card.title}</h3>
        )}
        {card.content && (
          <p className="text-xs text-amber-800 leading-relaxed whitespace-pre-wrap">{card.content}</p>
        )}

        <p className="text-[10px] text-amber-600/60 mt-2">{timeLabel}</p>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={() => onEdit(card)} className="text-amber-600 hover:text-amber-800">
              <Pencil size={14} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(card.id)} className="text-red-400 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Card theme
  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
      {card.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.image_url}
          alt={card.title ?? ""}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-4">
        {card.title && (
          <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
        )}
        {card.content && (
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{card.content}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{timeLabel}</p>
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {onEdit && (
          <button
            onClick={() => onEdit(card)}
            className="bg-white rounded-full p-1.5 shadow text-amber-500 hover:text-amber-700"
          >
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(card.id)}
            className="bg-white rounded-full p-1.5 shadow text-red-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
