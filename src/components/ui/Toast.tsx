"use client";

import { useEffect, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
}

interface ToastItemProps {
  message: string;
  duration?: number;
  onDone: () => void;
}

function ToastItem({ message, duration = 2000, onDone }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), duration - 300);
    const done = setTimeout(onDone, duration);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, [duration, onDone]);

  return (
    <div
      className={`px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg transition-all duration-300 whitespace-nowrap
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
    >
      {message}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDone: (id: number) => void;
}

export function ToastContainer({ toasts, onDone }: ToastContainerProps) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} message={t.message} onDone={() => onDone(t.id)} />
      ))}
    </div>
  );
}

let _toastId = 0;
export function createToast(message: string): ToastItem {
  return { id: ++_toastId, message };
}
