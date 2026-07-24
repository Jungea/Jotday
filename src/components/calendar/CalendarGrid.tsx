"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  format,
  parse,
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
import { DaySheet } from "@/components/ui/DaySheet";
import type { DayMeta } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarGridProps {
  dayMetas: DayMeta[];
  onMonthChange?: (month: string) => void;
  initialMonth?: string;
  onDataChange?: () => void;
  availableTags?: string[];
  selectedTag?: string | null;
  onTagSelect?: (tag: string | null) => void;
  tagDayMetas?: DayMeta[];
}

export function CalendarGrid({ dayMetas, onMonthChange, initialMonth, onDataChange, availableTags, selectedTag, onTagSelect, tagDayMetas }: CalendarGridProps) {
  const [current, setCurrent] = useState(() =>
    initialMonth ? parse(initialMonth, "yyyy-MM", new Date()) : new Date()
  );
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [jumpDragY, setJumpDragY] = useState(0);
  const [jumpIsDragging, setJumpIsDragging] = useState(false);
  const jumpStartY = useRef(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialMonth) setCurrent(parse(initialMonth, "yyyy-MM", new Date()));
  }, [initialMonth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentYear = current.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  function onJumpPointerDown(e: React.PointerEvent) {
    setJumpIsDragging(true);
    jumpStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onJumpPointerMove(e: React.PointerEvent) {
    if (!jumpIsDragging) return;
    setJumpDragY(Math.max(0, e.clientY - jumpStartY.current));
  }
  function onJumpPointerUp(e: React.PointerEvent) {
    if (!jumpIsDragging) return;
    setJumpIsDragging(false);
    if (e.clientY - jumpStartY.current > 120) setShowJump(false);
    setJumpDragY(0);
  }

  function handleJump(year: number, month: number) {
    const next = new Date(year, month - 1, 1);
    setCurrent(next);
    onMonthChange?.(format(next, "yyyy-MM"));
    setShowJump(false);
  }
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const isDark = theme === "dark";

  const metaMap = new Map(dayMetas.map((m) => [m.date, m]));
  const tagMetaMap = new Map((tagDayMetas ?? []).map((m) => [m.date, m]));

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
    <div className="w-full p-2" ref={gridRef}>
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
        <button
          onClick={() => { setSelectedYear(currentYear); setShowJump(true); }}
          className={`text-xl font-bold px-2 py-1 rounded-lg transition-colors ${isDark ? "text-white hover:bg-gray-800" : "text-gray-900 hover:bg-gray-100"}`}
        >
          {format(current, "yyyy년 M월", { locale: ko })}
        </button>
        <div className="flex items-center gap-1">
          {format(current, "yyyy-MM") !== format(new Date(), "yyyy-MM") && (
            <button
              onClick={() => {
                const today = new Date();
                setCurrent(today);
                onMonthChange?.(format(today, "yyyy-MM"));
              }}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              오늘
            </button>
          )}
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

      {/* 태그 필터 칩 */}
      {availableTags && availableTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagSelect?.(selectedTag === tag ? null : tag)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                ${selectedTag === tag
                  ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                  : isDark ? "bg-gray-800 text-gray-400 hover:bg-gray-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {prevDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (
            <GhostDayCell
              key={`prev-${key}`}
              day={day}
              meta={metaMap.get(key)}
              isDark={isDark}
              onClick={() => {
                const prev = subMonths(current, 1);
                setCurrent(prev);
                onMonthChange?.(format(prev, "yyyy-MM"));
              }}
              tagMeta={selectedTag ? tagMetaMap.get(key) : undefined}
              tagActive={!!selectedTag}
            />
          );
        })}
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
              tagMeta={selectedTag ? tagMetaMap.get(key) : undefined}
              tagActive={!!selectedTag}
            />
          );
        })}
        {nextDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          return (
            <GhostDayCell
              key={`next-${key}`}
              day={day}
              meta={metaMap.get(key)}
              isDark={isDark}
              onClick={() => {
                const next = addMonths(current, 1);
                setCurrent(next);
                onMonthChange?.(format(next, "yyyy-MM"));
              }}
              tagMeta={selectedTag ? tagMetaMap.get(key) : undefined}
              tagActive={!!selectedTag}
            />
          );
        })}
      </div>

      {/* 연도/월 빠른 점프 */}
      {showJump && (
        <div className="fixed inset-0 z-sheet flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowJump(false)} />
          <div
            className={`relative rounded-t-2xl px-5 pt-4 pb-10 ${isDark ? "bg-[#1a1a1a]" : "bg-white"}`}
            style={{
              transform: `translateY(${jumpDragY}px)`,
              transition: jumpIsDragging ? "none" : "transform 0.25s ease",
            }}
          >
            <div
              className="flex justify-center py-1 mb-4 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={onJumpPointerDown}
              onPointerMove={onJumpPointerMove}
              onPointerUp={onJumpPointerUp}
              onPointerLeave={onJumpPointerUp}
            >
              <div className="w-10 h-1 rounded-full bg-gray-400/40" />
            </div>

            {/* 연도 선택 */}
            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${y === selectedYear
                      ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                      : isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {y}
                </button>
              ))}
            </div>

            {/* 월 선택 */}
            <div className="grid grid-cols-4 gap-2">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => handleJump(selectedYear, m)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors
                    ${m === current.getMonth() + 1
                      ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                      : isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {m}월
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 모바일 날짜 시트 */}
      {selectedDay && (
        <div className="sm:hidden">
          <DaySheet
            date={selectedDay}
            isDark={isDark}
            onClose={() => setSelectedDay(null)}
            onDataChange={onDataChange}
            collapsedHeight="40dvh"
            showBackdrop={false}
          />
        </div>
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
  tagMeta,
  tagActive,
}: {
  day: Date;
  meta?: DayMeta;
  isToday: boolean;
  isSelected: boolean;
  dow: number;
  isDark: boolean;
  onClick: () => void;
  tagMeta?: DayMeta;
  tagActive?: boolean;
}) {
  const hasRecord = !!meta && meta.count > 0;
  const hasTagRecord = !!tagMeta && tagMeta.count > 0;
  const dateNum = format(day, "d");

  // 태그 필터 활성 시: 해당 태그 카드 썸네일 표시, 없으면 dim
  const displayImage = tagActive
    ? (hasTagRecord ? tagMeta!.preview_image : null)
    : meta?.preview_image ?? null;
  const displayEmoji = tagActive
    ? (hasTagRecord && !tagMeta!.preview_image ? tagMeta!.preview_emoji : null)
    : (!meta?.preview_image ? meta?.preview_emoji ?? null : null);
  const dimmed = tagActive && !hasTagRecord;

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-md transition-all
        ${hasRecord && displayImage
          ? isDark
            ? "bg-[#1c1c1c] shadow-sm border border-gray-800 hover:border-gray-600"
            : "bg-white shadow-sm border border-gray-200 hover:border-gray-300"
          : isDark
            ? "hover:bg-gray-800/50"
            : "hover:bg-gray-100"
        }
        ${isToday ? isDark ? "ring-2 ring-white" : "ring-2 ring-gray-900" : ""}
        ${dimmed ? "opacity-30" : ""}
      `}
    >
      {displayImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displayImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-md opacity-65"
        />
      )}
      {!displayImage && displayEmoji && (
        <div className={`absolute inset-0 flex items-center justify-center rounded-md ${isDark ? "bg-[#1a2535]" : "bg-gray-100"}`}>
          <span className="text-2xl leading-none">{displayEmoji}</span>
        </div>
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

function GhostDayCell({ day, meta, isDark, onClick, tagMeta, tagActive }: { day: Date; meta?: DayMeta; isDark: boolean; onClick: () => void; tagMeta?: DayMeta; tagActive?: boolean }) {
  const dow = getDay(day);
  const hasRecord = !!meta && meta.count > 0;
  const hasTagRecord = !!tagMeta && tagMeta.count > 0;

  const displayImage = tagActive
    ? (hasTagRecord ? tagMeta!.preview_image : null)
    : meta?.preview_image ?? null;
  const displayEmoji = tagActive
    ? (hasTagRecord && !tagMeta!.preview_image ? tagMeta!.preview_emoji : null)
    : (!meta?.preview_image ? meta?.preview_emoji ?? null : null);
  const dimmed = tagActive && !hasTagRecord;

  return (
    <button
      onClick={onClick}
      className={`relative aspect-square rounded-md transition-all opacity-50 ${
        hasRecord && displayImage
          ? isDark
            ? "bg-[#1c1c1c] border border-gray-800"
            : "bg-white border border-gray-200"
          : isDark
            ? "hover:bg-gray-800/50"
            : "hover:bg-gray-100"
      } ${dimmed ? "!opacity-15" : ""}`}
    >
      {displayImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayImage} alt="" className="absolute inset-0 w-full h-full object-cover rounded-md opacity-65" />
      )}
      {!displayImage && displayEmoji && (
        <div className={`absolute inset-0 flex items-center justify-center rounded-md ${isDark ? "bg-[#1a2535]" : "bg-gray-100"}`}>
          <span className="text-2xl leading-none">{displayEmoji}</span>
        </div>
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
