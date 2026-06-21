"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/store/theme";
import { useRecentEmojisStore } from "@/store/recentEmojis";

const MAX_RECENT = 32;

export async function saveRecent(value: string) {
  if (!value.trim()) return;
  const { items, setItems } = useRecentEmojisStore.getState();
  const next = [value.trim(), ...items.filter((e) => e !== value.trim())].slice(0, MAX_RECENT);
  setItems(next);
  await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recent_emojis: next }),
  });
}

interface EmojiPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const isDark = useThemeStore((s) => s.theme === "dark");
  const recent = useRecentEmojisStore((s) => s.items);
  const setItems = useRecentEmojisStore((s) => s.setItems);
  const hydrate = useRecentEmojisStore((s) => s.hydrate);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);

  return (
    <div className={`rounded-xl border ${isDark ? "bg-[#1a1a1a] border-gray-800" : "bg-gray-50 border-gray-200"}`}>

      {/* 입력창 */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="텍스트 또는 이모티콘 입력..."
          className={`flex-1 text-sm bg-transparent outline-none ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-400"}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`text-xs ${isDark ? "text-gray-600 hover:text-gray-400" : "text-gray-400 hover:text-gray-600"}`}
          >
            ✕
          </button>
        )}
      </div>

      {/* 최근 사용 */}
      <div>
        <div className="flex items-center justify-between px-3 pt-2 pb-1">
          <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            {recent.length > 0 ? "최근 사용" : "아직 사용한 항목이 없어요"}
          </p>
          {recent.length > 0 && (
            <button
              type="button"
              onClick={() => setDeleteMode((v) => !v)}
              className={`text-xs ${deleteMode ? isDark ? "text-white" : "text-gray-900" : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
            >
              {deleteMode ? "완료" : "삭제"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap overflow-y-auto max-h-28 gap-1 px-2 pt-1 pb-2">
          {recent.map((item, i) => {
            function removeItem() {
              const next = recent.filter((_, idx) => idx !== i);
              setItems(next);
              if (next.length === 0) setDeleteMode(false);
              fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recent_emojis: next }),
              });
            }
            return (
              <div key={`${item}-${i}`} className="flex-none relative mt-1">
                <button
                  type="button"
                  onClick={() => { if (!deleteMode) onChange(value + item); }}
                  className={`flex items-center justify-center h-9 px-2 rounded-lg text-sm whitespace-nowrap transition-all ${isDark ? "text-white hover:bg-gray-800 active:bg-gray-700" : "text-gray-900 hover:bg-gray-200 active:bg-gray-300"}`}
                  style={isDark ? { filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))" } : undefined}
                >
                  {item}
                </button>
                {deleteMode && (
                  <button
                    type="button"
                    onClick={removeItem}
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center ${isDark ? "bg-gray-600 text-gray-300" : "bg-gray-400 text-white"}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
