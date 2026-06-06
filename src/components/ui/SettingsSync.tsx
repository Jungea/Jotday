"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/store/theme";
import { useCardActionsStore } from "@/store/cardActions";
import { useFeedPresetsStore } from "@/store/feedPresets";
import { useShareSettingsStore } from "@/store/shareSettings";

export function SettingsSync() {
  const isSyncingRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debouncedSave() {
    if (isSyncingRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const { theme } = useThemeStore.getState();
      const { order, pinned } = useCardActionsStore.getState();
      const { presets } = useFeedPresetsStore.getState();
      const { expiryDays, daySort } = useShareSettingsStore.getState();
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          card_actions: { order, pinned },
          feed_presets: { presets },
          share_settings: { expiryDays, daySort },
        }),
      });
    }, 500);
  }

  useEffect(() => {
    const unsubs = [
      useThemeStore.subscribe(() => debouncedSave()),
      useCardActionsStore.subscribe(() => debouncedSave()),
      useFeedPresetsStore.subscribe(() => debouncedSave()),
      useShareSettingsStore.subscribe(() => debouncedSave()),
    ];

    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.theme) useThemeStore.getState().setTheme(data.theme);
          if (data.card_actions?.order)
            useCardActionsStore.setState({
              order: data.card_actions.order,
              pinned: data.card_actions.pinned,
            });
          if (data.feed_presets?.presets)
            useFeedPresetsStore.setState({ presets: data.feed_presets.presets });
          if (data.share_settings !== undefined && data.share_settings !== null) {
            useShareSettingsStore.getState().setExpiryDays(data.share_settings.expiryDays);
            if (data.share_settings.daySort)
              useShareSettingsStore.getState().setDaySort(data.share_settings.daySort);
          }
        }
      })
      .finally(() => {
        isSyncingRef.current = false;
      });

    return () => {
      unsubs.forEach((u) => u());
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
