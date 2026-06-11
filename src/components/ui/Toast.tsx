"use client";

import { useEffect, useState } from "react";
import { useToastStore } from "@/store/toast";

const FADE_DURATION = 300;   // CSS transition-duration과 일치
const DISPLAY_MS = 1700;     // 토스트 표시 유지 시간
const TOTAL_MS = DISPLAY_MS + FADE_DURATION;

function ToastItem({ message, onDone }: { message: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), DISPLAY_MS);
    const done = setTimeout(onDone, TOTAL_MS);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      className={`px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg transition-all duration-300 whitespace-nowrap
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      {message}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} onDone={() => removeToast(t.id)} />
      ))}
    </div>
  );
}
