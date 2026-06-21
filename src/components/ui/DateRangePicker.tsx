"use client";

import { useState } from "react";
import {
  format, parseISO, isValid, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isBefore, isWithinInterval,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  isDark: boolean;
}

type Picking = "start" | "end" | "range";

function toDate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
}

function buildGrid(month: Date): (Date | null)[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const offset = (start.getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...days];
}

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export function DateRangePicker({ from, to, onChange, isDark }: Props) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<Picking>("range");
  const [month, setMonth] = useState(toDate(from) ?? new Date());
  const [hovered, setHovered] = useState<Date | null>(null);
  const [showJump, setShowJump] = useState(false);

  const currentYear = month.getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  function handleJump(year: number, m: number) {
    setMonth(new Date(year, m - 1, 1));
    setShowJump(false);
  }

  const fromDate = toDate(from);
  const toDate_ = toDate(to);
  const hasRange = !!fromDate && !!toDate_;

  function openAs(mode: Picking, anchor?: Date) {
    setPicking(mode);
    if (anchor) setMonth(anchor);
    setShowJump(false);
    setOpen(true);
  }

  function handleDay(day: Date) {
    if (picking === "start") {
      // 시작일만 변경, 종료일보다 늦으면 종료일도 조정
      const newTo = toDate_ && isBefore(toDate_, day) ? format(day, "yyyy-MM-dd") : to;
      onChange(format(day, "yyyy-MM-dd"), newTo);
      setOpen(false);
    } else if (picking === "end") {
      // 종료일만 변경, 시작일보다 빠르면 시작일도 조정
      const newFrom = fromDate && isBefore(day, fromDate) ? format(day, "yyyy-MM-dd") : from;
      onChange(newFrom, format(day, "yyyy-MM-dd"));
      setOpen(false);
    } else {
      // 범위 선택 모드
      if (!fromDate || (fromDate && toDate_)) {
        onChange(format(day, "yyyy-MM-dd"), "");
      } else {
        if (isBefore(day, fromDate)) {
          onChange(format(day, "yyyy-MM-dd"), format(fromDate, "yyyy-MM-dd"));
        } else {
          onChange(format(fromDate, "yyyy-MM-dd"), format(day, "yyyy-MM-dd"));
        }
        setOpen(false);
      }
    }
  }

  function handleReset() {
    onChange("", "");
    setPicking("range");
  }

  function isInRange(day: Date) {
    const f = fromDate;
    const t = picking === "range" && !toDate_ && hovered ? hovered : toDate_;
    if (!f || !t) return false;
    const [s, e] = isBefore(f, t) ? [f, t] : [t, f];
    return isWithinInterval(day, { start: s, end: e });
  }

  function isStart(day: Date) { return !!fromDate && isSameDay(day, fromDate); }
  function isEnd(day: Date)   { return !!toDate_ && isSameDay(day, toDate_); }
  function isEdge(day: Date)  { return isStart(day) || isEnd(day); }

  const grid = buildGrid(month);

  const c = {
    bg:    isDark ? "bg-[#1a1a1a]" : "bg-white",
    text:  isDark ? "text-white" : "text-gray-900",
    sub:   isDark ? "text-gray-500" : "text-gray-400",
    nav:   isDark ? "hover:bg-gray-800" : "hover:bg-gray-100",
    range: isDark ? "bg-white/10" : "bg-black/[0.06]",
    edge:  isDark ? "bg-white text-black" : "bg-gray-900 text-white",
    hover: isDark ? "hover:bg-white/10" : "hover:bg-gray-100",
    btn:   `flex-1 px-3 py-1.5 rounded-lg text-sm text-left border transition-colors`,
  };

  const btnBase = isDark
    ? "bg-gray-900 border-gray-700 text-white"
    : "bg-white border-gray-300 text-gray-900";
  const btnActive = isDark
    ? "border-white"
    : "border-gray-900";

  return (
    <>
      {/* Trigger */}
      <div className="flex items-center gap-2">
        <button
          className={`${c.btn} ${btnBase} ${open && picking === "start" ? btnActive : ""}`}
          onClick={() => hasRange ? openAs("start", fromDate) : openAs("range", fromDate ?? new Date())}
        >
          {from ? format(parseISO(from), "yyyy.MM.dd") : <span className={c.sub}>시작일</span>}
        </button>
        <span className={`text-sm ${c.sub}`}>~</span>
        <button
          className={`${c.btn} ${btnBase} ${open && picking === "end" ? btnActive : ""}`}
          onClick={() => hasRange ? openAs("end", toDate_ ?? new Date()) : openAs("range", fromDate ?? new Date())}
        >
          {to ? format(parseISO(to), "yyyy.MM.dd") : <span className={c.sub}>종료일</span>}
        </button>
      </div>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-sheet flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setShowJump(false); }} />

          <div className={`relative rounded-t-2xl px-5 pt-4 pb-10 ${c.bg}`}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-gray-400/40 mx-auto mb-4" />

            {/* Month nav */}
            <div className={`flex items-center justify-between mb-4 ${c.text}`}>
              <button
                onClick={() => setMonth(subMonths(month, 1))}
                className={`p-1.5 rounded-full ${c.nav} transition-colors`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setShowJump(true)}
                className={`text-sm font-semibold px-2 py-1 rounded-lg transition-colors ${c.nav}`}
              >
                {format(month, "yyyy년 M월", { locale: ko })}
              </button>
              <button
                onClick={() => setMonth(addMonths(month, 1))}
                className={`p-1.5 rounded-full ${c.nav} transition-colors`}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {showJump ? (
              <>
                {/* 연도 선택 */}
                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none mb-4">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => handleJump(y, month.getMonth() + 1)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                        ${y === currentYear
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
                      onClick={() => handleJump(currentYear, m)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-colors
                        ${m === month.getMonth() + 1
                          ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                          : isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* 안내 문구 */}
                <p className={`text-xs text-center mb-3 ${c.sub}`}>
                  {picking === "start" ? "시작일을 선택하세요"
                    : picking === "end" ? "종료일을 선택하세요"
                    : !fromDate ? "시작일을 선택하세요"
                    : !toDate_ ? "종료일을 선택하세요"
                    : "날짜를 선택하세요"}
                </p>

                {/* Weekdays */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className={`text-center text-xs py-1 ${c.sub}`}>{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7">
                  {grid.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const edge = isEdge(day);
                    const inRange = isInRange(day);
                    const start = isStart(day);
                    const end = isEnd(day);

                    return (
                      <div
                        key={i}
                        className="relative flex items-center justify-center h-10"
                        onMouseEnter={() => picking === "range" && !toDate_ && setHovered(day)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {inRange && !edge && (
                          <div className={`absolute inset-y-1 left-0 right-0 ${c.range}`} />
                        )}
                        {start && toDate_ && (
                          <div className={`absolute inset-y-1 left-1/2 right-0 ${c.range}`} />
                        )}
                        {end && fromDate && !isSameDay(fromDate, day) && (
                          <div className={`absolute inset-y-1 left-0 right-1/2 ${c.range}`} />
                        )}
                        <button
                          onClick={() => handleDay(day)}
                          className={`relative z-10 w-9 h-9 rounded-full text-sm font-medium transition-colors
                            ${edge ? c.edge : `${c.text} ${c.hover}`}`}
                        >
                          {format(day, "d")}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 재설정 */}
                {hasRange && (
                  <button
                    onClick={handleReset}
                    className={`mt-4 w-full py-2 rounded-xl text-sm transition-colors ${c.sub} ${c.nav}`}
                  >
                    재설정
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
