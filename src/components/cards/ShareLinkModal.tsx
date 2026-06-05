"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  url: string;
  expiresAt: string | null;
  onClose: () => void;
  isDark: boolean;
}

export function ShareLinkModal({ url, expiresAt, onClose, isDark }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expiryLabel = expiresAt
    ? `${format(parseISO(expiresAt), "yyyy.MM.dd")}까지 유효`
    : "만료 없음";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className={`relative w-full max-w-md rounded-t-2xl p-6 ${isDark ? "bg-[#1c1c1c]" : "bg-white"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>링크 공유</h3>
          <button onClick={onClose} className={isDark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-900"}>
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            readOnly
            value={url}
            className={`flex-1 text-xs px-3 py-2 rounded-lg border outline-none truncate ${
              isDark ? "bg-[#111] border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          />
          <button
            onClick={handleCopy}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              copied
                ? isDark ? "bg-green-700 text-white" : "bg-green-600 text-white"
                : isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"
            }`}
          >
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>

        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{expiryLabel}</p>
      </div>
    </div>
  );
}
