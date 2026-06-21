"use client";

import { useModalHistoryBack } from "@/hooks/useModalHistoryBack";

interface Props {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
}

export function ConfirmModal({ message, confirmLabel = "삭제", onConfirm, onCancel, isDark }: Props) {
  useModalHistoryBack(onCancel);
  return (
    <div className="fixed inset-0 z-sheet flex items-end justify-center" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative w-full max-w-md rounded-t-2xl p-6 ${isDark ? "bg-[#1c1c1c]" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={`text-sm mb-6 ${isDark ? "text-gray-200" : "text-gray-800"}`}>{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-400 text-white hover:bg-red-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
