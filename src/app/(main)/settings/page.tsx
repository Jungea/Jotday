"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { Theme } from "@/types";

const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: "light", label: "라이트", desc: "화이트 모노톤" },
  { id: "dark", label: "다크", desc: "블랙 모노톤" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === "dark";

  return (
    <div className={isDark ? "theme-dark min-h-screen" : "theme-light min-h-screen"}>
      <header className={`flex items-center gap-3 px-5 py-4 ${isDark ? "bg-[#111] border-b border-gray-800" : "bg-white border-b border-gray-200 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>설정</h1>
      </header>

      <main className="p-6 max-w-md mx-auto">
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          테마
        </h2>
        <div className="space-y-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                theme === t.id
                  ? isDark
                    ? "border-white bg-gray-800"
                    : "border-gray-900 bg-gray-50"
                  : isDark
                  ? "border-gray-800 bg-[#1c1c1c] hover:border-gray-700"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className={`w-8 h-8 rounded-full border-2 shrink-0 ${t.id === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`} />
              <div className="flex-1 text-left">
                <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.label}</div>
                <div className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t.desc}</div>
              </div>
              {theme === t.id && (
                <Check size={18} className={isDark ? "text-white shrink-0" : "text-gray-900 shrink-0"} />
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
