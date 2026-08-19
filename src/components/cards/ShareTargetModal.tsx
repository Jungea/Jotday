"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { X, Upload, Camera, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ImageCropModal } from "@/components/cards/ImageCropModal";
import { CameraModal } from "@/components/cards/CameraModal";
import { EmojiPicker, saveRecent } from "@/components/cards/EmojiPicker";
import { useThemeStore } from "@/store/theme";
import { useToastStore } from "@/store/toast";
import { useGlobalLoadingStore } from "@/store/globalLoading";
import { useImageSlots, cloudinaryResized } from "@/hooks/useImageSlots";
import { useTagAutocomplete } from "@/hooks/useTagAutocomplete";
import { useModalHistoryBack } from "@/hooks/useModalHistoryBack";

function extractTags(text: string): string[] {
  const matches = text.match(/#([^\s#]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

interface ShareTargetModalProps {
  onClose: () => void;
}

export function ShareTargetModal({ onClose }: ShareTargetModalProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const addToast = useToastStore((s) => s.addToast);
  const { begin: beginLoading, end: endLoading } = useGlobalLoadingStore();
  const router = useRouter();

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [content, setContent] = useState("");
  const [visualText, setVisualText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { tagSuggestions, activeSuggestion, setActiveSuggestion, dropdownPos, handleContentChange, handleKeyDown, applyTag } =
    useTagAutocomplete(textareaRef, content, setContent);

  const {
    slots, cropQueue, croppingSlotIndex, showCamera, setShowCamera,
    uploading, dragOver, uploadError, setUploadError,
    handleFileChange, handleCameraCapture, handleCropConfirm, handleCropCancel,
    handleRemoveSlot, handleDragStart, handleDragOver, handleDrop, handleDragEnd,
    handleTouchStart, handleTouchEnd, slotContainerRef,
  } = useImageSlots();

  useModalHistoryBack(onClose);

  // 캐시에서 공유 파일 로드 → 크롭 큐에 추가 (CardForm과 동일한 흐름)
  useEffect(() => {
    (async () => {
      try {
        const cache = await caches.open("jotday-share");
        const keys = await cache.keys();
        if (keys.length === 0) return;

        const files: File[] = [];
        for (const key of keys) {
          const resp = await cache.match(key);
          if (!resp) continue;
          const blob = await resp.blob();
          files.push(new File([blob], "shared.jpg", { type: blob.type }));
        }

        // EXIF 날짜·시간 추출
        if (files.length > 0) {
          const { parse: parseExif } = await import("exifr");
          const exif = await parseExif(files[0], ["DateTimeOriginal"]).catch(() => null);
          if (exif?.DateTimeOriginal instanceof Date) {
            setDate(format(exif.DateTimeOriginal, "yyyy-MM-dd"));
            setTime(format(exif.DateTimeOriginal, "HH:mm"));
          }
        }

        files.forEach((file) => handleCameraCapture(file));
      } catch (e) {
        console.error("[ShareTarget] 파일 로드 실패", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = uploading || submitting;
  const uploadedCount = slots.filter((s) => s.kind === "uploaded").length;

  async function handleSave() {
    if (busy) return;
    setSubmitting(true);
    setUploadError(null);
    if (visualText.trim()) await saveRecent(visualText.trim());

    const doneSlots = slots.filter((s): s is Exclude<typeof s, { kind: "pending" }> => s.kind !== "pending");

    const cardData = new FormData();
    cardData.append("date", date);
    cardData.append("type", "mixed");
    cardData.append("time", new Date(`${date}T${time}:00`).toISOString());
    if (content) cardData.append("content", content);
    cardData.append("images", JSON.stringify(doneSlots.map((s) => ({ url: s.url, public_id: s.publicId }))));
    cardData.append("tags", JSON.stringify(extractTags(content)));
    cardData.append("emojis", JSON.stringify(visualText.trim() ? [visualText.trim()] : []));

    beginLoading();
    onClose();

    (async () => {
      try {
        const res = await fetch("/api/cards", { method: "POST", body: cardData });
        if (!res.ok) {
          const data = await res.json();
          addToast(data.error ?? "저장 실패");
          return;
        }
        const cache = await caches.open("jotday-share");
        const cacheKeys = await cache.keys();
        await Promise.all(cacheKeys.map((k) => cache.delete(k)));
        addToast("사진이 저장됐어요");
        router.push(`/${date}`);
      } catch {
        addToast("저장에 실패했어요");
      } finally {
        endLoading();
      }
    })();
  }

  const inputCls = `border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-modal">
        <div className={`${isDark ? "bg-[#1c1c1c]" : "bg-white"} rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col`}>
          <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>갤러리에서 공유</h2>
            <button onClick={onClose} className={isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}>
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 px-5 py-4">
            <div className="space-y-4">
              {/* 날짜·시간 */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                  <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>날짜</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                    className={inputCls} />
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>시간</label>
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                    onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                    className={inputCls} />
                </div>
              </div>

              {/* 이미지 슬롯 */}
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
                      className={`relative rounded-lg overflow-hidden w-24 h-[128px] cursor-grab active:cursor-grabbing transition-opacity ${dragOver === i ? "ring-2 ring-amber-400 opacity-70" : ""}`}
                    >
                      {slot.kind === "pending" ? (
                        <div className={`w-full h-full flex items-center justify-center animate-pulse ${isDark ? "bg-gray-800" : "bg-gray-200"}`}>
                          <div className={`w-5 h-5 border-2 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-500" : "border-gray-400"}`} />
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={cloudinaryResized(slot.url, 400)} alt="" className="w-full h-full object-cover pointer-events-none" />
                      )}
                      <button type="button" onClick={() => handleRemoveSlot(i)}
                        className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 업로드 버튼 */}
              <div className="flex gap-2">
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
                  className={`flex-1 h-14 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${busy ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
                  <Upload size={16} />
                  <span className="text-sm">{slots.length > 0 ? "이미지 추가" : "업로드"}</span>
                </button>
                <button type="button" disabled={busy} onClick={() => setShowCamera(true)}
                  className={`h-14 px-5 border-2 border-dashed rounded-lg flex items-center justify-center gap-2 transition-colors ${busy ? "opacity-40 cursor-not-allowed" : ""} ${isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
                  <Camera size={16} />
                </button>
                <button type="button" disabled={busy} onClick={() => setShowEmojiPicker((v) => !v)}
                  className={`h-14 px-4 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${busy ? "opacity-40 cursor-not-allowed" : ""} ${showEmojiPicker || visualText ? isDark ? "border-gray-500 text-white" : "border-gray-500 text-gray-800" : isDark ? "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300" : "border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600"}`}>
                  <Type size={16} />
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />

              {showEmojiPicker && <EmojiPicker value={visualText} onChange={setVisualText} />}

              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="오늘의 기록..."
                rows={4}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none ${isDark ? "border-gray-700 bg-[#111] text-white placeholder-gray-600" : "border-gray-200 bg-white text-gray-900 placeholder-gray-400"}`}
              />
              {tagSuggestions.length > 0 && dropdownPos && (
                <ul className={`fixed z-menu rounded-xl shadow-lg border overflow-hidden min-w-[140px] ${isDark ? "bg-[#2a2a2a] border-gray-700" : "bg-white border-gray-200"}`}
                  style={{ top: dropdownPos.top, left: dropdownPos.left }}>
                  {tagSuggestions.map((tag, i) => (
                    <li key={tag}>
                      <button type="button"
                        onMouseDown={(e) => { e.preventDefault(); applyTag(tag); }}
                        onMouseEnter={() => setActiveSuggestion(i)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-1.5 ${i === activeSuggestion ? isDark ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900" : isDark ? "text-gray-300" : "text-gray-700"}`}>
                        <span className={isDark ? "text-gray-500" : "text-gray-400"}>#</span>{tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
            </div>
          </div>

          <div className={`flex gap-3 px-5 py-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
            <Button type="button" variant="secondary" onClick={onClose}
              className={`flex-1 ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" : ""}`}>
              취소
            </Button>
            <Button type="button" onClick={handleSave} className="flex-1" disabled={busy}>
              {uploading ? "업로드 중..." : uploadedCount > 1 ? `저장 (${uploadedCount})` : "저장"}
            </Button>
          </div>
        </div>
      </div>

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
    </>
  );
}
