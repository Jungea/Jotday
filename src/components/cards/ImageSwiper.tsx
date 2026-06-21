"use client";

import { useRef, useState, useEffect } from "react";

function touchDist(t: TouchList) {
  return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
}
function touchMid(t: TouchList) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

export function useSwipe(count: number, onTap?: () => void) {
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

/* eslint-disable react-hooks/refs, react-hooks/purity */
export function Lightbox({ images, startIndex, onClose }: { images: { url: string }[]; startIndex: number; onClose: () => void }) {
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
  }, []);

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
      setIndex((i) => {
        const next = dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0);
        if (next !== i) { scaleRef.current = 1; posRef.current = { x: 0, y: 0 }; }
        return next;
      });
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
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
    <div className="fixed inset-0 z-modal bg-black select-none" style={{ touchAction: "none" }}>
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
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            style={{
              transform: `translateX(calc(${(i - index) * 100}% + ${dragX}px))`,
              transition: slideTransition && dragX === 0 ? "transform 0.3s ease" : "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
/* eslint-enable react-hooks/refs, react-hooks/purity */

export function ImageSwiper({ images, disableLightbox }: { images: { url: string }[]; disableLightbox?: boolean }) {
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
