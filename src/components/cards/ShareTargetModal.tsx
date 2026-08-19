"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useThemeStore } from "@/store/theme";
import { useToastStore } from "@/store/toast";
import { useGlobalLoadingStore } from "@/store/globalLoading";

interface ShareTargetModalProps {
  onClose: () => void;
}

export function ShareTargetModal({ onClose }: ShareTargetModalProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const addToast = useToastStore((s) => s.addToast);
  const { begin: beginLoading, end: endLoading } = useGlobalLoadingStore();
  const router = useRouter();

  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(), "HH:mm"));
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrls: string[] = [];
    (async () => {
      try {
        const cache = await caches.open("jotday-share");
        const keys = await cache.keys();
        if (keys.length === 0) { setLoading(false); return; }

        const loaded = await Promise.all(
          keys.map(async (key) => {
            const resp = await cache.match(key);
            if (!resp) return null;
            const blob = await resp.blob();
            return new File([blob], "shared.jpg", { type: blob.type });
          })
        );
        const validFiles = loaded.filter((f): f is File => !!f);
        const urls = validFiles.map((f) => URL.createObjectURL(f));
        objectUrls = urls;
        setFiles(validFiles);
        setPreviews(urls);

        // EXIF에서 촬영 날짜 추출
        const { parse: parseExif } = await import("exifr");
        const exif = await parseExif(validFiles[0], ["DateTimeOriginal"]).catch(() => null);
        if (exif?.DateTimeOriginal instanceof Date) {
          setDate(format(exif.DateTimeOriginal, "yyyy-MM-dd"));
          setTime(format(exif.DateTimeOriginal, "HH:mm"));
        }
      } catch (e) {
        console.error("[ShareTarget] 파일 로드 실패", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => { objectUrls.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  async function handleSave() {
    if (files.length === 0) return;
    beginLoading();
    try {
      // 서명 1회 발급 (같은 folder/timestamp → 여러 파일에 재사용 가능)
      const signRes = await fetch("/api/upload-sign");
      const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json();

      const uploadedImages = await Promise.all(
        files.map(async (file) => {
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
          const { secure_url, public_id } = await res.json();
          return { url: secure_url as string, public_id: public_id as string };
        })
      );

      const tags = (content.match(/#([^\s#]+)/g) ?? []).map((t) => t.slice(1).toLowerCase());
      const cardData = new FormData();
      cardData.append("date", date);
      cardData.append("type", "mixed");
      cardData.append("time", new Date(`${date}T${time}:00`).toISOString());
      if (content) cardData.append("content", content);
      cardData.append("images", JSON.stringify(uploadedImages));
      cardData.append("tags", JSON.stringify(tags));
      const res = await fetch("/api/cards", { method: "POST", body: cardData });
      if (!res.ok) throw new Error("카드 저장 실패");

      // 캐시 정리
      const cache = await caches.open("jotday-share");
      const keys = await cache.keys();
      await Promise.all(keys.map((k) => cache.delete(k)));

      addToast("사진이 저장됐어요");
      onClose();
      router.push(`/${date}`);
    } catch {
      addToast("저장에 실패했어요");
    } finally {
      endLoading();
    }
  }

  const inputCls = `border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${
    isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"
  }`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-modal">
      <div className={`${isDark ? "bg-[#1c1c1c]" : "bg-white"} rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col`}>
        <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
          <h2 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>갤러리에서 공유</h2>
          <button onClick={onClose} className={isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}>
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
            </div>
          ) : files.length === 0 ? (
            <p className={`text-sm text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>공유된 이미지가 없어요</p>
          ) : (
            <>
              {/* 미리보기 */}
              <div className="flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="w-24 h-[120px] object-cover rounded-lg"
                  />
                ))}
              </div>

              {/* 날짜 */}
              <div className="flex items-center gap-2">
                <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>날짜</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                  className={inputCls}
                />
              </div>

              {/* 시간 */}
              <div className="flex items-center gap-2">
                <label className={`text-sm whitespace-nowrap ${isDark ? "text-gray-400" : "text-gray-500"}`}>시간</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                  className={inputCls}
                />
              </div>

              {/* 내용 */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요..."
                rows={4}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none ${isDark ? "border-gray-700 bg-[#111] text-white placeholder-gray-600" : "border-gray-200 bg-white text-gray-900 placeholder-gray-400"}`}
              />
            </>
          )}
        </div>

        <div className={`flex gap-3 px-5 py-4 border-t ${isDark ? "border-gray-800" : "border-gray-100"} shrink-0`}>
          <Button type="button" variant="secondary" onClick={onClose} className={`flex-1 ${isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700" : ""}`}>
            취소
          </Button>
          <Button type="button" onClick={handleSave} className="flex-1" disabled={loading || files.length === 0}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
