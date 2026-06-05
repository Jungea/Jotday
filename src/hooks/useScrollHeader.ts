import { useState } from "react";

export function useScrollHeader() {
  const [showHeader, setShowHeader] = useState(true);

  function onScroll(scrollTop: number) {
    if (scrollTop > 76) setShowHeader(false);
    else if (scrollTop < 20) setShowHeader(true);
  }

  return { showHeader, onScroll };
}
