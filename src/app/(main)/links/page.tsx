"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useThemeStore } from "@/store/theme";
import { useShareSettingsStore } from "@/store/shareSettings";

interface ShareToken {
  id: string;
  token: string;
  card_id: string | null;
  date: string | null;
  expires_at: string | null;
  created_at: string;
}

const EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: "1일", value: 1 },
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
  { label: "무제한", value: null },
];

export default function LinksPage() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const { expiryDays, setExpiryDays } = useShareSettingsStore();
  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [loading, setLoading] = useState(true);

  const sub = isDark ? "text-gray-500" : "text-gray-400";
  const cardCls = isDark
    ? "bg-[#1c1c1c] border border-gray-800"
    : "bg-white border border-gray-200 shadow-sm";

  useEffect(() => {
    fetch("/api/share")
      .then((r) => r.json())
      .then((data) => setTokens(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!window.confirm("이 링크를 만료 처리할까요?")) return;
    const res = await fetch(`/api/share?id=${id}`, { method: "DELETE" });
    if (res.ok) setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  function isExpired(token: ShareToken) {
    return !!token.expires_at && new Date(token.expires_at) < new Date();
  }

  return (
    <div className={`h-dvh flex flex-col ${isDark ? "theme-dark" : "theme-light"}`}>
      <header className={`shrink-0 flex items-center gap-3 px-4 py-3 border-b ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200 shadow-sm"}`}>
        <button
          onClick={() => router.back()}
          className={`p-1.5 rounded-full transition-colors ${isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}
        >
          <ArrowLeft size={20} />
        </button>
        <span className={`flex-1 text-base font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
          공유한 링크
        </span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-md mx-auto space-y-8">

          {/* 만료 기간 설정 */}
          <section>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>새 링크 만료 기간</h2>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setExpiryDays(opt.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    expiryDays === opt.value
                      ? isDark ? "bg-white text-black" : "bg-gray-900 text-white"
                      : isDark ? "bg-[#1c1c1c] text-gray-400 border border-gray-800" : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* 링크 목록 */}
          <section>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${sub}`}>링크 목록</h2>
            {loading ? (
              <div className="flex justify-center py-10">
                <div className={`w-7 h-7 border-4 border-t-transparent rounded-full animate-spin ${isDark ? "border-gray-600" : "border-gray-300"}`} />
              </div>
            ) : tokens.length === 0 ? (
              <p className={`text-sm text-center py-8 ${sub}`}>공유한 링크가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {tokens.map((token) => {
                  const expired = isExpired(token);
                  const label = token.date
                    ? format(parseISO(token.date), "yyyy년 M월 d일") + " 날짜 전체"
                    : "카드";
                  const expiryLabel = token.expires_at
                    ? format(parseISO(token.expires_at), "yyyy.MM.dd") + "까지 유효"
                    : "만료 없음";
                  const createdLabel = format(parseISO(token.created_at), "yyyy.MM.dd HH:mm");
                  const url = `${window.location.origin}/share/${token.token}`;

                  return (
                    <div key={token.id} className={`rounded-xl p-4 ${cardCls} ${expired ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                              {label}
                            </span>
                            {expired && (
                              <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-400"}`}>
                                만료됨
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${sub} truncate`}>{url}</p>
                          <div className={`flex gap-3 mt-1.5 text-xs ${sub}`}>
                            <span>{createdLabel} 생성</span>
                            <span>{expiryLabel}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!expired && (
                            <button
                              onClick={() => window.open(url, "_blank")}
                              className={`p-1.5 rounded-lg transition-colors ${isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-400"}`}
                            >
                              <ExternalLink size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(token.id)}
                            className={`p-1.5 rounded-lg transition-colors text-red-400 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
