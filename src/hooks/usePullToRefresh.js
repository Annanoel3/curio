import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh, threshold = 70) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (startY.current === null) return;
      const dist = e.touches[0].clientY - startY.current;
      if (dist > 0 && window.scrollY === 0) {
        setPulling(true);
        setPullDistance(Math.min(dist * 0.5, threshold + 20));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !refreshing.current) {
        refreshing.current = true;
        await onRefresh();
        refreshing.current = false;
      }
      startY.current = null;
      setPulling(false);
      setPullDistance(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onRefresh, pullDistance, threshold]);

  return { pulling, pullDistance };
}