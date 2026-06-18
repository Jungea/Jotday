"use client";

import { useState, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import imageCompression from "browser-image-compression";
import type { Card } from "@/types";

export type ImageSlot =
  | { kind: "existing"; url: string; publicId: string }
  | { kind: "uploaded"; url: string; publicId: string }
  | { kind: "pending"; tempId: string };

export function cloudinaryResized(url: string, width: number): string {
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/w_${width},c_limit,q_auto,f_auto/`);
}

function initSlots(editCard?: Card): ImageSlot[] {
  if (!editCard) return [];
  if (editCard.images?.length > 0) {
    return editCard.images.map((img) => ({ kind: "existing", url: img.url, publicId: img.public_id }));
  }
  if (editCard.image_url) {
    return [{ kind: "existing", url: editCard.image_url, publicId: editCard.image_public_id ?? "" }];
  }
  return [];
}

async function uploadToCloudinary(file: File): Promise<{ url: string; publicId: string }> {
  const signRes = await fetch("/api/upload-sign");
  if (!signRes.ok) throw new Error("서명 실패");
  const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json();

  const fd = new FormData();
  fd.append("file", file);
  fd.append("signature", signature);
  fd.append("timestamp", String(timestamp));
  fd.append("folder", folder);
  fd.append("api_key", apiKey);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("업로드 실패");
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}

async function compressForCrop(file: File): Promise<string> {
  if (typeof createImageBitmap !== "undefined" && typeof OffscreenCanvas !== "undefined") {
    try {
      const MAX = 1200;
      const bitmap = await createImageBitmap(file, { resizeWidth: MAX, resizeQuality: "medium" });
      const { width, height } = bitmap;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.82 });
      return URL.createObjectURL(blob);
    } catch {
      // fallback
    }
  }
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1200,
    maxSizeMB: 1,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.82,
  });
  return URL.createObjectURL(compressed);
}

export function useImageSlots(editCard?: Card) {
  const [slots, setSlots] = useState<ImageSlot[]>(() => initSlots(editCard));
  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [croppingSlotIndex, setCroppingSlotIndex] = useState<number | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const uploading = uploadCount > 0;
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const touchDragIndex = useRef<number | null>(null);
  const touchDragOverIndex = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isTouchDragging = useRef(false);
  const slotContainerRef = useRef<HTMLDivElement | null>(null);

  const cropQueueRef = useRef(cropQueue);
  useEffect(() => { cropQueueRef.current = cropQueue; }, [cropQueue]);
  useEffect(() => {
    return () => { cropQueueRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  useEffect(() => {
    const el = slotContainerRef.current;
    if (!el) return;
    const onTouchMove = (e: globalThis.TouchEvent) => {
      if (touchDragIndex.current === null || !touchStartPos.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;
      if (!isTouchDragging.current && Math.sqrt(dx * dx + dy * dy) < 8) return;
      e.preventDefault();
      isTouchDragging.current = true;
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      let current: Element | null = target;
      while (current) {
        const idx = current.getAttribute("data-slot-index");
        if (idx !== null) {
          const over = parseInt(idx, 10);
          touchDragOverIndex.current = over;
          setDragOver(over);
          return;
        }
        current = current.parentElement;
      }
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploadCount((c) => c + 1);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      (files as (File | null)[])[i] = null;
      try {
        const url = await compressForCrop(file);
        setCropQueue((q) => [...q, url]);
      } catch {
        // 건너뜀
      }
    }
    setUploadCount((c) => c - 1);
  }

  function handleCameraCapture(file: File) {
    setShowCamera(false);
    const url = URL.createObjectURL(file);
    setCropQueue((q) => [...q, url]);
  }

  async function handleCropConfirm(file: File) {
    const idx = croppingSlotIndex;
    setCroppingSlotIndex(null);
    setCropQueue((q) => { URL.revokeObjectURL(q[0]); return q.slice(1); });

    const tempId = Math.random().toString(36).slice(2);
    if (idx !== null) {
      setSlots((prev) => prev.map((s, i) => i === idx ? { kind: "pending" as const, tempId } : s));
    } else {
      setSlots((prev) => [...prev, { kind: "pending" as const, tempId }]);
    }

    setUploadCount((c) => c + 1);
    try {
      const { url, publicId } = await uploadToCloudinary(file);
      const newSlot: ImageSlot = { kind: "uploaded", url, publicId };
      setSlots((prev) => prev.map((s) => s.kind === "pending" && s.tempId === tempId ? newSlot : s));
    } catch {
      setUploadError("업로드 실패");
      setSlots((prev) => prev.filter((s) => !(s.kind === "pending" && s.tempId === tempId)));
    }
    setUploadCount((c) => c - 1);
  }

  function handleCropCancel() {
    setCroppingSlotIndex(null);
    setCropQueue((q) => { URL.revokeObjectURL(q[0]); return q.slice(1); });
  }

  function handleCropSlot(index: number) {
    setCroppingSlotIndex(index);
    const slot = slots[index];
    if (slot.kind === "pending") return;
    setCropQueue((q) => [...q, cloudinaryResized(slot.url, 1600)]);
  }

  function handleRemoveSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragStart(e: DragEvent, index: number) {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    setDragOver(index);
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) { setDragOver(null); return; }
    setSlots((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(index, 0, item);
      return next;
    });
    dragIndex.current = null;
    setDragOver(null);
  }

  function handleDragEnd() {
    dragIndex.current = null;
    setDragOver(null);
  }

  function handleTouchStart(index: number, e: React.TouchEvent) {
    const touch = e.touches[0];
    touchDragIndex.current = index;
    touchDragOverIndex.current = index;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isTouchDragging.current = false;
  }

  function handleTouchEnd() {
    if (isTouchDragging.current) {
      const from = touchDragIndex.current;
      const to = touchDragOverIndex.current;
      if (from !== null && to !== null && from !== to) {
        setSlots((prev) => {
          const next = [...prev];
          const [item] = next.splice(from, 1);
          next.splice(to, 0, item);
          return next;
        });
      }
    }
    touchDragIndex.current = null;
    touchDragOverIndex.current = null;
    touchStartPos.current = null;
    isTouchDragging.current = false;
    setDragOver(null);
  }

  return {
    slots,
    cropQueue,
    croppingSlotIndex,
    showCamera,
    setShowCamera,
    uploading,
    dragOver,
    uploadError,
    setUploadError,
    handleFileChange,
    handleCameraCapture,
    handleCropConfirm,
    handleCropCancel,
    handleCropSlot,
    handleRemoveSlot,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchEnd,
    slotContainerRef,
  };
}
