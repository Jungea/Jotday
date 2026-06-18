"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { X, Upload, Camera, Scissors } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/cards/ImageCropModal";
import { CameraModal } from "@/components/cards/CameraModal";
import { useThemeStore } from "@/store/theme";
import { useTagAutocomplete } from "@/hooks/useTagAutocomplete";
import { useImageSlots, cloudinaryResized } from "@/hooks/useImageSlots";
import { useModalHistoryBack } from "@/hooks/useModalHistoryBack";
import type { Card } from "@/types";

function extractTags(text: string): string[] {
  const matches = text.match(/#([^\s#]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

interface CardFormProps {
  date: string;
  editCard?: Card;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CardForm({ date, editCard, onSuccess, onCancel }: CardFormProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const isEdit = !!editCard;

  const [content, setContent] = useState(editCard?.content ?? "");
  const [time, setTime] = useState(editCard ? format(new Date(editCard.created_at), "HH:mm") : format(new Date(), "HH:mm"));
  const [manualTime, setManualTime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { tagSuggestions, activeSuggestion, setActiveSuggestion, dropdownPos, handleContentChange, handleKeyDown, applyTag } =
    useTagAutocomplete(textareaRef, content, setContent);

  const {
    slots, cropQueue, croppingSlotIndex, showCamera, setShowCamera,
    uploading, dragOver, uploadError, setUploadError,
    handleFileChange, handleCameraCapture, handleCropConfirm, handleCropCancel,
    handleCropSlot, handleRemoveSlot, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleTouchStart, handleTouchEnd, slotContainerRef,
  } = useImageSlots(editCard);

  useModalHistoryBack(onCancel);

  const busy = uploading || loading;
  const uploadedCount = slots.filter((s) => s.kind === "uploaded").length;
  const displayError = error ?? uploadError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUploadError(null);
    setLoading(true);

    if (isEdit) {
      const formData = new FormData();
      formData.append("id", editCard.id);
      formData.append("type", "mixed");
      if (content) formData.append("content", content);
      if (time) formData.append("time", new Date(`${date}T${time}:00`).toISOString());
      formData.append("tags", JSON.stringify(extractTags(content)));

      const originalIds = (editCard.images?.length > 0
        ? editCard.images.map((i) => i.public_id)
        : editCard.image_public_id ? [editCard.image_public_id] : []
      ).join(",");
      const doneSlots = slots.filter((s): s is Exclude<typeof s, { kind: "pending" }> => s.kind !== "pending");
      const currentIds = doneSlots.map((s) => s.publicId).join(",");

      if (originalIds !== currentIds) {
        formData.append("images", JSON.stringify(
          doneSlots.map((s) => ({ url: s.url, public_id: s.publicId }))
        ));
      }

      const res = await fetch("/api/cards", { method: "PATCH", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "수정 실패");
        setLoading(false);
        return;
      }
    } else {
      const formData = new FormData();
      formData.append("date", date);
      formData.append("type", "mixed");
      if (content) formData.append("content", content);
      formData.append("time", new Date(`${date}T${manualTime ? time : format(new Date(), "HH:mm")}:00`).toISOString());
      formData.append("tags", JSON.stringify(extractTags(content)));
      formData.append("images", JSON.stringify(
        slots
          .filter((s): s is Exclude<typeof s, { kind: "pending" }> => s.kind !== "pending")
          .map((s) => ({ url: s.url, public_id: s.publicId }))
      ));

      const res = await fetch("/api/cards", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "저장 실패");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <>
      {showCamera && (
        <CameraModal onCapture={handleCameraCapture} onCancel={() => setShowCamera(false)} />
      )}
      {cropQueue[0] && (
        <ImageCropModal
          key={cropQueue[0]}
          src={cropQueue[0]}
          current={croppingSlotIndex !== null ? undefined : uploadedCount + 1}
          total={croppingSlotIndex !== null ? undefined : uploadedCount + cropQueue.length}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
        <div className={`${isDark ? "bg-[#1c1c1c]" : "bg-white"} rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col`}>
          <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>{isEdit ? "카드 수정" : `${date} 기록`}</h2>
            <button onClick={onCancel} className={isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}>
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            <form id="card-form" onSubmit={handleSubmit} className="space-y-4">
              {isEdit ? (
                <div className="flex items-center gap-2">
                  <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>기록 시간</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
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
                      onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                      className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`}
                    />
                  )}
                </div>
              )}

              {slots.length > 0 && (
                <div ref={slotContainerRef} className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <div
                      key={i}
                      data-slot-index={i}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDrop={(e) => handleDrop(e, i)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={(e) => handleTouchStart(i, e)}
                      onTouchEnd={handleTouchEnd}
                      className={`relative rounded-lg overflow-hidden w-24 h-[120px] cursor-grab active:cursor-grabbing transition-opacity ${
                        dragOver === i ? "ring-2 ring-amber-400 opacity-70" : ""
                      }`}
                    >
                      {slot.kind === "pending" ? (
                        <div className={`w-full h-full flex items-center justify-center animate-pulse ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
                          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-500" : "border-gray-400"}`} />
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cloudinaryResized(slot.url, 400)} alt="" className="w-full h-full object-cover pointer-events-none" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                      >
                        <X size={12} />
                      </button>
                      {!isEdit && slot.kind !== "pending" && (
                        <button
                          type="button"
                          onClick={() => handleCropSlot(i)}
                          className="absolute bottom-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                        >
                          <Scissors size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fileRef.current?.click()}
                  className={`flex-1 h-14 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${loading ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  <Upload size={16} />
                  <span className="text-sm">{slots.length > 0 ? "이미지 추가" : "업로드"}</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowCamera(true)}
                  className={`h-14 px-5 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${loading ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}
                >
                  <Camera size={16} />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />

              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="오늘의 기록..."
                rows={8}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none ${isDark ? "border-gray-700 bg-[#111] text-white placeholder-gray-600" : "border-gray-200 bg-white text-gray-900 placeholder-gray-400"}`}
              />
              {tagSuggestions.length > 0 && dropdownPos && (
                <ul
                  className={`fixed z-[200] rounded-xl shadow-lg border overflow-hidden min-w-[140px] ${isDark ? "bg-[#2a2a2a] border-gray-700" : "bg-white border-gray-200"}`}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                  {tagSuggestions.map((tag, i) => (
                    <li key={tag}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyTag(tag); }}
                        onMouseEnter={() => setActiveSuggestion(i)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-1.5 ${
                          i === activeSuggestion
                            ? isDark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"
                            : isDark ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        <span className={isDark ? "text-gray-500" : "text-gray-400"}>#</span>{tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {displayError && <p className="text-red-500 text-sm">{displayError}</p>}
            </form>
          </div>

          <div className={`flex gap-3 px-5 py-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className={`flex-1 ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" : ""}`}
            >
              취소
            </Button>
            <Button type="submit" form="card-form" className="flex-1" disabled={busy}>
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
