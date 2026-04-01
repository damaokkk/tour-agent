import { useEffect } from 'react';

/**
 * 锁定/解锁页面滚动
 * 打开时固定 body 位置，关闭时恢复滚动位置
 * 需求：6.3、6.4
 */
function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isLocked]);
}

export default useScrollLock;
