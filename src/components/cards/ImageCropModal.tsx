"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";

const ASPECT_W = 4;
const ASPECT_H = 5;

interface Props {
  src: string;
  current?: number;
  total?: number;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

function initCropFrame() {
  if (typeof window === "undefined") return { x: 0, y: 0, w: 320, h: 400 };
  const cw = Math.min(window.innerWidth * 0.85, 360);
  const ch = cw * (ASPECT_H / ASPECT_W);
  return { x: (window.innerWidth - cw) / 2, y: (window.innerHeight - ch) / 2, w: cw, h: ch };
}

function touchDist(t: TouchList) {
  return Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);
}
function touchMid(t: TouchList) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}

export function ImageCropModal({ src, current, total, onConfirm, onCancel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef(0);

  // Synchronously initialized — no race condition with onLoad
  const cropRef = useRef(initCropFrame());
  const posRef = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });
  const scaleRef = useRef(1);
  const minScaleRef = useRef(1);
  const naturalRef = useRef({ w: 0, h: 0 });

  const [, setTick] = useState(0);
  function requestRender() {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setTick((n) => n + 1));
  }

  function clamp(px: number, py: number, s: number) {
    const { x: fx, y: fy, w: fw, h: fh } = cropRef.current;
    const { w: nw, h: nh } = naturalRef.current;
    if (!nw) return { x: px, y: py };
    return {
      x: Math.min(fx + (nw * s) / 2, Math.max(fx + fw - (nw * s) / 2, px)),
      y: Math.min(fy + (nh * s) / 2, Math.max(fy + fh - (nh * s) / 2, py)),
    };
  }

  function handleLoad() {
    const img = imgRef.current;
    if (!img) return;
    const { naturalWidth: nw, naturalHeight: nh } = img;
    if (!nw || !nh) return;
    naturalRef.current = { w: nw, h: nh };
    const { w: cw, h: ch } = cropRef.current;
    const s = Math.max(cw / nw, ch / nh);
    minScaleRef.current = s;
    scaleRef.current = s;
    posRef.current = clamp(posRef.current.x, posRef.current.y, s);
    requestRender();
  }

  // Touch: 1-finger drag, 2-finger pinch zoom
  const lastTouch = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      if (e.touches.length === 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
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
        posRef.current = clamp(posRef.current.x + dx, posRef.current.y + dy, scaleRef.current);
        requestRender();
      } else if (e.touches.length >= 2) {
        const d = touchDist(e.touches);
        const mid = touchMid(e.touches);
        const newScale = Math.max(minScaleRef.current, scaleRef.current * (d / lastPinchDist.current));
        const nx = mid.x + (posRef.current.x - mid.x) * (newScale / scaleRef.current);
        const ny = mid.y + (posRef.current.y - mid.y) * (newScale / scaleRef.current);
        scaleRef.current = newScale;
        posRef.current = clamp(nx, ny, newScale);
        lastPinchDist.current = d;
        requestRender();
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []); // refs only — stable

  // Mouse drag
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (e.pointerType === "touch" || !isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    posRef.current = clamp(posRef.current.x + dx, posRef.current.y + dy, scaleRef.current);
    requestRender();
  }
  function onPointerUp(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
    isDragging.current = false;
  }

  // Mouse wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const ratio = e.deltaY < 0 ? 1.08 : 0.93;
      const newScale = Math.max(minScaleRef.current, scaleRef.current * ratio);
      const nx = e.clientX + (posRef.current.x - e.clientX) * (newScale / scaleRef.current);
      const ny = e.clientY + (posRef.current.y - e.clientY) * (newScale / scaleRef.current);
      scaleRef.current = newScale;
      posRef.current = clamp(nx, ny, newScale);
      requestRender();
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;
    const s = scaleRef.current;
    const { x: px, y: py } = posRef.current;
    const { w: nw, h: nh } = naturalRef.current;
    const { x: fx, y: fy, w: fw, h: fh } = cropRef.current;
    const imageLeft = px - (nw * s) / 2;
    const imageTop = py - (nh * s) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, (fx - imageLeft) / s, (fy - imageTop) / s, fw / s, fh / s, 0, 0, 1080, 1350);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], "image.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  }

  // Render from refs
  const s = scaleRef.current;
  const { x: px, y: py } = posRef.current;
  const { w: nw, h: nh } = naturalRef.current;
  const { x: fx, y: fy, w: fw, h: fh } = cropRef.current;
  const imageLeft = nw > 0 ? px - (nw * s) / 2 : -9999;
  const imageTop = nh > 0 ? py - (nh * s) / 2 : -9999;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[60] overflow-hidden bg-black cursor-grab active:cursor-grabbing select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt=""
        draggable={false}
        onLoad={handleLoad}
        style={{
          position: "absolute",
          left: imageLeft,
          top: imageTop,
          width: nw > 0 ? nw * s : 0,
          height: nh > 0 ? nh * s : 0,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />

      {/* Dim with transparent crop hole via box-shadow */}
      <div
        style={{
          position: "absolute",
          left: fx,
          top: fy,
          width: fw,
          height: fh,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-5"
        style={{ pointerEvents: "none" }}
      >
        <button
          className="text-white/80 hover:text-white w-10 h-10 flex items-center justify-center"
          style={{ pointerEvents: "auto" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onCancel}
        >
          <X size={22} />
        </button>
        <span className="text-white text-sm font-medium">
          {total && total > 1 ? `사진 조절 ${current} / ${total}` : "사진 조절"}
        </span>
        <button
          className="text-amber-400 hover:text-amber-300 font-semibold w-10 h-10 flex items-center justify-center"
          style={{ pointerEvents: "auto" }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleConfirm}
        >
          <Check size={22} />
        </button>
      </div>
    </div>
  );
}
