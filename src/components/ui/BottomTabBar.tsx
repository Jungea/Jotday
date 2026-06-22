"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutList, Search, Settings, Sparkles } from "lucide-react";
import { useThemeStore } from "@/store/theme";
import { useUIStore } from "@/store/ui";

const TABS = [
  { href: "/",          icon: CalendarDays, label: "달력" },
  { href: "/feed",      icon: LayoutList,   label: "피드" },
  { href: "/memories",  icon: Sparkles,     label: "추억" },
  { href: "/search",    icon: Search,       label: "검색" },
  { href: "/settings",  icon: Settings,     label: "설정" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const isDark = useThemeStore((s) => s.theme === "dark");
  const showNav = useUIStore((s) => s.showNav);

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-tab flex border-t transition-transform duration-300 ${showNav ? "translate-y-0" : "translate-y-full"} ${isDark ? "bg-[#111] border-gray-800" : "bg-white border-gray-200"}`}>
      {TABS.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            prefetch={false}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors
              ${active
                ? isDark ? "text-white" : "text-gray-900"
                : isDark ? "text-gray-600" : "text-gray-400"
              }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[10px] ${active ? "font-semibold" : "font-normal"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
