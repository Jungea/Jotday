"use client";

import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2, Pencil, Star, Download, Link, MoreHorizontal, Copy, Loader2, Check, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { useThemeStore } from "@/store/theme";
import { useShareSettingsStore } from "@/store/shareSettings";
import { useCardActionsStore } from "@/store/cardActions";
import { useToastStore } from "@/store/toast";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ImageSwiper } from "@/components/cards/ImageSwiper";
import { downloadCard, downloadAllCards } from "@/lib/download";
import type { Card } from "@/types";

function textToHsl(str: string, isDark: boolean) {
  let hash = 0;
  for (const ch of str) hash = (ch.codePointAt(0) ?? 0) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return isDark
    ? `hsl(${hue}, 30%, 18%), hsl(${hue}, 40%, 10%)`
    : `hsl(${hue}, 40%, 92%), hsl(${hue}, 50%, 82%)`;
}

interface CardItemProps {
  card: Card;
  isDark?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (card: Card) => void;
  onCopy?: (newCardId: string) => void;
  onMove?: (id: string) => void;
  onSetRepresentative?: (id: string) => void;
  shareView?: boolean;
  disableLightbox?: boolean;
  barGradient?: string;
}

interface ActionState {
  sharing: boolean;
  copying: boolean;
  starring: boolean;
  deleting: boolean;
  moving: boolean;
  linked: boolean;
  isRep: boolean;
}

interface ActionHandlers {
  onDownload: () => void;
  onLink?: () => void;
  onStar?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onMoveClick?: () => void;
}

interface ActionButtonsProps {
  size: number;
  btnBg: string;
  isDark: boolean;
  pinned: (id: string) => boolean;
  order: string[];
  showMore: boolean;
  setShowMore: (v: boolean | ((prev: boolean) => boolean)) => void;
  state: ActionState;
  handlers: ActionHandlers;
  starColor: string;
  starDimColor: string;
}

function ActionButtons({ size, btnBg, isDark, pinned, order, showMore, setShowMore, state, handlers, starColor, starDimColor }: ActionButtonsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);

  const { sharing, copying, starring, deleting, moving, linked, isRep } = state;
  const { onDownload, onLink, onStar, onEdit, onDelete, onCopy, onMoveClick } = handlers;

  function handleToggleMore() {
    if (!showMore && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isUp = window.innerHeight - rect.bottom < 200;
      setMenuPos(
        isUp
          ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
          : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
      );
    }
    setShowMore((v) => !v);
  }

  const p = pinned;
  const menuClass = `fixed z-menu rounded-xl shadow-lg py-1 min-w-[120px] ${isDark ? "bg-[#2a2a2a] border border-gray-700" : "bg-white border border-gray-200"}`;
  const itemClass = (active?: boolean) => `w-full flex items-center gap-2.5 px-3 py-2 text-xs ${active ? (isDark ? "text-white" : "text-gray-900") : (isDark ? "text-gray-300 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-50")}`;
  const btnClass = `${btnBg} rounded-full p-1.5 shadow ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`;

  const anyLoading = sharing || copying || starring || deleting || moving;
  const overflowLoading =
    (sharing && !p("link") && !!onLink) ||
    (copying && !p("copy") && !!onCopy) ||
    (starring && !p("star") && !!onStar) ||
    (deleting && !p("delete") && !!onDelete) ||
    (moving && !p("move") && !!onMoveClick);

  const overflowMap: Record<string, React.ReactElement | null> = {
    download: !p("download") ? <button key="dl" onClick={() => { setShowMore(false); onDownload(); }} disabled={anyLoading} className={itemClass()}>{sharing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} 다운로드</button> : null,
    link:     !p("link") && onLink ? <button key="lk" onClick={() => { setShowMore(false); onLink(); }} disabled={anyLoading} className={itemClass(linked)}>{sharing ? <Loader2 size={13} className="animate-spin" /> : linked ? <Check size={13} /> : <Link size={13} />} {linked ? "복사됨" : "링크 공유"}</button> : null,
    star:     !p("star") && onStar ? <button key="st" onClick={() => { setShowMore(false); onStar(); }} disabled={anyLoading} className={itemClass(isRep)}>{starring ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} fill={isRep ? "currentColor" : "none"} />} 대표 설정</button> : null,
    edit:     !p("edit") && onEdit ? <button key="ed" onClick={() => { setShowMore(false); onEdit(); }} disabled={anyLoading} className={itemClass()}><Pencil size={13} /> 수정</button> : null,
    delete:   !p("delete") && onDelete ? <button key="de" onClick={() => { setShowMore(false); onDelete(); }} disabled={anyLoading} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>{deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} 삭제</button> : null,
    copy:     !p("copy") && onCopy ? <button key="cp" onClick={() => { setShowMore(false); onCopy(); }} disabled={anyLoading} className={itemClass()}>{copying ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} {copying ? "복사 중..." : "복사"}</button> : null,
    move:     !p("move") && onMoveClick ? <button key="mv" onClick={() => { setShowMore(false); onMoveClick(); }} disabled={anyLoading} className={itemClass()}>{moving ? <Loader2 size={13} className="animate-spin" /> : <CalendarDays size={13} />} {moving ? "이동 중..." : "날짜 이동"}</button> : null,
  };
  const overflowEls = order.map((id) => overflowMap[id]).filter(Boolean) as React.ReactElement[];

  const pinnedMap: Record<string, React.ReactElement | null> = {
    download: p("download") ? <button key="dl" onClick={onDownload} disabled={anyLoading} className={btnClass}>{sharing ? <Loader2 size={size} className="animate-spin" /> : <Download size={size} />}</button> : null,
    link:     p("link") && onLink ? <button key="lk" onClick={onLink} disabled={anyLoading} className={`${btnClass} ${linked ? (isDark ? "text-white" : "text-gray-900") : ""}`}>{sharing ? <Loader2 size={size} className="animate-spin" /> : linked ? <Check size={size} /> : <Link size={size} />}</button> : null,
    star:     p("star") && onStar ? <button key="st" onClick={onStar} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow ${isRep ? starColor : starDimColor}`}>{starring ? <Loader2 size={size} className="animate-spin" /> : <Star size={size} fill={isRep ? "currentColor" : "none"} />}</button> : null,
    edit:     p("edit") && onEdit ? <button key="ed" onClick={onEdit} disabled={anyLoading} className={btnClass}><Pencil size={size} /></button> : null,
    delete:   p("delete") && onDelete ? <button key="de" onClick={onDelete} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow text-red-400 hover:text-red-600`}>{deleting ? <Loader2 size={size} className="animate-spin" /> : <Trash2 size={size} />}</button> : null,
    copy:     p("copy") && onCopy ? <button key="cp" onClick={onCopy} disabled={anyLoading} className={btnClass}>{copying ? <Loader2 size={size} className="animate-spin" /> : <Copy size={size} />}</button> : null,
    move:     p("move") && onMoveClick ? <button key="mv" onClick={onMoveClick} disabled={anyLoading} className={btnClass}>{moving ? <Loader2 size={size} className="animate-spin" /> : <CalendarDays size={size} />}</button> : null,
  };

  return (
    <>
      {order.map((id) => pinnedMap[id])}
      {overflowEls.length > 0 && (
        <div className="relative" ref={containerRef}>
          <button onClick={handleToggleMore} disabled={anyLoading} className={`${btnBg} rounded-full p-1.5 shadow ${linked ? (isDark ? "text-white" : "text-gray-900") : isDark ? "text-gray-400" : "text-gray-500"}`}>
            {overflowLoading ? <Loader2 size={size} className="animate-spin" /> : linked ? <Check size={size} /> : <MoreHorizontal size={size} />}
          </button>
          {showMore && menuPos && createPortal(
            <>
              <div className="fixed inset-0 z-menu-back" onClick={() => setShowMore(false)} />
              <div className={menuClass} style={menuPos}>{overflowEls}</div>
            </>,
            document.body
          )}
        </div>
      )}
    </>
  );
}

function HighlightedText({ text, isDark }: { text: string; isDark: boolean }) {
  const router = useRouter();
  const parts = text.split(/(#[^\s#]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span
            key={i}
            className={`cursor-pointer hover:underline ${isDark ? "text-gray-400" : "text-gray-500"}`}
            onClick={(e) => { e.stopPropagation(); router.push(`/search?tags=${part.slice(1).toLowerCase()}`); }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function ExpandableContent({ text, className, isDark }: { text: string; className: string; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={`${className} whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>
        <HighlightedText text={text} isDark={isDark} />
      </p>
      {(clamped || expanded) && (
        <button onClick={() => setExpanded((v) => !v)} className="text-xs text-gray-400 mt-1">
          {expanded ? "접기" : "더보기"}
        </button>
      )}
    </div>
  );
}

export function CardItem({ card, isDark: isDarkProp, onDelete, onEdit, onCopy, onMove, onSetRepresentative, shareView, disableLightbox, barGradient }: CardItemProps) {
  const theme = useThemeStore((s) => s.theme);
  const isDark = isDarkProp ?? theme === "dark";
  const { expiryDays } = useShareSettingsStore();
  const { order, pinned } = useCardActionsStore();
  const addToast = useToastStore((s) => s.addToast);
  const p = (id: string) => pinned.includes(id as never);
  const timeLabel = format(new Date(card.created_at), "HH:mm");

  const [sharing, setSharing] = useState(false);
  const [linked, setLinked] = useState(false);
  const [copying, setCopying] = useState(false);
  const [starring, setStarring] = useState(false);
  const [deleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetDate, setMoveTargetDate] = useState(card.date);
  const [showMore, setShowMore] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const images = card.images?.length > 0
    ? card.images
    : card.image_url
      ? [{ url: card.image_url, public_id: card.image_public_id ?? "" }]
      : [];

  const isRep = !!card.is_representative;
  const btnBg = isDark ? "bg-gray-800" : "bg-white";
  const starColor = isDark ? "text-white" : "text-gray-900";
  const starDimColor = isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900";
  const repGlow = isRep
    ? isDark
      ? "ring-2 ring-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
      : "ring-2 ring-gray-800/60 shadow-[0_0_20px_rgba(0,0,0,0.25)]"
    : "";

  const hasImages = images.length > 0;
  const effectiveOrder = (shareView ? ["download"] : order).filter((id) => id !== "download" || hasImages);
  const effectiveP = shareView ? () => true : p;

  async function handleDownload() {
    setSharing(true);
    const hasMultiple = (card.images?.length ?? 0) > 1;
    if (hasMultiple) await downloadAllCards(card);
    else await downloadCard(card);
    setSharing(false);
  }

  async function handleCopy() {
    setCopying(true);
    try {
      const formData = new FormData();
      formData.append("copy_from", card.id);
      formData.append("date", card.date);
      const res = await fetch("/api/cards", { method: "POST", body: formData });
      if (res.ok) {
        const newCard = await res.json();
        onCopy?.(newCard.id);
        addToast("카드가 복사됐어요");
      }
    } finally {
      setCopying(false);
    }
  }

  async function handleShareLink() {
    setSharing(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: card.id, expires_in_days: expiryDays }),
      });
      const data = await res.json();
      if (data.token) {
        const url = `${window.location.origin}/share/${data.token}`;
        await navigator.clipboard.writeText(url);
        setLinked(true);
        setTimeout(() => setLinked(false), 2000);
        addToast("링크가 복사됐어요");
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleStarClick() {
    setStarring(true);
    try {
      const formData = new FormData();
      formData.append("id", card.id);
      if (isRep) {
        formData.append("unset_representative", "true");
      } else {
        formData.append("set_representative", "true");
      }
      const res = await fetch("/api/cards", { method: "PATCH", body: formData });
      if (res.ok) {
        onSetRepresentative?.(card.id);
        addToast(isRep ? "대표 설정이 해제됐어요" : "대표 카드로 설정됐어요");
      }
    } finally {
      setStarring(false);
    }
  }

  async function handleMove() {
    setMoving(true);
    setShowMoveModal(false);
    try {
      const fd = new FormData();
      fd.append("id", card.id);
      fd.append("move_to_date", moveTargetDate);
      const res = await fetch("/api/cards", { method: "PATCH", body: fd });
      if (res.ok) {
        onMove?.(card.id);
        addToast("카드를 이동했어요");
      }
    } finally {
      setMoving(false);
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    onDelete?.(card.id);
    const res = await fetch(`/api/cards?id=${card.id}`, { method: "DELETE" });
    addToast(res.ok ? "카드가 삭제됐어요" : "삭제에 실패했어요");
  }

  const actionState: ActionState = { sharing, copying, starring, deleting, moving, linked, isRep };
  const actionHandlers: ActionHandlers = {
    onDownload: handleDownload,
    onLink: shareView ? undefined : handleShareLink,
    onStar: shareView ? undefined : (onSetRepresentative && hasImages ? handleStarClick : undefined),
    onEdit: onEdit ? () => onEdit(card) : undefined,
    onDelete: onDelete ? () => setShowDeleteConfirm(true) : undefined,
    onCopy: onCopy ? handleCopy : undefined,
    onMoveClick: onMove ? () => setShowMoveModal(true) : undefined,
  };

  const sharedActionProps = {
    btnBg,
    isDark,
    pinned: effectiveP,
    order: effectiveOrder,
    showMore,
    setShowMore,
    state: actionState,
    handlers: actionHandlers,
    starColor,
    starDimColor,
  };

  return (
    <>
      <div id={`card-${card.id}`} className={`rounded-xl ${repGlow}`}>
        <div className={`relative rounded-xl overflow-hidden group ${
          isDark
            ? "bg-[#1c1c1c] border border-gray-800 shadow-none"
            : "bg-white shadow-sm border border-gray-200"
        }`}>
          {images.length > 0 && (
            <div className={`relative z-[1] overflow-hidden ${card.content ? "rounded-t-xl" : "rounded-xl"}`}>
              <ImageSwiper images={images} disableLightbox={disableLightbox} />
              {card.emojis?.[0] && (
                <div className="absolute bottom-2 left-3 z-10">
                  <span className="text-2xl drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{card.emojis[0]}</span>
                </div>
              )}
            </div>
          )}
          {images.length === 0 && card.emojis?.[0] && (
            <div
              className={`flex items-center justify-center px-6 py-8 ${card.content ? "rounded-t-xl" : "rounded-xl"}`}
              style={{ background: `linear-gradient(135deg, ${textToHsl(card.emojis[0], isDark ?? false)})` }}
            >
              {(() => {
                const e = card.emojis[0];
                const fs = e.length <= 2 ? "6rem" : e.length <= 6 ? "3.5rem" : "2rem";
                return (
                  <span
                    className={`leading-none text-center ${isDark ? "text-white" : "text-gray-900"}`}
                    style={{ fontSize: fs }}
                  >
                    {e}
                  </span>
                );
              })()}
            </div>
          )}
          <div className="flex items-stretch">
            {barGradient && (
              <div className="w-[3px] flex-shrink-0" style={{ background: barGradient }} />
            )}
            <div className="flex-1 p-4">
              {card.content && (
                <ExpandableContent
                  text={card.content}
                  className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  isDark={isDark}
                />
              )}
              <div className="flex items-center justify-between mt-2">
                <p className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>{timeLabel}</p>
                <div className="flex gap-1 items-center">
                  <ActionButtons size={13} {...sharedActionProps} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showMoveModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40">
          <div className={`rounded-2xl p-5 w-72 shadow-xl ${isDark ? "bg-[#1c1c1c]" : "bg-white"}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>날짜 이동</h3>
            <input
              type="date"
              value={moveTargetDate}
              onChange={(e) => setMoveTargetDate(e.target.value)}
              onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
              className={`w-full border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-gray-400 ${isDark ? "border-gray-700 bg-[#111] text-white" : "border-gray-200 bg-white text-gray-900"}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowMoveModal(false); setMoveTargetDate(card.date); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${isDark ? "bg-gray-800 text-gray-200 hover:bg-gray-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                취소
              </button>
              <button
                onClick={handleMove}
                disabled={!moveTargetDate || moveTargetDate === card.date}
                className={`flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-40 ${isDark ? "bg-white text-black hover:bg-gray-200" : "bg-gray-900 text-white hover:bg-gray-700"}`}
              >
                이동
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          message="카드를 삭제할까요?"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isDark={isDark}
        />
      )}
    </>
  );
}
