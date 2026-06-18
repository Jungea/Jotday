import { useState, useEffect } from "react";

export function useScrollHeader() {
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  function onScroll(scrollTop: number) {
    if (scrollTop > 76) setShowHeader(false);
    else if (scrollTop < 20) setShowHeader(true);
  }

  return { showHeader, onScroll };
}
