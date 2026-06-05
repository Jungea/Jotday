"use client";

import { useRef, useState, useEffect } from "react";
import { Trash2, Pencil, Star } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  isDark?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
  onSetRepresentative?: (id: string) => void;
}

function useSwipe(count: number) {
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    isDragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (!isDragging.current || startX.current === null) return;
    isDragging.current = false;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) > 40) {
      setIndex((i) => dx < 0 ? Math.min(i + 1, count - 1) : Math.max(i - 1, 0));
    }
    startX.current = null;
  }
  function onPointerLeave() {
    isDragging.current = false;
    startX.current = null;
  }

  return { index, setIndex, onPointerDown, onPointerUp, onPointerLeave };
}

function ImageSwiper({ images }: { images: { url: string }[] }) {
  const { index, setIndex, onPointerDown, onPointerUp, onPointerLeave } = useSwipe(images.length);

  if (images.length === 0) return null;
  if (images.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={images[0].url} alt="" className="w-full h-auto" />;
  }

  return (
    <div
      className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      <div
        className="flex transition-transform duration-200"
        style={{
          width: `${images.length * 100}%`,
          transform: `translateX(${-(index * 100) / images.length}%)`,
        }}
      >
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={img.url} alt="" draggable={false} className="h-auto pointer-events-none" style={{ width: `${100 / images.length}%` }} />
        ))}
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ExpandableContent({ text, className }: { text: string; className: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={`${className} whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>
        {text}
      </p>
      {(clamped || expanded) && (
        <button onClick={() => setExpanded((v) => !v)} className="text-xs text-gray-400 mt-1">
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

export function CardItem({ card, isDark: isDarkProp, onDelete, onEdit, onSetRepresentative }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === "dark";
  const timeLabel = format(new Date(card.created_at), "HH:mm");

  const images = card.images?.length > 0
    ? card.images
    : card.image_url
      ? [{ url: card.image_url, public_id: card.image_public_id ?? "" }]
      : [];
  const hasImage = images.length > 0;

  const repGlow = isDark
    ? "ring-2 ring-white shadow-[0_0_0_2px_#fff,0_0_40px_10px_rgba(255,255,255,0.15)]"
    : "ring-2 ring-amber-400 shadow-[0_0_0_2px_#fbbf24,0_0_40px_12px_rgba(251,191,36,0.4)]";

  const btnBg = isDark ? "bg-gray-800" : "bg-white";
  const starColor = isDark ? "text-white" : "text-gray-900";
  const starDimColor = isDark ? "text-gray-600 hover:text-white" : "text-gray-300 hover:text-gray-900";

  return (
    <div className={`relative rounded-xl overflow-hidden group ${
      isDark
        ? `bg-[#1c1c1c] border border-gray-800 ${card.is_representative ? repGlow : "shadow-none"}`
        : `bg-white ${card.is_representative ? repGlow : "shadow-sm border border-gray-200"}`
    }`}>
      {images.length > 0 && <ImageSwiper images={images} />}
      <div className="p-4">
        {card.content && (
          <ExpandableContent
            text={card.content}
            className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}
          />
        )}
        <div className="flex items-center justify-between mt-2">
          <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>{timeLabel}</p>
          <div className="flex gap-1 sm:hidden">
            {onSetRepresentative && hasImage && (
              <button
                onClick={() => onSetRepresentative(card.id)}
                className={`${btnBg} rounded-full p-1.5 shadow ${card.is_representative ? starColor : starDimColor}`}
              >
                <Star size={13} fill={card.is_representative ? "currentColor" : "none"} />
              </button>
            )}
            {onEdit && (
              <button onClick={() => onEdit(card)} className={`${btnBg} rounded-full p-1.5 shadow ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={() => { if (window.confirm("삭제할까요?")) onDelete(card.id); }} className={`${btnBg} rounded-full p-1.5 shadow text-red-400`}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
        {onSetRepresentative && hasImage && (
          <button
            onClick={() => onSetRepresentative(card.id)}
            className={`${btnBg} rounded-full p-1.5 shadow ${card.is_representative ? starColor : starDimColor}`}
          >
            <Star size={14} fill={card.is_representative ? "currentColor" : "none"} />
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(card)} className={`${btnBg} rounded-full p-1.5 shadow ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}>
            <Pencil size={14} />
          </button>
        )}
        {onDelete && (
          <button onClick={() => { if (window.confirm("삭제할까요?")) onDelete(card.id); }} className={`${btnBg} rounded-full p-1.5 shadow text-red-400 hover:text-red-600`}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
