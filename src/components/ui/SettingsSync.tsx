"use client";

import { useEffect, useRef } from "react";
import { useThemeStore } from "@/store/theme";
import { useCardActionsStore, DEFAULT_ORDER, type ActionId } from "@/store/cardActions";
import { useFeedPresetsStore } from "@/store/feedPresets";
import { useShareSettingsStore } from "@/store/shareSettings";
import { useRecentEmojisStore } from "@/store/recentEmojis";
import { useCalendarTagsStore } from "@/store/calendarTags";

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
      const { calendarTags, selectedTag } = useCalendarTagsStore.getState();
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          card_actions: { order, pinned },
          feed_presets: { presets },
          share_settings: { expiryDays, daySort },
          calendar_tags: calendarTags,
          calendar_selected_tag: selectedTag,
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
      useCalendarTagsStore.subscribe(() => debouncedSave()),
    ];

    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.theme) useThemeStore.getState().setTheme(data.theme);
          if (data.card_actions?.order) {
            const saved: ActionId[] = data.card_actions.order;
            const missing = DEFAULT_ORDER.filter((id) => !saved.includes(id));
            useCardActionsStore.setState({
              order: missing.length > 0 ? [...saved, ...missing] : saved,
              pinned: data.card_actions.pinned,
            });
          }
          if (data.feed_presets?.presets)
            useFeedPresetsStore.setState({ presets: data.feed_presets.presets });
          if (data.share_settings !== undefined && data.share_settings !== null) {
            useShareSettingsStore.getState().setExpiryDays(data.share_settings.expiryDays);
            if (data.share_settings.daySort)
              useShareSettingsStore.getState().setDaySort(data.share_settings.daySort);
          }
          if (Array.isArray(data.recent_emojis) && data.recent_emojis.length > 0)
            useRecentEmojisStore.getState().setItems(data.recent_emojis);
          if (Array.isArray(data.calendar_tags))
            useCalendarTagsStore.getState().setCalendarTags(data.calendar_tags);
          if ("calendar_selected_tag" in data)
            useCalendarTagsStore.getState().setSelectedTag(data.calendar_selected_tag ?? null);
        }
      })
      .finally(() => {
        isSyncingRef.current = false;
      });

    return () => {
      unsubs.forEach((u) => u());
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return null;
}
