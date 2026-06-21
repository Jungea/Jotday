import { useState, useEffect, useRef } from "react";
import { useUIStore } from "@/store/ui";

export function useScrollHeader() {
  const [showHeader, setShowHeader] = useState(true);
  const setShowNav = useUIStore((s) => s.setShowNav);
  const prevScrollTop = useRef(0);

  useEffect(() => {
    setShowNav(true);
    window.scrollTo(0, 0);
    return () => setShowNav(true);
  }, [setShowNav]);

  function onScroll(scrollTop: number) {
    const prev = prevScrollTop.current;
    prevScrollTop.current = scrollTop;

    if (scrollTop < 20) {
      setShowHeader(true);
      setShowNav(true);
    } else if (scrollTop > prev) {
      setShowHeader(false);
      setShowNav(false);
    } else if (scrollTop < prev) {
      setShowHeader(true);
      setShowNav(true);
    }
  }

  return { showHeader, onScroll };
}
