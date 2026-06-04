"use client";

import { Trash2 } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  onDelete?: (id: string) => void;
}

export function CardItem({ card, onDelete }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isCork = theme === "cork";

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

        {onDelete && (
          <button
            onClick={() => onDelete(card.id)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600"
          >
            <Trash2 size={14} />
          </button>
        )}
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
      </div>

      {onDelete && (
        <button
          onClick={() => onDelete(card.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full p-1.5 shadow text-red-400 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
