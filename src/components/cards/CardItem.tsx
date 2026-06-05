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

function touchDist(t: TouchList) {
  return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
}
function touchMid(t: TouchList) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

function Lightbox({ images, startIndex, onClose }: { images: { url: string }[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const scaleRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const [, setTick] = useState(0);

  function requestRender() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTick((n) => n + 1));
  }

  function resetTransform() {
    scaleRef.current = 1;
    posRef.current = { x: 0, y: 0 };
    requestRender();
  }

  function goTo(next: number) {
    resetTransform();
    setIndex(next);
  }

  // ESC key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Touch gestures
  const lastTouch = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const swipeStartX = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      if (e.touches.length === 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        swipeStartX.current = e.touches[0].clientX;
      } else if (e.touches.length >= 2) {
        lastPinchDist.current = touchDist(e.touches);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastTouch.current.x;
        const dy = e.touches[0].clientY - lastTouch.current.y;
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        if (scaleRef.current > 1) {
          posRef.current = { x: posRef.current.x + dx, y: posRef.current.y + dy };
          requestRender();
        }
      } else if (e.touches.length >= 2) {
        const d = touchDist(e.touches);
        const mid = touchMid(e.touches);
        const ratio = d / lastPinchDist.current;
        const newScale = Math.max(1, Math.min(8, scaleRef.current * ratio));
        const nx = posRef.current.x + (mid.x - window.innerWidth / 2) * (1 - ratio);
        const ny = posRef.current.y + (mid.y - window.innerHeight / 2) * (1 - ratio);
        scaleRef.current = newScale;
        posRef.current = { x: nx, y: ny };
        lastPinchDist.current = d;
        requestRender();
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (scaleRef.current <= 1 && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - swipeStartX.current;
        if (Math.abs(dx) > 50) {
          setIndex((i) => {
            const next = dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0);
            if (next !== i) { scaleRef.current = 1; posRef.current = { x: 0, y: 0 }; }
            return next;
          });
          requestRender();
        }
      }
      if (scaleRef.current < 1) resetTransform();
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [images.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const ratio = e.deltaY < 0 ? 1.1 : 0.91;
      const newScale = Math.max(1, Math.min(8, scaleRef.current * ratio));
      const cx = e.clientX - window.innerWidth / 2;
      const cy = e.clientY - window.innerHeight / 2;
      posRef.current = {
        x: posRef.current.x + cx * (1 - ratio),
        y: posRef.current.y + cy * (1 - ratio),
      };
      scaleRef.current = newScale;
      if (newScale === 1) posRef.current = { x: 0, y: 0 };
      requestRender();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Mouse drag
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  function onMouseDown(e: React.MouseEvent) {
    if (scaleRef.current <= 1) return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    posRef.current = {
      x: posRef.current.x + e.clientX - lastMouse.current.x,
      y: posRef.current.y + e.clientY - lastMouse.current.y,
    };
    lastMouse.current = { x: e.clientX, y: e.clientY };
    requestRender();
  }
  function onMouseUp() { isDragging.current = false; }

  // Double-tap/click to zoom
  const lastTapTime = useRef(0);
  function onTap(e: React.MouseEvent) {
    if (e.type === "click" && isDragging.current) return;
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (scaleRef.current > 1) {
        resetTransform();
      } else {
        scaleRef.current = 2.5;
        posRef.current = { x: 0, y: 0 };
        requestRender();
      }
    }
    lastTapTime.current = now;
  }

  const s = scaleRef.current;
  const { x, y } = posRef.current;

  return (
    <div className="fixed inset-0 z-[70] bg-black select-none" style={{ touchAction: "none" }}>
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        style={{ cursor: s > 1 ? "grab" : "zoom-in" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onTap}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[index].url}
          alt=""
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100dvh",
            objectFit: "contain",
            transform: `translate(${x}px, ${y}px) scale(${s})`,
            transformOrigin: "center center",
            transition: s === 1 ? "transform 0.2s" : "none",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      </div>

      {/* 이미지 전환 인디케이터 */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <button
              key={i}
              className={`w-2 h-2 rounded-full transition-colors pointer-events-auto ${i === index ? "bg-white" : "bg-white/40"}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
            />
          ))}
        </div>
      )}

      {/* 좌우 화살표 (다중 이미지, 줌 아닐 때) */}
      {images.length > 1 && s === 1 && index > 0 && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      )}
      {images.length > 1 && s === 1 && index < images.length - 1 && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2"
          onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      )}

      <button
        className="absolute top-5 right-5 text-white/70 hover:text-white z-10"
        onClick={onClose}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  );
}

function ImageSwiper({ images }: { images: { url: string }[] }) {
  const { index, setIndex, onPointerDown, onPointerUp, onPointerLeave } = useSwipe(images.length);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0].url} alt="" className="w-full h-auto cursor-zoom-in" onClick={() => setLightboxIndex(0)} />
        {lightboxIndex !== null && <Lightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
      </>
    );
  }

  return (
    <>
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
            <img
              key={i}
              src={img.url}
              alt=""
              draggable={false}
              className="h-auto pointer-events-none"
              style={{ width: `${100 / images.length}%` }}
            />
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
        <button
          className="absolute inset-0 w-full h-full"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setLightboxIndex(index)}
          aria-label="전체화면으로 보기"
        />
      </div>
      {lightboxIndex !== null && <Lightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>
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
