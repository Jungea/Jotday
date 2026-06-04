"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addMonths, subMonths, parse } from "date-fns";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { Logo } from "@/components/Logo";
import { useThemeStore } from "@/store/theme";
import { createClient } from "@/lib/supabase/client";
import type { DayMeta } from "@/types";

export default function HomePage() {
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
  const theme = useThemeStore((s) => s.theme);
  const router = useRouter();

  const fetchMetas = useCallback(async (month: string) => {
    const base = parse(month, "yyyy-MM", new Date());
    const months = [
      format(subMonths(base, 1), "yyyy-MM"),
      month,
      format(addMonths(base, 1), "yyyy-MM"),
    ];
    const results = await Promise.all(months.map((m) => fetch(`/api/cards?month=${m}`).then((r) => r.ok ? r.json() : [])));
    setDayMetas(results.flat());
  }, []);

  useEffect(() => {
    fetchMetas(currentMonth);
  }, [currentMonth, fetchMetas]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isDark = theme === "dark";

  return (
    <div className={isDark ? "theme-dark" : "theme-light"}>
      {/* Navbar */}
      <nav className={`flex items-center justify-between px-6 py-4 ${isDark ? "bg-[#111] border-b border-gray-800" : "bg-white border-b border-gray-200 shadow-sm"}`}>
        <Logo height={44} className={isDark ? "text-white" : "text-gray-900"} />
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={handleLogout}
            className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Calendar */}
      <main className="px-4 py-6">
        <CalendarGrid
          dayMetas={dayMetas}
          onMonthChange={setCurrentMonth}
        />
      </main>
    </div>
  );
}
