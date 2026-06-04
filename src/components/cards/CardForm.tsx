"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { ImageIcon, Type, LayoutGrid, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Card, CardType } from "@/types";

interface CardFormProps {
  date: string;
  editCard?: Card;
  onSuccess: () => void;
  onCancel: () => void;
}

const CARD_TYPES: { type: CardType; label: string; icon: React.ReactNode }[] = [
  { type: "image", label: "이미지", icon: <ImageIcon size={18} /> },
  { type: "text", label: "텍스트", icon: <Type size={18} /> },
  { type: "mixed", label: "혼합", icon: <LayoutGrid size={18} /> },
];

export function CardForm({ date, editCard, onSuccess, onCancel }: CardFormProps) {
  const [cardType, setCardType] = useState<CardType>(editCard?.type ?? "mixed");
  const [title, setTitle] = useState(editCard?.title ?? "");
  const [content, setContent] = useState(editCard?.content ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(editCard?.image_url ?? null);
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
    setImageFile(file);
    setRemoveImage(false);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
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

  const needsImage = cardType === "image" || cardType === "mixed";
  const needsText = cardType === "text" || cardType === "mixed";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">{isEdit ? "카드 수정" : `${date} 기록`}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Card type selector */}
        <div className="flex gap-2 mb-5">
          {CARD_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => setCardType(type)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
                cardType === type
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-amber-300"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 (선택)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          {/* Time — edit mode only */}
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

          {/* Image upload */}
          {needsImage && (
            <div>
              {imagePreview ? (
                <div className="relative rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="w-full h-48 object-cover" />
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
                  className="w-full h-36 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-colors"
                >
                  <Upload size={24} />
                  <span className="text-sm">이미지 업로드</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Text */}
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

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (isEdit ? "수정 중..." : "저장 중...") : (isEdit ? "수정" : "저장")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
