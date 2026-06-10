"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Star, Download, Link, MoreHorizontal, Copy, Loader2, Check, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import { useShareSettingsStore } from "@/store/shareSettings";
import { useCardActionsStore } from "@/store/cardActions";
import { useToastStore } from "@/store/toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  isDark?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
  onCopy?: (newCardId: string) => void;
  onMove?: (id: string) => void;
  onSetRepresentative?: (id: string) => void;
  shareView?: boolean;
  disableLightbox?: boolean;
  barGradient?: string;
}

function useSwipe(count: number, onTap?: () => void) {
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
    if (Math.abs(dx) > 60) {
      setIndex((i) => dx < 0 ? Math.min(i + 1, count - 1) : Math.max(i - 1, 0));
    } else {
      onTap?.();
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

  // Pinch zoom (touch events only)
  const lastPinchDist = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length >= 2) {
        lastPinchDist.current = touchDist(e.touches);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length >= 2) {
        e.preventDefault();
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

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Pointer events: swipe (scale=1) + drag (scale>1) + double-tap
  const ptrDown = useRef(false);
  const ptrStartX = useRef(0);
  const ptrStartY = useRef(0);
  const ptrLastX = useRef(0);
  const ptrLastY = useRef(0);
  const lastTapTime = useRef(0);
  const dragXRef = useRef(0);
  const withSlideTransition = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return;
    ptrDown.current = true;
    withSlideTransition.current = false;
    ptrStartX.current = e.clientX;
    ptrStartY.current = e.clientY;
    ptrLastX.current = e.clientX;
    ptrLastY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!ptrDown.current || !e.isPrimary) return;
    if (scaleRef.current > 1) {
      posRef.current = {
        x: posRef.current.x + e.clientX - ptrLastX.current,
        y: posRef.current.y + e.clientY - ptrLastY.current,
      };
    } else {
      dragXRef.current = e.clientX - ptrStartX.current;
    }
    ptrLastX.current = e.clientX;
    ptrLastY.current = e.clientY;
    requestRender();
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!ptrDown.current || !e.isPrimary) return;
    ptrDown.current = false;
    const dx = e.clientX - ptrStartX.current;
    const dy = e.clientY - ptrStartY.current;
    dragXRef.current = 0;
    withSlideTransition.current = true;

    if (scaleRef.current <= 1 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      // 스와이프
      setIndex((i) => {
        const next = dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0);
        if (next !== i) { scaleRef.current = 1; posRef.current = { x: 0, y: 0 }; }
        return next;
      });
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      // 더블탭 줌
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        if (scaleRef.current > 1) resetTransform();
        else { scaleRef.current = 2.5; requestRender(); }
      }
      lastTapTime.current = now;
    }
    requestRender();
  }

  const s = scaleRef.current;
  const { x, y } = posRef.current;
  const dragX = dragXRef.current;
  const slideTransition = withSlideTransition.current;

  return (
    <div className="fixed inset-0 z-[70] bg-black select-none" style={{ touchAction: "none" }}>
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        style={{ cursor: s > 1 ? "grab" : "default", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {images.map((img, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translateX(calc(${(i - index) * 100}% + ${dragX}px))`,
              transition: slideTransition && dragX === 0 ? "transform 0.3s ease" : "none",
            }}
          >
            <img
              src={img.url}
              alt=""
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "100dvh",
                objectFit: "contain",
                transform: i === index ? `translate(${x}px, ${y}px) scale(${s})` : "none",
                transition: i === index && s === 1 && dragX === 0 ? "transform 0.2s" : "none",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* 이미지 전환 인디케이터 */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1.5 pointer-events-none">
          <span className="bg-black/50 text-white text-[11px] tabular-nums leading-none px-2 py-0.5 rounded-full">
            {index + 1} / {images.length}
          </span>
          <div className="flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                className={`w-2 h-2 rounded-full transition-colors pointer-events-auto ${i === index ? "bg-white" : "bg-white/40"}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
              />
            ))}
          </div>
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

function ImageSwiper({ images, disableLightbox }: { images: { url: string }[]; disableLightbox?: boolean }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openLightbox = disableLightbox ? undefined : () => setLightboxIndex(index);
  const { index, setIndex, onPointerDown, onPointerUp, onPointerLeave } = useSwipe(images.length, openLightbox);

  if (images.length === 0) return null;
  if (images.length === 1) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[0].url}
          alt=""
          className="w-full h-auto cursor-pointer"
          onClick={disableLightbox ? undefined : () => setLightboxIndex(0)}
        />
        {lightboxIndex !== null && <Lightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
      </>
    );
  }

  return (
    <>
      <div
        className="relative overflow-hidden cursor-pointer select-none"
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
        <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center gap-1.5">
          <span className="bg-black/50 text-white text-[11px] tabular-nums leading-none px-2 py-0.5 rounded-full">
            {index + 1} / {images.length}
          </span>
          <div className="flex gap-1.5">
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
      </div>
      {lightboxIndex !== null && <Lightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>
  );
}

function cardFilename(card: Card, index?: number) {
  const time = format(new Date(), "HHmmss");
  const base = `jotday-${card.date}-${time}`;
  return index !== undefined ? `${base}-${index + 1}.jpg` : `${base}.jpg`;
}

async function downloadImageUrl(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

async function downloadCard(card: Card) {
  const images = card.images?.length > 0
    ? card.images
    : card.image_url ? [{ url: card.image_url }] : [];
  if (!images.length) return;
  await downloadImageUrl(images[0].url, cardFilename(card));
}

async function downloadAllCards(card: Card) {
  const images = card.images?.length > 0
    ? card.images
    : card.image_url ? [{ url: card.image_url }] : [];
  for (let i = 0; i < images.length; i++) {
    await downloadImageUrl(images[i].url, cardFilename(card, i));
    if (i < images.length - 1) await new Promise((r) => setTimeout(r, 300));
  }
}


function ActionButtons({ size, btnBg, isDark, p, order, showMore, setShowMore, onDownload, onLink, sharing, linked, onStar, isRep, starColor, starDimColor, starring, onEdit, onDelete, onCopy, copying, onMoveClick, moving, deleting, menuDir }: {
  size: number; btnBg: string; isDark: boolean; p: (id: string) => boolean; order: string[];
  showMore: boolean; setShowMore: (v: boolean | ((prev: boolean) => boolean)) => void;
  onDownload: () => void; onLink?: () => void; sharing: boolean; linked: boolean;
  onStar?: () => void; isRep: boolean; starColor: string; starDimColor: string; starring: boolean;
  onEdit?: () => void; onDelete?: () => void; onCopy?: () => void; copying: boolean;
  onMoveClick?: () => void; moving: boolean; deleting: boolean;
  menuDir: "up" | "down";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [actualDir, setActualDir] = useState<"up" | "down">(menuDir);

  function handleToggleMore() {
    if (!showMore && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setActualDir(window.innerHeight - rect.bottom < 200 ? "up" : "down");
    }
    setShowMore((v) => !v);
  }

  const menuClass = `absolute ${actualDir === "up" ? "bottom-8" : "top-8"} right-0 z-50 rounded-xl shadow-lg py-1 min-w-[120px] ${isDark ? "bg-[#2a2a2a] border border-gray-700" : "bg-white border border-gray-200"}`;
  const itemClass = (active?: boolean) => `w-full flex items-center gap-2.5 px-3 py-2 text-xs ${active ? (isDark ? "text-white" : "text-gray-900") : (isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50")}`;
  const btnClass = `${btnBg} rounded-full p-1.5 shadow ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`;

  const anyLoading = sharing || copying || starring || deleting || moving;
  const overflowLoading =
    (sharing && !p("link") && !!onLink) ||
    (copying && !p("copy") && !!onCopy) ||
    (starring && !p("star") && !!onStar) ||
    (deleting && !p("delete") && !!onDelete) ||
    (moving && !p("move") && !!onMoveClick);
  const actionMap: Record<string, React.ReactElement | null> = {
    download: !p("download") ? <button key="dl" onClick={() => { setShowMore(false); onDownload(); }} disabled={anyLoading} className={itemClass()}>{sharing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 다운로드</button> : null,
    link:     !p("link") && onLink ? <button key="lk" onClick={() => { setShowMore(false); onLink(); }} disabled={anyLoading} className={itemClass(linked)}>{sharing ? <Loader2 size={13} className="animate-spin" /> : linked ? <Check size={13} /> : <Link size={13} />} {linked ? "복사됨" : "링크 공유"}</button> : null,
    star:     !p("star") && onStar ? <button key="st" onClick={() => { setShowMore(false); onStar(); }} disabled={anyLoading} className={itemClass(isRep)}>{starring ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} fill={isRep ? "currentColor" : "none"} />} 대표 설정</button> : null,
    edit:     !p("edit") && onEdit ? <button key="ed" onClick={() => { setShowMore(false); onEdit(); }} disabled={anyLoading} className={itemClass()}><Pencil size={13} /> 수정</button> : null,
    delete:   !p("delete") && onDelete ? <button key="de" onClick={() => { setShowMore(false); onDelete(); }} disabled={anyLoading} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>{deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 삭제</button> : null,
    copy:     !p("copy") && onCopy ? <button key="cp" onClick={() => { setShowMore(false); onCopy(); }} disabled={anyLoading} className={itemClass()}>{copying ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} {copying ? "복사 중..." : "복사"}</button> : null,
    move:     !p("move") && onMoveClick ? <button key="mv" onClick={() => { setShowMore(false); onMoveClick(); }} disabled={anyLoading} className={itemClass()}>{moving ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={13} />} {moving ? "이동 중..." : "날짜 이동"}</button> : null,
  };
  const overflowEls = order.map((id) => actionMap[id]).filter(Boolean) as React.ReactElement[];

  const pinnedMap: Record<string, React.ReactElement | null> = {
    download: p("download") ? <button key="dl" onClick={onDownload} disabled={anyLoading} className={btnClass}>{sharing ? <Loader2 size={size} className="animate-spin" /> : <Download size={size} />}</button> : null,
    link:     p("link") && onLink ? <button key="lk" onClick={onLink} disabled={anyLoading} className={`${btnClass} ${linked ? (isDark ? "text-white" : "text-gray-900") : ""}`}>{sharing ? <Loader2 size={size} className="animate-spin" /> : linked ? <Check size={size} /> : <Link size={size} />}</button> : null,
    star:     p("star") && onStar ? <button key="st" onClick={onStar} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow ${isRep ? starColor : starDimColor}`}>{starring ? <Loader2 size={size} className="animate-spin" /> : <Star size={size} fill={isRep ? "currentColor" : "none"} />}</button> : null,
    edit:     p("edit") && onEdit ? <button key="ed" onClick={onEdit} disabled={anyLoading} className={btnClass}><Pencil size={size} /></button> : null,
    delete:   p("delete") && onDelete ? <button key="de" onClick={onDelete} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow text-red-400 hover:text-red-600`}>{deleting ? <Loader2 size={size} className="animate-spin" /> : <Trash2 size={size} />}</button> : null,
    copy:     p("copy") && onCopy ? <button key="cp" onClick={onCopy} disabled={anyLoading} className={btnClass}>{copying ? <Loader2 size={size} className="animate-spin" /> : <Copy size={size} />}</button> : null,
    move:     p("move") && onMoveClick ? <button key="mv" onClick={onMoveClick} disabled={anyLoading} className={btnClass}>{moving ? <Loader2 size={size} className="animate-spin" /> : <CalendarDays size={size} />}</button> : null,
  };

  return (
    <>
      {order.map((id) => pinnedMap[id])}
      {overflowEls.length > 0 && (
        <div className="relative" ref={containerRef}>
          <button onClick={handleToggleMore} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow ${linked ? (isDark ? "text-white" : "text-gray-900") : isDark ? "text-gray-400" : "text-gray-500"}`}>
            {overflowLoading ? <Loader2 size={size} className="animate-spin" /> : linked ? <Check size={size} /> : <MoreHorizontal size={size} />}
          </button>
          {showMore && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)} />
              <div className={menuClass}>{overflowEls}</div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function HighlightedText({ text, isDark }: { text: string; isDark: boolean }) {
  const router = useRouter();
  const parts = text.split(/(#[^\s#]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span
            key={i}
            className={`cursor-pointer hover:underline ${isDark ? "text-gray-400" : "text-gray-500"}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/search?tags=${part.slice(1).toLowerCase()}`); }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function ExpandableContent({ text, className, isDark }: { text: string; className: string; isDark: boolean }) {
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
        <HighlightedText text={text} isDark={isDark} />
      </p>
      {(clamped || expanded) && (
        <button onClick={() => setExpanded((v) => !v)} className="text-xs text-gray-400 mt-1">
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

export function CardItem({ card, isDark: isDarkProp, onDelete, onEdit, onCopy, onMove, onSetRepresentative, shareView, disableLightbox, barGradient }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === "dark";
  const { expiryDays } = useShareSettingsStore();
  const { order, pinned } = useCardActionsStore();
  const addToast = useToastStore((s) => s.addToast);
  const p = (id: string) => pinned.includes(id as never);
  const timeLabel = format(new Date(card.created_at), "HH:mm");
  const [sharing, setSharing] = useState(false);
  const [linked, setLinked] = useState(false);
  const [copying, setCopying] = useState(false);
  const [starring, setStarring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState(card.date);
  const [showMore, setShowMore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDownload() {
    setSharing(true);
    const hasMultiple = (card.images?.length ?? 0) > 1;
    if (hasMultiple) await downloadAllCards(card);
    else await downloadCard(card);
    setSharing(false);
  }

  async function handleCopy() {
    setCopying(true);
    try {
      const formData = new FormData();
      formData.append("copy_from", card.id);
      formData.append("date", card.date);
      const res = await fetch("/api/cards", { method: "POST", body: formData });
      if (res.ok) {
        const newCard = await res.json();
        onCopy?.(newCard.id);
        addToast("카드가 복사됐어요");
      }
    } finally {
      setCopying(false);
    }
  }

  async function handleShareLink() {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id, expires_in_days: expiryDays }),
      });
      const data = await res.json();
      if (data.token) {
        const url = `${window.location.origin}/share/${data.token}`;
        await navigator.clipboard.writeText(url);
        setLinked(true);
        setTimeout(() => setLinked(false), 2000);
        addToast("링크가 복사됐어요");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleStarClick() {
    setStarring(true);
    try {
      const formData = new FormData();
      formData.append("id", card.id);
      if (isRep) {
        formData.append("unset_representative", "true");
      } else {
        formData.append("set_representative", "true");
      }
      const res = await fetch("/api/cards", { method: "PATCH", body: formData });
      if (res.ok) {
        onSetRepresentative?.(card.id);
        addToast(isRep ? "대표 설정이 해제됐어요" : "대표 카드로 설정됐어요");
      }
    } finally {
      setStarring(false);
    }
  }

  async function handleMove() {
    setMoving(true);
    setShowMoveModal(false);
    try {
      const fd = new FormData();
      fd.append("id", card.id);
      fd.append("move_to_date", moveTargetDate);
      const res = await fetch("/api/cards", { method: "PATCH", body: fd });
      if (res.ok) {
        onMove?.(card.id);
        addToast("카드를 이동했어요");
      }
    } finally {
      setMoving(false);
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards?id=${card.id}`, { method: "DELETE" });
      if (res.ok) onDelete?.(card.id);
    } finally {
      setDeleting(false);
    }
  }

  const images = card.images?.length > 0
    ? card.images
    : card.image_url
      ? [{ url: card.image_url, public_id: card.image_public_id ?? "" }]
      : [];

  const isRep = !!card.is_representative;
  const btnBg = isDark ? "bg-gray-800" : "bg-white";
  const starColor = isDark ? "text-white" : "text-gray-900";
  const starDimColor = isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900";
  const repGlow = isRep
    ? isDark
      ? "ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
      : "ring-2 ring-gray-800/60 shadow-[0_0_20px_rgba(0,0,0,0.25)]"
    : "";

  const hasImages = images.length > 0;
  const handleStar = onSetRepresentative && hasImages ? handleStarClick : undefined;
  const effectiveOrder = (shareView ? ["download"] : order).filter((id) => id !== "download" || hasImages);
  const effectiveP = shareView ? () => true : p;

  return (
    <>
      <div id={`card-${card.id}`} className={`rounded-xl ${repGlow}`}>
      <div className={`relative rounded-xl overflow-hidden group ${
        isDark
          ? "bg-[#1c1c1c] border border-gray-800 shadow-none"
          : "bg-white shadow-sm border border-gray-200"
      }`}>
        {images.length > 0 && (
          <div className={`relative z-[1] overflow-hidden ${card.content ? "rounded-t-xl" : "rounded-xl"}`}>
            <ImageSwiper images={images} disableLightbox={disableLightbox} />
          </div>
        )}
        <div className="flex items-stretch">
          {barGradient && (
            <div
              className="w-[3px] flex-shrink-0"
              style={{ background: barGradient }}
            />
          )}
          <div className="flex-1 p-4">
            {card.content && (
              <ExpandableContent
                text={card.content}
                className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}
                isDark={isDark}
              />
            )}
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>{timeLabel}</p>
              <div className="flex gap-1 sm:hidden items-center">
                <ActionButtons size={13} btnBg={btnBg} isDark={isDark} p={effectiveP} order={effectiveOrder}
                  showMore={showMore} setShowMore={setShowMore}
                  onDownload={handleDownload} sharing={sharing} linked={linked}
                  onLink={shareView ? undefined : handleShareLink}
                  onStar={shareView ? undefined : handleStar}
                  isRep={isRep} starColor={starColor} starDimColor={starDimColor}
                  onEdit={onEdit ? () => onEdit(card) : undefined}
                  onDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
                  onCopy={onCopy ? handleCopy : undefined} copying={copying}
                  onMoveClick={onMove ? () => setShowMoveModal(true) : undefined} moving={moving}
                  starring={starring} deleting={deleting}
                  menuDir="up"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
          <ActionButtons size={14} btnBg={btnBg} isDark={isDark} p={effectiveP} order={effectiveOrder}
            showMore={showMore} setShowMore={setShowMore}
            onDownload={handleDownload} sharing={sharing} linked={linked}
            onLink={shareView ? undefined : handleShareLink}
            onStar={shareView ? undefined : handleStar}
            isRep={isRep} starColor={starColor} starDimColor={starDimColor}
            onEdit={onEdit ? () => onEdit(card) : undefined}
            onDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
            onCopy={onCopy ? handleCopy : undefined} copying={copying}
            onMoveClick={onMove ? () => setShowMoveModal(true) : undefined} moving={moving}
            starring={starring} deleting={deleting}
            menuDir="down"
          />
        </div>
      </div>
      </div>
      {showMoveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className={`rounded-2xl p-5 w-72 shadow-xl ${isDark ? "bg-[#1c1c1c]" : "bg-white"}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>날짜 이동</h3>
            <input
              type="date"
              value={moveTargetDate}
              onChange={(e) => setMoveTargetDate(e.target.value)}
              onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch (_) {} }}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowMoveModal(false); setMoveTargetDate(card.date); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                취소
              </button>
              <button
                onClick={handleMove}
                disabled={!moveTargetDate || moveTargetDate === card.date}
                className={`flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40 ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          message="카드를 삭제할까요?"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isDark={isDark}
        />
      )}
    </>
  );
}
