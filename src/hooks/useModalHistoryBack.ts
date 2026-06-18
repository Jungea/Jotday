"use client";

import { useEffect, useRef } from "react";

/**
 * 전역 스택으로 모달 뒤로가기를 관리한다.
 * - 모달 열림(마운트) 시: history에 더미 항목 추가 + 스택에 핸들러 등록
 * - 뒤로가기(popstate): 스택 최상단 핸들러만 실행 → 중첩 모달 안전하게 처리
 * - X버튼(onClose 직접 호출) 시: 스택에서 제거만 하고 history.back()은 호출 안 함
 *   → 더미 항목이 남지만 다음 뒤로가기 시 stack이 비어 아무 일도 없이 소비됨
 */

const stack: Array<() => void> = [];
let listenerAdded = false;

function ensureListener() {
  if (listenerAdded || typeof window === "undefined") return;
  listenerAdded = true;
  window.addEventListener("popstate", () => {
    const handler = stack.pop();
    handler?.();
  });
}

export function useModalHistoryBack(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    ensureListener();
    const handler = () => onCloseRef.current();
    history.pushState({ modal: true }, "");
    stack.push(handler);
    return () => {
      const idx = stack.indexOf(handler);
      if (idx !== -1) stack.splice(idx, 1);
    };
  }, []);
}
