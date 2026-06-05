"use client";

import { Logo } from "@/components/Logo";
import { useThemeStore } from "@/store/theme";

export function CollapsingHeader({ show }: { show: boolean }) {
  const isDark = useThemeStore((s) => s.theme === "dark");

  return (
    <div className={`shrink-0 overflow-hidden transition-[height] duration-300 ${show ? "h-[76px]" : "h-0"}`}>
      <nav className={`flex items-center px-6 py-4 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <Logo height={44} className={isDark ? "text-white" : "text-gray-900"} />
      </nav>
    </div>
  );
}
