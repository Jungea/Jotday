"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { Theme } from "@/types";

const THEMES: { id: Theme; label: string; desc: string; emoji: string }[] = [
  {
    id: "cork",
    label: "Cork",
    desc: "코르크보드 아날로그 감성",
    emoji: "📌",
  },
  {
    id: "card",
    label: "Card",
    desc: "그리드 카드 모던 클린",
    emoji: "🗂️",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const isCork = theme === "cork";

  return (
    <div className={`min-h-screen ${isCork ? "theme-cork" : "theme-card"}`}>
      {/* Header */}
      <header className={`flex items-center gap-3 px-5 py-4 ${isCork ? "bg-amber-800/30" : "bg-white border-b border-gray-100 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/30 text-amber-100" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`font-bold text-lg ${isCork ? "text-amber-100" : "text-gray-900"}`}>설정</h1>
      </header>

      <main className="p-6 max-w-md mx-auto">
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isCork ? "text-amber-200" : "text-gray-400"}`}>
          테마
        </h2>
        <div className="space-y-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                theme === t.id
                  ? "border-amber-500 bg-amber-50"
                  : isCork
                  ? "border-amber-800/30 bg-amber-100/20 hover:bg-amber-100/30"
                  : "border-gray-100 bg-white hover:border-amber-200"
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <div className="flex-1 text-left">
                <div className={`font-semibold ${isCork && theme !== t.id ? "text-amber-100" : "text-gray-900"}`}>
                  {t.label}
                </div>
                <div className={`text-sm ${isCork && theme !== t.id ? "text-amber-200" : "text-gray-500"}`}>
                  {t.desc}
                </div>
              </div>
              {theme === t.id && (
                <Check size={18} className="text-amber-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
