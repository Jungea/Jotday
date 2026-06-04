"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { useThemeStore } from "@/store/theme";
import { createClient } from "@/lib/supabase/client";
import type { DayMeta } from "@/types";

export default function HomePage() {
  const [dayMetas, setDayMetas] = useState<DayMeta[]>([]);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), "yyyy-MM"));
  const theme = useThemeStore((s) => s.theme);
  const router = useRouter();

  const fetchMetas = useCallback(async (month: string) => {
    const res = await fetch(`/api/cards?month=${month}`);
    if (res.ok) setDayMetas(await res.json());
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

  const isCork = theme === "cork";

  return (
    <div className={`min-h-screen ${isCork ? "theme-cork" : "theme-card"}`}>
      {/* Navbar */}
      <nav className={`flex items-center justify-between px-6 py-4 ${isCork ? "bg-amber-800/30" : "bg-white border-b border-gray-100 shadow-sm"}`}>
        <h1 className={`text-xl font-bold tracking-wide ${isCork ? "text-amber-100" : "text-amber-700"}`}>
          Lumia
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className={`p-2 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/30 text-amber-100" : "hover:bg-gray-100 text-gray-500"}`}
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={handleLogout}
            className={`p-2 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/30 text-amber-100" : "hover:bg-gray-100 text-gray-500"}`}
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
