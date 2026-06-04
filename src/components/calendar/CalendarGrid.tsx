"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import type { DayMeta } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarGridProps {
  dayMetas: DayMeta[];
  onMonthChange?: (month: string) => void;
}

export function CalendarGrid({ dayMetas, onMonthChange }: CalendarGridProps) {
  const [current, setCurrent] = useState(new Date());
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const metaMap = new Map(dayMetas.map((m) => [m.date, m]));

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  function handleDayClick(date: Date) {
    if (!isSameMonth(date, current)) return;
    router.push(`/${format(date, "yyyy-MM-dd")}`);
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const next = subMonths(current, 1);
            setCurrent(next);
            onMonthChange?.(format(next, "yyyy-MM"));
          }}
          className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
          {format(current, "yyyy년 M월", { locale: ko })}
        </h2>
        <button
          onClick={() => {
            const next = addMonths(current, 1);
            setCurrent(next);
            onMonthChange?.(format(next, "yyyy-MM"));
          }}
          className={`p-2 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-1 ${
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : isDark ? "text-gray-500" : "text-gray-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const meta = metaMap.get(key);
          const today = isToday(day);
          const dow = getDay(day);

          return (
            <DayCell
              key={key}
              day={day}
              meta={meta}
              isToday={today}
              dow={dow}
              isDark={isDark}
              onClick={() => handleDayClick(day)}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  day,
  meta,
  isToday,
  dow,
  isDark,
  onClick,
}: {
  day: Date;
  meta?: DayMeta;
  isToday: boolean;
  dow: number;
  isDark: boolean;
  onClick: () => void;
}) {
  const hasRecord = !!meta && meta.count > 0;
  const dateNum = format(day, "d");

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square flex flex-col items-center justify-center rounded-lg
        transition-all
        ${hasRecord
          ? isDark
            ? "bg-[#1c1c1c] shadow-sm border border-gray-800 hover:border-gray-600"
            : "bg-white shadow-sm border border-gray-200 hover:border-gray-300"
          : isDark
            ? "hover:bg-gray-800/50"
            : "hover:bg-gray-100"
        }
        ${isToday ? isDark ? "ring-2 ring-white" : "ring-2 ring-gray-900" : ""}
      `}
    >
      {hasRecord && meta?.preview_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.preview_image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-lg opacity-40"
        />
      )}
      <span
        className={`relative z-10 text-sm font-medium ${
          isToday
            ? isDark
              ? "bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs"
              : "bg-gray-900 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            : dow === 0
            ? "text-red-400"
            : dow === 6
            ? "text-blue-400"
            : isDark
            ? "text-gray-300"
            : "text-gray-700"
        }`}
      >
        {dateNum}
      </span>
      {hasRecord && (
        <div className="relative z-10 flex gap-0.5 mt-0.5">
          {Array.from({ length: Math.min(meta!.count, 3) }).map((_, i) => (
            <div key={i} className={`w-1 h-1 rounded-full ${isDark ? "bg-gray-500" : "bg-gray-400"}`} />
          ))}
        </div>
      )}
    </button>
  );
}
