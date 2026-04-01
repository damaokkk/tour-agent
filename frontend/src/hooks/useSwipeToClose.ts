import { useEffect } from 'react';

/**
 * 下滑手势关闭弹窗
 * 需求：6.2
 */
interface UseSwipeToCloseOptions {
  onClose: () => void;
  /** 触发关闭的最小下滑距离，默认 80px */
  threshold?: number;
  /** 是否启用，默认 true */
  enabled?: boolean;
}

function useSwipeToClose(
  ref: React.RefObject<HTMLElement | null>,
  options: UseSwipeToCloseOptions
): void {
  const { onClose, threshold = 80, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) return;

    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0].clientY;
      if (endY - startY > threshold) {
        onClose();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose, threshold, enabled]);
}

export default useSwipeToClose;
