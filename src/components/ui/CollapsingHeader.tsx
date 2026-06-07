"use client";

import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useThemeStore } from "@/store/theme";

export function CollapsingHeader({ show }: { show: boolean }) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const router = useRouter();

  return (
    <div className={`shrink-0 overflow-hidden transition-[height] duration-300 ${show ? "h-[76px]" : "h-0"}`}>
      <nav className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <Logo height={44} className={`cursor-pointer ${isDark ? "text-white" : "text-gray-900"}`} onClick={() => router.push("/")} />
        <button
          onClick={() => router.push("/stats")}
          className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <BarChart2 size={20} />
        </button>
      </nav>
    </div>
  );
}
