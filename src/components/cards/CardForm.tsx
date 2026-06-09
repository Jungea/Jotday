"use client";

import { useState, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import imageCompression from "browser-image-compression";
import { format } from "date-fns";
import { X, Upload, Camera, Scissors } from "lucide-react";

function extractTags(text: string): string[] {
  const matches = text.match(/#([^\s#]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
import { Button } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/cards/ImageCropModal";
import { useThemeStore } from "@/store/theme";
import type { Card } from "@/types";

interface CardFormProps {
  date: string;
  editCard?: Card;
  onSuccess: () => void;
  onCancel: () => void;
}

type ImageSlot =
  | { kind: "existing"; url: string; publicId: string }
  | { kind: "uploaded"; url: string; publicId: string };

// Cloudinary URL에 리사이즈 파라미터 삽입 (썸네일·크롭 미리보기용)
function cloudinaryResized(url: string, width: number): string {
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

export function CardForm({ date, editCard, onSuccess, onCancel }: CardFormProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const cardType = "mixed";
  const [content, setContent] = useState(editCard?.content ?? "");
  const [time, setTime] = useState(editCard ? format(new Date(editCard.created_at), "HH:mm") : format(new Date(), "HH:mm"));
  const [manualTime, setManualTime] = useState(false);

  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [croppingSlotIndex, setCroppingSlotIndex] = useState<number | null>(null);
  const [slots, setSlots] = useState<ImageSlot[]>(() => initSlots(editCard));

  // unmount 시 cropQueue의 Blob URL 정리
  const cropQueueRef = useRef(cropQueue);
  useEffect(() => { cropQueueRef.current = cropQueue; }, [cropQueue]);
  useEffect(() => {
    return () => { cropQueueRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editCard;
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const busy = uploading || loading;

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

  // 갤러리 전용: 압축 후 크롭 모달에 추가
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

  // 갤러리 버튼: 압축 → 크롭 모달 (크롭 확인 후 Cloudinary 업로드)
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
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
    setUploading(false);
  }

  // 카메라 버튼: 클라이언트 이미지 처리 없이 Cloudinary 직접 업로드 (OOM 방지)
  async function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      try {
        const { url, publicId } = await uploadToCloudinary(file);
        setSlots((prev) => [...prev, { kind: "uploaded", url, publicId }]);
      } catch {
        setError("업로드 실패");
      }
    }
    setUploading(false);
  }

  // 크롭 확인: 모달을 먼저 닫고 Cloudinary 업로드
  async function handleCropConfirm(file: File) {
    const idx = croppingSlotIndex;
    setCroppingSlotIndex(null);
    setCropQueue((q) => { URL.revokeObjectURL(q[0]); return q.slice(1); });
    setUploading(true);
    try {
      const { url, publicId } = await uploadToCloudinary(file);
      const newSlot: ImageSlot = { kind: "uploaded", url, publicId };
      if (idx !== null) {
        setSlots((prev) => prev.map((s, i) => i === idx ? newSlot : s));
      } else {
        setSlots((prev) => [...prev, newSlot]);
      }
    } catch {
      setError("업로드 실패");
    }
    setUploading(false);
  }

  // 기존 슬롯 크롭 (Cloudinary URL → 1600px로 크롭 모달)
  function handleCropSlot(index: number) {
    setCroppingSlotIndex(index);
    setCropQueue((q) => [...q, cloudinaryResized(slots[index].url, 1600)]);
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

  function handleRemoveSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isEdit) {
      const formData = new FormData();
      formData.append("id", editCard.id);
      formData.append("type", cardType);
      if (content) formData.append("content", content);
      if (time) formData.append("time", new Date(`${date}T${time}:00`).toISOString());
      formData.append("tags", JSON.stringify(extractTags(content)));

      const originalIds = (editCard.images?.length > 0
        ? editCard.images.map((i) => i.public_id)
        : editCard.image_public_id ? [editCard.image_public_id] : []
      ).join(",");
      const currentIds = slots.map((s) => s.publicId).join(",");

      if (originalIds !== currentIds) {
        formData.append("images", JSON.stringify(
          slots.map((s) => ({ url: s.url, public_id: s.publicId }))
        ));
      }

      const res = await fetch("/api/cards", { method: "PATCH", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "수정 실패");
        setLoading(false);
        return;
      }
      onSuccess();
    } else {
      const formData = new FormData();
      formData.append("date", date);
      formData.append("type", cardType);
      if (content) formData.append("content", content);
      formData.append("time", new Date(`${date}T${manualTime ? time : format(new Date(), "HH:mm")}:00`).toISOString());
      formData.append("tags", JSON.stringify(extractTags(content)));
      formData.append("images", JSON.stringify(
        slots.map((s) => ({ url: s.url, public_id: s.publicId }))
      ));
      const res = await fetch("/api/cards", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장 실패");
        setLoading(false);
        return;
      }
      onSuccess();
    }
    setLoading(false);
  }

  const uploadedCount = slots.filter((s) => s.kind === "uploaded").length;

  return (
    <>
      {cropQueue[0] && (
        <ImageCropModal
          key={cropQueue[0]}
          src={cropQueue[0]}
          current={croppingSlotIndex !== null ? undefined : slots.length + 1}
          total={croppingSlotIndex !== null ? undefined : slots.length + cropQueue.length}
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setCroppingSlotIndex(null);
            setCropQueue((q) => { URL.revokeObjectURL(q[0]); return q.slice(1); });
          }}
        />
      )}
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
        <div className={`${isDark ? "bg-[#1c1c1c]" : "bg-white"} rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col`}>
          {/* 고정 헤더 */}
          <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>{isEdit ? "카드 수정" : `${date} 기록`}</h2>
            <button onClick={onCancel} className={isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}>
              <X size={20} />
            </button>
          </div>

          {/* 스크롤 영역 */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <form id="card-form" onSubmit={handleSubmit} className="space-y-4">
              {isEdit ? (
                <div className="flex items-center gap-2">
                  <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>기록 시간</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch (_) {} }}
                    className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>시간 직접 설정</span>
                    <span
                      onClick={() => setManualTime((v) => !v)}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${manualTime ? (isDark ? "bg-white" : "bg-gray-900") : (isDark ? "bg-gray-700" : "bg-gray-200")}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform duration-200 ${manualTime ? "translate-x-[20px]" : "translate-x-[2px]"} ${manualTime && isDark ? "bg-gray-900" : "bg-white"}`} />
                    </span>
                  </label>
                  {manualTime && (
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch (_) {} }}
                      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`}
                    />
                  )}
                </div>
              )}

              {/* 이미지 슬롯 목록 — 드래그로 순서 변경 */}
              {slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      className={`relative rounded-lg overflow-hidden w-24 h-[120px] cursor-grab active:cursor-grabbing transition-opacity ${
                        dragOver === i ? "ring-2 ring-amber-400 opacity-70" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cloudinaryResized(slot.url, 400)} alt="" className="w-full h-full object-cover pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCropSlot(i)}
                        className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <Scissors size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 이미지 추가 버튼 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 h-14 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${busy ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  <Upload size={16} />
                  <span className="text-sm">{uploading ? "처리 중..." : slots.length > 0 ? "이미지 추가" : "업로드"}</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cameraRef.current?.click()}
                  className={`h-14 px-5 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${busy ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  <Camera size={16} />
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                onChange={handleCameraChange}
                className="hidden"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘의 기록..."
                rows={8}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none ${isDark ? "border-gray-700 bg-[#111] text-white placeholder-gray-600" : "border-gray-200 bg-white text-gray-900 placeholder-gray-400"}`}
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </form>
          </div>

          {/* 고정 하단 버튼 */}
          <div className={`flex gap-3 px-5 py-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className={`flex-1 ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" : ""}`}
            >
              취소
            </Button>
            <Button
              type="submit"
              form="card-form"
              className="flex-1"
              disabled={busy}
            >
              {loading
                ? (isEdit ? "수정 중..." : "저장 중...")
                : uploading
                ? "업로드 중..."
                : (isEdit ? "수정" : uploadedCount > 1 ? `저장 (${uploadedCount})` : "저장")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
