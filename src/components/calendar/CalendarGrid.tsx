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

  const metaMap = new Map(dayMetas.map((m) => [m.date, m]));

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = getDay(monthStart); // 0 = 일요일

  function handleDayClick(date: Date) {
    if (!isSameMonth(date, current)) return;
    router.push(`/${format(date, "yyyy-MM-dd")}`);
  }

  const isCork = theme === "cork";

  return (
    <div className={`w-full max-w-2xl mx-auto ${isCork ? "p-4" : "p-2"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => {
            const next = subMonths(current, 1);
            setCurrent(next);
            onMonthChange?.(format(next, "yyyy-MM"));
          }}
          className={`p-2 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/20 text-amber-900" : "hover:bg-gray-100 text-gray-600"}`}
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className={`text-xl font-bold ${isCork ? "text-amber-900" : "text-gray-900"}`}>
          {format(current, "yyyy년 M월", { locale: ko })}
        </h2>
        <button
          onClick={() => {
            const next = addMonths(current, 1);
            setCurrent(next);
            onMonthChange?.(format(next, "yyyy-MM"));
          }}
          className={`p-2 rounded-full transition-colors ${isCork ? "hover:bg-amber-800/20 text-amber-900" : "hover:bg-gray-100 text-gray-600"}`}
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
              i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : isCork ? "text-amber-800" : "text-gray-500"
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
              theme={theme}
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
  theme,
  onClick,
}: {
  day: Date;
  meta?: DayMeta;
  isToday: boolean;
  dow: number;
  theme: string;
  onClick: () => void;
}) {
  const isCork = theme === "cork";
  const hasRecord = !!meta && meta.count > 0;
  const dateNum = format(day, "d");

  if (isCork) {
    return (
      <button
        onClick={onClick}
        className="relative aspect-square flex flex-col items-center justify-center group"
      >
        {/* Cork note paper */}
        <div
          className={`
            w-full h-full rounded-sm flex flex-col items-center justify-center
            transition-transform group-hover:scale-105 group-hover:-rotate-1
            ${hasRecord ? "shadow-md" : ""}
            ${isToday ? "ring-2 ring-amber-500" : ""}
          `}
          style={{
            backgroundColor: hasRecord ? "#fdf6e3" : "rgba(255,255,255,0.1)",
            boxShadow: hasRecord ? "2px 2px 4px rgba(0,0,0,0.2)" : undefined,
          }}
        >
          {hasRecord && meta?.preview_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={meta.preview_image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-sm opacity-60"
            />
          )}
          <span
            className={`relative text-xs font-bold z-10 ${
              dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-600" : "text-amber-900"
            } ${isToday ? "bg-amber-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]" : ""}`}
          >
            {dateNum}
          </span>
          {hasRecord && meta!.count > 1 && (
            <span className="relative z-10 text-[9px] text-amber-700 font-medium">
              +{meta!.count}
            </span>
          )}
        </div>
        {/* Cork pin */}
        {hasRecord && (
          <div className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-sm z-20" />
        )}
      </button>
    );
  }

  // Card theme
  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square flex flex-col items-center justify-center rounded-lg
        transition-all hover:bg-amber-50 hover:shadow-sm
        ${hasRecord ? "bg-white shadow-sm border border-gray-100" : ""}
        ${isToday ? "ring-2 ring-amber-400" : ""}
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
            ? "bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
            : dow === 0
            ? "text-red-400"
            : dow === 6
            ? "text-blue-400"
            : "text-gray-700"
        }`}
      >
        {dateNum}
      </span>
      {hasRecord && (
        <div className="relative z-10 flex gap-0.5 mt-0.5">
          {Array.from({ length: Math.min(meta!.count, 3) }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-amber-400" />
          ))}
        </div>
      )}
    </button>
  );
}
