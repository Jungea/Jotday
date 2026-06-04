"use client";

import { useThemeStore } from "@/store/theme";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  return <div className={`theme-${theme}`}>{children}</div>;
}
