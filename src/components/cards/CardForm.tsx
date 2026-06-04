"use client";

import { useState, useRef } from "react";
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

export function CardForm({ date, editCard, onSuccess, onCancel }: CardFormProps) {
  const cardType = "mixed";
  const [title, setTitle] = useState(editCard?.title ?? "");
  const [content, setContent] = useState(editCard?.content ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editCard?.image_url ?? null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [time, setTime] = useState(
    editCard ? format(new Date(editCard.created_at), "HH:mm") : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editCard;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleCropConfirm(file: File) {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setCropSrc(null);
  }

  function handleRemoveImage() {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("type", cardType);
    if (title) formData.append("title", title);
    if (content) formData.append("content", content);
    if (imageFile) formData.append("image", imageFile);

    if (isEdit) {
      formData.append("id", editCard.id);
      if (removeImage) formData.append("remove_image", "true");
      if (time) formData.append("time", time);
      const res = await fetch("/api/cards", { method: "PATCH", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "수정 실패");
      } else {
        onSuccess();
      }
    } else {
      formData.append("date", date);
      const res = await fetch("/api/cards", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장 실패");
      } else {
        onSuccess();
      }
    }
    setLoading(false);
  }

  const needsImage = true;
  const needsText = true;

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        onConfirm={handleCropConfirm}
        onCancel={() => setCropSrc(null)}
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

            {needsImage && (
              <div>
                {imagePreview ? (
                  <div className="relative rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="" className="w-full h-auto" />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
                  >
                    <Upload size={22} />
                    <span className="text-sm">이미지 업로드</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>
            )}

            {needsText && (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="오늘의 기록..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        </div>

        {/* 고정 하단 버튼 */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 shrink-0">
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            취소
          </Button>
          <Button type="submit" form="card-form" className="flex-1" disabled={loading}>
            {loading ? (isEdit ? "수정 중..." : "저장 중...") : (isEdit ? "수정" : "저장")}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
