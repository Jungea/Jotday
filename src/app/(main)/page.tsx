"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { format, addMonths, subMonths, parse } from "date-fns";
import { Plus, Camera } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { CardForm } from "@/components/cards/CardForm";
import { CameraModal } from "@/components/cards/CameraModal";
import { ImageCropModal } from "@/components/cards/ImageCropModal";
import { useToastStore } from "@/store/toast";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { useThemeStore } from "@/store/theme";
import { useCalendarTagsStore } from "@/store/calendarTags";
import type { DayMeta } from "@/types";

function HomeContent() {
  const searchParams = useSearchParams();
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [currentMonth, setCurrentMonth] = useState(
    searchParams.get("month") ?? format(new Date(), "yyyy-MM")
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const month = searchParams.get("month");
    if (month) setCurrentMonth(month);
  }, [searchParams]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const calendarTags = useCalendarTagsStore((s) => s.calendarTags);
  const selectedTag = useCalendarTagsStore((s) => s.selectedTag);
  const setSelectedTag = useCalendarTagsStore((s) => s.setSelectedTag);
  const [tagDayMetas, setTagDayMetas] = useState<DayMeta[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showQuickCamera, setShowQuickCamera] = useState(false);
  const [quickCropSrc, setQuickCropSrc] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const { showHeader, onScroll } = useScrollHeader();
  const theme = useThemeStore((s) => s.theme);
  const addToast = useToastStore((s) => s.addToast);

  const fetchMetas = useCallback(async (month: string) => {
    setLoading(true);
    const base = parse(month, "yyyy-MM", new Date());
    const months = [
      format(subMonths(base, 1), "yyyy-MM"),
      month,
      format(addMonths(base, 1), "yyyy-MM"),
    ];
    const results = await Promise.all(months.map((m) => fetch(`/api/cards?month=${m}`).then((r) => r.ok ? r.json() : [])));
    setDayMetas(results.flat());
    setLoading(false);
    setInitialLoaded(true);
  }, []);

  const fetchTagMetas = useCallback(async (month: string, tag: string) => {
    const base = parse(month, "yyyy-MM", new Date());
    const months = [
      format(subMonths(base, 1), "yyyy-MM"),
      month,
      format(addMonths(base, 1), "yyyy-MM"),
    ];
    const results = await Promise.all(months.map((m) => fetch(`/api/cards?month=${m}&tag=${encodeURIComponent(tag)}`).then((r) => r.ok ? r.json() : [])));
    setTagDayMetas(results.flat());
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchMetas(currentMonth);
  }, [currentMonth, fetchMetas]);

  useEffect(() => {
    if (selectedTag) fetchTagMetas(currentMonth, selectedTag);
    else setTagDayMetas([]);
  }, [currentMonth, selectedTag, fetchTagMetas]);
  /* eslint-enable react-hooks/set-state-in-effect */


  const isDark = theme === "dark";

  function handleQuickCapture(file: File) {
    setShowQuickCamera(false);
    setQuickCropSrc(URL.createObjectURL(file));
  }

  function handleQuickCropConfirm(file: File) {
    if (quickCropSrc) URL.revokeObjectURL(quickCropSrc);
    setQuickCropSrc(null);
    (async () => {
      try {
        const signRes = await fetch("/api/upload-sign");
        const { signature, timestamp, folder, cloudName, apiKey } = await signRes.json();
        const fd = new FormData();
        fd.append("file", file);
        fd.append("signature", signature);
        fd.append("timestamp", String(timestamp));
        fd.append("folder", folder);
        fd.append("api_key", apiKey);
        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: fd });
        const { secure_url, public_id } = await upRes.json();
        const cardData = new FormData();
        cardData.append("date", today);
        cardData.append("type", "image");
        cardData.append("images", JSON.stringify([{ url: secure_url, public_id }]));
        cardData.append("tags", JSON.stringify([]));
        await fetch("/api/cards", { method: "POST", body: cardData });
        fetchMetas(currentMonth);
        addToast("사진이 저장됐어요");
      } catch {
        addToast("사진 저장에 실패했어요");
      }
    })();
  }

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      {/* Calendar */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-20 relative" onScroll={(e) => onScroll(e.currentTarget.scrollTop)}>
        {!initialLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
          </div>
        ) : (
          <>
            <CalendarGrid
            dayMetas={dayMetas}
            onMonthChange={setCurrentMonth}
            initialMonth={currentMonth}
            onDataChange={() => fetchMetas(currentMonth)}
            availableTags={calendarTags}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            tagDayMetas={tagDayMetas}
          />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-8 h-8 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-20 right-5 z-fab flex flex-col items-center gap-2">
        <button
          onClick={() => setShowQuickCamera(true)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors
            ${isDark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"}`}
        >
          <Camera size={20} />
        </button>
        <button
          onClick={() => setShowForm(true)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors
            ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
        >
          <Plus size={22} />
        </button>
      </div>

      {showQuickCamera && (
        <CameraModal onCapture={handleQuickCapture} onCancel={() => setShowQuickCamera(false)} />
      )}
      {quickCropSrc && (
        <ImageCropModal
          src={quickCropSrc}
          onConfirm={handleQuickCropConfirm}
          onCancel={() => { URL.revokeObjectURL(quickCropSrc); setQuickCropSrc(null); }}
        />
      )}

      {showForm && (
        <CardForm
          date={today}
          onSuccess={() => {
            setShowForm(false);
            fetchMetas(currentMonth);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
