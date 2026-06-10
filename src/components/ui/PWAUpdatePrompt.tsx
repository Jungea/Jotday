"use client";

import { useEffect } from "react";
import { useToastStore } from "@/store/toast";

export function PWAUpdatePrompt() {
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      addToast("새 버전으로 업데이트됐어요");
    });
  }, [addToast]);

  return null;
}
