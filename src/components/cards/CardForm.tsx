"use client";

import { useState, useRef } from "react";
import type { DragEvent } from "react";
import { format } from "date-fns";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/cards/ImageCropModal";
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
  const cardType = "mixed";
  const [title, setTitle] = useState(editCard?.title ?? "");
  const [content, setContent] = useState(editCard?.content ?? "");
  const [time, setTime] = useState(editCard ? format(new Date(editCard.created_at), "HH:mm") : "");

  const [cropQueue, setCropQueue] = useState<string[]>([]);
  const [slots, setSlots] = useState<ImageSlot[]>(() => initSlots(editCard));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      if (title) formData.append("title", title);
      if (content) formData.append("content", content);
      if (time) formData.append("time", time);

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
      if (title) formData.append("title", title);
      if (content) formData.append("content", content);
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
        <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col">
          {/* 고정 헤더 */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "카드 수정" : `${date} 기록`}</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          {/* 스크롤 영역 */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <form id="card-form" onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목 (선택)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />

              {isEdit && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500 whitespace-nowrap">기록 시간</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
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
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
              >
                <Upload size={22} />
                <span className="text-sm">
                  {slots.length > 0 ? "이미지 추가" : "이미지 업로드"}
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘의 기록..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </form>
          </div>

          {/* 고정 하단 버튼 */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              취소
            </Button>
            <Button type="submit" form="card-form" className="flex-1" disabled={loading}>
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
