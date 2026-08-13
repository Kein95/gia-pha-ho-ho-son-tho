import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

export function usePanZoom(
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const [scale, setScale] = useState(1);

  // Pinch-to-zoom tracking
  const lastPinchDistRef = useRef<number | null>(null);
  const lastTouchCountRef = useRef(0);

  const handleZoomIn = useCallback(
    () => setScale((s) => Math.min(s + 0.1, 2)),
    [],
  );
  const handleZoomOut = useCallback(
    () => setScale((s) => Math.max(s - 0.1, 0.3)),
    [],
  );
  const handleResetZoom = useCallback(() => setScale(1), []);

  // --- Mouse handlers ---
  const handleMouseDown = (e: MouseEvent<HTMLElement>) => {
    setIsPressed(true);
    hasDraggedRef.current = false;
    setDragStart({ x: e.pageX, y: e.pageY });
    if (containerRef.current) {
      setScrollStart({
        left: containerRef.current.scrollLeft,
        top: containerRef.current.scrollTop,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (!isPressed || !containerRef.current) return;

    const dx = e.pageX - dragStart.x;
    const dy = e.pageY - dragStart.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      setIsDragging(true);
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      e.preventDefault();
      containerRef.current.scrollLeft = scrollStart.left - dx;
      containerRef.current.scrollTop = scrollStart.top - dy;
    }
  };

  const handleMouseUpOrLeave = () => {
    setIsPressed(false);
    setIsDragging(false);
  };

  const handleClickCapture = (e: MouseEvent<HTMLElement>) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
      hasDraggedRef.current = false;
    }
  };

  // --- Native touch listeners (non-passive so preventDefault works) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const startDrag = (x: number, y: number) => {
      setIsPressed(true);
      hasDraggedRef.current = false;
      setDragStart({ x, y });
      if (containerRef.current) {
        setScrollStart({
          left: containerRef.current.scrollLeft,
          top: containerRef.current.scrollTop,
        });
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const count = e.touches.length;
      if (count === 1) {
        // Single finger pan
        const touch = e.touches[0];
        startDrag(touch.pageX, touch.pageY);
      } else if (count === 2) {
        // Pinch-to-zoom start
        setIsPressed(false);
        setIsDragging(false);
        lastPinchDistRef.current = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY,
        );
      }
      lastTouchCountRef.current = count;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const count = e.touches.length;
      // Transition 2→1 fingers: resume pan from the remaining finger
      if (count === 1 && lastTouchCountRef.current === 2) {
        setIsPressed(false);
        setIsDragging(false);
        lastPinchDistRef.current = null;
        const touch = e.touches[0];
        startDrag(touch.pageX, touch.pageY);
      }

      if (count === 1 && isPressed && containerRef.current) {
        const touch = e.touches[0];
        const dx = touch.pageX - dragStart.x;
        const dy = touch.pageY - dragStart.y;

        if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
          setIsDragging(true);
          hasDraggedRef.current = true;
        }

        if (hasDraggedRef.current) {
          containerRef.current.scrollLeft = scrollStart.left - dx;
          containerRef.current.scrollTop = scrollStart.top - dy;
        }
      } else if (count === 2 && lastPinchDistRef.current !== null) {
        // Pinch-to-zoom
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY,
        );
        const delta = dist - lastPinchDistRef.current;
        if (Math.abs(delta) > 5) {
          setScale((s) => {
            const newScale = s + delta * 0.005;
            return Math.min(Math.max(newScale, 0.3), 2);
          });
          lastPinchDistRef.current = dist;
        }
      }
      lastTouchCountRef.current = count;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      setIsPressed(false);
      setIsDragging(false);
      lastPinchDistRef.current = null;
      lastTouchCountRef.current = e.touches.length;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setScale((s) => {
        const delta = -e.deltaY * 0.01;
        return Math.min(Math.max(s + delta, 0.3), 2);
      });
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchEnd);
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, isPressed, dragStart, scrollStart]);

  return {
    scale,
    isPressed,
    isDragging,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUpOrLeave,
      handleClickCapture,
      handleZoomIn,
      handleZoomOut,
      handleResetZoom,
    },
  };
}
