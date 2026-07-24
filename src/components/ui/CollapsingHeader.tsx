"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart2, Sparkles } from "lucide-react";
import { format, subMonths, subYears } from "date-fns";
import { Logo } from "@/components/Logo";
import { useThemeStore } from "@/store/theme";

const MEMORY_FNS = [
  (d: Date) => subMonths(d, 1),
  (d: Date) => subMonths(d, 3),
  (d: Date) => subMonths(d, 6),
  (d: Date) => subYears(d, 1),
  (d: Date) => subYears(d, 2),
  (d: Date) => subYears(d, 3),
  (d: Date) => subYears(d, 5),
];

export function CollapsingHeader({ show }: { show: boolean }) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const router = useRouter();
  const [hasMemories, setHasMemories] = useState(false);

  useEffect(() => {
    const today = new Date();
    const dates = MEMORY_FNS.map((fn) => format(fn(today), "yyyy-MM-dd")).join(",");
    fetch(`/api/cards?memories=true&dates=${dates}`)
      .then((r) => r.json())
      .then((data: Record<string, unknown[]>) => {
        setHasMemories(Object.values(data).some((arr) => arr.length > 0));
      })
      .catch(() => {});
  }, []);

  const btnClass = `p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`;

  return (
    <div className={`shrink-0 overflow-hidden transition-[height] duration-300 ${show ? "h-[76px]" : "h-0"}`}>
      <nav className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <Logo height={44} className={`cursor-pointer ${isDark ? "text-white" : "text-gray-900"}`} onClick={() => router.push("/")} />
        <div className="flex items-center gap-1">
          <button onClick={() => router.push("/memories")} className={`relative ${btnClass}`}>
            <Sparkles size={20} />
            {hasMemories && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
          <button onClick={() => router.push("/stats")} className={btnClass}>
            <BarChart2 size={20} />
          </button>
        </div>
      </nav>
    </div>
  );
}
