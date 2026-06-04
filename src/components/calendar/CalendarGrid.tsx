"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
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
  subDays,
  addDays,
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
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const metaMap = new Map(dayMetas.map((m) => [m.date, m]));

  const selectedMeta = selectedDay ? metaMap.get(selectedDay) : undefined;

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);
  const prevMonthEnd = endOfMonth(subMonths(current, 1));
  const prevDays = Array.from({ length: startPad }, (_, i) =>
    subDays(prevMonthEnd, startPad - 1 - i)
  );
  const totalCells = startPad + days.length;
  const endPad = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextMonthStart = startOfMonth(addMonths(current, 1));
  const nextDays = Array.from({ length: endPad }, (_, i) => addDays(nextMonthStart, i));

  function handleDayClick(date: Date) {
    if (!isSameMonth(date, current)) return;
    if (window.innerWidth < 640) {
      const key = format(date, "yyyy-MM-dd");
      setSelectedDay((prev) => (prev === key ? null : key));
    } else {
      router.push(`/${format(date, "yyyy-MM-dd")}`);
    }
  }

  return (
    <div className="w-full p-2">
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
        {prevDays.map((day) => (
          <GhostDayCell
            key={`prev-${format(day, "yyyy-MM-dd")}`}
            day={day}
            meta={metaMap.get(format(day, "yyyy-MM-dd"))}
            isDark={isDark}
            onClick={() => {
              const prev = subMonths(current, 1);
              setCurrent(prev);
              onMonthChange?.(format(prev, "yyyy-MM"));
              if (window.innerWidth < 640) setSelectedDay(format(day, "yyyy-MM-dd"));
              else router.push(`/${format(day, "yyyy-MM-dd")}`);
            }}
          />
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
              isSelected={selectedDay === key}
              dow={dow}
              isDark={isDark}
              onClick={() => handleDayClick(day)}
            />
          );
        })}
        {nextDays.map((day) => (
          <GhostDayCell
            key={`next-${format(day, "yyyy-MM-dd")}`}
            day={day}
            meta={metaMap.get(format(day, "yyyy-MM-dd"))}
            isDark={isDark}
            onClick={() => {
              const next = addMonths(current, 1);
              setCurrent(next);
              onMonthChange?.(format(next, "yyyy-MM"));
              if (window.innerWidth < 640) setSelectedDay(format(day, "yyyy-MM-dd"));
              else router.push(`/${format(day, "yyyy-MM-dd")}`);
            }}
          />
        ))}
      </div>

      {/* 모바일 바텀 시트 */}
      {selectedDay && (
        <>
          <div className={`fixed bottom-0 left-0 right-0 z-50 sm:hidden rounded-t-2xl shadow-xl p-5 ${isDark ? "bg-[#1c1c1c] border-t border-gray-800" : "bg-white border-t border-gray-200"}`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {format(new Date(selectedDay), "M월 d일 (EEE)", { locale: ko })}
                {selectedMeta && selectedMeta.count > 0 && (
                  <span className={`ml-2 text-sm font-normal ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {selectedMeta.count}개
                  </span>
                )}
              </span>
              <button onClick={() => setSelectedDay(null)} className={isDark ? "text-gray-500" : "text-gray-400"}>
                <X size={20} />
              </button>
            </div>

            {selectedMeta?.preview_image ? (
              <button onClick={() => router.push(`/${selectedDay}`)} className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedMeta.preview_image} alt="" className="w-full h-56 object-cover rounded-xl" />
              </button>
            ) : (
              <button
                onClick={() => router.push(`/${selectedDay}`)}
                className={`w-full h-40 rounded-xl flex items-center justify-center ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
              >
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>탭해서 보러가기</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DayCell({
  day,
  meta,
  isToday,
  isSelected,
  dow,
  isDark,
  onClick,
}: {
  day: Date;
  meta?: DayMeta;
  isToday: boolean;
  isSelected: boolean;
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
        relative aspect-square rounded-md transition-all
        ${hasRecord && meta?.preview_image
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
          className="absolute inset-0 w-full h-full object-cover rounded-md opacity-65"
        />
      )}

      {/* 날짜 — 모바일: 상단 가운데 / 데스크탑: 좌상단 */}
      <span
        className={`absolute z-10 text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
          top-1.5 left-1/2 -translate-x-1/2
          ${isToday
            ? isDark
              ? "bg-white text-black sm:top-1 sm:left-1.5 sm:translate-x-0"
              : "bg-gray-900 text-white sm:top-1 sm:left-1.5 sm:translate-x-0"
            : isSelected
            ? isDark
              ? "border-2 border-white text-white sm:border-0 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
              : "border-2 border-gray-900 text-gray-900 sm:border-0 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
            : dow === 0
            ? "text-red-400 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
            : dow === 6
            ? "text-blue-400 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
            : isDark
            ? "text-gray-300 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
            : "text-gray-700 sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block"
          }`}
      >
        {dateNum}
      </span>

      {/* 모바일: 점(하단 가운데) / 데스크탑: 카드 아이콘+뱃지(우하단) */}
      {hasRecord && (
        <>
          <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 w-1.5 h-1.5 rounded-full sm:hidden ${isSelected ? isDark ? "bg-white" : "bg-gray-900" : isDark ? "bg-gray-500" : "bg-gray-400"}`} />
          <span className={`absolute bottom-1.5 right-1.5 z-10 hidden sm:flex text-[9px] font-bold rounded w-4 h-4 items-center justify-center leading-none ${isDark ? "bg-gray-600 text-white" : "bg-gray-300 text-gray-800"}`}>
            {meta!.count}
          </span>
        </>
      )}
    </button>
  );
}

function GhostDayCell({ day, meta, isDark, onClick }: { day: Date; meta?: DayMeta; isDark: boolean; onClick: () => void }) {
  const dow = getDay(day);
  const hasRecord = !!meta && meta.count > 0;
  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded-md transition-all opacity-50 ${
        hasRecord
          ? isDark
            ? "bg-[#1c1c1c] border border-gray-800"
            : "bg-white border border-gray-200"
          : isDark
            ? "hover:bg-gray-800/50"
            : "hover:bg-gray-100"
      }`}
    >
      {hasRecord && meta?.preview_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={meta.preview_image} alt="" className="absolute inset-0 w-full h-full object-cover rounded-md opacity-65" />
      )}
      <span className={`absolute z-10 text-xs font-medium
        top-1.5 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center rounded-full
        sm:top-1 sm:left-1.5 sm:translate-x-0 sm:w-auto sm:h-auto sm:rounded-none sm:block
        ${dow === 0 ? "text-red-400/50" : dow === 6 ? "text-blue-400/50" : isDark ? "text-gray-600" : "text-gray-400"}`}>
        {format(day, "d")}
      </span>
      {hasRecord && (
        <>
          <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 w-1.5 h-1.5 rounded-full sm:hidden ${isDark ? "bg-gray-600" : "bg-gray-300"}`} />
          <span className={`absolute bottom-1.5 right-1.5 z-10 hidden sm:flex text-[9px] font-bold rounded w-4 h-4 items-center justify-center leading-none ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-200 text-gray-500"}`}>
            {meta!.count}
          </span>
        </>
      )}
    </button>
  );
}
