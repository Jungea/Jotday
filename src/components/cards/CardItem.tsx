"use client";

import { useRef, useState, useEffect } from "react";
import { Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
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
      {/* Dot indicators */}
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

function CorkImageSwiper({ images }: { images: { url: string }[] }) {
  const { index, setIndex, onPointerDown, onPointerUp, onPointerLeave } = useSwipe(images.length);

  if (images.length === 0) return null;
  if (images.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={images[0].url} alt="" className="w-full h-auto rounded-sm mb-3" />;
  }

  return (
    <div
      className="relative overflow-hidden rounded-sm mb-3 cursor-grab active:cursor-grabbing select-none"
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
          <img key={i} src={img.url} alt="" draggable={false} className="h-auto rounded-sm pointer-events-none" style={{ width: `${100 / images.length}%` }} />
        ))}
      </div>
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, i) => (
          <button
            key={i}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-amber-800" : "bg-amber-800/40"}`}
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
      <p
        ref={ref}
        className={`${className} whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-amber-500 mt-1"
        >
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

export function CardItem({ card, onDelete, onEdit }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isCork = theme === "cork";
  const timeLabel = format(new Date(card.created_at), "HH:mm");

  const images = card.images?.length > 0
    ? card.images
    : card.image_url
      ? [{ url: card.image_url, public_id: card.image_public_id ?? "" }]
      : [];

  if (isCork) {
    return (
      <div
        className="relative bg-[#fdf6e3] rounded-sm shadow-[2px_4px_8px_rgba(0,0,0,0.25)] p-4 group"
        style={{
          transform: `rotate(${Math.random() > 0.5 ? 1 : -1}deg)`,
        }}
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow" />

        {images.length > 0 && <CorkImageSwiper images={images} />}
        {card.title && (
          <h3 className="text-sm font-bold text-amber-900 mb-1">{card.title}</h3>
        )}
        {card.content && (
          <ExpandableContent text={card.content} className="text-xs text-amber-800 leading-relaxed" />
        )}

        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-amber-600/60">{timeLabel}</p>
          <div className="flex gap-2 sm:hidden">
            {onEdit && (
              <button onClick={() => onEdit(card)} className="text-amber-600">
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(card.id)} className="text-red-400">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
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

  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
      {images.length > 0 && <ImageSwiper images={images} />}
      <div className="p-4">
        {card.title && (
          <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
        )}
        {card.content && (
          <ExpandableContent text={card.content} className="text-sm text-gray-600 leading-relaxed" />
        )}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">{timeLabel}</p>
          <div className="flex gap-1 sm:hidden">
            {onEdit && (
              <button onClick={() => onEdit(card)} className="bg-white rounded-full p-1.5 shadow text-amber-500">
                <Pencil size={13} />
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(card.id)} className="bg-white rounded-full p-1.5 shadow text-red-400">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
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
