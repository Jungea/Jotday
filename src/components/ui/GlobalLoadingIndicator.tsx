"use client";

import { useGlobalLoadingStore } from "@/store/globalLoading";

export function GlobalLoadingIndicator() {
  const active = useGlobalLoadingStore((s) => s.count > 0);
  if (!active) return null;
  return (
    <div className="fixed bottom-[72px] left-2 z-toast pointer-events-none">
      <div className="w-8 h-8 rounded-full bg-gray-900/80 flex items-center justify-center shadow-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
