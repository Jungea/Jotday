"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Star, Download, Link, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import { useShareSettingsStore } from "@/store/shareSettings";
import { useCardActionsStore } from "@/store/cardActions";
import { ShareLinkModal } from "@/components/cards/ShareLinkModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Card } from "@/types";

interface CardItemProps {
  card: Card;
  isDark?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
  onSetRepresentative?: (id: string) => void;
  shareView?: boolean;
  disableLightbox?: boolean;
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function buildCardBlob(card: Card, isDark: boolean): Promise<Blob | null> {
  const images = card.images?.length > 0
    ? card.images
    : card.image_url ? [{ url: card.image_url }] : [];

  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = isDark ? "#111111" : "#f5f5f5";
  ctx.fillRect(0, 0, W, H);

  // Image
  if (images.length > 0) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = images[0].url;
      });
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const canvasRatio = W / H;
      const imgRatio = iw / ih;
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (imgRatio > canvasRatio) { sw = ih * canvasRatio; sx = (iw - sw) / 2; }
      else { sh = iw / canvasRatio; sy = (ih - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    } catch { /* 이미지 로드 실패 시 배경만 */ }
  }

  // 텍스트가 있으면 하단 그라데이션 오버레이
  if (card.content && images.length > 0) {
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const onImage = images.length > 0;
  const textColor = onImage ? "#ffffff" : (isDark ? "#e5e5e5" : "#111111");
  const subColor  = onImage ? "rgba(255,255,255,0.55)" : (isDark ? "#555555" : "#aaaaaa");

  // 날짜
  ctx.font = "300 36px sans-serif";
  ctx.fillStyle = subColor;
  ctx.textBaseline = "top";
  ctx.fillText(format(new Date(card.created_at), "yyyy.MM.dd"), 64, 64);

  // 본문
  if (card.content) {
    ctx.font = "400 46px sans-serif";
    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";
    const lines = wrapText(ctx, card.content, W - 128);
    const lineH = 70;
    const maxLines = 10;
    const visible = lines.slice(0, maxLines);
    let startY = onImage ? H - 80 - visible.length * lineH : 180;
    for (const line of visible) {
      ctx.fillText(line, 64, startY);
      startY += lineH;
    }
  }

  // 브랜딩
  ctx.font = "300 28px sans-serif";
  ctx.fillStyle = subColor;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "right";
  ctx.fillText("Jotday", W - 64, H - 56);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function cardFilename(card: Card, index?: number) {
  const time = format(new Date(), "HHmmss");
  const base = `jotday-${card.date}-${time}`;
  return index !== undefined ? `${base}-${index + 1}.png` : `${base}.png`;
}

async function downloadCard(card: Card, isDark: boolean) {
  const blob = await buildCardBlob(card, isDark);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = cardFilename(card);
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadAllCards(card: Card, isDark: boolean) {
  const images = card.images?.length > 0
    ? card.images
    : card.image_url ? [{ url: card.image_url, public_id: "" }] : [];
  for (let i = 0; i < images.length; i++) {
    const single = { ...card, images: [images[i]], image_url: images[i].url };
    const blob = await buildCardBlob(single, isDark);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cardFilename(card, i);
    a.click();
    URL.revokeObjectURL(url);
    if (i < images.length - 1) await new Promise((r) => setTimeout(r, 300));
  }
}


function ActionButtons({ size, btnBg, isDark, p, order, showMore, setShowMore, onDownload, onLink, sharing, onStar, isRep, starColor, starDimColor, onEdit, onDelete, menuDir }: {
  size: number; btnBg: string; isDark: boolean; p: (id: string) => boolean; order: string[];
  showMore: boolean; setShowMore: (v: boolean | ((prev: boolean) => boolean)) => void;
  onDownload: () => void; onLink?: () => void; sharing: boolean;
  onStar?: () => void; isRep: boolean; starColor: string; starDimColor: string;
  onEdit?: () => void; onDelete?: () => void;
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

  const actionMap: Record<string, React.ReactElement | null> = {
    download: !p("download") ? <button key="dl" onClick={() => { setShowMore(false); onDownload(); }} disabled={sharing} className={itemClass()}><Download size={13} /> 다운로드</button> : null,
    link:     !p("link") && onLink ? <button key="lk" onClick={() => { setShowMore(false); onLink(); }} className={itemClass()}><Link size={13} /> 링크 공유</button> : null,
    star:     !p("star") && onStar ? <button key="st" onClick={() => { setShowMore(false); onStar(); }} className={itemClass(isRep)}><Star size={13} fill={isRep ? "currentColor" : "none"} /> 대표 설정</button> : null,
    edit:     !p("edit") && onEdit   ? <button key="ed" onClick={() => { setShowMore(false); onEdit(); }} className={itemClass()}><Pencil size={13} /> 수정</button> : null,
    delete:   !p("delete") && onDelete ? <button key="de" onClick={() => { setShowMore(false); onDelete(); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}><Trash2 size={13} /> 삭제</button> : null,
  };
  const overflowEls = order.map((id) => actionMap[id]).filter(Boolean) as React.ReactElement[];

  const pinnedMap: Record<string, React.ReactElement | null> = {
    download: p("download") ? <button key="dl" onClick={onDownload} disabled={sharing} className={btnClass}><Download size={size} /></button> : null,
    link:     p("link") && onLink ? <button key="lk" onClick={onLink} className={btnClass}><Link size={size} /></button> : null,
    star:     p("star") && onStar ? <button key="st" onClick={onStar} className={`${btnBg} rounded-full p-1.5 shadow ${isRep ? starColor : starDimColor}`}><Star size={size} fill={isRep ? "currentColor" : "none"} /></button> : null,
    edit:     p("edit") && onEdit   ? <button key="ed" onClick={onEdit} className={btnClass}><Pencil size={size} /></button> : null,
    delete:   p("delete") && onDelete ? <button key="de" onClick={onDelete} className={`${btnBg} rounded-full p-1.5 shadow text-red-400 hover:text-red-600`}><Trash2 size={size} /></button> : null,
  };

  return (
    <>
      {order.map((id) => pinnedMap[id])}
      {overflowEls.length > 0 && (
        <div className="relative" ref={containerRef}>
          <button onClick={handleToggleMore} className={`${btnBg} rounded-full p-1.5 shadow ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            <MoreHorizontal size={size} />
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

export function CardItem({ card, isDark: isDarkProp, onDelete, onEdit, onSetRepresentative, shareView, disableLightbox }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === "dark";
  const { expiryDays } = useShareSettingsStore();
  const { order, pinned } = useCardActionsStore();
  const p = (id: string) => pinned.includes(id as never);
  const timeLabel = format(new Date(card.created_at), "HH:mm");
  const [sharing, setSharing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [shareLinkModal, setShareLinkModal] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleDownload() {
    setSharing(true);
    const hasMultiple = (card.images?.length ?? 0) > 1;
    if (hasMultiple) await downloadAllCards(card, isDark);
    else await downloadCard(card, isDark);
    setSharing(false);
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
        setShareLinkModal({ url: `${window.location.origin}/share/${data.token}`, expiresAt: data.expires_at });
      }
    } finally {
      setSharing(false);
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
  const handleStar = onSetRepresentative && hasImages ? () => onSetRepresentative(card.id) : undefined;
  const effectiveOrder = (shareView ? ["download"] : order).filter((id) => id !== "download" || hasImages);
  const effectiveP = shareView ? () => true : p;

  return (
    <>
      <div className={`rounded-xl ${repGlow}`}>
      <div className={`relative rounded-xl group ${
        isDark
          ? "bg-[#1c1c1c] border border-gray-800 shadow-none"
          : "bg-white shadow-sm border border-gray-200"
      }`}>
        {images.length > 0 && (
          <div className={`overflow-hidden ${card.content ? "rounded-t-xl" : "rounded-xl"}`}>
            <ImageSwiper images={images} disableLightbox={disableLightbox} />
          </div>
        )}
        <div className="p-4">
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
                onDownload={handleDownload} sharing={sharing}
                onLink={shareView ? undefined : handleShareLink}
                onStar={shareView ? undefined : handleStar}
                isRep={isRep} starColor={starColor} starDimColor={starDimColor}
                onEdit={onEdit ? () => onEdit(card) : undefined}
                onDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
                menuDir="up"
              />
            </div>
          </div>
        </div>

        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex gap-1">
          <ActionButtons size={14} btnBg={btnBg} isDark={isDark} p={effectiveP} order={effectiveOrder}
            showMore={showMore} setShowMore={setShowMore}
            onDownload={handleDownload} sharing={sharing}
            onLink={shareView ? undefined : handleShareLink}
            onStar={shareView ? undefined : handleStar}
            isRep={isRep} starColor={starColor} starDimColor={starDimColor}
            onEdit={onEdit ? () => onEdit(card) : undefined}
            onDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
            menuDir="down"
          />
        </div>
      </div>
      </div>
      {shareLinkModal && (
        <ShareLinkModal
          url={shareLinkModal.url}
          expiresAt={shareLinkModal.expiresAt}
          onClose={() => setShareLinkModal(null)}
          isDark={isDark}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          message="카드를 삭제할까요?"
          onConfirm={() => { setShowDeleteConfirm(false); onDelete!(card.id); }}
          onCancel={() => setShowDeleteConfirm(false)}
          isDark={isDark}
        />
      )}
    </>
  );
}
