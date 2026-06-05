"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, GripVertical, LogOut } from "lucide-react";
import { useCardActionsStore, ACTION_LABELS } from "@/store/cardActions";
import type { ActionId } from "@/store/cardActions";
import { BottomTabBar } from "@/components/ui/BottomTabBar";
import { CollapsingHeader } from "@/components/ui/CollapsingHeader";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { useThemeStore } from "@/store/theme";
import { useFeedPresetsStore } from "@/store/feedPresets";
import { useShareSettingsStore } from "@/store/shareSettings";
import type { Theme } from "@/types";
import type { PresetItem, BuiltinKey } from "@/store/feedPresets";

const THEMES: { id: Theme; label: string; desc: string }[] = [
  { id: "light", label: "라이트", desc: "화이트 모노톤" },
  { id: "dark", label: "다크", desc: "블랙 모노톤" },
];

function SortableAction({ id, isDark, pinned, onToggle }: { id: ActionId; isDark: boolean; pinned: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const sub = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}>
      <button {...attributes} {...listeners} className={`touch-none ${isDark ? "text-gray-600" : "text-gray-300"}`}>
        <GripVertical size={16} />
      </button>
      <span className={`flex-1 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{ACTION_LABELS[id]}</span>
      <button onClick={onToggle} className={`transition-colors ${pinned ? (isDark ? "text-white" : "text-gray-900") : sub} hover:opacity-70`}>
        {pinned ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
}

function SortablePreset({
  preset,
  isDark,
  onToggleHidden,
}: {
  preset: PresetItem;
  isDark: boolean;
  onToggleHidden: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: preset.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isDark ? "bg-[#1c1c1c]" : "bg-gray-50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`touch-none ${isDark ? "text-gray-600" : "text-gray-300"}`}
      >
        <GripVertical size={16} />
      </button>
      <span className={`flex-1 text-sm ${preset.hidden ? (isDark ? "text-gray-600" : "text-gray-300") : (isDark ? "text-white" : "text-gray-900")}`}>
        {preset.label}
      </span>
      <button
        onClick={onToggleHidden}
        className={`transition-colors ${preset.hidden ? (isDark ? "text-gray-600" : "text-gray-300") : (isDark ? "text-gray-400" : "text-gray-400")} hover:text-gray-500`}
      >
        {preset.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useThemeStore();
  const { presets, reorder, toggleHidden } = useFeedPresetsStore();
  const { expiryDays, setExpiryDays } = useShareSettingsStore();
  const { order, pinned, toggle, reorder: reorderActions } = useCardActionsStore();
  const isDark = theme === "dark";
  const { showHeader, onScroll } = useScrollHeader();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = presets.findIndex((p) => p.id === active.id);
    const newIndex = presets.findIndex((p) => p.id === over.id);
    reorder(oldIndex, newIndex);
  }

  const sub = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      <CollapsingHeader show={showHeader} />

      <main className="flex-1 overflow-y-auto" onScroll={(e) => onScroll(e.currentTarget.scrollTop)}>
        <div className="p-6 max-w-md mx-auto space-y-8">
        {/* 테마 */}
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>테마</h2>
          <div className="space-y-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  theme === t.id
                    ? isDark ? "border-white bg-gray-800" : "border-gray-900 bg-gray-50"
                    : isDark ? "border-gray-800 bg-[#1c1c1c] hover:border-gray-700" : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 shrink-0 ${t.id === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-300"}`} />
                <div className="flex-1 text-left">
                  <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{t.label}</div>
                  <div className={`text-sm ${sub}`}>{t.desc}</div>
                </div>
                {theme === t.id && (
                  <Check size={18} className={isDark ? "text-white shrink-0" : "text-gray-900 shrink-0"} />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 피드 필터 */}
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>피드 필터</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={presets.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <SortablePreset
                    key={preset.id}
                    preset={preset}
                    isDark={isDark}
                    onToggleHidden={() => toggleHidden(preset.id as BuiltinKey)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* 링크 공유 */}
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>링크 공유 만료 기간</h2>
          <div className="flex gap-2 flex-wrap">
            {([{ label: "1일", value: 1 }, { label: "7일", value: 7 }, { label: "30일", value: 30 }, { label: "무제한", value: null }] as { label: string; value: number | null }[]).map((opt) => (
              <button
                key={opt.label}
                onClick={() => setExpiryDays(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
                  ${expiryDays === opt.value
                    ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                    : isDark ? "bg-[#1c1c1c] text-gray-400 border border-gray-800" : "bg-white text-gray-500 border border-gray-200"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* 카드 액션 */}
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>카드 액션 버튼</h2>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
            const { active, over } = e;
            if (!over || active.id === over.id) return;
            reorderActions(order.indexOf(active.id as ActionId), order.indexOf(over.id as ActionId));
          }}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.map((id) => (
                  <SortableAction key={id} id={id} isDark={isDark} pinned={pinned.includes(id)} onToggle={() => toggle(id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        {/* 로그아웃 */}
        <section>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-red-500 ${
              isDark ? "bg-[#1c1c1c] hover:bg-gray-800" : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        </section>
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
