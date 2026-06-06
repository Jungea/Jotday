"use client";

import { useState, useRef } from "react";
import type { DragEvent } from "react";
import { format } from "date-fns";
import { X, Upload, Camera } from "lucide-react";

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
  | { kind: "new"; url: string; file: File };

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
  const [slots, setSlots] = useState<ImageSlot[]>(() => initSlots(editCard));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editCard;
  const dragIndex = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const readers = files.map(
      (file) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((srcs) => setCropQueue((q) => [...q, ...srcs]));
    e.target.value = "";
  }

  function handleCropConfirm(file: File) {
    const url = URL.createObjectURL(file);
    setSlots((prev) => [...prev, { kind: "new", url, file }]);
    setCropQueue((q) => q.slice(1));
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

    const existingSlots = slots.filter((s): s is Extract<ImageSlot, { kind: "existing" }> => s.kind === "existing");
    const newSlots = slots.filter((s): s is Extract<ImageSlot, { kind: "new" }> => s.kind === "new");

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
      const currentIds = existingSlots.map((s) => s.publicId).join(",");
      const imagesChanged = originalIds !== currentIds || newSlots.length > 0;

      if (imagesChanged) {
        formData.append("update_images", "true");
        for (const s of existingSlots) formData.append("keep_id", s.publicId);
        for (const s of newSlots) formData.append("image", s.file);
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
      if (manualTime && time) formData.append("time", new Date(`${date}T${time}:00`).toISOString());
      formData.append("tags", JSON.stringify(extractTags(content)));
      for (const s of newSlots) formData.append("image", s.file);
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

  const newCount = slots.filter((s) => s.kind === "new").length;

  return (
    <>
      {cropQueue[0] && (
        <ImageCropModal
          src={cropQueue[0]}
          current={slots.length + 1}
          total={slots.length + cropQueue.length}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropQueue((q) => q.slice(1))}
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
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={manualTime}
                      onChange={(e) => setManualTime(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>시간 직접 설정</span>
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
                      <img src={slot.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 이미지 추가 버튼 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 h-14 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  <Upload size={16} />
                  <span className="text-sm">{slots.length > 0 ? "이미지 추가" : "업로드"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className={`h-14 px-5 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
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
                capture="environment"
                onChange={handleFileChange}
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
              disabled={loading}
            >
              {loading
                ? (isEdit ? "수정 중..." : "저장 중...")
                : (isEdit ? "수정" : newCount > 1 ? `저장 (${newCount})` : "저장")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
